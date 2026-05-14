import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { filesAPI } from '../services/api';
import { useToast } from './ToastContext';
import { truncateFileName } from '../utils/fileUtils';

const UploadContext = createContext();

export const useUpload = () => useContext(UploadContext);

const UPLOAD_STATUS = {
    PENDING: 'pending',
    UPLOADING: 'uploading',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    ERROR: 'error',
};

export const UploadProvider = ({ children }) => {
    const [files, setFiles] = useState([]);
    const [uploadQueue, setUploadQueue] = useState([]);
    const [activeUploads, setActiveUploads] = useState(0);
    const [storageFullTrigger, setStorageFullTrigger] = useState(false);
    const { showToast } = useToast();

    // To avoid stale closures in async loops, we might need refs or careful effect management.
    // However, the original approach in Upload.jsx used local state and a while loop with accessing state? 
    // Wait, the original code in Upload.jsx had:
    // const pendingFiles = files.filter(...)
    // while (currentIndex < pendingFiles.length) { ... }
    // This works for a single batch start.

    // We want a more robust queue system.
    // Whenever `uploadQueue` changes, we check if we can start more uploads.

    const createFileState = (file, folderId = null, groupId = null) => ({
        id: Date.now() + Math.random(),
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: UPLOAD_STATUS.PENDING,
        speed: 0,
        timeRemaining: null,
        startTime: null,
        error: null,
        folderId,
        groupId,
    });

    const addFiles = (fileList, folderId = null, groupId = null) => {
        const newFiles = fileList.map(file => createFileState(file, folderId, groupId));
        setFiles(prev => [...prev, ...newFiles]);
        showToast(`${fileList.length} file(s) added to queue`, 'success');
    };

    const abortControllers = useRef({});

    const removeFile = (fileId) => {
        // Cancel the active upload request if it exists
        if (abortControllers.current[fileId]) {
            abortControllers.current[fileId].abort();
            delete abortControllers.current[fileId];
        }

        setFiles(prev => prev.filter(f => f.id !== fileId));
        setUploadQueue(prev => prev.filter(f => f.id !== fileId));
    };

    const clearCompleted = () => {
        setFiles(prev => prev.filter(f => f.status !== UPLOAD_STATUS.COMPLETED));
    };

    const clearAll = () => {
        // Abort all active uploads
        Object.values(abortControllers.current).forEach(controller => controller.abort());
        abortControllers.current = {};

        setFiles([]);
        setUploadQueue([]);
    };

    const startUpload = async () => {
        const pendingFiles = files.filter(f => f.status === UPLOAD_STATUS.PENDING);
        if (pendingFiles.length === 0) return;
        processQueue(pendingFiles);
    };

    const processQueue = async (filesToUpload) => {
        const maxConcurrent = 3;
        let currentIndex = 0;

        const uploadNext = async () => {
            while (currentIndex < filesToUpload.length) {
                const fileItem = filesToUpload[currentIndex];
                currentIndex++;

                // Check if file was removed before processing
                if (!files.find(f => f.id === fileItem.id)) continue;

                setActiveUploads(prev => prev + 1);
                await uploadFile(fileItem);
                setActiveUploads(prev => prev - 1);
            }
        };

        const promises = [];
        for (let i = 0; i < Math.min(maxConcurrent, filesToUpload.length); i++) {
            promises.push(uploadNext());
        }
    };

    const uploadFile = async (fileState) => {
        // Check if file still exists in state before starting (handling race conditions)
        // If removeFile was called just before this invalidates the need to upload
        // (Though the processQueue check helps, safer to double check or just proceed)

        const updateFileState = (updates) => {
            setFiles(prev => prev.map(f =>
                f.id === fileState.id ? { ...f, ...updates } : f
            ));
        };

        const controller = new AbortController();
        abortControllers.current[fileState.id] = controller;

        const encryptionStartTime = Date.now();
        let uploadStartTime = null;
        const ENCRYPTION_PROGRESS = 10;

        updateFileState({
            status: UPLOAD_STATUS.UPLOADING,
            startTime: encryptionStartTime,
            progress: 0
        });

        let lastProgressTime = Date.now();
        let lastProgressBytes = 0;
        const speedHistory = [];
        const MAX_SPEED_HISTORY = 20; // Increased history for smoother average
        let currentSpeed = 0;
        let currentTimeRemaining = null;

        try {
            await filesAPI.uploadFile(fileState.file, (progress, progressData) => {
                const now = Date.now();

                // Initialize upload start time when we pass encryption phase
                if (uploadStartTime === null && progress > ENCRYPTION_PROGRESS) {
                    uploadStartTime = now;
                }

                let bytesUploaded = 0;
                let totalBytes = fileState.size;

                if (progressData && progressData.loaded !== undefined) {
                    bytesUploaded = progressData.loaded;
                    totalBytes = progressData.total || fileState.size;
                } else {
                    if (progress > ENCRYPTION_PROGRESS) {
                        const uploadProgress = (progress - ENCRYPTION_PROGRESS) / (100 - ENCRYPTION_PROGRESS);
                        bytesUploaded = uploadProgress * fileState.size;
                    }
                }

                let speed = currentSpeed; // Use last known speed by default
                let timeRemaining = currentTimeRemaining; // Use last known time by default

                // Only calculate speed if we are actually uploading (past encryption phase)
                if (progress > ENCRYPTION_PROGRESS && bytesUploaded > 0) {
                    const timeDelta = now - lastProgressTime;

                    // Throttle speed updates: Calculate every 500ms for stability
                    if (timeDelta >= 500) {
                        const bytesDelta = bytesUploaded - lastProgressBytes;

                        // Only process valid positive progress
                        if (bytesDelta > 0) {
                            // Calculate instant speed (bytes per second)
                            const instantSpeed = (bytesDelta / timeDelta) * 1000;

                            // Add to history
                            speedHistory.push(instantSpeed);
                            if (speedHistory.length > MAX_SPEED_HISTORY) {
                                speedHistory.shift();
                            }

                            // Calculate average speed from history
                            if (speedHistory.length > 0) {
                                speed = speedHistory.reduce((sum, s) => sum + s, 0) / speedHistory.length;
                            }

                            // Calculate ETA
                            if (speed > 0 && bytesUploaded < totalBytes) {
                                const remainingBytes = totalBytes - bytesUploaded;
                                const remainingSeconds = remainingBytes / speed;

                                if (remainingSeconds < 60) {
                                    timeRemaining = `${Math.ceil(remainingSeconds)}s`;
                                } else if (remainingSeconds < 3600) {
                                    const minutes = Math.ceil(remainingSeconds / 60);
                                    timeRemaining = `${minutes}m`;
                                } else {
                                    const hours = Math.ceil(remainingSeconds / 3600);
                                    timeRemaining = `${hours}h`;
                                }
                            }

                            // Update persistent values
                            currentSpeed = speed;
                            currentTimeRemaining = timeRemaining;

                            // Update baselines for next delta
                            lastProgressTime = now;
                            lastProgressBytes = bytesUploaded;
                        }
                    }
                }

                // Note: We do NOT update `lastProgressTime` if we skipped calculation due to throttle
                // This allows `timeDelta` to accumulate until > 500ms


                updateFileState({
                    progress,
                    speed,
                    timeRemaining,
                });

            }, {
                folderId: fileState.folderId,
                groupId: fileState.groupId,
                signal: controller.signal
            });

            updateFileState({
                status: UPLOAD_STATUS.COMPLETED,
                progress: 100,
                speed: 0,
                timeRemaining: null
            });

            delete abortControllers.current[fileState.id];
            showToast(`${truncateFileName(fileState.name, 30)} uploaded successfully`, 'success');
        } catch (error) {
            delete abortControllers.current[fileState.id];

            // Silent return if cancelled
            if (error.message === 'Upload cancelled' || controller.signal.aborted) {
                // Determine if we should keep it in failed state or just remove?
                // `removeFile` removes it from state, so we might not need to update.
                // But if it was cancelled by something else (e.g. clearAll), we might want to update.
                // Since removeFile removes it from the 'files' array, updateFileState won't find it.
                // So safe to just log or ignore.
                console.log(`Upload cancelled for ${fileState.name}`);
                return;
            }

            let errorMessage = error.message;
            if (error.message.includes('timeout')) {
                errorMessage = 'Upload timeout';
            } else if (error.message.includes('Network error')) {
                errorMessage = 'Network error';
            } else if (error.message.includes('Storage Full')) {
                setStorageFullTrigger(true);
                errorMessage = 'Storage Full';
            }

            updateFileState({
                status: UPLOAD_STATUS.ERROR,
                error: errorMessage,
                speed: 0,
                timeRemaining: null
            });
            showToast(`Failed to upload ${truncateFileName(fileState.name, 30)}`, 'error');
        }
    };

    const retryUpload = async (fileId) => {
        const fileToRetry = files.find(f => f.id === fileId);
        if (!fileToRetry) return;

        // Reset state
        setFiles(prev => prev.map(f =>
            f.id === fileId ? {
                ...f,
                status: UPLOAD_STATUS.PENDING,
                progress: 0,
                error: null,
                speed: 0,
                timeRemaining: null
            } : f
        ));

        // Wait a tick for state update then start
        setTimeout(() => {
            // Need to get the fresh file object with updated state? 
            // uploadFile uses properties from the passed object but updates via setFiles.
            // We can pass the original file object but ensure we treat it as new attempt.
            uploadFile(fileToRetry);
        }, 0);
    };

    return (
        <UploadContext.Provider value={{
            files,
            addFiles,
            removeFile,
            startUpload,
            retryUpload,
            activeUploads,
            storageFullTrigger,
            setStorageFullTrigger,
            clearCompleted,
            clearAll,
            UPLOAD_STATUS
        }}>
            {children}
        </UploadContext.Provider>
    );
};
