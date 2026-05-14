import { getApiUrl } from '../utils/getApiUrl';
import { safeJsonParse, isHtmlResponse } from '../utils/apiHelpers';
import { generateSalt, deriveKeyFromPassword, encryptChunkWithIV, getUserEncryptionKey } from '../utils/encryption';
import { AnalyticsService } from './analyticsService';

// Get token from localStorage
export function getToken() {
  return localStorage.getItem('token');
}

// Set token in localStorage
export function setToken(token) {
  localStorage.setItem('token', token);
}

// Remove token from localStorage
export function removeToken() {
  localStorage.removeItem('token');
  const path = window.location.pathname;
  if (path !== '/login' && path !== '/register' && path !== '/admin' && path !== '/admin-login') {
    window.location.href = '/login';
  }
}

// Check if token exists
export function hasToken() {
  return !!getToken();
}

// Make authenticated API request
async function apiRequest(endpoint, options = {}) {
  const apiUrl = await getApiUrl();
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...options.headers,
  };

  if (token) {
    headers['auth-token'] = token;
  }

  const method = options.method || 'GET';
  const fullUrl = `${apiUrl}${endpoint}`;
  console.log(`🌐 API Call: ${method} ${fullUrl}`);

  let response;
  try {
    response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkError) {
    console.error(`❌ Network error for ${method} ${fullUrl}:`, networkError);
    throw new Error(`Network error: Cannot connect to ${apiUrl}${endpoint}. Check backend status.`);
  }

  if (response.status === 401) {
    removeToken();
    throw new Error('Unauthorized - Token expired or invalid');
  }

  const data = await safeJsonParse(response);

  if (!response.ok) {
    throw new Error(data.msg || data.message || 'Request failed');
  }

  return data;
}

// Auth API
export const authAPI = {
  async login(email, password) {
    const apiUrl = await getApiUrl();
    let response;
    try {
      response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ email, password }),
      });
    } catch (err) {
      throw new Error(`Connection failed: ${apiUrl}/auth/login`);
    }

    const data = await safeJsonParse(response);
    if (!response.ok) throw new Error(data.msg || 'Login failed');

    if (data.token) {
      setToken(data.token);
      if (data.user?.name) localStorage.setItem('userName', data.user.name);
      if (data.user?.email) localStorage.setItem('userEmail', data.user.email);
      if (data.user?.role) localStorage.setItem('userRole', data.user.role);
      if (data.user?._id) localStorage.setItem('userId', data.user._id);
    }
    return data;
  },

  async register(userData) {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(userData),
    });
    const data = await safeJsonParse(response);
    if (!response.ok) throw new Error(data.msg || 'Registration failed');
    return data;
  },
  // --- WebAuthn / Fingerprint ---
  async getFingerprints() {
    const data = await apiRequest('/auth/fingerprints');
    return data;
  },

  async getRegistrationChallenge() {
    const data = await apiRequest('/auth/register-challenge', { method: 'POST' });
    return data;
  },

  async verifyRegistration(response) {
    const data = await apiRequest('/auth/register-verify', {
      method: 'POST',
      body: JSON.stringify(response)
    });
    return data;
  },

  async getLoginChallenge(email) {
    // This endpoint is public (no token needed yet), so we use fetch directly or apiRequest if it handles no-token
    // But apiRequest adds token if present. Login challenge is usually pre-auth.
    // Our backend route /auth/login-challenge is public.
    const apiUrl = await getApiUrl();
    const res = await fetch(`${apiUrl}/auth/login-challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ email })
    });
    const data = await safeJsonParse(res);
    if (!res.ok) throw new Error(data.msg || 'Login challenge failed');
    return data;
  },

  async verifyLogin(email, response) {
    const apiUrl = await getApiUrl();
    const res = await fetch(`${apiUrl}/auth/login-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ email, ...response })
    });
    const data = await safeJsonParse(res);
    if (!res.ok) throw new Error(data.msg || 'Login verification failed');

    // Auto-save session if success
    if (data.token) {
      setToken(data.token);
      if (data.user?.name) localStorage.setItem('userName', data.user.name);
    }
    return data;
  },

  async deleteFingerprint(id) {
    const data = await apiRequest(`/auth/fingerprints/${id}`, { method: 'DELETE' });
    return data;
  }
};

// User API
export const userAPI = {
  getProfile: () => apiRequest('/user/profile'),
  updateProfile(data) { return apiRequest('/user/profile', { method: 'PUT', body: JSON.stringify(data) }); },
  searchUsers(query) { return apiRequest(`/user/search?q=${encodeURIComponent(query)}`); },
};

