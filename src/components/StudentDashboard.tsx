import { useState, useEffect, useRef } from 'react';
import {
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  ExternalLink,
  FileText,
  Layers3,
  Loader2,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  SquareCheckBig,
  Upload,
  User,
  X
} from 'lucide-react';

interface Citation {
  document_id?: string;
  title: string;
  course_code?: string;
  document_type?: string;
  snippet?: string;
  similarity?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  action_chips?: string[];
  verified?: boolean;
  scope_declined?: boolean;
  timestamp: string;
}

interface StudentTask {
  id: string;
  title: string;
  due_date?: string;
  status: 'todo' | 'in_progress' | 'completed';
}

interface CalendarEvent {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  location?: string;
}

export function StudentDashboard({ onBackToLanding }: { onBackToLanding: () => void }) {
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks' | 'calendar' | 'upload'>('chat');
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Default student profile (restricted to @akaluniversity.ac.in)
  const student = {
    name: 'Harpreet Singh',
    email: 'harpreet.singh@akaluniversity.ac.in',
    rollNumber: 'AKU-2024-CSE-042',
    department: 'Computer Science & Engineering',
    semester: 3,
    campus: 'Akal University, Talwandi Sabo'
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Good morning, **${student.name}**! I am your Akal University Campus Copilot.\n\nI am grounded in official campus circulars, CS-301 course guidelines, and examination notices. Ask me about upcoming deadlines, exam schedules, or project deliverables.`,
      action_chips: [
        'What do I need to submit for my Data Structures project?',
        'When do Mid-Semester exams start?',
        'Who was Napoleon Bonaparte?'
      ],
      verified: true,
      timestamp: '09:41 AM'
    }
  ]);

  const [tasks, setTasks] = useState<StudentTask[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Admin Ingestion form states
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<'circular' | 'syllabus' | 'exam_notice'>('circular');
  const [uploadText, setUploadText] = useState('');
  const [uploading, setUploading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Fetch initial tasks & calendar
  useEffect(() => {
    fetchTasks();
    fetchCalendar();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  async function fetchTasks() {
    try {
      const res = await fetch('http://localhost:3001/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.warn('Could not fetch tasks:', err);
    }
  }

  async function fetchCalendar() {
    try {
      const res = await fetch('http://localhost:3001/api/calendar');
      if (res.ok) {
        const data = await res.json();
        setCalendarEvents(data.events || []);
      }
    } catch (err) {
      console.warn('Could not fetch calendar:', err);
    }
  }

  async function handleSend(queryText?: string) {
    const text = (queryText || inputQuery).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          user_id: 'student-swati-aku'
        })
      });

      if (!res.ok) throw new Error('Network error from MCP service');

      const data = await res.json();
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        citations: data.citations || [],
        action_chips: data.action_chips || [],
        verified: data.verified,
        scope_declined: data.scope_declined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Unable to reach Campus Copilot MCP server on localhost:3001. Please verify the background service is running.',
          scope_declined: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleActionChip(action: string) {
    if (action.toLowerCase().includes('calendar')) {
      try {
        const res = await fetch('http://localhost:3001/api/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action_type: 'add_to_calendar',
            context: {
              title: 'Data Structures (CS-301) Project Deadline',
              start_time: '2026-10-18T23:59:59Z'
            }
          })
        });
        const data = await res.json();
        showToast(data.message || 'Added to calendar!');
        fetchCalendar();
      } catch {
        showToast('Failed to sync with calendar.');
      }
    } else if (action.toLowerCase().includes('checklist')) {
      try {
        const res = await fetch('http://localhost:3001/api/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action_type: 'create_checklist',
            context: {}
          })
        });
        const data = await res.json();
        showToast(data.message || 'Checklist generated in tasks!');
        fetchTasks();
        setActiveTab('tasks');
      } catch {
        showToast('Failed to create checklist.');
      }
    } else {
      // Treat as a direct question
      handleSend(action);
    }
  }

  async function handleToggleTask(task: StudentTask) {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await fetch(`http://localhost:3001/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      fetchTasks();
    } catch {}
  }

  async function handleCreateNewTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await fetch('http://localhost:3001/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle.trim() })
      });
      setNewTaskTitle('');
      fetchTasks();
      showToast('New task added!');
    } catch {}
  }

  async function handleAdminUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadText.trim()) return;

    setUploading(true);
    try {
      const res = await fetch('http://localhost:3001/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadTitle.trim(),
          text: uploadText.trim(),
          category: uploadCategory,
          metadata: {
            department: 'Academic Branch',
            document_type: uploadCategory
          }
        })
      });
      const data = await res.json();
      setUploading(false);
      if (res.ok) {
        showToast(`Document uploaded & indexed into ${data.chunks_created} chunks!`);
        setUploadTitle('');
        setUploadText('');
        setActiveTab('chat');
        handleSend(`Tell me about ${data.document.title}`);
      }
    } catch {
      setUploading(false);
      showToast('Error uploading document.');
    }
  }

  return (
    <div className="dashboard-root" style={{ background: '#070a13', minHeight: '100vh', color: '#f3f5ff' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          background: 'linear-gradient(135deg, #1b387a, #3b2875)',
          border: '1px solid #63a9ff',
          borderRadius: 10,
          padding: '12px 18px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          animation: 'fadeIn 0.3s'
        }}>
          <CircleCheck size={18} color="#6fe3c2" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} style={{ background: 'none', border: 'none', color: '#a0b0d0', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Bar */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(10,14,28,0.92)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0 24px'
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(145deg, rgba(64,137,255,0.35), rgba(98,45,209,0.35))',
              border: '1px solid rgba(103,186,255,0.5)',
              display: 'grid',
              placeItems: 'center',
              color: '#8be8ff'
            }}>
              <Bot size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 17, letterSpacing: '-0.02em' }}>
                  Campus <strong style={{ color: '#8bb7ff' }}>Copilot</strong>
                </span>
                <span style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  padding: '2px 7px',
                  borderRadius: 6,
                  background: 'rgba(99,217,255,0.14)',
                  color: '#6ee4ff',
                  border: '1px solid rgba(99,217,255,0.3)'
                }}>
                  Pilot v1.0
                </span>
              </div>
              <small style={{ color: '#73809e', fontSize: 11 }}>Akal University Student Operating System</small>
            </div>
          </div>

          {/* Student Profile Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 14px',
              borderRadius: 30,
              background: 'rgba(23,32,68,0.65)',
              border: '1px solid rgba(119,150,238,0.22)'
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#2b52af',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                display: 'grid',
                placeItems: 'center'
              }}>
                HS
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {student.name}
                  <span title="Domain @akaluniversity.ac.in Verified" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <ShieldCheck size={13} color="#6fe3c2" />
                  </span>
                </div>
                <small style={{ color: '#8895b3', fontSize: 10 }}>B.Tech CSE · Sem {student.semester}</small>
              </div>
            </div>

            <button
              onClick={onBackToLanding}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#ccd5ee',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Exit to Landing
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: 1240, margin: '24px auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
        {/* Sidebar Nav */}
        <aside style={{
          background: 'rgba(15,20,40,0.7)',
          border: '1px solid rgba(120,145,215,0.16)',
          borderRadius: 14,
          padding: 18,
          height: 'fit-content'
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#68779b', marginBottom: 14 }}>
            Command Modules
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                border: activeTab === 'chat' ? '1px solid rgba(100,165,255,0.4)' : '1px solid transparent',
                background: activeTab === 'chat' ? 'linear-gradient(135deg, rgba(50,95,210,0.35), rgba(70,45,150,0.25))' : 'transparent',
                color: activeTab === 'chat' ? '#e2edff' : '#8a96b4',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%'
              }}
            >
              <Bot size={17} color={activeTab === 'chat' ? '#70dbff' : '#8a96b4'} />
              Copilot Chat & RAG
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                border: activeTab === 'tasks' ? '1px solid rgba(100,165,255,0.4)' : '1px solid transparent',
                background: activeTab === 'tasks' ? 'linear-gradient(135deg, rgba(50,95,210,0.35), rgba(70,45,150,0.25))' : 'transparent',
                color: activeTab === 'tasks' ? '#e2edff' : '#8a96b4',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%'
              }}
            >
              <SquareCheckBig size={17} color={activeTab === 'tasks' ? '#70dbff' : '#8a96b4'} />
              Tasks & Checklists
              {tasks.filter(t => t.status === 'todo').length > 0 && (
                <span style={{ marginLeft: 'auto', background: 'rgba(99,145,255,0.25)', color: '#96bcff', fontSize: 10, padding: '2px 7px', borderRadius: 10 }}>
                  {tasks.filter(t => t.status === 'todo').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                border: activeTab === 'calendar' ? '1px solid rgba(100,165,255,0.4)' : '1px solid transparent',
                background: activeTab === 'calendar' ? 'linear-gradient(135deg, rgba(50,95,210,0.35), rgba(70,45,150,0.25))' : 'transparent',
                color: activeTab === 'calendar' ? '#e2edff' : '#8a96b4',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%'
              }}
            >
              <CalendarDays size={17} color={activeTab === 'calendar' ? '#70dbff' : '#8a96b4'} />
              Deadlines & Calendar
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                border: activeTab === 'upload' ? '1px solid rgba(100,165,255,0.4)' : '1px solid transparent',
                background: activeTab === 'upload' ? 'linear-gradient(135deg, rgba(50,95,210,0.35), rgba(70,45,150,0.25))' : 'transparent',
                color: activeTab === 'upload' ? '#e2edff' : '#8a96b4',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%'
              }}
            >
              <Upload size={17} color={activeTab === 'upload' ? '#70dbff' : '#8a96b4'} />
              Upload Campus Notice
            </button>
          </nav>

          <hr style={{ borderColor: 'rgba(255,255,255,0.07)', margin: '20px 0' }} />

          {/* Quick Campus Status */}
          <div style={{ fontSize: 11, color: '#7b87a4', lineHeight: 1.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6fe3c2', marginBottom: 6, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6fe3c2', display: 'inline-block' }} />
              MCP Server Online
            </div>
            <div>Port: <strong>3001</strong></div>
            <div>Target: <strong>Akal University</strong></div>
            <div>Active Context: <strong>CS-301, Autumn 2026</strong></div>
          </div>
        </aside>

        {/* Tab 1: Copilot Chat */}
        {activeTab === 'chat' && (
          <main style={{
            background: 'rgba(15,20,40,0.7)',
            border: '1px solid rgba(120,145,215,0.16)',
            borderRadius: 14,
            display: 'flex',
            flexDirection: 'column',
            height: '78vh',
            overflow: 'hidden'
          }}>
            {/* Chat Messages Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    display: 'flex',
                    gap: 12,
                    maxWidth: '85%',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: msg.role === 'user' ? '50%' : 10,
                      background: msg.role === 'user' ? '#2b52af' : 'linear-gradient(135deg, rgba(64,137,255,0.4), rgba(98,45,209,0.4))',
                      border: msg.role === 'user' ? 'none' : '1px solid rgba(103,186,255,0.5)',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      color: '#fff',
                      fontSize: 11
                    }}>
                      {msg.role === 'user' ? 'HS' : <Bot size={18} color="#7fe5ff" />}
                    </div>

                    {/* Bubble Content */}
                    <div style={{
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, #2b56b8, #4230a8)'
                        : msg.scope_declined
                          ? 'rgba(48,25,35,0.6)'
                          : 'linear-gradient(135deg, rgba(28,42,88,0.55), rgba(20,24,55,0.5))',
                      border: msg.scope_declined
                        ? '1px solid rgba(255,100,120,0.3)'
                        : '1px solid rgba(119,150,238,0.22)',
                      borderRadius: 12,
                      padding: '16px 20px',
                      color: '#dbe3f8',
                      fontSize: 13,
                      lineHeight: 1.6
                    }}>
                      {/* Header with verified badge */}
                      {msg.role === 'assistant' && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#88afff' }}>Campus Copilot</span>
                          {msg.verified && !msg.scope_declined && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: '#6fe3c2',
                              fontSize: 10,
                              fontWeight: 600,
                              background: 'rgba(111,227,194,0.12)',
                              padding: '2px 8px',
                              borderRadius: 20
                            }}>
                              <CircleCheck size={12} /> Verified Akal University Source
                            </span>
                          )}
                          {msg.scope_declined && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: '#ff8a99',
                              fontSize: 10,
                              fontWeight: 600,
                              background: 'rgba(255,100,120,0.15)',
                              padding: '2px 8px',
                              borderRadius: 20
                            }}>
                              <CircleAlert size={12} /> Scope Refusal (Off-Campus)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Text */}
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

                      {/* Citations Box */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7e8ba8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FileText size={12} color="#7fe5ff" /> Verified Citations ({msg.citations.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {msg.citations.map((c, idx) => (
                              <div key={idx} style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                background: 'rgba(12,18,40,0.65)',
                                border: '1px solid rgba(110,140,220,0.16)',
                                fontSize: 11
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#9bb8ff', fontWeight: 600 }}>
                                  <span>{c.title}</span>
                                  {c.similarity && (
                                    <span style={{ fontSize: 9, color: '#6fe3c2', background: 'rgba(111,227,194,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                                      Match {Math.round(c.similarity * 100)}%
                                    </span>
                                  )}
                                </div>
                                {c.snippet && (
                                  <p style={{ margin: '4px 0 0', color: '#7f8ca8', fontSize: 10, fontStyle: 'italic' }}>
                                    "{c.snippet}"
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Chips */}
                      {msg.action_chips && msg.action_chips.length > 0 && (
                        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {msg.action_chips.map((chip, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleActionChip(chip)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 20,
                                background: 'linear-gradient(135deg, rgba(60,110,230,0.25), rgba(120,60,210,0.2))',
                                border: '1px solid rgba(120,165,255,0.3)',
                                color: '#bdd3ff',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <Sparkles size={11} color="#6fe3c2" />
                              {chip}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#7e8ba8', fontSize: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(64,137,255,0.4), rgba(98,45,209,0.4))',
                    border: '1px solid rgba(103,186,255,0.5)',
                    display: 'grid',
                    placeItems: 'center'
                  }}>
                    <Loader2 size={17} className="spin" color="#7fe5ff" />
                  </div>
                  <span>Searching official Akal University documents & verifying citations...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(11,15,32,0.9)' }}>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSend();
                }}
                style={{ display: 'flex', gap: 10, alignItems: 'center' }}
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={e => setInputQuery(e.target.value)}
                  placeholder="Ask about Akal University notices, CS-301 project guidelines, exams, deadlines..."
                  style={{
                    flex: 1,
                    padding: '14px 18px',
                    borderRadius: 10,
                    background: 'rgba(18,24,50,0.7)',
                    border: '1px solid rgba(120,150,230,0.25)',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={loading || !inputQuery.trim()}
                  style={{
                    padding: '14px 22px',
                    borderRadius: 10,
                    background: 'linear-gradient(105deg, #3a7bff, #6749de)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: loading || !inputQuery.trim() ? 'not-allowed' : 'pointer',
                    opacity: loading || !inputQuery.trim() ? 0.5 : 1
                  }}
                >
                  <Send size={15} /> Send
                </button>
              </form>
            </div>
          </main>
        )}

        {/* Tab 2: Tasks & Checklists */}
        {activeTab === 'tasks' && (
          <main style={{
            background: 'rgba(15,20,40,0.7)',
            border: '1px solid rgba(120,145,215,0.16)',
            borderRadius: 14,
            padding: 28,
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontFamily: 'Space Grotesk' }}>Student Tasks & Action Checklists</h2>
                <small style={{ color: '#8895b3' }}>Direct Postgres read/write through MCP service</small>
              </div>
            </div>

            <form onSubmit={handleCreateNewTask} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              <input
                type="text"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Add a new academic milestone or task..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: 'rgba(18,24,50,0.7)',
                  border: '1px solid rgba(120,150,230,0.25)',
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '12px 18px',
                  borderRadius: 8,
                  background: '#2b52af',
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Plus size={16} /> Add Task
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.length === 0 ? (
                <div style={{ color: '#7a86a4', textAlign: 'center', padding: 40 }}>No tasks found. Use Copilot to generate checklists!</div>
              ) : (
                tasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => handleToggleTask(t)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 18px',
                      borderRadius: 10,
                      background: t.status === 'completed' ? 'rgba(25,35,70,0.25)' : 'rgba(22,30,64,0.65)',
                      border: '1px solid rgba(119,150,238,0.18)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: t.status === 'completed' ? '1px solid #6fe3c2' : '1px solid rgba(120,150,230,0.4)',
                      background: t.status === 'completed' ? '#6fe3c2' : 'transparent',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#070a13'
                    }}>
                      {t.status === 'completed' && <Check size={14} strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1, textDecoration: t.status === 'completed' ? 'line-through' : 'none', color: t.status === 'completed' ? '#687796' : '#e1e8fc', fontSize: 13 }}>
                      {t.title}
                    </div>
                    {t.due_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8898bf', fontSize: 11 }}>
                        <Clock size={12} />
                        {new Date(t.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </main>
        )}

        {/* Tab 3: Calendar & Deadlines */}
        {activeTab === 'calendar' && (
          <main style={{
            background: 'rgba(15,20,40,0.7)',
            border: '1px solid rgba(120,145,215,0.16)',
            borderRadius: 14,
            padding: 28,
            overflowY: 'auto'
          }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontFamily: 'Space Grotesk' }}>Upcoming Deadlines & Academic Calendar</h2>
              <small style={{ color: '#8895b3' }}>Aggregated from university circulars & student schedule</small>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {calendarEvents.map(evt => (
                <div
                  key={evt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 20px',
                    borderRadius: 10,
                    background: 'rgba(22,30,64,0.65)',
                    border: '1px solid rgba(119,150,238,0.2)'
                  }}
                >
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: evt.event_type === 'exam' ? 'rgba(230,80,90,0.2)' : 'rgba(60,130,255,0.2)',
                    color: evt.event_type === 'exam' ? '#ff8a99' : '#72dcff',
                    border: evt.event_type === 'exam' ? '1px solid rgba(230,80,90,0.4)' : '1px solid rgba(60,130,255,0.4)',
                    display: 'grid',
                    placeItems: 'center'
                  }}>
                    <CalendarDays size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f4ff' }}>{evt.title}</div>
                    <small style={{ color: '#8291b5' }}>Location: {evt.location || 'Student Portal'}</small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#9bb7ff' }}>
                      {new Date(evt.start_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <small style={{ color: '#68779b' }}>{evt.event_type.toUpperCase()}</small>
                  </div>
                </div>
              ))}
            </div>
          </main>
        )}

        {/* Tab 4: Admin Ingest Tool */}
        {activeTab === 'upload' && (
          <main style={{
            background: 'rgba(15,20,40,0.7)',
            border: '1px solid rgba(120,145,215,0.16)',
            borderRadius: 14,
            padding: 28,
            overflowY: 'auto'
          }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontFamily: 'Space Grotesk' }}>Ingest & Index Official Campus Notice</h2>
              <small style={{ color: '#8895b3' }}>Uploads raw PDF/circular text, generates semantic chunks, and updates vector store</small>
            </div>

            <form onSubmit={handleAdminUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#a0aed0', marginBottom: 6 }}>
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. Akal University Circular #24: Winter Vacation & Hostels Notice"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: 'rgba(18,24,50,0.7)',
                    border: '1px solid rgba(120,150,230,0.25)',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#a0aed0', marginBottom: 6 }}>
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: 'rgba(18,24,50,0.7)',
                    border: '1px solid rgba(120,150,230,0.25)',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none'
                  }}
                >
                  <option value="circular">General Circular</option>
                  <option value="exam_notice">Examination Notice</option>
                  <option value="syllabus">Course Syllabus</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#a0aed0', marginBottom: 6 }}>
                  Notice Content (Text or PDF transcription)
                </label>
                <textarea
                  required
                  rows={6}
                  value={uploadText}
                  onChange={e => setUploadText(e.target.value)}
                  placeholder="Paste official notification text here with dates, rules, and guidelines..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: 'rgba(18,24,50,0.7)',
                    border: '1px solid rgba(120,150,230,0.25)',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                style={{
                  padding: '14px 22px',
                  borderRadius: 8,
                  background: 'linear-gradient(105deg, #3a7bff, #6749de)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: uploading ? 'not-allowed' : 'pointer'
                }}
              >
                {uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
                Ingest & Index Document
              </button>
            </form>
          </main>
        )}
      </div>
    </div>
  );
}
