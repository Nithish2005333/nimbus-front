const STORAGE_KEY = 'session_analytics_data';

export const AnalyticsService = {
  // Log a new upload metric
  logUploadMetric: (metric) => {
    try {
      const existingData = AnalyticsService.getUploadMetrics();
      const newEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        status: 'success', // Default to success if not specified
        ...metric, 
      };
      
      // Keep only last 50 entries to avoid localStorage bloat
      const updatedData = [newEntry, ...existingData].slice(0, 50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      return newEntry;
    } catch (error) {
      console.error('Failed to log analytics:', error);
    }
  },

  // Log a failed upload
  logError: (metric) => {
    AnalyticsService.logUploadMetric({
        ...metric,
        status: 'failed',
        speed: 0,
        uploadTime: 0,
        encryptionTime: 0
    });
  },

  // Get all metrics
  getUploadMetrics: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get analytics:', error);
      return [];
    }
  },

  // Clear metrics
  clearMetrics: () => {
    localStorage.removeItem(STORAGE_KEY);
  },
  
  // Calculate statistics
  getStats: () => {
    const metrics = AnalyticsService.getUploadMetrics();
    if (metrics.length === 0) return null;

    const successfulUploads = metrics.filter(m => m.status === 'success');
    const totalSize = successfulUploads.reduce((acc, curr) => acc + (curr.size || 0), 0);
    const avgSpeed = successfulUploads.length > 0 
        ? successfulUploads.reduce((acc, curr) => acc + (curr.speed || 0), 0) / successfulUploads.length
        : 0;
    const avgEncryptionTime = successfulUploads.length > 0
        ? successfulUploads.reduce((acc, curr) => acc + (curr.encryptionTime || 0), 0) / successfulUploads.length
        : 0;

    return {
      totalUploads: successfulUploads.length,
      totalAttempts: metrics.length,
      totalSize: (totalSize / (1024 * 1024)).toFixed(2) + ' MB',
      avgSpeed: avgSpeed.toFixed(2) + ' MB/s',
      avgEncryptionTime: avgEncryptionTime.toFixed(0) + ' ms'
    };
  },

  // Get comparative benchmarks (Simulated vs Real)
  getBenchmarks: () => {
    const metrics = AnalyticsService.getUploadMetrics().filter(m => m.status === 'success');
    if (metrics.length === 0) return null;

    const avgSpeed = metrics.reduce((acc, curr) => acc + curr.speed, 0) / metrics.length;
    
    // Dynamic Benchmark: Use device's estimated uplink speed if available
    // Standard providers typically utilize ~80% of available single-stream bandwidth
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    let standardSpeed = 2.5; // Fallback industry average (MB/s)

    if (connection && connection.uplink) {
        // connection.uplink is in Mbps. Convert to MB/s ( / 8 )
        standardSpeed = connection.uplink / 8;
    } else if (connection && connection.downlink) {
        // Estimate uplink as 1/4 of downlink if uplink not specified
        standardSpeed = (connection.downlink / 8) / 4; 
    } 

    return [
      {
        name: 'Nimbus Cloud',
        speed: parseFloat(avgSpeed.toFixed(2)),
        security: 100, // Zero-Knowledge + Client-Side
        privacy: 100, // No metadata access
        color: '#22d3ee'
      },
      {
        name: 'Google Drive',
        speed: standardSpeed,
        security: 85, // Server-side Encryption (Managed Keys)
        privacy: 40, // Metadata & Content Scanning
        color: '#fbbf24' // Google Yellow/Orange
      }
    ];
  },

  // Get Real Accuracy/Integrity Rating
  getIntegrityStats: () => {
    const metrics = AnalyticsService.getUploadMetrics();
    if (metrics.length === 0) return null;
    
    const total = metrics.length;
    const initialfail = metrics.filter(m => m.status === 'failed').length;
    const success = metrics.filter(m => m.status === 'success').length;

    // Reliability Score: Success Rate
    const reliability = total > 0 ? (success / total) * 100 : 100;

    // Network Stability: Variance in speed (lower is better)
    const successMetrics = metrics.filter(m => m.status === 'success');
    let stabilityScore = 100;
    if (successMetrics.length > 1) {
        const avgSpeed = successMetrics.reduce((acc, curr) => acc + curr.speed, 0) / successMetrics.length;
        const variance = successMetrics.reduce((acc, curr) => acc + Math.pow(curr.speed - avgSpeed, 2), 0) / successMetrics.length;
        const stdDev = Math.sqrt(variance);
        // Coefficient of variation. If stdDev is 50% of avgSpeed, score drops.
        const cv = avgSpeed > 0 ? stdDev / avgSpeed : 0;
        stabilityScore = Math.max(0, 100 - (cv * 100)); 
    }

    return {
      integrityScore: reliability.toFixed(1),
      networkStability: stabilityScore.toFixed(1),
      filesVerified: success,
      failedAttempts: initialfail,
    };
  },
  // Reset current session analysis
  resetSession: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
