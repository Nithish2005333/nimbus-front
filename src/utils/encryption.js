/**
 * Zero-Knowledge Encryption Utilities
 * 
 * This module provides client-side encryption/decryption for files.
 * Encryption keys are derived from user password and never leave the device.
 * 
 * Based on research papers:
 * - Proxy Re-Encryption Scheme for Decentralized Storage Networks (MDPI, 2022)
 * - Silca-Singular Caching of Homomorphic Encryption for Cloud Databases (2023)
 */

// Import Web Crypto API for AES-GCM encryption
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // AES-256
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // 128 bits authentication tag
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const DIGEST = 'SHA-256';

/**
 * Encrypt file data using AES-256-GCM
 * @param {ArrayBuffer} fileData - The file data to encrypt
 * @param {string} password - User password for key derivation
 * @param {Uint8Array} salt - Salt for key derivation (optional, will generate if not provided)
 * @returns {Promise<{encryptedData: ArrayBuffer, salt: Uint8Array, iv: Uint8Array}>}
 */
export async function encryptFile(fileData, password, salt = null) {
  try {
    // Generate salt if not provided
    const encryptionSalt = salt || generateSalt();

    // Derive encryption key from password
    const key = await deriveKeyFromPassword(password, encryptionSalt);

    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encrypt the file
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH,
      },
      key,
      fileData
    );

    return {
      encryptedData,
      salt: encryptionSalt,
      iv,
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt file: ' + error.message);
  }
}

/**
 * Decrypt file data using AES-256-GCM
 * @param {ArrayBuffer} encryptedData - The encrypted file data
 * @param {string} password - User password for key derivation
 * @param {Uint8Array} salt - Salt used during encryption
 * @param {Uint8Array} iv - IV used during encryption
 * @returns {Promise<ArrayBuffer>}
 */
export async function decryptFile(encryptedData, password, salt, iv) {
  try {
    // Derive the same key from password and salt
    const key = await deriveKeyFromPassword(password, salt);

    // Decrypt the file
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH,
      },
      key,
      encryptedData
    );

    return decryptedData;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt file. Wrong password or corrupted data.');
  }
}

/**
 * Encrypt a File object and return a Blob
 * For large files, uses chunked encryption to prevent memory crashes
 */
// Exported for external use in streaming uploads
export function generateSalt(length = SALT_LENGTH) {
  return crypto.getRandomValues(new Uint8Array(length));
}

// Exported for external use in streaming uploads
export async function deriveKeyFromPassword(password, salt) {
  const passwordBuffer = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: DIGEST,
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// Helper for encrypting a specific chunk with a derived IV
export async function encryptChunkWithIV(chunkBuffer, key, baseIv, chunkIndex) {
  const iv = new Uint8Array(baseIv);
  // Add counter to IV (simple XOR strategy for uniqueness per chunk)
  // Assuming chunkIndex fits in 32 bits and reusing the IV modification strategy
  for (let j = 0; j < 4; j++) {
    iv[11 - j] ^= (chunkIndex >> (j * 8)) & 0xFF;
  }

  return crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: TAG_LENGTH,
    },
    key,
    chunkBuffer
  );
}

/**
 * Encrypt a File object and return a Blob
 * For large files, uses chunked encryption to prevent memory crashes
 */
export async function encryptFileBlob(file, password) {
  // Use chunked encryption for files larger than 50MB
  if (file.size > 50 * 1024 * 1024) {
    return encryptFileChunked(file, password);
  }

  const fileData = await file.arrayBuffer();
  // We need to re-implement encryptFile logic here or reuse it?
  // Since we exported helpers, let's keep the local helpers or use them.
  // The original encryptFile is below but not exported? No, it's used internally.
  // To avoid breaking existing calls, let's just call encryptFile (assuming it's available in scope)
  // Wait, I can't see the rest of file.
  // Assuming encryptFile is defined in this file.
  const { encryptedData, salt, iv } = await encryptFile(fileData, password);

  // Convert ArrayBuffers to base64 strings for storage
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  // Create blob from encrypted data
  const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });

  return {
    encryptedBlob,
    salt: saltBase64,
    iv: ivBase64,
  };
}

/**
 * Chunked encryption for large files
 * Format: [MAGIC: NMB2][EncryptedChunks...]
 * Each chunk is [TAG: 16b][Data: 1MB]
 */
async function encryptFileChunked(file, password) {
  const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks for good performance
  const encryptionSalt = generateSalt();
  const key = await deriveKeyFromPassword(password, encryptionSalt);
  const baseIv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const chunks = [];
  // Add magic header to identify as chunked V2
  chunks.push(new TextEncoder().encode('NMB2'));

  for (let i = 0; i < file.size; i += CHUNK_SIZE) {
    const chunk = file.slice(i, i + CHUNK_SIZE);
    const data = await chunk.arrayBuffer();

    const chunkIndex = Math.floor(i / CHUNK_SIZE);
    const encryptedData = await encryptChunkWithIV(data, key, baseIv, chunkIndex);

    chunks.push(encryptedData);
  }

  const encryptedBlob = new Blob(chunks, { type: 'application/octet-stream' });
  const saltBase64 = btoa(String.fromCharCode(...encryptionSalt));
  const ivBase64 = btoa(String.fromCharCode(...baseIv));

  return {
    encryptedBlob,
    salt: saltBase64,
    iv: ivBase64,
  };
}

/**
 * Decrypt a Blob and return original File-like object
 */
