// services/syncService.js
// Remote pendrive sync service for frontend
import { getApiUrl } from '../utils/apiUrlManager';
import { getToken, removeToken } from './api';

/**
 * Check if current device is the storage server (has pendrive)
 */
export async function checkStorageServer() {
  try {
    const apiUrl = await getApiUrl();
    const token = getToken();
    
    const response = await fetch(`${apiUrl}/sync/status`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });

    if (!response.ok) {
      if (response.status === 401) removeToken();
      throw new Error('Failed to check storage server status');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Storage server check error:', error);
    throw error;
  }
}

/**
 * Sync file to storage server (pendrive device)
 * Converts encrypted file to base64 and sends to storage server
 * @param {File|Object} fileOrEncryptedData - Either a File object or encrypted file data object
 * @param {Function} onProgress - Progress callback
 */
export async function syncFileToServer(fileOrEncryptedData, onProgress) {
  try {
    const apiUrl = await getApiUrl();
    const token = getToken();
    
    // Handle both encrypted file data object and plain File object
    let fileToSync, encryptionSalt, encryptionIV, originalFileName;
    
    if (fileOrEncryptedData.encryptedFile) {
      // Encrypted file data object (from encryptionService)
      fileToSync = fileOrEncryptedData.encryptedFile;
      encryptionSalt = fileOrEncryptedData.salt;
      encryptionIV = fileOrEncryptedData.iv;
      originalFileName = fileOrEncryptedData.originalName;
    } else {
      // Plain File object (fallback)
      fileToSync = fileOrEncryptedData;
      encryptionSalt = null;
      encryptionIV = null;
      originalFileName = fileToSync.name;
    }
    
    // Convert file to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          // Reading progress: 10-50%
          const readProgress = 10 + (e.loaded / e.total) * 40;
          onProgress(readProgress);
        }
      };
      
      reader.onload = async () => {
        try {
          if (onProgress) onProgress(50);
          
          const base64Data = reader.result.split(',')[1]; // Remove data:type;base64, prefix
          
          // Check if this is storage server first
          const status = await checkStorageServer();
          
          if (status.isStorageServer) {
            // This device has pendrive - use normal upload
            reject(new Error('This device has pendrive. Use normal upload instead.'));
            return;
          }

          if (onProgress) onProgress(60);

          // Send to storage server with encryption metadata
          const response = await fetch(`${apiUrl}/sync/file`, {
            method: 'POST',
            headers: {
              'Authorization': token,
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
              fileId: Date.now().toString(),
              fileData: base64Data,
              fileName: fileToSync.name, // Encrypted filename (.enc)
              fileSize: fileToSync.size,
              // Include encryption metadata so Device B can store it
              encryptionSalt: encryptionSalt,
              encryptionIV: encryptionIV,
              originalFileName: originalFileName // Original filename before encryption
            })
          });

          if (onProgress) onProgress(90);

          if (!response.ok) {
            if (response.status === 401) removeToken();
            let errorData = {};
            try { errorData = await response.json(); } catch (e) { }
            throw new Error(errorData.msg || 'Sync failed');
          }

          const data = await response.json();
          if (onProgress) onProgress(100);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(fileToSync);
    });
  } catch (error) {
    console.error('Sync file error:', error);
    throw error;
  }
}

/**
 * Check if file should be synced (device doesn't have pendrive)
 */
export async function shouldSyncToRemote() {
  try {
    const status = await checkStorageServer();
    return !status.isStorageServer; // Sync if this is NOT the storage server
  } catch (error) {
    console.error('Error checking sync status:', error);
    return false; // Default to local upload if check fails
  }
}

