import { useState, useRef, useEffect } from 'react';
import { filesAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatFileSize } from '../utils/fileUtils';
import { generateAIResponse } from '../utils/aiLogic';

/**
 * AI Assistant Page - Rule-Based Intelligence System
 */

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your AI assistant. I can help you find files, organize storage, analyze file types, detect duplicates, provide security recommendations, check backup status, suggest optimizations, and much more. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const data = await filesAPI.getFiles();
      const fileList = data.files || [];
      setFiles(fileList);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const response = generateAIResponse(userMessage, files);
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
      setLoading(false);
    }, 600);
  };

  const quickActions = [
    { label: 'Find files', query: 'Find all my documents' },
    { label: 'Storage stats', query: 'Show statistics' },
    { label: 'Organize', query: 'Help organize files' },
    { label: 'Large files', query: 'Show largest files' },
    { label: 'Recommendations', query: 'Give recommendations' },
  ];

  const handleQuickAction = (query) => {
    setInput(query);
    setTimeout(() => {
      setLoading(true);
      setMessages((prev) => [...prev, { role: 'user', content: query }]); // Add user message
      setTimeout(() => {
        const response = generateAIResponse(query, files);
        setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
        setLoading(false);
      }, 600);
      setInput('');
    }, 100);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 backdrop-blur-xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8 text-[var(--accent-primary)]" strokeWidth={2}>
              <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2z" opacity="0.3" />
              <path d="M12 8v8M8 12h8M15 15l3 3M9 9L6 6m9 0l3-3M9 15l-3 3" strokeLinecap="round" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)]">AI Assistant</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Ask me anything about your files and storage</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden p-0 backdrop-blur-xl shadow-sm">
        <div className="flex h-[600px] flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-black/10'
                    : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)]'
                    }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-[var(--bg-primary)] px-4 py-3 border border-[var(--border-color)]">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent-primary)]" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent-primary)]" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent-primary)]" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[var(--border-color)] p-4 bg-[var(--bg-primary)]/50">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.query)}
                  disabled={loading}
                  className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/30 transition-all disabled:opacity-50 shadow-sm"
                >
                  {action.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask me anything about your files..."
                disabled={loading}
                className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/10 disabled:opacity-50 shadow-sm transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-black/10"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 backdrop-blur-xl shadow-sm">
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">Total Files</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{files.length}</p>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 backdrop-blur-xl shadow-sm">
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">Storage Used</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            {formatFileSize(files.reduce((sum, file) => sum + (file.size || 0), 0))}
          </p>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 backdrop-blur-xl shadow-sm">
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">AI Ready</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-500">✓</p>
        </div>
      </div>
    </div>
  );
}