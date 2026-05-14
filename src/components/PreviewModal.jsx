import { useState, useEffect } from 'react';
import { filesAPI } from '../services/api';
import { isImage, isVideo, isText, formatFileSize, formatDate } from '../utils/fileUtils';
import FileIcon from './FileIcon';

export default function PreviewModal({ file, isOpen, onClose, onDownload }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen || !file) {
      setPreviewUrl(null);
      setTextContent(null);
      setError(null);
      setProgress(0);
      return;
    }

    const fileName = file.originalName || file.filename;
    const extension = fileName.split('.').pop()?.toLowerCase();
    const isTextFile = isText(fileName);
    const isOfficeFile = ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'].includes(extension);

    // Check if file can be previewed
    if (isImage(fileName) || extension === 'pdf' || isVideo(fileName) || ['mp3', 'wav', 'ogg'].includes(extension) || isTextFile || isOfficeFile) {
      loadPreview(isTextFile);
    } else {
      setError('Preview not available for this file type');
    }

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, file]);

  const loadPreview = async (isText = false) => {
    try {
      setLoading(true);
      setError(null);
      setProgress(0);
      setTextContent(null);
      console.log('Fetching preview for:', file.originalName || file.filename);

      // Use the filesAPI download method which handles decryption
      const blob = await filesAPI.downloadFileForPreview(file._id, (percent) => {
        setProgress(percent);
      });

      if (!blob || blob.size === 0) {
        console.error('Preview blob is empty');
        throw new Error('File content is empty or download failed');
      }

      console.log('Preview blob received:', blob.type, blob.size);

      if (isText) {
        const text = await blob.text();
        setTextContent(text);
      } else {
        // Create blob URL for preview
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch (err) {
      setError(err.message || 'Failed to load preview');
      console.error('Preview error details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !file) return null;

  const fileName = file.originalName || file.filename;
  const extension = fileName.split('.').pop()?.toLowerCase();
  const isImageFile = isImage(fileName);
  const isVideoFile = isVideo(fileName);
  const isAudioFile = ['mp3', 'wav', 'ogg'].includes(extension);
  const isPDF = extension === 'pdf';
  const isTextFile = isText(fileName);
  const isOffice = ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'].includes(extension);

  const canPreview = isImageFile || isPDF || isVideoFile || isAudioFile || isTextFile || isOffice;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-secondary)] rounded-3xl max-w-5xl max-h-[92vh] w-full m-4 flex flex-col border border-[var(--border-color)] shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] relative z-10">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[var(--text-primary)] truncate tracking-tight">{fileName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold bg-[var(--bg-primary)] text-[var(--text-secondary)] px-2 py-0.5 rounded-md border border-[var(--border-color)] uppercase tracking-wider">
                {extension || 'FILE'}
              </span>
              <p className="text-sm text-[var(--text-muted)] font-medium">
                {formatFileSize(file.size || 0)} • {formatDate(file.uploadedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            {onDownload && (
              <button
                onClick={() => onDownload(file._id)}
                className="btn-primary text-sm px-6 py-2.5 font-bold shadow-cyan-100"
              >
                Download
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2.5 rounded-xl hover:bg-[var(--bg-primary)] transition-all border border-transparent hover:border-[var(--border-color)]"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-[var(--bg-primary)] relative group">
          {/* Decorative background for preview area */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(var(--border-color)_1px,transparent_1px)] [background-size:20px_20px]"></div>
          
          {loading ? (
            <div className="text-center w-72 relative z-10 bg-[var(--bg-secondary)]/50 backdrop-blur-sm p-8 rounded-3xl border border-[var(--border-color)] shadow-xl">
              <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-[var(--accent-primary)] mx-auto mb-6"></div>
              <p className="text-[var(--text-primary)] font-bold text-lg">Decrypting File...</p>
              <p className="text-[var(--text-muted)] text-sm mt-1 font-medium">Securely loading your content</p>
              {progress > 0 && (
                <div className="mt-6">
                  <div className="h-2 w-full bg-[var(--bg-primary)] rounded-full overflow-hidden shadow-inner border border-[var(--border-color)]/50">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Progress</p>
                    <p className="text-[var(--accent-primary)] text-sm font-black">{progress}%</p>
                  </div>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="text-center relative z-10 bg-[var(--bg-secondary)] p-10 rounded-3xl border border-[var(--border-color)] shadow-xl max-w-md">
              <div className="flex justify-center mb-6 text-rose-500 bg-rose-500/10 w-24 h-24 rounded-full mx-auto items-center border border-rose-500/20 shadow-inner">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Decryption Error</h3>
              <p className="text-[var(--text-muted)] mb-8 font-medium leading-relaxed">{error}</p>
              {onDownload && (
                <button
                  onClick={() => onDownload(file._id)}
                  className="btn-primary w-full py-3 font-bold shadow-cyan-100"
                >
                  Download to view locally
                </button>
              )}
            </div>
          ) : !canPreview ? (
            <div className="text-center relative z-10 bg-[var(--bg-secondary)] p-10 rounded-3xl border border-[var(--border-color)] shadow-xl max-w-md">
              <div className="flex justify-center mb-6 text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 w-24 h-24 rounded-full mx-auto items-center border border-[var(--accent-primary)]/20 shadow-inner">
                <FileIcon fileName={fileName} className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Preview Unavailable</h3>
              <p className="text-[var(--text-muted)] mb-8 font-medium">This file type cannot be previewed in the browser.</p>
              {onDownload && (
                <button
                  onClick={() => onDownload(file._id)}
                  className="btn-primary w-full py-3 font-bold shadow-cyan-100"
                >
                  Download File
                </button>
              )}
            </div>
          ) : (previewUrl || textContent || isOffice) ? (
            <div className="w-full h-full flex items-center justify-center relative z-10">
              {isImageFile && previewUrl ? (
                <div className="relative group/image">
                  <img
                    src={previewUrl}
                    alt={fileName}
                    className="max-w-full max-h-[72vh] mx-auto object-contain rounded-2xl shadow-2xl border-4 border-[var(--bg-secondary)] ring-1 ring-[var(--border-color)]"
                  />
                  <div className="absolute top-4 right-4 opacity-0 group-hover/image:opacity-100 transition-opacity">
                    <a href={previewUrl} download={fileName} className="bg-[var(--bg-secondary)]/90 backdrop-blur-sm p-3 rounded-full text-[var(--text-primary)] hover:text-[var(--accent-primary)] shadow-lg border border-[var(--border-color)] transition-all">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </div>
                </div>
              ) : isVideoFile && previewUrl ? (
                <div className="w-full text-center">
                  {!error && (
                    <video
                      src={previewUrl}
                      controls
                      className="max-w-full max-h-[72vh] mx-auto rounded-2xl shadow-2xl border-4 border-[var(--bg-secondary)] ring-1 ring-[var(--border-color)]"
                      autoPlay={false}
                      onError={(e) => {
                        console.error('Video playback error:', e);
                        setError('Video format not supported by your browser or codec issue.');
                      }}
                    >
                      <div className="flex flex-col items-center justify-center p-8 bg-[var(--bg-primary)] rounded-2xl">
                        <p className="text-[var(--text-muted)] mb-2 font-bold">Your browser does not support this video format.</p>
                      </div>
                    </video>
                  )}
                  {error && (
                    <div className="flex flex-col items-center justify-center p-10 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-xl max-w-sm mx-auto">
                      <div className="w-20 h-20 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center mb-6 text-[var(--text-muted)] shadow-inner">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-[var(--text-primary)] font-bold text-xl mb-2">Video Preview Error</p>
                      <p className="text-[var(--text-muted)] text-sm mb-8 text-center font-medium leading-relaxed">{error}</p>
                      {onDownload && (
                        <button
                          onClick={() => onDownload(file._id)}
                          className="btn-primary w-full py-3 font-bold shadow-cyan-100 flex items-center justify-center gap-2"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Download Video
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : isPDF && previewUrl ? (
                <div className="w-full h-full bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border-4 border-[var(--bg-secondary)] ring-1 ring-[var(--border-color)] overflow-hidden">
                  <object
                    data={previewUrl}
                    type="application/pdf"
                    className="w-full h-[72vh] rounded-lg border-0"
                  >
                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] bg-[var(--bg-primary)] p-10 text-center">
                      <div className="w-20 h-20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                         <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                         </svg>
                      </div>
                      <p className="mb-6 font-bold text-lg text-[var(--text-primary)]">PDF Preview Unavailable</p>
                      <p className="text-[var(--text-muted)] mb-8 max-w-xs font-medium">Your browser doesn't support inline PDF viewing for this secure file.</p>
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary px-8 py-3 font-bold shadow-cyan-100"
                      >
                        Open PDF in New Tab
                      </a>
                    </div>
                  </object>
                </div>
              ) : isAudioFile && previewUrl ? (
                <div className="text-center w-full max-w-md bg-[var(--bg-secondary)] p-10 rounded-3xl shadow-2xl border border-[var(--border-color)]">
                  <div className="flex justify-center mb-8 text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 w-24 h-24 rounded-full mx-auto items-center border border-[var(--accent-primary)]/20 shadow-inner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-12 h-12">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">{fileName}</h3>
                  <audio src={previewUrl} controls className="w-full custom-audio-player" />
                </div>
              ) : isTextFile && textContent ? (
                <div className="w-full bg-[var(--bg-secondary)] p-8 rounded-2xl border border-[var(--border-color)] shadow-inner overflow-auto max-h-[72vh] custom-scrollbar text-left relative">
                  <div className="absolute top-0 right-0 p-3 flex gap-2">
                    <button onClick={() => {
                      navigator.clipboard.writeText(textContent);
                    }} className="p-2 bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-muted)] transition-colors shadow-sm border border-[var(--border-color)]" title="Copy Content">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <pre className="text-sm text-[var(--text-primary)] font-mono whitespace-pre-wrap leading-relaxed">
                    {textContent}
                  </pre>
                </div>
              ) : isOffice ? (
                <div className="text-center bg-[var(--bg-secondary)] p-12 rounded-3xl border border-[var(--border-color)] shadow-2xl max-w-lg">
                  <div className="flex justify-center mb-8 text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 w-32 h-32 rounded-3xl mx-auto items-center border border-[var(--accent-primary)]/20 shadow-inner relative group">
                    <FileIcon fileName={fileName} className="w-20 h-20 transition-transform group-hover:scale-110" />
                    <div className="absolute -top-3 -right-3 bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg border-2 border-[var(--bg-secondary)] uppercase tracking-tighter">Encrypted</div>
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Premium Content</h3>
                  <p className="text-[var(--text-muted)] mb-10 max-w-xs mx-auto font-medium leading-relaxed">
                    Zero-Knowledge Encryption prevents in-browser rendering of complex Office documents. 
                    Please download to view with native applications.
                  </p>
                  {onDownload && (
                    <button
                      onClick={() => onDownload(file._id)}
                      className="btn-primary w-full py-4 font-bold shadow-cyan-100 flex items-center justify-center gap-3 text-lg"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Secure Download
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
