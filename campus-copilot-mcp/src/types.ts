export interface Profile {
  id: string;
  email: string;
  full_name: string;
  university_id?: string;
  department?: string;
  semester?: number;
  created_at?: string;
}

export interface CampusDocument {
  id: string;
  title: string;
  category: 'syllabus' | 'exam_notice' | 'circular';
  course_code?: string;
  department?: string;
  document_type: string;
  file_url?: string;
  valid_until?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  metadata: {
    course_code?: string;
    department?: string;
    document_type?: string;
    valid_until?: string;
    title?: string;
  };
  embedding_vector?: number[];
  created_at: string;
}

export interface StudentTask {
  id: string;
  user_id: string;
  title: string;
  due_date?: string;
  status: 'todo' | 'in_progress' | 'completed';
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  event_type: 'exam' | 'class' | 'deadline' | 'event';
  start_time: string;
  end_time?: string;
  location?: string;
  created_at: string;
}

export interface ChatThread {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface Citation {
  document_id?: string;
  title: string;
  course_code?: string;
  document_type?: string;
  snippet?: string;
  similarity?: number;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  created_at: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}
