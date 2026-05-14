/**
 * Encryption Service - Wraps encryption utilities for file operations
 * Handles encryption/decryption during upload/download
 */

import { encryptFileBlob, decryptFileBlob, getUserEncryptionKey, clearEncryptionKeys } from '../utils/encryption';
import { getMimeType } from '../utils/fileUtils';

/**
 * Encrypt a file before upload
 * Returns a File object that can be uploaded normally
 */
export async function encryptFileForUpload(originalFile) {
  try {
    // Get user's encryption key from session (derived from JWT token)
    const masterKey = await getUserEncryptionKey();

    // Encrypt the file using the master key
    // Note: In a production system, you might want to use the user's password directly
    // For this implementation, we derive from the JWT token for simplicity
    const { encryptedBlob, salt, iv } = await encryptFileBlob(originalFile, masterKey);

    // Create a new File object from the encrypted blob
    // Use the original filename with .encrypted extension to indicate it's encrypted
    const encryptedFile = new File(
      [encryptedBlob],
      originalFile.name + '.enc',
      { type: 'application/octet-stream' }
    );

    // Return encrypted file with metadata
    return {
      encryptedFile,
      salt,
      iv,
      originalName: originalFile.name,
      originalSize: originalFile.size,
      encryptedSize: encryptedBlob.size,
    };
  } catch (error) {
    console.error('Encryption service error:', error);
    throw new Error('Failed to encrypt file: ' + error.message);
  }
}

/**
 * Decrypt a file after download
 * Returns a Blob that can be saved as the original file
 */
export async function decryptFileAfterDownload(encryptedBlob, salt, iv, originalFileName, ownerEmail = null) {
  try {
    console.log('=== DECRYPTION DEBUG ===');
    console.log('File to decrypt:', originalFileName);
    console.log('Encrypted blob size:', encryptedBlob.size);
    console.log('Salt (base64):', salt?.substring(0, 20) + '...');
    console.log('IV (base64):', iv?.substring(0, 20) + '...');
    console.log('User email in localStorage:', localStorage.getItem('userEmail'));
    console.log('Owner email (from sharing context):', ownerEmail);

    // Get user's encryption key from session, or use owner email if it's a shared file
    const masterKey = await getUserEncryptionKey(ownerEmail);
    console.log('Master key derived (first 8 chars):', masterKey?.substring(0, 8) + '...');

    // Remove .enc extension if present
    const cleanFileName = originalFileName.replace(/\.enc$/, '');

    // Decrypt the file
    const decryptedBlob = await decryptFileBlob(encryptedBlob, masterKey, salt, iv);
    console.log('Decryption successful! Decrypted blob size:', decryptedBlob.size);

    // Create a File object from decrypted blob with original filename and correct MIME type
    const decryptedFile = new File(
      [decryptedBlob],
      cleanFileName,
      { type: getMimeType(cleanFileName) }
    );

    return decryptedFile;
  } catch (error) {
    console.error('=== DECRYPTION FAILED ===');
    console.error('Error details:', error);
    console.error('File:', originalFileName);
    console.error('User email:', localStorage.getItem('userEmail'));
    throw new Error('Failed to decrypt file: ' + error.message);
  }
}

/**
 * Clear encryption keys (call on logout)
 */
export { clearEncryptionKeys as clearKeys };

