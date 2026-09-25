/*
  # Campus Copilot (UniMate CampusNexus) Core Database Schema
  Target: Akal University Pilot
  
  1. Profiles (auth.users extension with @akaluniversity.ac.in domain constraint)
  2. Campus Documents & Ingestion (campus_documents, document_chunks)
  3. Student Tasks (student_tasks)
  4. Calendar Events (calendar_events)
  5. Chat Logging & Citations (chat_threads, chat_messages)
*/

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  university_id text,
  department text,
  semester int,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT akal_domain_check CHECK (
    email LIKE '%@akaluniversity.ac.in' OR 
    email = 'admin@akaluniversity.ac.in' OR 
    email LIKE '%@student.akaluniversity.ac.in'
  )
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" 
  ON profiles FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" 
  ON profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" 
  ON profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

-- 2. Campus Documents
CREATE TABLE IF NOT EXISTS campus_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'circular', -- 'syllabus', 'exam_notice', 'circular'
  course_code text,
  department text,
  document_type text NOT NULL DEFAULT 'notice',
  file_url text,
  valid_until timestamptz,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campus_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campus_documents_select_all"
  ON campus_documents FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "campus_documents_insert_admin"
  ON campus_documents FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Document Chunks for RAG Grounding
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES campus_documents(id) ON DELETE CASCADE,
  chunk_index int NOT NULL DEFAULT 0,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  embedding_vector jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_chunks_select_all"
  ON document_chunks FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "document_chunks_insert_all"
  ON document_chunks FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 3. Student Tasks Table
CREATE TABLE IF NOT EXISTS student_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date timestamptz,
  status text CHECK (status IN ('todo', 'in_progress', 'completed')) DEFAULT 'todo',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE student_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_tasks_select_own"
  ON student_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "student_tasks_insert_own"
  ON student_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "student_tasks_update_own"
  ON student_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "student_tasks_delete_own"
  ON student_tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_type text DEFAULT 'event', -- 'exam', 'class', 'deadline', 'event'
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  location text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events_select_own"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "calendar_events_insert_own"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calendar_events_update_own"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "calendar_events_delete_own"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Chat Threads & Messages (Logging & Citations)
CREATE TABLE IF NOT EXISTS chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Campus Query',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_threads_select_own"
  ON chat_threads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "chat_threads_insert_own"
  ON chat_threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES chat_threads(id) ON DELETE CASCADE,
  role text CHECK (role IN ('user', 'assistant')) NOT NULL,
  content text NOT NULL,
  citations jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_select_own"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM chat_threads WHERE id = thread_id AND user_id = auth.uid()));

CREATE POLICY "chat_messages_insert_own"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM chat_threads WHERE id = thread_id AND user_id = auth.uid()));
