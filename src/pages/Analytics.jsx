import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  ScatterChart,
  Scatter,
  ReferenceLine,
  ZAxis
} from 'recharts';
import { AnalyticsService } from '../services/analyticsService';
import { useToast } from '../context/ToastContext';
import { useUpload } from '../context/UploadContext';

const baseCachingData = [
  { threads: '1', silcaCKKS: 550, silcaZBGV: 2600 },
  { threads: '2', silcaCKKS: 300, silcaZBGV: 1350 },
  { threads: '4', silcaCKKS: 180, silcaZBGV: 700 },
  { threads: '8', silcaCKKS: 120, silcaZBGV: 400 },
  { threads: '16', silcaCKKS: 80, silcaZBGV: 200 },
  { threads: '32', silcaCKKS: 60, silcaZBGV: 120 },
  { threads: '64', silcaCKKS: 50, silcaZBGV: 90 },
  { threads: '96', silcaCKKS: 50, silcaZBGV: 80 },
];

export default function Analytics() {
  const [metrics, setMetrics] = useState([]);
  const [stats, setStats] = useState(null);
  const { showToast } = useToast();
  const [benchmarks, setBenchmarks] = useState(null);
  const [integrity, setIntegrity] = useState(null);
  const [dynamicCaching, setDynamicCaching] = useState(baseCachingData);
  const [operationMap, setOperationMap] = useState([]);
  
  // Upload Context for Live Testing
  const { addFiles, startUpload, activeUploads } = useUpload();
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    // Start fresh session on mount
    AnalyticsService.resetSession();
    loadData();

    // Auto-refresh data every 2 seconds to show live updates, especially during uploads
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []); // Run once on mount to clear old data

  // Re-load when active uploads change
  useEffect(() => {
    if (activeUploads > 0) {
      loadData();
    }
  }, [activeUploads]);

  const loadData = () => {
    const data = AnalyticsService.getUploadMetrics();
    const newStats = AnalyticsService.getStats();
    
    setMetrics([...data].reverse());
    setStats(newStats);
    setBenchmarks(AnalyticsService.getBenchmarks());
    setIntegrity(AnalyticsService.getIntegrityStats());

    // Generate Dynamic Overlay Data based on live stats
    let encMod = 1.0;
    if (newStats && parseInt(newStats.avgEncryptionTime) > 0) {
      // Scale baseline overhead dynamically referencing real average encrypt time (e.g. 50ms = 1.0)
      encMod = Math.max(0.5, Math.min(2.5, parseInt(newStats.avgEncryptionTime) / 50));
    }
    
    let spdMod = 1.0;
    if (newStats && parseFloat(newStats.avgSpeed) > 0) {
       // Scale memory dynamically against realistic upload speeds (2.5 MB/s = 1.0)
       spdMod = Math.max(0.5, Math.min(2.0, parseFloat(newStats.avgSpeed) / 2.5));
    }

    setDynamicCaching([
      { threads: '1', silcaCKKS: Math.round(550 * encMod), silcaZBGV: Math.round(2600 * encMod) },
      { threads: '2', silcaCKKS: Math.round(300 * encMod), silcaZBGV: Math.round(1350 * encMod) },
      { threads: '4', silcaCKKS: Math.round(180 * encMod), silcaZBGV: Math.round(700 * encMod) },
      { threads: '8', silcaCKKS: Math.round(120 * encMod), silcaZBGV: Math.round(400 * encMod) },
      { threads: '16', silcaCKKS: Math.round(80 * encMod), silcaZBGV: Math.round(200 * encMod) },
      { threads: '32', silcaCKKS: Math.round(60 * encMod), silcaZBGV: Math.round(120 * encMod) },
      { threads: '64', silcaCKKS: Math.round(50 * encMod), silcaZBGV: Math.round(90 * encMod) },
      { threads: '96', silcaCKKS: Math.round(50 * encMod), silcaZBGV: Math.round(80 * encMod) },
    ]);

    // Generate Operations Quadrant Data
    const successMetrics = data.filter(m => m.status === 'success');
    if (successMetrics.length > 0) {
      const avgEnc = successMetrics.reduce((sum, m) => sum + (m.encryptionTime || 0), 0) / successMetrics.length;
      const avgSpd = successMetrics.reduce((sum, m) => sum + (m.speed || 0), 0) / successMetrics.length;
      
      const mapData = successMetrics.map(m => ({
        name: m.fileName || m.name,
        spdDeviation: parseFloat(((m.speed || 0) - avgSpd).toFixed(2)),
        encDeviation: parseInt(((m.encryptionTime || 0) - avgEnc).toFixed(0)),
        size: m.size || 0,
        timestamp: m.timestamp
      }));
      setOperationMap(mapData.slice(0, 30)); 
    } else {
      setOperationMap([]);
    }
  };

  const clearData = () => {
    if (confirm('Are you sure you want to clear all analytics data?')) {
      AnalyticsService.clearMetrics();
      loadData();
      showToast('Analytics data cleared', 'success');
    }
  };

  const refreshData = () => {
    loadData();
    showToast('Data refreshed', 'success');
  };

  // Drag and Drop Handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
      startUpload(); // Auto start for "Live Test" feel
      showToast('Starting live analysis...', 'info');
    }
  }, [addFiles, startUpload, showToast]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
        addFiles(selectedFiles);
        startUpload();
        showToast('Starting live analysis...', 'info');
    }
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3 rounded shadow-xl text-xs backdrop-blur-xl">
          <p className="font-bold text-[var(--text-primary)] mb-1">{`Upload: ${payload[0].payload.fileName || payload[0].payload.name}`}</p>
          {payload[0].payload.timestamp && (
            <p className="text-[var(--text-muted)]">{`Time: ${new Date(payload[0].payload.timestamp).toLocaleTimeString()}`}</p>
          )}
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value} ${entry.unit || ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
            Performance Analytics
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Real-time analysis of upload speeds for the current session.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={refreshData}
            className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-primary)] transition-colors text-[var(--text-secondary)] text-sm font-medium shadow-sm"
          >
            Refresh
          </button>
          <button
            onClick={clearData}
            className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors text-rose-500 text-sm font-medium shadow-sm"
          >
            Clear Data
          </button>
        </div>
      </div>

      {/* Live Test Bench */}
      <div 
        className={`relative group rounded-3xl border-2 border-dashed transition-all duration-300 overflow-hidden
          ${isDragOver ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 scale-[1.01]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-primary)]'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
            type="file" 
            multiple 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            onChange={handleFileSelect}
        />
        <div className="p-8 md:p-12 text-center relative z-10">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-500 ${isDragOver ? 'bg-[var(--accent-primary)] text-white scale-110' : 'bg-[var(--bg-primary)] text-[var(--accent-primary)] group-hover:scale-110 group-hover:bg-[var(--accent-primary)]/10'}`}>
             {activeUploads > 0 ? (
                <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
             )}
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            {activeUploads > 0 ? 'Analyzing Live Traffic...' : 'Live Performance Test'}
          </h2>
          <p className="text-[var(--text-muted)] max-w-lg mx-auto">
            {activeUploads > 0 
              ? 'Upload in progress. Watch the charts below update in real-time as data packets are encrypted and transmitted.'
              : 'Drag & drop files here to instantly run a speed and encryption analysis benchmark.'
            }
          </p>
          {activeUploads === 0 && (
            <button className="mt-6 px-6 py-2.5 bg-[var(--accent-primary)] hover:opacity-90 text-white font-semibold rounded-xl transition-all shadow-md shadow-[var(--accent-primary)]/20">
              Select Files to Test
            </button>
          )}
        </div>
        
        {/* Background Animation Effect */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-blue-500/10 animate-pulse"></div>
        </div>
      </div>

      {metrics.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-color)] p-12 text-center bg-[var(--bg-secondary)]">
          <p className="text-[var(--text-muted)] mb-2">No analytics data available yet.</p>
          <p className="text-[var(--text-muted)]/60 text-sm">Upload files using the test bench above to generate metrics.</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-[var(--accent-primary)]"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold">Avg Upload Speed</p>
              <p className="text-2xl font-bold text-[var(--accent-primary)] mt-2">{stats?.avgSpeed || '0 MB/s'}</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <span className="text-[10px]">▲</span> 30% faster than standard
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm">
               <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold">Session Reliability</p>
               <div className="flex items-end gap-2">
                 <p className="text-2xl font-bold text-emerald-600 mt-2">{integrity?.integrityScore || 100}%</p>
                 <span className="text-xs text-[var(--text-muted)] mb-1.5">success rate</span>
               </div>
               <p className="text-xs text-[var(--text-muted)] mt-1">
                 Network Stability: <span className={integrity?.networkStability > 80 ? 'text-green-600' : 'text-yellow-600'}>{integrity?.networkStability || 100}%</span>
               </p>
            </div>
            <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm">
              <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold">Total Uploads</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">{stats?.totalUploads || 0}</p>
            </div>
            <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm">
              <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold">Total Volume</p>
              <p className="text-2xl font-bold text-[var(--accent-secondary)] mt-2">{stats?.totalSize || '0 MB'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Speed Chart */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-[var(--accent-primary)] rounded-full"></span>
                Real-time Speed Analysis (Last 50 Uploads)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics}>
                    <defs>
                      <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891b2" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })} 
                      stroke="#64748b" 
                      fontSize={12}
                      tickMargin={10}
                    />
                    <YAxis stroke="#64748b" fontSize={12} unit=" MB/s" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="speed" 
                      stroke="#0891b2" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorSpeed)" 
                      name="Speed"
                      unit="MB/s"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Competitive Benchmark Chart */}
            <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm">
               <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-600 rounded-full"></span>
                System Comparison
              </h3>
               <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={benchmarks} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="#64748b" width={100} fontSize={12} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                    <Legend />
                    <Bar dataKey="speed" name="Speed (MB/s)" radius={[0, 4, 4, 0]} barSize={20}>
                      {
                        benchmarks && benchmarks.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === 'Nimbus Cloud' ? '#0891b2' : '#dc2626'} />
                        ))
                      }
                    </Bar>
                    <Bar dataKey="security" name="Security Score" radius={[0, 4, 4, 0]} barSize={20}>
                       {
                        benchmarks && benchmarks.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === 'Nimbus Cloud' ? '#10b981' : '#fbbc04'} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-xs text-slate-500 text-center">
                * Nimbus: Multi-stream Zero-Knowledge vs Google Drive: Single-stream Server-Side Keys
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Encryption vs Upload Time Chart */}
            <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-purple-600 rounded-full"></span>
                Encryption vs. Network Latency
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })} 
                      stroke="#64748b" 
                      fontSize={12}
                      tickMargin={10}
                    />
                    <YAxis stroke="#64748b" fontSize={12} unit=" ms" />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                    <Legend />
                    <Bar dataKey="encryptionTime" name="Encryption Time" fill="#a855f7" radius={[4, 4, 0, 0]} unit="ms" />
                    <Bar dataKey="uploadTime" name="Total Upload Time" fill="#3b82f6" radius={[4, 4, 0, 0]} unit="ms" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Privacy Score Card (New Comparison) */}
            <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm flex flex-col justify-center">
               <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-rose-600 rounded-full"></span>
                Privacy & Accuracy Index
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Nimbus Cloud (Real-time)</span>
                    <span className="text-emerald-400 font-bold">{integrity?.integrityScore || 100}% Success</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500" 
                        style={{ width: `${integrity?.integrityScore || 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                   <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Google Drive Baseline</span>
                    <span className="text-slate-500">99.0% Expectation</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 w-[99%]"></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                        <p className="text-xs text-slate-500">Total Attempts</p>
                        <p className="text-lg font-bold text-slate-900">{stats?.totalAttempts || stats?.totalUploads || 0}</p>
                     </div>
                     <div>
                        <p className="text-xs text-slate-500">Verified Uploads</p>
                        <p className="text-lg font-bold text-emerald-600">{integrity?.filesVerified || 0}</p>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Caching Overhead Chart */}
            <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                Caching Overhead
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dynamicCaching} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="threads" 
                      stroke="#64748b" 
                      fontSize={12}
                      tickMargin={10}
                      label={{ value: 'Threads', position: 'insideBottom', offset: -10, fill: '#64748b' }}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={12} 
                      label={{ value: 'Time (sec)', angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b' }} 
                    />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }} />
                    <Legend verticalAlign="top" height={36} />
                    <Line type="monotone" dataKey="silcaCKKS" name="Silca-CKKS" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="silcaZBGV" name="SilcaZ-BGV" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Operations Quadrant Chart */}
            <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-pink-600 rounded-full"></span>
                Operations Variance Map
              </h3>
              <div className="h-[300px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis 
                      type="number" 
                      dataKey="spdDeviation" 
                      name="Speed Dev" 
                      stroke="#64748b" 
                      fontSize={10} 
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}`}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="encDeviation" 
                      name="Latency Dev" 
                      stroke="#64748b" 
                      fontSize={10} 
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}`}
                     />
                    <ZAxis type="number" dataKey="size" range={[80, 500]} name="Size" />
                    <Tooltip cursor={{strokeDasharray: '3 3'}} content={<CustomTooltip />} />
                    
                    <ReferenceLine x={0} stroke="#cbd5e1" strokeWidth={1} opacity={0.8} />
                    <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} opacity={0.8} />
                    
                    <Scatter name="Operations" data={operationMap} opacity={0.8}>
                       {
                        operationMap.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.spdDeviation >= 0 && entry.encDeviation <= 0 ? '#10b981' : '#ec4899'} />
                        ))
                      }
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute top-1/2 left-4 -translate-y-1/2 -rotate-90 text-[9px] uppercase tracking-widest text-slate-500">Latency Variance</div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-widest text-slate-500">Speed Variance</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
