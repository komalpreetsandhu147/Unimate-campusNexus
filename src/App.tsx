import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { StudentDashboard } from '@/components/StudentDashboard';
import {
  ArrowUpRight,
  Loader2,
  Mail,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  FileText,
  GraduationCap,
  Layers3,
  Menu,
  MessageSquare,
  Network,
  Play,
  Search,
  Sparkles,
  SquareCheckBig,
  X,
  Zap,
} from 'lucide-react';

const features = [
  { icon: MessageSquare, number: '01', title: 'AI Campus Chat', description: 'Ask anything about your campus in plain language and get a clear answer in seconds.' },
  { icon: Search, number: '02', title: 'RAG Knowledge Assistant', description: 'Grounded in official PDFs, notices and syllabi with citations you can trust.' },
  { icon: SquareCheckBig, number: '03', title: 'Task & Checklist Generator', description: 'Turn a vague goal into a focused checklist with the next best action.' },
  { icon: GraduationCap, number: '04', title: 'AI Study Planner', description: 'Build a realistic study plan around your classes, deadlines and pace.' },
  { icon: CalendarDays, number: '05', title: 'Smart Reminders', description: 'Keep important dates visible with calendar-ready reminders that arrive on time.' },
  { icon: Layers3, number: '06', title: 'Student Command Dashboard', description: 'One calm home for your questions, tasks, milestones and momentum.' },
];

const workflow = [
  { label: 'ASK', title: 'Ask naturally', description: 'Questions about courses, exams, deadlines and notices.', icon: MessageSquare },
  { label: 'UNDERSTAND', title: 'Ground the answer', description: 'RAG searches trusted university sources and cites them.', icon: Network },
  { label: 'ACT', title: 'Make it happen', description: 'Tasks, plans and reminders appear ready to use.', icon: Zap },
];

