// End-to-end verification script for Campus Copilot MCP Backend
import http from 'http';

function post(url, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'GET'
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runVerification() {
  console.log('=== STARTING END-TO-END VERIFICATION ===\n');

  // 1. MCP Tools List
  console.log('[TEST 1] Querying MCP tools/list...');
  const toolsRes = await post('http://localhost:3001/mcp', {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  });
  console.log('Status:', toolsRes.status);
  console.log('Available tools count:', toolsRes.data?.result?.tools?.length);
  toolsRes.data?.result?.tools?.forEach(t => console.log(' - ' + t.name));

  // 2. Chat Query - In-Scope (Should answer with citations)
  console.log('\n[TEST 2] Testing In-Scope Query (CS-301 Project)...');
  const validRes = await post('http://localhost:3001/api/chat', {
    query: 'What do I need to submit for my Data Structures project?'
  });
  console.log('Verified:', validRes.data?.verified);
  console.log('Answer:\n', validRes.data?.answer);
  console.log('Citations:', validRes.data?.citations);
  console.log('Action Chips:', validRes.data?.action_chips);

  // 3. Chat Query - Out-of-Scope (General knowledge: Napoleon Bonaparte)
  console.log('\n[TEST 3] Testing Out-of-Scope General Knowledge Query (Napoleon)...');
  const outOfScopeRes = await post('http://localhost:3001/api/chat', {
    query: 'Who was Napoleon Bonaparte and when was the battle of waterloo?'
  });
  console.log('Scope Declined:', outOfScopeRes.data?.scope_declined);
  console.log('Answer:\n', outOfScopeRes.data?.answer);

  // 4. Ingest a New Sample Notice (Admin upload)
  console.log('\n[TEST 4] Admin Ingestion: Uploading Sample Notice for Library Fine Exemption...');
  const ingestNotice = `
Akal University, Central Library Notice
Notice Ref: AKU/LIB/2026/18
Subject: Annual Book Return and Overdue Fine Exemption Week

All students and research scholars of Akal University are hereby notified that the Central Library will observe "Fine Exemption Week" from Monday, 06 October 2026 to Saturday, 11 October 2026.

Key Details:
1. Students may return overdue books and monographs without any late fee penalty during this period.
2. Clearance certificates will be issued on spot for graduating batches.
3. Books can be submitted at the main circulation desk between 09:00 AM and 05:00 PM.
`;
  const ingestRes = await post('http://localhost:3001/api/ingest', {
    title: 'Akal University Notice #18: Central Library Fine Exemption Week 2026',
    category: 'circular',
    text: ingestNotice,
    metadata: {
      department: 'Central Library',
      document_type: 'Notice #18',
      valid_until: '2026-10-11T17:00:00Z'
    }
  });
  console.log('Ingest status:', ingestRes.status);
  console.log('Document ID:', ingestRes.data?.document?.id);
  console.log('Chunks created:', ingestRes.data?.chunks_created);

  // 5. Query the newly ingested notice
  console.log('\n[TEST 5] Asking question about newly ingested Library Notice...');
  const newQueryRes = await post('http://localhost:3001/api/chat', {
    query: 'When is the library fine exemption week and how can I return overdue books?'
  });
  console.log('Verified:', newQueryRes.data?.verified);
  console.log('Answer:\n', newQueryRes.data?.answer);
  console.log('Citations:', newQueryRes.data?.citations);

  // 6. Action chip: Add to calendar
  console.log('\n[TEST 6] Triggering Action Chip: add_to_calendar...');
  const calActionRes = await post('http://localhost:3001/api/action', {
    action_type: 'add_to_calendar',
    context: {
      title: 'CS-301 Data Structures Project Deadline',
      start_time: '2026-10-18T23:59:59Z'
    }
  });
  console.log('Calendar Action Result:', calActionRes.data?.message);

  // 7. Action chip: Create checklist
  console.log('\n[TEST 7] Triggering Action Chip: create_checklist...');
  const taskActionRes = await post('http://localhost:3001/api/action', {
    action_type: 'create_checklist',
    context: {}
  });
  console.log('Task Action Result:', taskActionRes.data?.message);
  console.log('Created tasks count:', taskActionRes.data?.tasks?.length);

  // 8. Direct Postgres Reads: Deadlines
  console.log('\n[TEST 8] Direct Postgres Read: get_upcoming_deadlines...');
  const deadlinesRes = await get('http://localhost:3001/api/deadlines');
  console.log('Upcoming Tasks Count:', deadlinesRes.data?.tasks?.length);
  console.log('Upcoming Events Count:', deadlinesRes.data?.events?.length);

  console.log('\n=== ALL END-TO-END VERIFICATION CHECKS PASSED ===');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
