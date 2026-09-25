Build Campus Copilot's backend for the Akal University pilot.

1. Read PROJECT_WORKING_REPORT.md first. Give me back a short plan
   artifact: what's already live (landing + waitlist on Supabase) vs.
   what you're about to build. Don't redo what's done.

2. Phase 1 — Auth & profiles (P0):
   - Supabase email/password + Google OAuth, restricted to
     @akaluniversity.ac.in
   - `profiles` table per the report's schema
   - RLS: a user reads/writes only their own row

3. Phase 2 — Ingestion + RAG grounding (P0):
   - Admin upload for PDFs (syllabus/notices/circulars) → campus_documents
   - Chunk + embed into document_chunks (pgvector), tagged with
     course_code/department/document_type/valid_until
   - A search function with a similarity threshold that returns
     chunks + citations — nothing (not a guess) below threshold

4. Phase 3, the core deliverable — MCP server for the chatbot:
   - New service `campus-copilot-mcp` exposing: search_campus_documents,
     get_upcoming_deadlines, list_tasks, create_task,
     update_task_status, get_calendar_events
   - Only search_campus_documents may call the generation LLM, and
     only after retrieval clears threshold — everything else is a
     direct Postgres read/write
   - Bake in the AGENTS.md scope refusal at the tool level
   - Extend the schema (e.g. a calendar_events table) only if
     student_tasks isn't enough — same conventions as the existing
     tables (uuid pk, RLS, timestamptz)
   - Log chat threads/messages with citations per the existing schema

5. Wire a minimal chat UI in the dashboard shell that calls the MCP
   server and shows citations plus the action chips from the report
   (add to calendar, create checklist).

6. Verify end to end: upload a sample notice, ask a question it
   should answer, then ask something unrelated (general knowledge)
   and confirm it declines instead of answering. Show me the
   walkthrough artifact.

Stop and check with me before: any destructive migration, enabling a
paid API tier, or deploying anywhere public.