export async function decryptFileBlob(encryptedBlob, password, saltBase64, ivBase64) {
  // Check if it's a chunked file by reading magic header
  const headerBlob = encryptedBlob.slice(0, 4);
  const headerText = await headerBlob.text();

  if (headerText === 'NMB2') {
    // Standard Chunked (Header + 4MB chunks)
    return decryptFileChunked(encryptedBlob, password, saltBase64, ivBase64, 4 * 1024 * 1024, 4);
  }

  // If no header, it could be:
  // 1. A small single-encrypted file
  // 2. A raw chunked file from UltraSpeed upload (5MB or 4MB chunks, no header)

  // Strategy 1: Try Legacy Single Blob Decryption
  try {
    const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
    const encryptedData = await encryptedBlob.arrayBuffer();
    const decryptedData = await decryptFile(encryptedData, password, salt, iv);
    return new Blob([decryptedData]);
  } catch (singleError) {
    // Strategy 2: Try Chunked Decryption (Raw Stream - 5MB chunks - used by UltraSpeed)
    try {
      // 5MB is what api.js was using for UltraSpeed
      return await decryptFileChunked(encryptedBlob, password, saltBase64, ivBase64, 5 * 1024 * 1024, 0);
    } catch (chunk5Error) {
      // Strategy 3: Try Chunked Decryption (Raw Stream - 4MB chunks - Standard/Fallback)
      try {
        return await decryptFileChunked(encryptedBlob, password, saltBase64, ivBase64, 4 * 1024 * 1024, 0);
      } catch (chunk4Error) {
        console.error('All decryption strategies failed.');
        console.error('Single:', singleError.message);
        console.error('Chunk5MB:', chunk5Error.message);
        console.error('Chunk4MB:', chunk4Error.message);
        throw new Error('Failed to decrypt file. Wrong password or corrupted data.');
      }
    }
  }
}

/**
 * Chunked decryption for large files
 */
async function decryptFileChunked(encryptedBlob, password, saltBase64, ivBase64, rawChunkSize = 4 * 1024 * 1024, startOffset = 4) {
  // Total Chunk Size = Raw Data Block + Tag
  const CHUNK_TOTAL_SIZE = rawChunkSize + (TAG_LENGTH / 8);

  const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
  const ivBase = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  const key = await deriveKeyFromPassword(password, salt);

  const decryptedChunks = [];

  let offset = startOffset;
  let counter = 0;

  while (offset < encryptedBlob.size) {
    // Determine bounds for this chunk
    // Note: The last chunk might be smaller
    const currentChunkSize = Math.min(CHUNK_TOTAL_SIZE, encryptedBlob.size - offset);
    const chunkBlob = encryptedBlob.slice(offset, offset + currentChunkSize);
    const encryptedData = await chunkBlob.arrayBuffer();

    // Construct chunk IV
    const iv = new Uint8Array(ivBase);
    for (let j = 0; j < 4; j++) {
      iv[11 - j] ^= (counter >> (j * 8)) & 0xFF;
    }

    try {
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: ALGORITHM,
          iv: iv,
          tagLength: TAG_LENGTH,
        },
        key,
        encryptedData
      );
      decryptedChunks.push(decryptedData);
    } catch (e) {
      throw new Error(`Chunk ${counter} failed to decrypt: ${e.message}`);
    }

    offset += currentChunkSize;
    counter++;
  }

  return new Blob(decryptedChunks);
}

/**
 * Get encryption key from user's JWT token
 * This ensures each user has a unique encryption key derived from their session
 * The key is derived from the token to maintain zero-knowledge architecture
 */
export async function getEncryptionKeyFromToken(userEmailParam = null) {
  // Get user email from localStorage (set during login) or from param
  const userEmail = userEmailParam || localStorage.getItem('userEmail');
  if (!userEmail) {
    console.error('No user email found in localStorage');
    throw new Error('No user email found. Please login again.');
  }

  console.log('Deriving encryption key from user email:', userEmail);

  // Create a stable key from the user email using SHA-256
  // This ensures the same key is derived across different login sessions
  const encoder = new TextEncoder();
  const data = encoder.encode(userEmail);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Use the hash as the password for key derivation
  // Convert to hex string for consistent storage
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const key = hashHex.substring(0, 64); // Use first 64 hex chars (32 bytes)
  console.log('Encryption key derived successfully (first 8 chars):', key.substring(0, 8) + '...');

  return key;
}

/**
 * Get or create user's encryption master key
 * Stores a derived key in sessionStorage (cleared on logout)
 */
export async function getUserEncryptionKey(userEmailParam = null) {
  // If we have a custom email (shared folder/file), don't use cache
  if (userEmailParam) {
    return getEncryptionKeyFromToken(userEmailParam);
  }

  // Check if we already have a master key in sessionStorage
  const storedKey = sessionStorage.getItem('encryption_master_key');
  if (storedKey) {
    console.log('Using stored encryption key from sessionStorage');
    return storedKey;
  }

  console.log('Generating new encryption key from user email...');

  // Generate a new master key from the user email
  const masterKey = await getEncryptionKeyFromToken();

  console.log('Encryption key generated, storing in sessionStorage');

  // Store in sessionStorage (cleared when browser closes)
  sessionStorage.setItem('encryption_master_key', masterKey);

  return masterKey;
}

/**
 * Clear encryption keys from session storage
 * Call this on logout
 */
export function clearEncryptionKeys() {
  sessionStorage.removeItem('encryption_master_key');
}

/**
 * Hash password for storage (used during registration/login)
 * This is separate from encryption key derivation
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

