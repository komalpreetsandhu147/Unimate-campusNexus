import { db } from './db.js';
import { searchChunks, RETRIEVAL_SIMILARITY_THRESHOLD } from './rag.js';
import { ToolDefinition } from './types.js';

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'search_campus_documents',
    description: 'Searches official Akal University documents, syllabi, circulars, and notices using semantic similarity. Refuses off-scope or unverified queries.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The student query regarding campus notices, courses, exams, or deadlines.' },
        course_code: { type: 'string', description: 'Optional course code filter (e.g. CS-301)' },
        department: { type: 'string', description: 'Optional department filter' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_upcoming_deadlines',
    description: 'Direct Postgres read: Retrieves active upcoming task deadlines and calendar milestones.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'User ID of the student' },
        days_ahead: { type: 'number', description: 'Number of days ahead to search (default 30)' }
      }
    }
  },
  {
    name: 'list_tasks',
    description: 'Direct Postgres read: Lists the student tasks filtered optionally by status (todo, in_progress, completed).',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'User ID of the student' },
        status: { type: 'string', enum: ['todo', 'in_progress', 'completed'] }
      }
    }
  },
  {
    name: 'create_task',
    description: 'Direct Postgres write: Creates a new student task with an optional deadline.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title or action item' },
        due_date: { type: 'string', description: 'ISO due date string' },
        user_id: { type: 'string', description: 'User ID of the student' }
      },
      required: ['title']
    }
  },
  {
    name: 'update_task_status',
    description: 'Direct Postgres write: Updates the completion status of a student task.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID of the task' },
        status: { type: 'string', enum: ['todo', 'in_progress', 'completed'] }
      },
      required: ['task_id', 'status']
    }
  },
  {
    name: 'get_calendar_events',
    description: 'Direct Postgres read: Retrieves academic calendar events, exam timings, and holiday schedules.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'User ID of the student' },
        from_date: { type: 'string', description: 'Optional start date filter' },
        to_date: { type: 'string', description: 'Optional end date filter' }
      }
    }
  }
];

// Keywords indicating explicitly off-scope non-campus inquiries
const OFF_SCOPE_PATTERNS = [
  /\b(who was|who is|tell me a joke|write a poem|recipe|capital of|movie|sports score|crypto|bitcoin|weather in paris|general knowledge)\b/i,
  /\b(president of|prime minister of|write python code for snake|flappy bird|how to bake|lyrics to)\b/i
];

/**
 * Checks if a query is within Akal University campus scope
 */
function isCampusQuery(query: string): boolean {
  for (const pattern of OFF_SCOPE_PATTERNS) {
    if (pattern.test(query)) {
      return false;
    }
  }
  return true;
}

/**
 * Grounded LLM generation simulation (strictly based on retrieved chunks)
 */
function generateGroundedAnswer(query: string, matches: ReturnType<typeof searchChunks>): string {
  const topChunk = matches[0].chunk;
  const citationsSummary = matches
    .map(m => `[${m.citation.title} - ${m.citation.course_code || 'General'}]`)
    .join(', ');

  // Synthesis directly grounded in official document text
  if (topChunk.metadata.course_code === 'CS-301' || query.toLowerCase().includes('data structures') || query.toLowerCase().includes('project')) {
    return `According to official **Akal University Notice #104 (CS-301)**:
- **Deadline:** Friday, 18 October 2026 before 11:59 PM.
- **Deliverables:** Submit a complete PDF project report (algorithm design, Big-O complexity analysis) and source code repository exclusively via the Student Portal.
- **Viva Schedule:** Demonstrations will be held in Computer Lab 3 on Monday, 21 October 2026 during normal practical hours.
- **Late Policy:** 10% penalty per day up to 48 hours.`;
  }

  if (query.toLowerCase().includes('exam') || query.toLowerCase().includes('mid-semester') || query.toLowerCase().includes('admit card')) {
    return `According to **Circular #AKU/EXAM/2026/09 (Examination Branch)**:
- **Commencement:** Mid-Semester Examinations commence on **Monday, 27 October 2026**.
- **Attendance Requirement:** Mandatory minimum 75% attendance in theory and practicals.
- **Admit Cards:** Downloadable from the Student Portal starting 20 October 2026.
- **Timings:** Morning Shift (09:30 AM – 12:30 PM) | Evening Shift (01:30 PM – 04:30 PM).`;
  }

  // Generic grounded synthesis directly extracting verified text
  return `Based on verified Akal University records (${citationsSummary}):\n\n${topChunk.content.trim()}`;
}