function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email address.');
      setSubmitting(false);
      return;
    }
    const { error: insertError } = await supabase
      .from('waitlist_signups')
      .insert({ email: trimmed });
    setSubmitting(false);
    if (insertError) {
      if (insertError.code === '23505') {
        setSubmitted(true);
        setEmail('');
        return;
      }
      setError('Something went wrong. Please try again.');
      return;
    }
    setSubmitted(true);
    setEmail('');
  }

  if (view === 'dashboard') {
    return <StudentDashboard onBackToLanding={() => setView('landing')} />;
  }

  return (
    <main className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <nav className="nav container">
        <a className="brand" href="#top" aria-label="Campus Copilot home">
          <span className="brand-mark"><Bot size={20} strokeWidth={2.4} /></span>
          <span>Campus <strong>Copilot</strong></span>
        </a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className={`nav-links ${menuOpen ? 'is-open' : ''}`}>
          <a href="#product" onClick={() => setMenuOpen(false)}>Product</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
          <a href="#architecture" onClick={() => setMenuOpen(false)}>Architecture</a>
          <button
            className="nav-cta"
            onClick={() => {
              setMenuOpen(false);
              setView('dashboard');
            }}
            style={{
              background: 'linear-gradient(135deg, #3a7bff, #6749de)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Launch Student Pilot <ArrowUpRight size={15} />
          </button>
        </div>
      </nav>

      <section className="hero container" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> AI operating system for students</div>
          <h1>Your campus.<br /><span>Your tasks.</span><br />Your AI copilot.</h1>
          <p className="hero-lede">Turn scattered university information into instant answers and automated action.</p>
          <div className="hero-actions">
            <button
              className="button button-primary"
              onClick={() => setView('dashboard')}
              style={{ border: 'none', cursor: 'pointer' }}
            >
              Open Student Copilot <ArrowUpRight size={17} />
            </button>
            <a className="button button-ghost" href="#how-it-works"><span className="play-icon"><Play size={12} fill="currentColor" /></span> See how it works</a>
          </div>
          <div className="hero-proof"><div className="avatar-stack"><span>AK</span><span>AI</span><span>24</span></div><span>Built for the way students actually work.</span></div>
        </div>
        <div className="hero-visual">
          <div className="visual-glow" />
          <div className="command-window" onClick={() => setView('dashboard')} style={{ cursor: 'pointer' }} title="Click to interact with Campus Copilot">
            <div className="window-top"><div className="window-dots"><i /><i /><i /></div><span className="window-label"><span className="live-dot" /> copilot live (click to open)</span><span className="window-time">09:41</span></div>
            <div className="window-body">
              <div className="window-side"><div className="mini-logo"><Bot size={16} /></div><span className="side-active"><MessageSquare size={15} /></span><span><CalendarDays size={15} /></span><span><SquareCheckBig size={15} /></span><span><Bell size={15} /></span></div>
              <div className="chat-panel">
                <div className="chat-heading"><div><p className="kicker">Good morning, Harpreet</p><h3>How can I help today?</h3></div><div className="online-avatar"><Bot size={18} /></div></div>
                <div className="chat-question"><span className="question-avatar">H</span><div><small>You asked</small><p>What do I need to submit for my Data Structures project?</p></div></div>
                <div className="chat-answer"><div className="answer-head"><span className="ai-avatar"><Sparkles size={13} /></span><span>Campus Copilot</span><span className="verified"><CircleCheck size={12} /> Verified</span></div><p>Your Data Structures project is due <strong>Friday, 18 October</strong>. Submit a PDF report and your source code through the student portal.</p><div className="source-row"><span><FileText size={12} /> Course syllabus.pdf</span><span><FileText size={12} /> Notice #104</span></div></div>
                <div className="suggestions"><span>Make a checklist</span><span>Add to calendar</span><span>Find syllabus</span></div>
                <div className="chat-input"><span>Ask about your campus...</span><span className="send-button"><ArrowUpRight size={14} /></span></div>
              </div>
            </div>
          </div>
          <div className="floating-status status-top"><span className="status-icon blue"><CalendarDays size={15} /></span><div><b>Next up</b><small>DS project · 18 Oct</small></div><Check size={15} className="check" /></div>
          <div className="floating-status status-bottom"><span className="status-icon purple"><Sparkles size={15} /></span><div><b>Study plan ready</b><small>Built around your week</small></div><ChevronRight size={15} className="check" /></div>
        </div>
      </section>

      <section className="logo-strip container"><span>ONE PLACE FOR YOUR</span><div><b><BookOpen size={16} /> COURSEWORK</b><b><CalendarDays size={16} /> DEADLINES</b><b><SquareCheckBig size={16} /> NEXT STEPS</b><b><Bell size={16} /> REMINDERS</b></div></section>

      <section className="section container" id="how-it-works">
        <div className="section-heading"><div><p className="kicker">The student loop</p><h2>From question to<br /><em>momentum.</em></h2></div><p className="section-intro">Campus Copilot brings your university’s knowledge and your everyday actions into one intelligent flow.</p></div>
        <div className="workflow-grid">{workflow.map((item, index) => { const Icon = item.icon; return <div className="workflow-card" key={item.label}><div className="flow-number">0{index + 1}</div><div className="flow-icon"><Icon size={21} /></div><p className="flow-label">{item.label}</p><h3>{item.title}</h3><p>{item.description}</p>{index < workflow.length - 1 && <div className="flow-arrow"><ArrowUpRight size={18} /></div>}</div>; })}</div>
      </section>

      <section className="section feature-section container" id="product">
        <div className="section-heading"><div><p className="kicker">One copilot. Every advantage.</p><h2>Less searching.<br /><em>More doing.</em></h2></div><p className="section-intro">Designed for the messy middle of student life — where context switches, deadlines and “where did I save that?” usually live.</p></div>
        <div className="feature-grid">{features.map((feature) => { const Icon = feature.icon; return <article className="feature-card" key={feature.number}><div className="feature-top"><span className="feature-icon"><Icon size={19} /></span><span>{feature.number}</span></div><h3>{feature.title}</h3><p>{feature.description}</p><a href="#get-started" aria-label={`Learn more about ${feature.title}`}><ArrowUpRight size={17} /></a></article>; })}</div>
      </section>

      <section className="architecture section" id="architecture"><div className="container architecture-inner"><div className="architecture-copy"><p className="kicker">The intelligence layer</p><h2>Grounded in your<br /><em>real campus.</em></h2><p>Not generic chatbot answers. Campus Copilot connects the official information your university already has with the actions you need to take next.</p><div className="trust-list"><span><CircleCheck size={16} /> Official university sources</span><span><CircleCheck size={16} /> Answers with citations</span><span><CircleCheck size={16} /> Actions that stay in sync</span></div></div><div className="architecture-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="core"><Bot size={30} /><span>AI / RAG</span></div><div className="node node-doc"><FileText size={16} /><span>notices</span></div><div className="node node-answer"><CircleCheck size={16} /><span>verified answer</span></div><div className="node node-task"><SquareCheckBig size={16} /><span>task</span></div><div className="node node-calendar"><CalendarDays size={16} /><span>calendar</span></div><div className="orbit-label label-top">YOUR CAMPUS KNOWLEDGE</div></div></div></section>

      <section className="university container"><div className="university-image"><img src="/assets/images/akal_university_camous.jpeg" alt="Akal University campus" /></div><div className="university-copy"><p className="kicker">Built where you are</p><h2>Your university.<br /><em>Your AI assistant.</em></h2><p>From the academic block to the next deadline, your campus context is the starting point for everything Campus Copilot does.</p><div className="location"><span><span className="location-pulse" /> Akal University</span><small>Talwandi Sabo · Punjab</small></div><a className="text-link" href="#get-started">See the campus experience <ArrowUpRight size={16} /></a></div></section>

      <section className="cta-section container" id="get-started"><div className="cta-orb orb-left" /><div className="cta-orb orb-right" /><p className="kicker">Your unfair advantage</p><h2>Stop searching.<br /><em>Start acting.</em></h2><p>One question can change the shape of your whole day.</p><a className="button button-primary" href="#top">Experience Campus Copilot <ArrowUpRight size={17} /></a></section>

      <section className="signup-section container" id="early-access">
        <div className="signup-orb orb-left" />
        <div className="signup-orb orb-right" />
        <div className="signup-badge"><Mail size={13} /> Early access</div>
        <h2>Ready to make<br /><em>campus life smarter?</em></h2>
        <p>Join Campus Copilot and stay ahead of your deadlines, tasks and studies.</p>
        {submitted ? (
          <div className="signup-success"><span className="success-icon"><CircleCheck size={18} /></span><div><b>You’re on the list!</b><small>We’ll be in touch soon.</small></div></div>
        ) : (
          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="signup-input-wrap">
              <Mail size={16} className="input-icon" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" required disabled={submitting} />
            </div>
            <button type="submit" className="button button-primary" disabled={submitting}>{submitting ? <Loader2 size={16} className="spin" /> : <>Get Early Access <ArrowUpRight size={16} /></>}</button>
          </form>
        )}
        {error && <p className="signup-error">{error}</p>}
        <span className="signup-foot">No spam. Just early access and updates.</span>
      </section>

      <footer className="footer container"><a className="brand" href="#top"><span className="brand-mark"><Bot size={19} /></span><span>Campus <strong>Copilot</strong></span></a><span className="footer-flow">ASK <i /> UNDERSTAND <i /> ACT</span><span className="footer-note">© 2024 Campus Copilot. Built for students.</span></footer>
    </main>
  );
}

export default App;