// Groups API
export const groupsAPI = {
  createGroup: (name, emails) => apiRequest('/groups', { method: 'POST', body: JSON.stringify({ name, emails }) }),
  getGroups: () => apiRequest('/groups'),
  shareWithGroup: (fileId, groupId) => apiRequest(`/groups/share-file/${fileId}`, { method: 'POST', body: JSON.stringify({ groupId }) }),
};

// Files API
export const filesAPI = {
  async getFiles() {
    return apiRequest('/files/list');
  },

  async uploadFile(file, onProgress, options = {}) {
    const apiUrl = await getApiUrl();
    const token = getToken();

    // ANALYTICS TRACING
    const uploadStartTime = Date.now();
    let encryptionStartTime = Date.now();
    let encryptionDuration = 0;

    // ENCRYPT FILE (Zero-Knowledge)
    let encryptedFileData;
    const ULTRA_SPEED_THRESHOLD = 20 * 1024 * 1024;

    // For large files, skip full encryption here to enable streaming encryption
    if (file.size > ULTRA_SPEED_THRESHOLD) {
      // Get real user key
      const userMasterKey = await getUserEncryptionKey();

      encryptedFileData = {
        encryptedFile: file, // Pass RAW file
        isRaw: true,
        originalName: file.name,
        originalSize: file.size,
        password: userMasterKey // Use REAL user key
      };
    } else {
      const encryptionService = await import('./encryptionService');
      if (onProgress) onProgress(5);

      encryptionStartTime = Date.now(); // Start timing encryption
      encryptedFileData = await encryptionService.encryptFileForUpload(file);
      encryptionDuration = Date.now() - encryptionStartTime; // End timing encryption

      if (onProgress) onProgress(10);
    }

    // SYNC CHECK
    try {
      const syncService = await import('./syncService');
      if (await syncService.shouldSyncToRemote()) {
        return syncService.syncFileToServer(encryptedFileData, (p) => {
          if (onProgress) onProgress(10 + (p * 0.9));
        });
      }
    } catch (sErr) { }

    // ULTRA SPEED CHECK (> 20MB)
    // Check original file size if we have it, or current blob size
    const sizeToCheck = file.originalSize || file.size;

    if (sizeToCheck > ULTRA_SPEED_THRESHOLD) {
      // For ultra speed, we prefer the RAW file if available to do streaming encryption
      // If we already have encryptedFileData from above, it's likely a blob.
      // But we want to avoid the initial full-file encryption for large files.
      // SO: We need to change the logic above to NOT encrypt if it's large.

      // Let's modify the previous block (lines 130-145) to skip full encryption for large files
      // BUT, since we have limited editing context, we will accept the passed data. 
      // If the caller (you) updated the code to skip, good. 
      // Actually, we need to handle "Raw File + On-The-Fly Encryption" mode here.

      // If we are passed a raw file (not encrypted yet), use on-the-fly
      // How do we know? We can check if `encryptedFileData` has `key` or if we pass a flag.
      // Let's assume for now we use the existing encrypted blob if it exists, OR...

      // Wait, the visual request was "it take too much time to start".
      // This is because line 134 `await encryptionService.encryptFileForUpload(file)` runs BEFORE this check.
      // We must move this check UP or modify logic to NOT encrypy full file first.

      // Since I can only edit this block, I will implement the streaming logic here, but 
      // I also need to make sure the INITIAL encryption (lines 129-145) didn't run or returns fast.
      // I will refactor `uploadFile` in a separate tool call to skip initial encryption.

      return performUltraSpeedUpload(encryptedFileData, onProgress, options, apiUrl, token, { encryptionDuration, uploadStartTime, groupId: options.groupId });
    }

    // NORMAL UPLOAD
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', encryptedFileData.encryptedFile);
      if (encryptedFileData.salt) {
        formData.append('encryptionSalt', encryptedFileData.salt);
        formData.append('encryptionIV', encryptedFileData.iv);
        formData.append('originalFileName', encryptedFileData.originalName);
      }
      if (options.folderId) formData.append('folderId', options.folderId);
      if (options.groupId) formData.append('groupId', options.groupId);

      // Handle Cancellation
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload cancelled'));
        });
      }

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const uploadProgress = (e.loaded / e.total) * 100;
          onProgress(10 + (uploadProgress * 0.9), { loaded: e.loaded, total: e.total });
        }
      });

      xhr.onload = () => {
        if (xhr.status === 401) { removeToken(); reject(new Error('Unauthorized')); return; }
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            // Log Analytics
            const totalDuration = Date.now() - uploadStartTime;
            const fileSizeMB = file.size / (1024 * 1024);
            const speedMBps = fileSizeMB / (totalDuration / 1000);

            AnalyticsService.logUploadMetric({
              fileName: file.name,
              size: file.size,
              uploadTime: totalDuration,
              encryptionTime: encryptionDuration,
              speed: parseFloat(speedMBps.toFixed(2))
            });

            resolve(data);
          } else {
            AnalyticsService.logError({
              fileName: file.name,
              size: file.size,
              error: data.msg || 'Upload failed'
            });
            reject(new Error(data.msg || 'Upload failed'));
          }
        } catch (e) {
          AnalyticsService.logError({
            fileName: file.name,
            size: file.size,
            error: 'Parse error'
          });
          reject(new Error('Parse error'));
        }
      };
      xhr.onerror = () => {
        AnalyticsService.logError({
          fileName: file.name,
          size: file.size,
          error: 'Network error'
        });
        reject(new Error('Network error'));
      };
      xhr.open('POST', `${apiUrl}/upload`, true);
      xhr.setRequestHeader('auth-token', token);
      xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');
      xhr.send(formData);
    });
  },

  async downloadFile(fileId, onProgress) {
    const apiUrl = await getApiUrl();
    const token = getToken();

    try {
      const filesData = await this.getFiles();
      const fileMetadata = filesData.files?.find(f => f._id === fileId);

      if (!fileMetadata) {
        throw new Error('File not found in file list');
      }

      console.log('Downloading file:', fileMetadata.originalName || fileMetadata.filename);

      const response = await fetch(`${apiUrl}/files/download/${fileId}`, {
        headers: { 'auth-token': token, 'ngrok-skip-browser-warning': 'true' }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download failed:', response.status, errorText);
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      // Track Progress
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : (fileMetadata.size || 0);
      let loaded = 0;

      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        loaded += value.length;

        if (onProgress && total > 0) {
          const percent = Math.round((loaded / total) * 100);
          onProgress(percent);
        }
      }

      // Reassemble Blob
      const encryptedBlob = new Blob(chunks);
      console.log('Downloaded blob size:', encryptedBlob.size);

      let decryptedBlob = encryptedBlob;

      if (fileMetadata?.isEncrypted) {
        console.log('Decrypting file...');
        if (onProgress) onProgress(100);

        const encryptionService = await import('./encryptionService');
        const ownerEmail = fileMetadata.userId?.email || null;
        decryptedBlob = await encryptionService.decryptFileAfterDownload(
          encryptedBlob, 
          fileMetadata.encryptionSalt, 
          fileMetadata.encryptionIV, 
          fileMetadata.originalName,
          ownerEmail
        );
        console.log('Decrypted blob size:', decryptedBlob.size);
      }

      const url = window.URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileMetadata?.originalName || 'download';
      document.body.appendChild(a);
      a.click();

      // Delay revocation to ensure download starts
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

      console.log('Download completed successfully');
    } catch (error) {
      console.error('Error in downloadFile:', error);
      throw error;
    }
  },

  async downloadFileForPreview(fileId, onProgress) {
    const apiUrl = await getApiUrl();
    const token = getToken();

    try {
      const filesData = await this.getFiles();
      const fileMetadata = filesData.files?.find(f => f._id === fileId);

      if (!fileMetadata) {
        throw new Error('File not found in file list');
      }

      console.log('Downloading file for preview:', fileMetadata.originalName || fileMetadata.filename);

      const response = await fetch(`${apiUrl}/files/download/${fileId}`, {
        headers: { 'auth-token': token, 'ngrok-skip-browser-warning': 'true' }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Preview download failed:', response.status, errorText);
        throw new Error(`Preview download failed: ${response.status} ${response.statusText}`);
      }

      // Track Progress
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : (fileMetadata.size || 0);
      let loaded = 0;

      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (onProgress && total > 0) {
          const percent = Math.round((loaded / total) * 100);
          onProgress(percent);
        }
      }

      const encryptedBlob = new Blob(chunks);
      console.log('Downloaded blob size:', encryptedBlob.size);

      if (fileMetadata?.isEncrypted) {
        console.log('Decrypting file...');
        if (onProgress) onProgress(100);

        const encryptionService = await import('./encryptionService');
        const ownerEmail = fileMetadata.userId?.email || null;
        const decryptedBlob = await encryptionService.decryptFileAfterDownload(
          encryptedBlob, 
          fileMetadata.encryptionSalt, 
          fileMetadata.encryptionIV, 
          fileMetadata.originalName,
          ownerEmail
        );
        console.log('Decrypted blob size:', decryptedBlob.size);
        return decryptedBlob;
      }
      return encryptedBlob;
    } catch (error) {
      console.error('Error in downloadFileForPreview:', error);
      throw error;
    }
  },

  getFileMetadata: async (fileId) => {
    const data = await apiRequest('/files/list');
    return data.files?.find(f => f._id === fileId);
  },
  deleteFile: (id) => apiRequest(`/files/${id}`, { method: 'DELETE' }),
  renameFile: (id, name) => apiRequest(`/files/rename/${id}`, { method: 'PATCH', body: JSON.stringify({ newName: name }) }),
  moveFile: (id, fId) => apiRequest(`/files/move/${id}`, { method: 'PATCH', body: JSON.stringify({ folderId: fId }) }),
  shareFile: (id, email) => apiRequest(`/files/share/${id}`, { method: 'POST', body: JSON.stringify({ email }) }),
  getRecentShares: () => apiRequest('/files/recent-shares'),
};

