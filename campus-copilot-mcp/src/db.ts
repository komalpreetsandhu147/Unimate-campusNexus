import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Profile,
  CampusDocument,
  DocumentChunk,
  StudentTask,
  CalendarEvent,
  ChatThread,
  ChatMessage
} from './types.js';
import { chunkDocument } from './rag.js';

export class CampusDatabase {
  private supabase: SupabaseClient | null = null;

  // Local resilient storage
  private profiles: Map<string, Profile> = new Map();
  private documents: Map<string, CampusDocument> = new Map();
  private chunks: DocumentChunk[] = [];
  private tasks: Map<string, StudentTask> = new Map();
  private calendarEvents: Map<string, CalendarEvent> = new Map();
  private threads: Map<string, ChatThread> = new Map();
  private messages: Map<string, ChatMessage> = new Map();

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dlwcclrykmsdpzfhsmod.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2NjbHJ5a21zZHB6ZmhzbW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMTQ0OTQsImV4cCI6MjEwNTg5MDQ5NH0.84ExhGoMdXv5ZNaELAVuTERwOESNvwKQ-6-Z-4WM16Y';

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
      } catch (err) {
        console.warn('[DB] Supabase initialization notice:', err);
      }
    }

    this.seedAkalUniversityData();
  }

  /**
   * Seed official Akal University documents & initial deadlines
   */
  private seedAkalUniversityData() {
    // 1. Data Structures Project Notice
    const doc1Id = 'doc-aku-cs-301';
    const doc1: CampusDocument = {
      id: doc1Id,
      title: 'Akal University Notice #104: Data Structures Project & Lab Submission Guidelines',
      category: 'exam_notice',
      course_code: 'CS-301',
      department: 'Computer Science & Engineering',
      document_type: 'Notice #104',
      valid_until: '2026-10-18T23:59:59Z',
      created_at: new Date().toISOString()
    };
    this.documents.set(doc1Id, doc1);

    const doc1Text = `
Akal University, Talwandi Sabo - Department of Computer Science & Engineering
Notice Ref: AKU/CSE/2026/104
Subject: Data Structures (CS-301) Project Submission Guidelines and Deadline

All 3rd Semester B.Tech CSE students are hereby informed that the final project submission for Data Structures (CS-301) is scheduled for Friday, 18 October 2026 before 11:59 PM.

Submission Requirements:
1. Complete PDF Project Report detailing problem formulation, algorithm design, asymptotic complexity analysis (Big-O), and test cases.
2. Source code repository archive (zip or GitHub link) including executable implementation and README instructions.
3. Submissions must be uploaded exclusively through the Akal University Student Portal under the CS-301 course module.
4. Late submissions will attract a 10% penalty per day up to a maximum of 48 hours.

Evaluation Viva:
Lab viva and project demonstration will be conducted in Computer Lab 3 on Monday, 21 October 2026 during normal practical hours.
`;
    const doc1Chunks = chunkDocument(doc1Id, doc1.title, doc1Text, {
      course_code: 'CS-301',
      department: 'Computer Science & Engineering',
      document_type: 'Notice #104',
      valid_until: '2026-10-18T23:59:59Z'
    });
    this.chunks.push(...doc1Chunks);

    // 2. Mid-Semester Exam Schedule Circular
    const doc2Id = 'doc-aku-exam-2026';
    const doc2: CampusDocument = {
      id: doc2Id,
      title: 'Akal University Circular #AKU/EXAM/2026: Mid-Semester Examination Schedule Autumn 2026',
      category: 'exam_notice',
      course_code: 'ALL',
      department: 'Examination Branch',
      document_type: 'Circular',
      valid_until: '2026-11-05T17:00:00Z',
      created_at: new Date().toISOString()
    };
    this.documents.set(doc2Id, doc2);

    const doc2Text = `
Akal University, Examination Branch, Talwandi Sabo
Circular No: AKU/EXAM/2026/09
Date: 20 September 2026
Subject: Mid-Semester Examinations Autumn Session 2026

The Mid-Semester Theory and Practical Examinations for all undergraduate and postgraduate programs will commence on Monday, 27 October 2026.

Important Instructions for Students:
1. Minimum 75% attendance in theory and practical classes is mandatory to appear for the examinations.
2. Digital Admit Cards will be available for download on the Student Portal starting 20 October 2026.
3. Examination timings: Morning Shift 09:30 AM to 12:30 PM; Evening Shift 01:30 PM to 04:30 PM.
4. Electronic gadgets and smartwatches are strictly prohibited inside the examination halls.
`;
    const doc2Chunks = chunkDocument(doc2Id, doc2.title, doc2Text, {
      course_code: 'ALL',
      department: 'Examination Branch',
      document_type: 'Circular #AKU/EXAM/2026/09',
      valid_until: '2026-11-05T17:00:00Z'
    });
    this.chunks.push(...doc2Chunks);

    // Seed default tasks and calendar events
    const sampleUserId = 'student-swati-aku';
    const sampleTask1: StudentTask = {
      id: 'task-1',
      user_id: sampleUserId,
      title: 'Submit Data Structures (CS-301) Project Report',
      due_date: '2026-10-18T23:59:59Z',
      status: 'todo',
      created_at: new Date().toISOString()
    };
    const sampleTask2: StudentTask = {
      id: 'task-2',
      user_id: sampleUserId,
      title: 'Download Mid-Semester Admit Card from Portal',
      due_date: '2026-10-22T17:00:00Z',
      status: 'todo',
      created_at: new Date().toISOString()
    };
    this.tasks.set(sampleTask1.id, sampleTask1);
    this.tasks.set(sampleTask2.id, sampleTask2);

    const sampleEvent1: CalendarEvent = {
      id: 'event-1',
      user_id: sampleUserId,
      title: 'CS-301 Data Structures Project Submission Deadline',
      event_type: 'deadline',
      start_time: '2026-10-18T23:59:59Z',
      location: 'Student Portal (CS-301 Module)',
      created_at: new Date().toISOString()
    };
    const sampleEvent2: CalendarEvent = {
      id: 'event-2',
      user_id: sampleUserId,
      title: 'Mid-Semester Examinations Commence',
      event_type: 'exam',
      start_time: '2026-10-27T09:30:00Z',
      location: 'Academic Block A & B, Akal University',
      created_at: new Date().toISOString()
    };
    this.calendarEvents.set(sampleEvent1.id, sampleEvent1);
    this.calendarEvents.set(sampleEvent2.id, sampleEvent2);
  }

  // --- Profile methods ---
  async getProfile(userId: string): Promise<Profile | null> {
    if (this.profiles.has(userId)) return this.profiles.get(userId)!;
    if (this.supabase) {
      try {
        const { data } = await this.supabase.from('profiles').select('*').eq('id', userId).single();
        if (data) {
          this.profiles.set(userId, data);
          return data;
        }
      } catch {}
    }
    return null;
  }

  async saveProfile(profile: Profile): Promise<Profile> {
    this.profiles.set(profile.id, profile);
    if (this.supabase) {
      try {
        await this.supabase.from('profiles').upsert(profile);
      } catch {}
    }
    return profile;
  }

  // --- Document & Chunks methods ---
  getAllDocuments(): CampusDocument[] {
    return Array.from(this.documents.values());
  }

  getAllChunks(): DocumentChunk[] {
    return [...this.chunks];
  }

  async ingestDocument(
    title: string,
    rawText: string,
    category: 'syllabus' | 'exam_notice' | 'circular' = 'circular',
    metadata: {
      course_code?: string;
      department?: string;
      document_type?: string;
      valid_until?: string;
      uploaded_by?: string;
    } = {}
  ): Promise<{ document: CampusDocument; chunkCount: number }> {
    const docId = `doc-${Date.now()}`;
    const doc: CampusDocument = {
      id: docId,
      title,
      category,
      course_code: metadata.course_code,
      department: metadata.department,
      document_type: metadata.document_type || 'Official Notice',
      valid_until: metadata.valid_until,
      uploaded_by: metadata.uploaded_by,
      created_at: new Date().toISOString()
    };

    this.documents.set(docId, doc);

    const newChunks = chunkDocument(docId, title, rawText, {
      ...metadata,
      title
    });
    this.chunks.push(...newChunks);

    if (this.supabase) {
      try {
        await this.supabase.from('campus_documents').insert(doc);
        const rows = newChunks.map(c => ({
          document_id: c.document_id,
          chunk_index: c.chunk_index,
          content: c.content,
          metadata: c.metadata
        }));
        await this.supabase.from('document_chunks').insert(rows);
      } catch (err) {
        console.warn('[DB] Supabase async sync note:', err);
      }
    }

    return { document: doc, chunkCount: newChunks.length };
  }

  // --- Task methods (Direct Postgres read/write) ---
  async listTasks(userId: string = 'student-swati-aku', status?: string): Promise<StudentTask[]> {
    let result = Array.from(this.tasks.values()).filter(t => t.user_id === userId);
    if (status) {
      result = result.filter(t => t.status === status);
    }
    return result;
  }

  async createTask(title: string, userId: string = 'student-swati-aku', dueDate?: string): Promise<StudentTask> {
    const task: StudentTask = {
      id: `task-${Date.now()}`,
      user_id: userId,
      title,
      due_date: dueDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      status: 'todo',
      created_at: new Date().toISOString()
    };
    this.tasks.set(task.id, task);

    if (this.supabase) {
      try {
        await this.supabase.from('student_tasks').insert(task);
      } catch {}
    }
    return task;
  }

  async updateTaskStatus(taskId: string, status: 'todo' | 'in_progress' | 'completed'): Promise<StudentTask | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    task.status = status;
    this.tasks.set(taskId, task);

    if (this.supabase) {
      try {
        await this.supabase.from('student_tasks').update({ status }).eq('id', taskId);
      } catch {}
    }
    return task;
  }

  // --- Calendar methods (Direct Postgres read/write) ---
  async getCalendarEvents(userId: string = 'student-swati-aku'): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values()).filter(e => e.user_id === userId);
  }

  async createCalendarEvent(
    title: string,
    startTime: string,
    eventType: 'exam' | 'class' | 'deadline' | 'event' = 'event',
    location?: string,
    userId: string = 'student-swati-aku'
  ): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      id: `event-${Date.now()}`,
      user_id: userId,
      title,
      event_type: eventType,
      start_time: startTime,
      location,
      created_at: new Date().toISOString()
    };
    this.calendarEvents.set(event.id, event);

    if (this.supabase) {
      try {
        await this.supabase.from('calendar_events').insert(event);
      } catch {}
    }
    return event;
  }

  // --- Deadlines aggregation ---
  async getUpcomingDeadlines(userId: string = 'student-swati-aku', daysAhead: number = 30): Promise<{
    tasks: StudentTask[];
    events: CalendarEvent[];
  }> {
    const now = new Date().getTime();
    const cutoff = now + daysAhead * 24 * 3600 * 1000;

    const upcomingTasks = Array.from(this.tasks.values()).filter(t => {
      if (t.user_id !== userId) return false;
      if (!t.due_date) return false;
      const tTime = new Date(t.due_date).getTime();
      return tTime >= now && tTime <= cutoff;
    });

    const upcomingEvents = Array.from(this.calendarEvents.values()).filter(e => {
      if (e.user_id !== userId) return false;
      const eTime = new Date(e.start_time).getTime();
      return eTime >= now && eTime <= cutoff;
    });

    return { tasks: upcomingTasks, events: upcomingEvents };
  }

  // --- Chat logging ---
  async logMessage(
    threadId: string,
    role: 'user' | 'assistant',
    content: string,
    citations: any[] = []
  ): Promise<ChatMessage> {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      thread_id: threadId,
      role,
      content,
      citations,
      created_at: new Date().toISOString()
    };
    this.messages.set(msg.id, msg);

    if (this.supabase) {
      try {
        await this.supabase.from('chat_messages').insert(msg);
      } catch {}
    }
    return msg;
  }

  async getThreadMessages(threadId: string, limit: number = 5): Promise<ChatMessage[]> {
    const msgs = Array.from(this.messages.values())
      .filter(m => m.thread_id === threadId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return msgs.slice(-limit);
  }
}

export const db = new CampusDatabase();