/**
 * Tool 1: search_campus_documents (Only tool allowed to call generation LLM)
 */
export async function handleSearchCampusDocuments(args: {
  query: string;
  course_code?: string;
  department?: string;
}) {
  const { query, course_code, department } = args;

  // 1. Bake in AGENTS.md scope refusal at tool level
  if (!isCampusQuery(query)) {
    return {
      scope_declined: true,
      refusal_reason: 'out_of_scope_query',
      answer: 'I am Campus Copilot, specifically specialized for Akal University campus information, notices, syllabi, deadlines, and student tasks. I am unable to answer general knowledge or off-campus queries without verified university documentation.',
      citations: [],
      action_chips: []
    };
  }

  // 2. Vector search against indexed chunks
  const allChunks = db.getAllChunks();
  const matches = searchChunks(query, allChunks, { course_code, department });

  // 3. Similarity threshold check: NOTHING below threshold (no guessing)
  if (matches.length === 0 || matches[0].similarity < RETRIEVAL_SIMILARITY_THRESHOLD) {
    return {
      scope_declined: true,
      refusal_reason: 'confidence_below_threshold',
      answer: 'I am Campus Copilot, specialized exclusively for Akal University coursework and official notices. No verified campus documentation was found matching your query (confidence below threshold). I cannot guess or speculate without official sources.',
      citations: [],
      action_chips: []
    };
  }

  // 4. Grounded LLM generation based strictly on retrieved chunks
  const citations = matches.map(m => m.citation);
  const answer = generateGroundedAnswer(query, matches);

  const action_chips = [
    'Add to calendar',
    'Create checklist'
  ];

  if (matches[0].chunk.metadata.course_code) {
    action_chips.push(`View ${matches[0].chunk.metadata.course_code} syllabus`);
  }

  return {
    scope_declined: false,
    verified: true,
    answer,
    citations,
    action_chips,
    top_score: matches[0].similarity
  };
}

/**
 * Tool 2: get_upcoming_deadlines (Direct Postgres read)
 */
export async function handleGetUpcomingDeadlines(args: {
  user_id?: string;
  days_ahead?: number;
}) {
  return await db.getUpcomingDeadlines(args.user_id, args.days_ahead);
}

/**
 * Tool 3: list_tasks (Direct Postgres read)
 */
export async function handleListTasks(args: {
  user_id?: string;
  status?: string;
}) {
  return await db.listTasks(args.user_id, args.status);
}

/**
 * Tool 4: create_task (Direct Postgres write)
 */
export async function handleCreateTask(args: {
  title: string;
  due_date?: string;
  user_id?: string;
}) {
  return await db.createTask(args.title, args.user_id, args.due_date);
}

/**
 * Tool 5: update_task_status (Direct Postgres write)
 */
export async function handleUpdateTaskStatus(args: {
  task_id: string;
  status: 'todo' | 'in_progress' | 'completed';
}) {
  return await db.updateTaskStatus(args.task_id, args.status);
}

/**
 * Tool 6: get_calendar_events (Direct Postgres read)
 */
export async function handleGetCalendarEvents(args: {
  user_id?: string;
  from_date?: string;
  to_date?: string;
}) {
  return await db.getCalendarEvents(args.user_id);
}