// ULTRA SPEED TRANSMISSION (Parallel multi-stream uplink)
async function performUltraSpeedUpload(encryptedData, onProgress, options, apiUrl, token, metrics = {}) {
  const file = encryptedData.encryptedFile;
  const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks (Aligned with encryption.js)
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const MAX_CONCURRENT = 5; // 5 parallel streams for ultra speed
  const signal = options.signal; // AbortSignal

  if (signal?.aborted) throw new Error('Upload cancelled');

  // 1. Initialize
  let encryptionKey = null;
  let encryptionSalt = null;
  let baseIv = null;

  if (encryptedData.isRaw) {
    console.log('[UltraSpeed] Initializing encryption keys...');
    encryptionSalt = generateSalt();
    const password = encryptedData.password; // usage of derived session password
    console.log('[UltraSpeed] Using password:', password ? '***' : 'null');
    encryptionKey = await deriveKeyFromPassword(password, encryptionSalt);
    baseIv = crypto.getRandomValues(new Uint8Array(12));
    console.log('[UltraSpeed] Keys generated:', { key: !!encryptionKey, iv: !!baseIv, salt: !!encryptionSalt });
  }

  if (encryptedData.isRaw && (!encryptionKey || !baseIv)) {
    throw new Error("Security Alert: Encryption keys failed to initialize");
  }

  // Calculate total size with encryption overhead if raw
  // Overhead is usually TAG_LENGTH/8 bytes per chunk if using GCM, but let's check encryptChunkWithIV
  // Actually, encryptChunkWithIV uses AES-GCM, so output is size + 16 bytes (tag) usually.
  const TAG_BYTES = 16;
  const finalTotalSize = encryptedData.isRaw
    ? file.size + (totalChunks * TAG_BYTES) // Approximate overhead
    : file.size;

  const initRes = await fetch(`${apiUrl}/upload/chunk/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'auth-token': token, 'ngrok-skip-browser-warning': 'true' },
    body: JSON.stringify({
      fileName: encryptedData.isRaw ? file.name + '.enc' : file.name,
      totalSize: finalTotalSize,
      totalChunks,
      // Send salt/iv metadata if raw
      encryptionSalt: encryptionSalt ? btoa(String.fromCharCode(...encryptionSalt)) : undefined,
      encryptionIV: baseIv ? btoa(String.fromCharCode(...baseIv)) : undefined
    }),
    signal
  });

  if (!initRes.ok) {
    if (initRes.status === 401) removeToken();
    let errMsg = 'Upload init failed';
    try {
      const errData = await initRes.json();
      errMsg = errData.msg || errMsg;
    } catch (e) { }
    throw new Error(errMsg);
  }
  const { uploadId } = await initRes.json();

  const chunksLoaded = new Array(totalChunks).fill(0);
  const reportProgress = () => {
    if (onProgress) {
      const totalLoaded = chunksLoaded.reduce((a, b) => a + b, 0);
      const percent = (totalLoaded / finalTotalSize) * 100;
      onProgress(10 + (percent * 0.85), { loaded: totalLoaded, total: finalTotalSize });
    }
  };

  // 2. Parallel Upload Process
  const uploadChunk = async (index) => {
    if (signal?.aborted) throw new Error('Upload cancelled');

    const start = index * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size); // Read raw file bounds
    const chunkBlob = file.slice(start, end);

    let chunkToSend = chunkBlob;

    // ON-THE-FLY ENCRYPTION
    if (encryptedData.isRaw) {
      if (!encryptionKey || !baseIv) {
        throw new Error("Encryption Failure: Keys missing during chunk processing");
      }
      console.log(`[Chunk ${index}] Encrypting...`);
      const arrayBuffer = await chunkBlob.arrayBuffer();
      const encryptedBuffer = await encryptChunkWithIV(arrayBuffer, encryptionKey, baseIv, index);
      chunkToSend = new Blob([encryptedBuffer]);
      console.log(`[Chunk ${index}] Encrypted! Size: ${chunkToSend.size}`);
    }

    // Verify Encryption Integrity
    if (encryptedData.isRaw) {
      const rawStart = new Uint8Array(await chunkBlob.slice(0, 64).arrayBuffer());
      const encStart = new Uint8Array(await chunkToSend.slice(0, 64).arrayBuffer());
      let identical = true;
      for (let i = 0; i < rawStart.length; i++) {
        if (rawStart[i] !== encStart[i]) { identical = false; break; }
      }
      if (identical && rawStart.length > 0) {
        throw new Error("Critical Security Failure: Data was not encrypted");
      }
    }

    const fd = new FormData();
    fd.append('chunk', chunkToSend);
    fd.append('uploadId', uploadId);
    fd.append('chunkIndex', index);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${apiUrl}/upload/chunk`, true);
      xhr.setRequestHeader('auth-token', token);
      xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');

      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload cancelled'));
        });
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          chunksLoaded[index] = e.loaded;
          reportProgress();
        }
      };
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Chunk upload failed'));
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(fd);
    });
  };

  const queue = Array.from({ length: totalChunks }, (_, i) => i);
  const workers = Array.from({ length: MAX_CONCURRENT }, async () => {
    while (queue.length > 0) {
      if (signal?.aborted) break;
      const index = queue.shift();

      let attempts = 0;
      let success = false;

      while (attempts < 3 && !success) {
        if (signal?.aborted) break;
        try {
          await uploadChunk(index);
          success = true;
        } catch (e) {
          attempts++;
          if (signal?.aborted || e.message === 'Upload cancelled') throw e;

          if (attempts >= 3) {
            console.error(`Chunk ${index} failed after 3 attempts`);
            throw e;
          }
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts - 1)));
        }
      }
    }
  });

  try {
    await Promise.all(workers);
  } catch (error) {
    if (signal?.aborted || error.message === 'Upload cancelled') {
      throw new Error('Upload cancelled');
    }
    AnalyticsService.logError({
      fileName: file.name,
      size: file.size,
      error: error.message
    });
    throw error;
  }

  if (signal?.aborted) throw new Error('Upload cancelled');

  // 3. Complete Assembly
  const completeRes = await fetch(`${apiUrl}/upload/chunk/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'auth-token': token, 'ngrok-skip-browser-warning': 'true' },
    body: JSON.stringify({
      uploadId,
      fileName: encryptedData.isRaw ? file.name + '.enc' : file.name,
      totalChunks,
      groupId: metrics.groupId,
      // Use local generated keys for On-The-Fly, or pre-calculated for others
      encryptionSalt: encryptionSalt ? btoa(String.fromCharCode(...encryptionSalt)) : encryptedData.salt,
      encryptionIV: baseIv ? btoa(String.fromCharCode(...baseIv)) : encryptedData.iv,
      originalFileName: encryptedData.originalName,
      folderId: options.folderId
    }),
    signal
  });

  if (!completeRes.ok) {
    if (completeRes.status === 401) removeToken();
    throw new Error('Chunk assembly failed');
  }
  const result = await completeRes.json();

  // Log Analytics for Ultra Speed
  const uploadStartTime = metrics.uploadStartTime || Date.now();
  const totalDuration = Date.now() - uploadStartTime;
  const fileSizeMB = file.size / (1024 * 1024);
  const speedMBps = fileSizeMB / (totalDuration / 1000);

  AnalyticsService.logUploadMetric({
    fileName: file.name,
    size: file.size,
    uploadTime: totalDuration,
    encryptionTime: metrics.encryptionDuration || 0, // Mostly on-the-fly, so captured in total time
    speed: parseFloat(speedMBps.toFixed(2)),
    isUltraSpeed: true
  });

  if (onProgress) onProgress(100);
  return result;
}

// Folders API
export const foldersAPI = {
  getFolders: (pId) => apiRequest(`/folders?parentId=${pId || 'null'}`),
  createFolder: (name, pId) => apiRequest('/folders', { method: 'POST', body: JSON.stringify({ name, parentId: pId }) }),
  renameFolder: (id, name) => apiRequest(`/folders/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deleteFolder: (id) => apiRequest(`/folders/${id}`, { method: 'DELETE' }),
  moveFolder: (id, pId) => apiRequest(`/folders/move/${id}`, { method: 'PATCH', body: JSON.stringify({ parentId: pId }) }),
};
