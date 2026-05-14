// function removed as it is replaced by FileIcon component

// Format file size
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Truncate filename to prevent UI stretching
export function truncateFileName(fileName, maxLength = 40) {
  if (!fileName) return '';
  if (fileName.length <= maxLength) return fileName;

  const extension = fileName.split('.').pop();
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const maxNameLength = maxLength - extension.length - 4; // -4 for "..."

  if (nameWithoutExt.length <= maxNameLength) return fileName;

  return nameWithoutExt.substring(0, maxNameLength) + '...' + extension;
}

// Format date
export function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Check if file is image
export function isImage(fileName) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
}

// Check if file is video
export function isVideo(fileName) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension);
}

// Check if file is text/code
export function isText(fileName) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const textExtensions = [
    'txt', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'md',
    'py', 'java', 'c', 'cpp', 'h', 'sh', 'log', 'sql', 'yaml',
    'yml', 'xml', 'env', 'gitignore', 'properties', 'ini', 'csv',
    'conf', 'bat', 'cmd', 'yaml', 'yml'
  ];
  return textExtensions.includes(extension);
}

// Get MIME type based on extension
export function getMimeType(fileName) {
  const extension = fileName.split('.').pop()?.toLowerCase();

  const mimeMap = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',

    // Video
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',

    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',

    // PDF
    'pdf': 'application/pdf',

    // Text / Code
    'txt': 'text/plain',
    'md': 'text/markdown',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'csv': 'text/csv'
  };

  return mimeMap[extension] || 'application/octet-stream';
}

// Calculate upload speed
export function calculateSpeed(bytesUploaded, timeElapsed) {
  if (timeElapsed === 0) return '0 B/s';
  const speed = bytesUploaded / (timeElapsed / 1000); // bytes per second
  return formatFileSize(speed) + '/s';
}

// Estimate remaining time
export function estimateTimeRemaining(bytesUploaded, totalBytes, timeElapsed) {
  if (bytesUploaded === 0 || timeElapsed === 0) return 'Calculating...';
  const speed = bytesUploaded / (timeElapsed / 1000);
  const remaining = totalBytes - bytesUploaded;
  const seconds = remaining / speed;

  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.ceil(seconds / 3600)}h`;
}
