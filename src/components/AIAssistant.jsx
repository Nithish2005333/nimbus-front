import { useState, useRef, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { generateAIResponse } from '../utils/aiLogic';

export default function AIAssistant({ files = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your Nimbus AI. I've analyzed your cloud storage and I'm ready to help you manage your files more effectively.\n\nYou can ask me to:\n• Find specific files\n• Analyze storage usage\n• Detect duplicates\n• Secure your data\n• Clean up temporary files",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { showToast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // Simulate AI processing
    setTimeout(() => {
      const response = generateAIResponse(userMessage, files);
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
      setLoading(false);
    }, 800);
  };

  const quickActions = [
    { label: 'Status', query: 'Storage usage', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { label: 'Duplicates', query: 'Find duplicates', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg> },
    { label: 'Security', query: 'Security check', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
    { label: 'Categories', query: 'Show categories', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-700 text-white shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-white/20 transition-all hover:scale-110 hover:rotate-6 active:scale-95 group"
      >
        <div className="absolute inset-0 rounded-full bg-cyan-400 opacity-0 group-hover:opacity-20 animate-ping" />
        <div className="absolute inset-0 rounded-full bg-cyan-400 opacity-0 group-hover:opacity-20 animate-ping" />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-8 w-8 relative z-10 text-white" strokeWidth={1.5}>
          <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2z" opacity="0.2" />
          <path d="M12 8v8M8 12h8" strokeLinecap="round" />
          <path d="M15 15l3 3M9 9L6 6m9 0l3-3M9 15l-3 3" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.3" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] max-w-md max-h-[85vh] flex flex-col rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/90 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] lg:bottom-8 lg:right-8 animate-in slide-in-from-bottom-5 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] p-5 rounded-t-3xl bg-gradient-to-r from-[var(--bg-primary)] to-transparent shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-black/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-white" strokeWidth={2}>
              <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2z" opacity="0.3" />
              <path d="M12 8v8M8 12h8M15 15l3 3M9 9L6 6m9 0l3-3M9 15l-3 3" strokeLinecap="round" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h3 className="font-black text-[var(--text-primary)] tracking-tight uppercase text-sm">Nimbus AI</h3>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Live Assistant</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition-all active:scale-90"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-[var(--border-color)] scrollbar-track-transparent min-h-0">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`max-w-[85%] rounded-[24px] px-5 py-3.5 shadow-sm ${msg.role === 'user'
                ? 'bg-[var(--accent-primary)] text-white rounded-br-none font-bold'
                : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-bl-none leading-relaxed'
                }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-[var(--bg-primary)] px-4 py-3 border border-[var(--border-color)] rounded-bl-none">
              <div className="flex gap-1.5">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent-primary)] [animation-delay:-0.3s]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent-primary)] [animation-delay:-0.15s]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent-primary)]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer / Input */}
      <div className="p-5 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/50 rounded-b-3xl shrink-0">
        <div className="mb-4 flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                const query = action.query;
                setLoading(true);
                setMessages((prev) => [...prev, { role: 'user', content: query }]);
                setTimeout(() => {
                  const response = generateAIResponse(query, files);
                  setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
                  setLoading(false);
                }, 800);
              }}
              className="rounded-xl bg-[var(--bg-secondary)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-all border border-[var(--border-color)] active:scale-95 flex items-center gap-2 shadow-sm"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>

        <div className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            className="w-full rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-5 py-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)]/50 focus:outline-none focus:ring-4 focus:ring-[var(--accent-primary)]/5 transition-all shadow-sm"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-2 bottom-2 rounded-[14px] bg-gradient-to-r from-cyan-600 to-blue-600 px-4 text-white hover:shadow-lg hover:shadow-black/20 disabled:opacity-30 disabled:grayscale transition-all active:scale-90"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
