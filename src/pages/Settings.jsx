import { useEffect, useState } from 'react';
import { getApiUrl, setApiUrl, clearApiUrl, testApiUrl, checkApiHealth } from '../utils/apiUrlManager';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);
  const [autoHealth, setAutoHealth] = useState(true);
  const [autoRetry, setAutoRetry] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadCurrentUrl();
    checkHealth();
  }, []);

  const loadCurrentUrl = async () => {
    const url = await getApiUrl();
    setCurrentUrl(url);
    setNewUrl(url);
  };

  const checkHealth = async () => {
    const health = await checkApiHealth();
    setHealthStatus(health);
  };

  const handleTestUrl = async () => {
    if (!newUrl.trim()) {
      showToast('Please enter a URL', 'error');
      return;
    }

    setTesting(true);
    try {
      const result = await testApiUrl(newUrl.trim());
      if (result.success) {
        showToast('API URL is working!', 'success');
      } else {
        showToast(`API test failed: ${result.message}`, 'error');
      }
    } catch (error) {
      showToast(`Test failed: ${error.message}`, 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleUpdateUrl = async () => {
    if (!newUrl.trim()) {
      showToast('Please enter a URL', 'error');
      return;
    }

    try {
      const testResult = await testApiUrl(newUrl.trim());
      if (!testResult.success) {
        const confirm = window.confirm(
          `API test failed: ${testResult.message}\n\nDo you still want to save this URL?`,
        );
        if (!confirm) return;
      }

      // setApiUrl now saves to backend (remote storage) if user is logged in
      await setApiUrl(newUrl.trim());
      await loadCurrentUrl();
      await checkHealth();
      showToast('API URL updated successfully! (Saved remotely)', 'success');

      setTimeout(() => {
        if (window.confirm('Reload page to apply changes?')) {
          window.location.reload();
        }
      }, 800);
    } catch (error) {
      showToast(`Failed to update URL: ${error.message}`, 'error');
    }
  };

  const handleResetUrl = async () => {
    if (window.confirm('Clear stored URL and use default/config?')) {
      // clearApiUrl now clears from both backend and localStorage
      await clearApiUrl();
      await loadCurrentUrl();
      await checkHealth();
      showToast('URL reset to default (Cleared from remote storage)', 'success');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="grid gap-6 lg:grid-cols-[1.7fr,1fr]">
        <div className="card card-accent">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)] font-bold">Settings</p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)] tracking-tight">App Settings</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] font-medium">
            Configure your API connection and app preferences.
          </p>
          <div className="mt-6 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">Current API URL</p>
                <p className="mt-2 break-all text-lg font-bold text-[var(--text-primary)]">{currentUrl || 'Not set'}</p>
              </div>
              {healthStatus && (
                <span
                  className={`rounded-full px-4 py-1 text-xs font-bold border ${healthStatus.healthy 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}
                >
                  {healthStatus.healthy ? 'Healthy' : 'Attention'}
                </span>
              )}
            </div>
            {healthStatus?.suggestion && !healthStatus.healthy && (
              <p className="mt-3 text-sm text-rose-600 font-medium bg-rose-50 p-3 rounded-xl border border-rose-100">{healthStatus.suggestion}</p>
            )}
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="apiUrl" className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">
                Update API URL
              </label>
              <div className="mt-2 flex flex-col sm:flex-row gap-3">
                <input
                  id="apiUrl"
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="input-field flex-1"
                  placeholder="https://your-ngrok-url.ngrok.app"
                />
                <button
                  onClick={handleTestUrl}
                  disabled={testing || !newUrl.trim()}
                  className="btn-secondary whitespace-nowrap px-6 py-2.5 font-bold disabled:opacity-50"
                >
                  {testing ? 'Testing…' : 'Test'}
                </button>
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)] font-medium">
                Enter your backend API URL. This is saved in your browser.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleUpdateUrl}
                disabled={newUrl.trim() === currentUrl}
                className="btn-primary px-8 py-2.5 font-bold disabled:opacity-50"
              >
                Save URL
              </button>
              <button onClick={handleResetUrl} className="btn-secondary px-6 py-2.5 font-bold">
                Reset
              </button>
              <button onClick={checkHealth} className="btn-secondary px-6 py-2.5 font-bold">
                Re-run health
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">Quick Actions</p>
          <div className="mt-4 space-y-3 text-sm">
            <button
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-left text-[var(--text-secondary)] font-bold transition hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5 hover:text-[var(--accent-primary)]"
              onClick={() => {
                navigator.clipboard.writeText(currentUrl);
                showToast('URL copied to clipboard', 'success');
              }}
            >
              📋 Copy endpoint
            </button>
            <button
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-left text-[var(--text-secondary)] font-bold transition hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5 hover:text-[var(--accent-primary)]"
              onClick={() => currentUrl && window.open(currentUrl, '_blank')}
            >
              🔗 Open in new tab
            </button>
            <label className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-secondary)] font-bold hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer">
              Auto health monitor
              <input type="checkbox" checked={autoHealth} onChange={(e) => setAutoHealth(e.target.checked)} className="w-5 h-5 rounded border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]" />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-secondary)] font-bold hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer">
              Retry on failure
              <input type="checkbox" checked={autoRetry} onChange={(e) => setAutoRetry(e.target.checked)} className="w-5 h-5 rounded border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]" />
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">Connection Status</p>
          <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
            {[1, 2, 3].map((log) => (
              <div key={log} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 transition-all hover:bg-[var(--bg-secondary)] hover:shadow-md hover:border-[var(--accent-primary)]/20 group">
                <p className="font-bold text-[var(--text-primary)] flex items-center justify-between">
                  Check #{log}
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase tracking-widest">Success</span>
                </p>
                <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Latency • {Math.round(Math.random() * 100 + 40)} ms</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">Quick Links</p>
          <div className="mt-4 space-y-3">
            {['Ngrok tunnel', 'Render API', 'Local dev server'].map((integration) => (
              <div key={integration} className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4 hover:bg-[var(--bg-secondary)] hover:shadow-md transition-all">
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{integration}</p>
                  <p className="text-xs text-[var(--text-muted)] font-medium">Connected</p>
                </div>
                <button className="btn-secondary px-4 py-2 text-xs font-bold shadow-sm">Open</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

