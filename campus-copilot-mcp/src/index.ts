import http from 'http';
import { db } from './db.js';
import {
  TOOL_DEFINITIONS,
  handleSearchCampusDocuments,
  handleGetUpcomingDeadlines,
  handleListTasks,
  handleCreateTask,
  handleUpdateTaskStatus,
  handleGetCalendarEvents
} from './tools.js';

const PORT = process.env.PORT || 3001;

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

async function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    // Health check
    if (req.method === 'GET' && pathname === '/health') {
      return sendJson(res, 200, {
        status: 'healthy',
        service: 'campus-copilot-mcp',
        campus: 'Akal University',
        documents_indexed: db.getAllDocuments().length,
        chunks_indexed: db.getAllChunks().length,
        timestamp: new Date().toISOString()
      });
    }

    // 1. Model Context Protocol (MCP) JSON-RPC Endpoint
    if (req.method === 'POST' && pathname === '/mcp') {
      const payload = await parseBody(req);
      const { method, params, id } = payload;

      if (method === 'tools/list') {
        return sendJson(res, 200, {
          jsonrpc: '2.0',
          id: id ?? 1,
          result: { tools: TOOL_DEFINITIONS }
        });
      }

      if (method === 'tools/call') {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        let result: any;

        switch (toolName) {
          case 'search_campus_documents':
            result = await handleSearchCampusDocuments(toolArgs);
            break;
          case 'get_upcoming_deadlines':
            result = await handleGetUpcomingDeadlines(toolArgs);
            break;
          case 'list_tasks':
            result = await handleListTasks(toolArgs);
            break;
          case 'create_task':
            result = await handleCreateTask(toolArgs);
            break;
          case 'update_task_status':
            result = await handleUpdateTaskStatus(toolArgs);
            break;
          case 'get_calendar_events':
            result = await handleGetCalendarEvents(toolArgs);
            break;
          default:
            return sendJson(res, 404, {
              jsonrpc: '2.0',
              id: id ?? 1,
              error: { code: -32601, message: `Tool '${toolName}' not found` }
            });
        }

        return sendJson(res, 200, {
          jsonrpc: '2.0',
          id: id ?? 1,
          result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], raw: result }
        });
      }

      return sendJson(res, 400, {
        jsonrpc: '2.0',
        id: id ?? 1,
        error: { code: -32600, message: `Unsupported method '${method}'` }
      });
    }

    // 2. High-level Chat Endpoint (Frontend Chat UI)
    if (req.method === 'POST' && pathname === '/api/chat') {
      const body = await parseBody(req);
      const query = (body.query || '').trim();
      const userId = body.user_id || 'student-swati-aku';
      const threadId = body.thread_id || `thread-${Date.now()}`;

      if (!query) {
        return sendJson(res, 400, { error: 'Query is required' });
      }

      // Fetch previous 2-3 turns for multi-turn context
      const recentMsgs = await db.getThreadMessages(threadId, 4);
      let enhancedQuery = query;
      if (recentMsgs.length > 0) {
        const prevUserMsgs = recentMsgs.filter(m => m.role === 'user').map(m => m.content);
        if (prevUserMsgs.length > 0) {
          enhancedQuery = `${prevUserMsgs.join(' ')} ${query}`;
        }
      }

      // Log User Message
      await db.logMessage(threadId, 'user', query, []);

      // Execute tool using enhanced multi-turn query
      const toolResult = await handleSearchCampusDocuments({ query: enhancedQuery });

      // Log Assistant Message with citations
      await db.logMessage(threadId, 'assistant', toolResult.answer, toolResult.citations || []);

      return sendJson(res, 200, {
        thread_id: threadId,
        role: 'assistant',
        answer: toolResult.answer,
        citations: toolResult.citations,
        action_chips: toolResult.action_chips,
        scope_declined: toolResult.scope_declined,
        verified: !toolResult.scope_declined
      });
    }

    // 3. Action Chips Handler (Add to Calendar, Create Checklist)
    if (req.method === 'POST' && pathname === '/api/action') {
      const body = await parseBody(req);
      const { action_type, context, user_id } = body;
      const uid = user_id || 'student-swati-aku';

      if (action_type === 'add_to_calendar') {
        const title = context?.title || 'Data Structures Project Deadline';
        const startTime = context?.start_time || '2026-10-18T23:59:59Z';
        const event = await db.createCalendarEvent(title, startTime, 'deadline', 'Portal', uid);
        return sendJson(res, 201, { success: true, event, message: 'Event successfully added to your Academic Calendar' });
      }

      if (action_type === 'create_checklist') {
        const tasks = [
          'Review CS-301 algorithm problem formulation',
          'Write asymptotic complexity analysis (Big-O)',
          'Package source code with README documentation',
          'Submit PDF report to student portal before 18 Oct 11:59 PM'
        ];
        const created = [];
        for (const t of tasks) {
          created.push(await db.createTask(t, uid, '2026-10-18T23:59:59Z'));
        }
        return sendJson(res, 201, { success: true, tasks: created, message: 'Checklist generated in your tasks' });
      }

      return sendJson(res, 400, { error: `Unknown action type: ${action_type}` });
    }

    // 4. Tasks endpoints (Direct Postgres reads & writes)
    if (pathname === '/api/tasks') {
      const uid = url.searchParams.get('user_id') || 'student-swati-aku';

      if (req.method === 'GET') {
        const status = url.searchParams.get('status') || undefined;
        const tasks = await db.listTasks(uid, status);
        return sendJson(res, 200, { tasks });
      }

      if (req.method === 'POST') {
        const body = await parseBody(req);
        if (!body.title) return sendJson(res, 400, { error: 'Title is required' });
        const task = await db.createTask(body.title, uid, body.due_date);
        return sendJson(res, 201, { task });
      }
    }

    if (req.method === 'PATCH' && pathname.startsWith('/api/tasks/')) {
      const taskId = pathname.replace('/api/tasks/', '');
      const body = await parseBody(req);
      if (!body.status) return sendJson(res, 400, { error: 'Status is required' });
      const updated = await db.updateTaskStatus(taskId, body.status);
      if (!updated) return sendJson(res, 404, { error: 'Task not found' });
      return sendJson(res, 200, { task: updated });
    }

    // 5. Calendar events endpoint
    if (req.method === 'GET' && pathname === '/api/calendar') {
      const uid = url.searchParams.get('user_id') || 'student-swati-aku';
      const events = await db.getCalendarEvents(uid);
      return sendJson(res, 200, { events });
    }

    // 6. Deadlines endpoint
    if (req.method === 'GET' && pathname === '/api/deadlines') {
      const uid = url.searchParams.get('user_id') || 'student-swati-aku';
      const deadlines = await db.getUpcomingDeadlines(uid);
      return sendJson(res, 200, deadlines);
    }

    // 7. Documents list & Ingest endpoints
    if (req.method === 'GET' && pathname === '/api/documents') {
      return sendJson(res, 200, {
        documents: db.getAllDocuments(),
        total_chunks: db.getAllChunks().length
      });
    }

    if (req.method === 'POST' && pathname === '/api/ingest') {
      const body = await parseBody(req);
      const { title, text, category, metadata } = body;
      if (!title || !text) {
        return sendJson(res, 400, { error: 'title and text are required' });
      }
      const result = await db.ingestDocument(title, text, category, metadata);
      return sendJson(res, 201, {
        message: 'Document successfully ingested and indexed with semantic chunks',
        document: result.document,
        chunks_created: result.chunkCount
      });
    }

    // Not found
    sendJson(res, 404, { error: 'Endpoint not found' });
  } catch (err: any) {
    console.error('[Server Error]', err);
    sendJson(res, 500, { error: 'Internal server error', details: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`[campus-copilot-mcp] Server active on http://localhost:${PORT}`);
  console.log(`[campus-copilot-mcp] MCP JSON-RPC endpoint: http://localhost:${PORT}/mcp`);
  console.log(`[campus-copilot-mcp] REST API endpoint: http://localhost:${PORT}/api/chat`);
});
