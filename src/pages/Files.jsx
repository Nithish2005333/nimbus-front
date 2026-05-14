import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { filesAPI, foldersAPI, userAPI, groupsAPI } from '../services/api';
import { useUpload } from '../context/UploadContext';
import { useToast } from '../context/ToastContext';
import FileCard from '../components/FileCard';
import PreviewModal from '../components/PreviewModal';
import AIAssistant from '../components/AIAssistant';
import FileIcon from '../components/FileIcon';
import { formatFileSize, formatDate } from '../utils/fileUtils';
import ContextMenu from '../components/ContextMenu';
import GlobalUploader from '../components/GlobalUploader';
import FolderPicker from '../components/FolderPicker';

export default function Files({ sharedOnly = false }) {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState(null); // The folder object we are currently in (null for root)
  const [folderPath, setFolderPath] = useState([]); // Array of folder objects for breadcrumbs
  const [viewMode, setViewMode] = useState('grid');

  const location = useLocation();
  const navigate = useNavigate();
  const selectionMode = location.state?.selectionMode;
  const targetCircle = location.state?.targetCircle;

  // Actions
  const [renameItem, setRenameItem] = useState(null); // { type: 'file'|'folder', item: ... }
  const [newName, setNewName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, folder, image, video, audio, document
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [sizeFilter, setSizeFilter] = useState('all'); // all, small, medium, large
  const [sortBy, setSortBy] = useState('name'); // name, date, size
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [showFilters, setShowFilters] = useState(false); // Toggle advanced filters

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedFolders, setSelectedFolders] = useState([]);

  // Context Menu
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, options: [] });
  const [infoModalItem, setInfoModalItem] = useState(null); // For "Properties"
  const [previewFile, setPreviewFile] = useState(null); // For file preview
  const [downloadProgress, setDownloadProgress] = useState({}); // { [id]: percent }

  // Custom Modals for file operations
  const [renameModal, setRenameModal] = useState({ show: false, file: null, newName: '' });
  const [deleteModal, setDeleteModal] = useState({ show: false, file: null });
  const [moveModal, setMoveModal] = useState({ show: false, items: [], targetId: '' });
  const [shareModal, setShareModal] = useState({ show: false, file: null, email: '' });
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [recentUsers, setRecentUsers] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);

  // Drag & Drop

  // Drag & Drop
  const [draggedItem, setDraggedItem] = useState(null);

  const { showToast } = useToast();


  useEffect(() => {
    fetchContent();
  }, [currentFolder]); // Refetch when changing folders

  // Load recent users from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recent_shared_users');
    if (saved) {
      try {
        setRecentUsers(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent users', e);
      }
    }
    fetchAvailableGroups();
  }, []);

  const fetchAvailableGroups = async () => {
    try {
      const response = await groupsAPI.getGroups();
      if (response.success) setAvailableGroups(response.groups);
    } catch (err) {
      console.error('Failed to fetch groups', err);
    }
  };

  // Search users effect
  useEffect(() => {
    if (!shareModal.show) {
      setUserSearchQuery('');
      setFoundUsers([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      if (userSearchQuery.length >= 2) {
        try {
          setIsSearchingUsers(true);
          const response = await userAPI.searchUsers(userSearchQuery);
          if (response.success) {
            setFoundUsers(response.users);
          }
        } catch (error) {
          console.error('Search users error:', error);
        } finally {
          setIsSearchingUsers(false);
        }
      } else {
        setFoundUsers([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [userSearchQuery, shareModal.show]);

  const handleShareWithUser = async (user) => {
    const email = user.email;
    try {
      await filesAPI.shareFile(shareModal.file._id, email);
      showToast(`File shared with ${user.name || email}`, 'success');
      
      // Update recent users
      const updatedRecent = [user, ...recentUsers.filter(u => u.email !== email)].slice(0, 5);
      setRecentUsers(updatedRecent);
      localStorage.setItem('recent_shared_users', JSON.stringify(updatedRecent));
      
      setShareModal({ show: false, file: null, email: '' });
    } catch (err) {
      showToast(err.message || 'Sharing failed', 'error');
    }
  };

  const handleShareWithGroup = async (group) => {
    try {
      await groupsAPI.shareWithGroup(shareModal.file._id, group._id);
      showToast(`File shared with group: ${group.name}`, 'success');
      setShareModal({ show: false, file: null, email: '' });
    } catch (err) {
      showToast(err.message || 'Group sharing failed', 'error');
    }
  };

  const fetchContent = async () => {
    try {
      setLoading(true);
      const parentId = currentFolder ? currentFolder._id : null;

      const [filesData, foldersData] = await Promise.all([
        filesAPI.getFiles(),
        foldersAPI.getFolders(parentId)
      ]);

      if (selectionMode) {
        // When selecting for sharehub, we only want to list files that are NOT already shared with this circle
        // But for simplicity, we'll show everything and filter on the finalized action if needed
      }

      // Client-side filtering for files because backend returns all (optimization needed later)
      const currentUserId = localStorage.getItem('userId');
      const allFiles = filesData.files || [];
      
      let filteredFiles = allFiles;
      if (sharedOnly) {
        // In shared hub, only show files THAT DO NOT BELONG TO ME
        filteredFiles = allFiles.filter(f => {
          const ownerId = f.userId?._id || f.userId;
          return ownerId !== currentUserId;
        });
        setFolders([]); // No folders in shared hub currently
      } else {
        // In my library, filter by current folder
        filteredFiles = allFiles.filter(f => {
          // Only show files THAT BELONG TO ME in My Library (folders logic)
          // OR if they are shared but we are at root? Usually shared files belong to "Shared Hub"
          // Let's make My Library ONLY show my files for clarity
          const ownerId = f.userId?._id || f.userId;
          if (ownerId !== currentUserId) return false;

          const fId = f.folderId || null;
          const cId = parentId || null;
          return fId === cId;
        });
        setFolders(foldersData.folders || []);
      }

      setFiles(filteredFiles);
    } catch (error) {
      showToast(error.message || 'Failed to load content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (folder) => {
    setCurrentFolder(folder);
    setFolderPath(prev => [...prev, folder]);
    // Clear selection on nav
    setSelectedFiles([]);
    setSelectedFolders([]);
  };

  const handleNavigateUp = () => {
    if (!currentFolder) return;
    const newPath = [...folderPath];
    newPath.pop(); // Remove current
    setFolderPath(newPath);
    setCurrentFolder(newPath.length > 0 ? newPath[newPath.length - 1] : null);
  };

  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      setCurrentFolder(null);
      setFolderPath([]);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolder(newPath[newPath.length - 1]);
    }
  };

  // Folder Actions
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await foldersAPI.createFolder(newFolderName, currentFolder ? currentFolder._id : null);
      setNewFolderName('');
      setIsCreatingFolder(false);
      showToast('Folder created', 'success');
      fetchContent();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };



  // File Actions
  const handleFileAction = async (action, file) => {
    try {
      if (action === 'download') {
        const fileId = file._id;
        setDownloadProgress(prev => ({ ...prev, [fileId]: 1 }));

        await filesAPI.downloadFile(fileId, (percent) => {
          setDownloadProgress(prev => ({ ...prev, [fileId]: percent }));
        });

        showToast('Download check browser', 'success');

        // Clear progress after short delay
        setTimeout(() => {
          setDownloadProgress(prev => {
            const newState = { ...prev };
            delete newState[fileId];
            return newState;
          });
        }, 2000);
      } else if (action === 'preview') {
        setPreviewFile(file);
      }
    } catch (error) {
      setDownloadProgress(prev => {
        const newState = { ...prev };
        delete newState[file._id];
        return newState;
      });
      showToast(error.message || `Failed to ${action} file`, 'error');
      // throw error; // Don't re-throw, we handled it
    }
  };

  // Drag and Drop Logic
  // Drag and Drop Logic
  const handleDragStart = (e, item, type) => {
    // Check if dragging a selected item
    const isSelected = type === 'file' ? selectedFiles.includes(item._id) : selectedFolders.includes(item._id);

    if (isSelected && (selectedFiles.length + selectedFolders.length) > 1) {
      // Bulk Drag
      setDraggedItem({
        item,
        type,
        isBulk: true,
        files: selectedFiles,
        folders: selectedFolders
      });
      e.dataTransfer.setData('text/plain', JSON.stringify({ isBulk: true, count: selectedFiles.length + selectedFolders.length }));
      // Custom drag image could be set here
    } else {
      // Single Drag
      setDraggedItem({ item, type });
      e.dataTransfer.setData('text/plain', JSON.stringify({ id: item._id, type }));
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetFolder) => {
    e.preventDefault();
    if (!draggedItem && !e.dataTransfer.files.length) return;

    // Check for OS file drop (upload)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = Array.from(e.dataTransfer.files);
      const targetId = targetFolder ? targetFolder._id : (currentFolder ? currentFolder._id : null);
      addFiles(fileList, targetId);
      return;
    }

    if (!draggedItem) return;
    const targetId = targetFolder ? targetFolder._id : (currentFolder ? currentFolder._id : 'root');

    // Prevent dropping into self
    if (targetFolder && draggedItem.item._id === targetFolder._id) return;
    // Prevent dropping into selection (if target is part of moved selection) - circular check needed usually

    try {
      if (draggedItem.isBulk) {
        // Batch Move
        const filePromises = draggedItem.files.map(id => filesAPI.moveFile(id, targetId));
        const folderPromises = draggedItem.folders.map(id => foldersAPI.moveFolder(id, targetId));

        await Promise.all([...filePromises, ...folderPromises]);
        showToast(`Moved ${draggedItem.files.length + draggedItem.folders.length} items`, 'success');
        fetchContent();
        clearSelection();
      } else {
        // Single Move
        const { item, type } = draggedItem;
        if (type === 'file') {
          if (item.folderId === (targetFolder ? targetFolder._id : null)) return;
          await filesAPI.moveFile(item._id, targetId);
          showToast(`Moved ${item.originalName || item.filename}`, 'success');
        } else {
          if (item._id === targetId) return;
          await foldersAPI.moveFolder(item._id, targetId);
          showToast(`Moved ${item.name}`, 'success');
        }
        fetchContent();
      }
    } catch (error) {
      showToast('Move failed: ' + error.message, 'error');
    } finally {
      setDraggedItem(null);
    }
  };

  // Mixed selection - Improved for Mobile
  const toggleSelection = (e, id, type) => {
    if (e) e.stopPropagation();

    // Clear context menu if open
    if (contextMenu.show) setContextMenu({ ...contextMenu, show: false });

    const totalSelected = selectedFiles.length + selectedFolders.length;

    // If already in selection mode (any item selected) or using keys
    if (totalSelected > 0 || (e && (e.ctrlKey || e.metaKey))) {
      if (type === 'file') {
        setSelectedFiles(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
      } else {
        setSelectedFolders(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
      }
    } else {
      // Single select (initial click)
      if (type === 'file') {
        setSelectedFiles([id]);
        setSelectedFolders([]);
      } else {
        setSelectedFolders([id]);
        setSelectedFiles([]);
      }
    }
  };

  const clearSelection = () => {
    setSelectedFiles([]);
    setSelectedFolders([]);
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  const handleContextMenu = (e, item, type) => {
    e.preventDefault();
    e.stopPropagation();

    // If already showing for THIS item, toggle it OFF
    if (contextMenu.show && contextMenu.item?._id === item._id) {
      setContextMenu(prev => ({ ...prev, show: false }));
      return;
    }

    const isSelected = type === 'file' ? selectedFiles.includes(item._id) : selectedFolders.includes(item._id);
    const totalSelected = selectedFiles.length + selectedFolders.length;

    // If right-clicking an unselected item, clear others and select this one (exclusive)
    if (!isSelected) {
      if (type === 'file') {
        setSelectedFiles([item._id]);
        setSelectedFolders([]);
      } else {
        setSelectedFolders([item._id]);
        setSelectedFiles([]);
      }
    }
    // If clicking a selected item and multiple are selected, we keep the selection for bulk action.

    // Define actions
    const bulkMode = isSelected && totalSelected > 1;

    const options = [
      !bulkMode && {
        label: 'Open',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
        action: () => type === 'folder' ? handleNavigate(item) : handleFileAction('preview', item)
      },
      !bulkMode && type === 'file' && {
        label: 'Download',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path d="M12 15l-4-4m8 0l-4 4m0 0V3m-9 13v1a3 3 0 003 3h12a3 3 0 003-3v-1" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>,
        action: async () => {
          try {
            await handleFileAction('download', item);
            showToast('Download started', 'success');
          } catch (error) {
            // Error already shown by handleFileAction
          }
        }
      },
      !bulkMode && type === 'file' && {
        label: 'Share',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>,
        action: () => setShareModal({ show: true, file: item, email: '' })
      },
      'separator',
      {
        label: bulkMode ? `Rename (${totalSelected} items - N/A)` : 'Rename', // Bulk rename complex
        disabled: bulkMode, // Disable bulk rename for now
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
        action: () => {
          if (bulkMode) return;
          setRenameModal({
            show: true,
            file: { ...item, type },
            newName: type === 'file' ? (item.originalName || item.filename) : item.name
          });
        }
      },
      {
        label: bulkMode ? `Move ${totalSelected} items` : 'Move',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
        action: () => setMoveModal({ show: true, items: bulkMode ? [...selectedFiles.map(id => ({ _id: id, type: 'file' })), ...selectedFolders.map(id => ({ _id: id, type: 'folder' }))] : [{ ...item, type }] })
      },
      'separator',
      {
        label: bulkMode ? `Delete ${totalSelected} items` : 'Delete',
        danger: true,
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
        action: () => {
          if (bulkMode) {
            setDeleteModal({
              show: true,
              isBulk: true,
              count: totalSelected,
              items: { files: [...selectedFiles], folders: [...selectedFolders] }
            });
          } else {
            setDeleteModal({ show: true, file: { ...item, type } });
          }
        }
      },
      'separator',
      !bulkMode && {
        label: 'Properties',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        action: () => setInfoModalItem({ ...item, type })
      }
    ];
    // Open context menu at cursor
    const x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    setContextMenu({
      show: true,
      x: x || 0,
      y: y || 0,
      item,
      type,
      options: options.filter(Boolean)
    });
  };

  const handleBulkDelete = async () => {
    // Implement bulk delete
    const promises = [
      ...selectedFiles.map(id => filesAPI.deleteFile(id)),
      ...selectedFolders.map(id => foldersAPI.deleteFolder(id))
    ];
    await Promise.all(promises);
    fetchContent();
    clearSelection();
  };

  // Sort and Combine
  const sortedItems = useMemo(() => {
    let filteredFiles = [...files];
    let filteredFolders = [...folders];

    // 1. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredFiles = filteredFiles.filter(f => (f.originalName || f.filename).toLowerCase().includes(q));
      filteredFolders = filteredFolders.filter(f => f.name.toLowerCase().includes(q));
    }

    // 2. Type Filter
    if (filterType !== 'all') {
      if (filterType === 'folder') {
        filteredFiles = [];
        // Keep filteredFolders as is (searching updates it)
      } else {
        filteredFiles = filteredFiles.filter(f => {
          const type = (f.contentType || '').toLowerCase();
          const ext = (f.originalName || f.filename).split('.').pop().toLowerCase();

          if (filterType === 'image') return type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
          if (filterType === 'video') return type.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext);
          if (filterType === 'audio') return type.startsWith('audio/') || ['mp3', 'wav', 'ogg'].includes(ext);
          if (filterType === 'document') return type.includes('pdf') || type.includes('text') || ['pdf', 'doc', 'docx', 'txt', 'md', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
          return true;
        });
        filteredFolders = []; // Hide folders for file-specific filters
      }
    }

    // 3. Date Filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filteredFiles = filteredFiles.filter(f => {
        const date = new Date(f.uploadedAt);
        if (dateFilter === 'today') return date.toDateString() === now.toDateString();
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return date >= weekAgo;
        }
        if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return date >= monthAgo;
        }
        return true;
      });

      filteredFolders = filteredFolders.filter(f => {
        const date = new Date(f.createdAt);
        const now = new Date();
        if (dateFilter === 'today') return date.toDateString() === now.toDateString();
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return date >= weekAgo;
        }
        if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return date >= monthAgo;
        }
        return true;
      });
    }

    // 4. Size Filter
    if (sizeFilter !== 'all') {
      filteredFiles = filteredFiles.filter(f => {
        const size = f.size || 0;
        if (sizeFilter === 'tiny') return size < 100 * 1024; // < 100KB
        if (sizeFilter === 'small') return size >= 100 * 1024 && size < 1024 * 1024; // 100KB - 1MB
        if (sizeFilter === 'medium') return size >= 1024 * 1024 && size < 100 * 1024 * 1024; // 1MB - 100MB
        if (sizeFilter === 'large') return size >= 100 * 1024 * 1024 && size < 1024 * 1024 * 1024; // 100MB - 1GB
        if (sizeFilter === 'huge') return size >= 1024 * 1024 * 1024; // > 1GB
        return true;
      });
      if (filterType !== 'folder') filteredFolders = [];
    }

    // Sorting Helper
    const sortFn = (a, b, keyA, keyB, type = 'string') => {
      let valA = keyA(a);
      let valB = keyB(b);
      if (type === 'string') return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      if (type === 'date') return sortOrder === 'asc' ? new Date(valA) - new Date(valB) : new Date(valB) - new Date(valA);
      if (type === 'number') return sortOrder === 'asc' ? valA - valB : valB - valA;
      return 0;
    };

    // Sort folders
    const sortedFolders = filteredFolders.sort((a, b) => {
      if (sortBy === 'date') return sortFn(a, b, x => x.createdAt, x => x.createdAt, 'date');
      return sortFn(a, b, x => x.name, x => x.name, 'string');
    });

    // Sort files
    const sortedFiles = filteredFiles.sort((a, b) => {
      if (sortBy === 'name') return sortFn(a, b, x => x.originalName || x.filename, x => x.originalName || x.filename, 'string');
      if (sortBy === 'date') return sortFn(a, b, x => x.uploadedAt, x => x.uploadedAt, 'date');
      if (sortBy === 'size') return sortFn(a, b, x => x.size || 0, x => x.size || 0, 'number');
      if (sortBy === 'type') {
        const extA = (a.originalName || a.filename).split('.').pop();
        const extB = (b.originalName || b.filename).split('.').pop();
        return sortFn(a, b, () => extA, () => extB, 'string');
      }
      return 0;
    });

    return { folders: sortedFolders, files: sortedFiles };
  }, [folders, files, searchQuery, filterType, dateFilter, sizeFilter, sortBy, sortOrder]);

  // Robust Select All Logic
  const isAllSelected = useMemo(() => {
    const totalItems = sortedItems.files.length + sortedItems.folders.length;
    if (totalItems === 0) return false;

    // Check if every visible file is selected
    const allFilesSelected = sortedItems.files.every(f => selectedFiles.includes(f._id));
    // Check if every visible folder is selected
    const allFoldersSelected = sortedItems.folders.every(f => selectedFolders.includes(f._id));

    return allFilesSelected && allFoldersSelected;
  }, [sortedItems, selectedFiles, selectedFolders]);


  const handleSelectAll = () => {
    if (isAllSelected) {
      clearSelection();
    } else {
      const allFileIds = sortedItems.files.map(f => f._id);
      const allFolderIds = sortedItems.folders.map(f => f._id);
      setSelectedFiles(allFileIds);
      setSelectedFolders(allFolderIds);
    }
  };

  // Files-Only Select All Logic
  const isAllFilesSelected = useMemo(() => {
    const validFiles = sortedItems.files.filter(f => f && f._id);
    if (validFiles.length === 0) return false;
    return validFiles.every(f => selectedFiles.includes(f._id));
  }, [sortedItems.files, selectedFiles]);

  const handleSelectAllFiles = (e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
      e.preventDefault();
    }

    // Get visible file IDs
    const currentFileIds = sortedItems.files.map(f => f._id).filter(Boolean);

    if (isAllFilesSelected) {
      // Unselect ONLY the visible files
      setSelectedFiles(prev => prev.filter(id => !currentFileIds.includes(id)));
    } else {
      // Select visible files
      setSelectedFiles(prev => {
        const newSet = new Set([...prev, ...currentFileIds]);
        return Array.from(newSet);
      });
    }
  };

  // Pill Component
  const FilterPill = ({ label, active, onClick, icon }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${active ? 'bg-cyan-600 text-white border-cyan-500 shadow-md' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-slate-200 hover:border-slate-300'}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AIAssistant files={files} />

      {/* Toolbar / Address Bar */}
      {!sharedOnly && (
        <div className="card p-2 mb-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          {/* Navigation Controls & Breadcrumbs */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={handleNavigateUp} disabled={!currentFolder} className="p-2 rounded-full hover:bg-[var(--bg-secondary)] disabled:opacity-30 shrink-0 text-[var(--text-secondary)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
            </button>

            {/* Breadcrumbs / Address Bar */}
            <div className="flex-1 input-field flex items-center gap-1 overflow-x-auto scrollbar-hide h-9 px-2.5 bg-[var(--bg-secondary)]/50 min-w-0">
              <button
                onClick={() => handleBreadcrumbClick(-1)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg transition-all shrink-0 ${folderPath.length === 0 ? 'text-cyan-700 bg-cyan-100 border border-[var(--accent-primary)]/30 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-slate-200'}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth={2.5}><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                <span className="text-[10px] font-black uppercase tracking-widest mt-0.5">Nimbus Cloud</span>
              </button>

              {folderPath.map((folder, idx) => (
                <div key={folder._id} className="flex items-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 text-slate-300 mx-0.5" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                  <button
                    onClick={() => handleBreadcrumbClick(idx)}
                    className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-lg transition-all whitespace-nowrap max-w-[120px] truncate ${idx === folderPath.length - 1 ? 'text-cyan-700' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-slate-200'}`}
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Select All Button */}
            <button
              onClick={handleSelectAll}
              className={`p-2 rounded-xl border transition-all ${isAllSelected
                ? 'bg-cyan-100 text-cyan-700 border-[var(--accent-primary)]/30 shadow-sm'
                : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
              title={isAllSelected ? 'Deselect All' : 'Select All'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl border transition-all ${showFilters || dateFilter !== 'all' || sizeFilter !== 'all' ? 'bg-cyan-100 text-cyan-700 border-[var(--accent-primary)]/30 shadow-sm' : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              title="Filters"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            </button>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field h-10 pl-9 w-40 sm:w-48 transition-all focus:w-48 sm:focus:w-64 bg-[var(--bg-secondary)]"
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

      {sharedOnly && (
        <div className="flex items-center justify-between p-4 mb-3 card border-blue-100 bg-blue-50/50 transition-all animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tighter">Shared Hub</h1>
              <p className="text-blue-600/60 text-[9px] font-black uppercase tracking-widest font-mono">Secured Peer-to-Peer Access</p>
            </div>
          </div>
          
          <div className="relative group">
            <input
              type="text"
              placeholder="Search Shared Files"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field h-9 pl-10 w-48 bg-[var(--bg-primary)] border-[var(--border-color)] focus:border-blue-500 transition-all font-bold text-xs"
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 absolute left-3.5 top-2.5 text-[var(--text-muted)] group-focus-within:text-blue-600 transition-colors"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
      )}

      {/* Expanded Filter Bar - Unique Design */}
      <div className={`mb-4 transition-all duration-300 ${showFilters ? 'max-h-[400px] md:max-h-[600px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="relative card p-4 md:p-5 max-h-[400px] md:max-h-[600px] overflow-y-auto bg-[var(--bg-primary)] border-[var(--border-color)]">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-transparent to-blue-50 pointer-events-none rounded-2xl" />

          <div className="relative space-y-4">
            {/* Type Filters - Enhanced Pills */}
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-3 font-bold">File Types</p>
              <div className="flex items-center gap-2 flex-wrap">
                <FilterPill label="All Types" active={filterType === 'all'} onClick={() => setFilterType('all')} />
                <FilterPill
                  label="Folders"
                  active={filterType === 'folder'}
                  onClick={() => setFilterType('folder')}
                  icon={<svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" /></svg>}
                />
                <FilterPill
                  label="Images"
                  active={filterType === 'image'}
                  onClick={() => setFilterType('image')}
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>}
                />
                <FilterPill
                  label="Videos"
                  active={filterType === 'video'}
                  onClick={() => setFilterType('video')}
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth={2}><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>}
                />
                <FilterPill
                  label="Audio"
                  active={filterType === 'audio'}
                  onClick={() => setFilterType('audio')}
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth={2}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>}
                />
                <FilterPill
                  label="Documents"
                  active={filterType === 'document'}
                  onClick={() => setFilterType('document')}
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>}
                />
              </div>
            </div>

            {/* Advanced Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--border-color)]">
              {/* Date Filter */}
              <div className="group">
                <label className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2 block font-bold flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Date Range
                </label>
                <select
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:border-cyan-400/30 focus:border-cyan-500 focus:bg-[var(--bg-primary)] transition-all outline-none cursor-pointer"
                >
                  <option value="all">Anytime</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="year">Last Year</option>
                </select>
              </div>

              {/* Size Filter */}
              <div className="group">
                <label className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2 block font-bold flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                  File Size
                </label>
                <select
                  value={sizeFilter}
                  onChange={e => setSizeFilter(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:border-cyan-400/30 focus:border-cyan-500 focus:bg-[var(--bg-primary)] transition-all outline-none cursor-pointer"
                >
                  <option value="all">Any Size</option>
                  <option value="tiny">Tiny (&lt;100KB)</option>
                  <option value="small">Small (100KB-1MB)</option>
                  <option value="medium">Medium (1-100MB)</option>
                  <option value="large">Large (100MB-1GB)</option>
                  <option value="huge">Huge (&gt;1GB)</option>
                </select>
              </div>

              {/* Sort Options - Enhanced */}
              <div className="group">
                <label className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2 block font-bold flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  Sort By
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:border-cyan-400/30 focus:border-cyan-500 focus:bg-[var(--bg-primary)] transition-all outline-none cursor-pointer"
                  >
                    <option value="name">Name</option>
                    <option value="date">Date Modified</option>
                    <option value="size">File Size</option>
                    <option value="type">File Type</option>
                  </select>

                  {/* Enhanced Ascending/Descending Toggle */}
                  <div className="flex bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-0.5 w-full sm:w-auto">
                    <button
                      onClick={() => setSortOrder('asc')}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${sortOrder === 'asc' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
                      title="Ascending (A-Z, 0-9, Oldest-Newest)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                      <span className="text-xs font-semibold">Asc</span>
                    </button>
                    <button
                      onClick={() => setSortOrder('desc')}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${sortOrder === 'desc' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
                      title="Descending (Z-A, 9-0, Newest-Oldest)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                      </svg>
                      <span className="text-xs font-semibold">Desc</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* View Mode & Reset */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold">View Mode</span>
                <div className="flex bg-[var(--bg-secondary)] rounded-lg p-1 border border-[var(--border-color)]">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
                    title="Grid View"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    <span className="text-xs font-medium">Grid</span>
                  </button>
                  <button
                    onClick={() => setViewMode('details')}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 ${viewMode === 'details' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
                    title="List View"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                    <span className="text-xs font-medium">List</span>
                  </button>
                </div>
              </div>

              {(filterType !== 'all' || dateFilter !== 'all' || sizeFilter !== 'all' || sortBy !== 'name' || sortOrder !== 'asc') && (
                <button
                  onClick={() => { setFilterType('all'); setDateFilter('all'); setSizeFilter('all'); setSortBy('name'); setSortOrder('asc'); }}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-400/20 text-rose-400 rounded-lg hover:bg-rose-500/20 hover:border-rose-400/30 transition-all text-xs font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset All Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Removed old action bar div to prevent vertical spacing issues on mobile */}

      {/* Selection Info Bar - Floating Premium Design */}
      {(selectedFiles.length + selectedFolders.length) > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 p-3 bg-[var(--bg-primary)]/90 backdrop-blur-2xl border border-[var(--accent-primary)]/30 rounded-2xl shadow-xl shadow-[var(--accent-primary)]/20/50 animate-in slide-in-from-bottom-10 duration-500">
          <div className="px-4 py-2 bg-[var(--accent-primary)]/10 rounded-xl border border-cyan-100 mr-2 flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-xs font-black uppercase tracking-widest text-[var(--accent-primary)]">Selected</span>
            <span className="text-sm text-[var(--text-primary)] font-bold ml-1">{selectedFiles.length + selectedFolders.length} items</span>
          </div>

          <div className="flex gap-1.5 px-1 border-l border-[var(--border-color)] ml-2">
            <button
              onClick={() => {
                const items = [
                  ...selectedFiles.map(id => ({ _id: id, type: 'file' })),
                  ...selectedFolders.map(id => ({ _id: id, type: 'folder' }))
                ];
                setMoveModal({ show: true, items });
              }}
              className="p-2 sm:px-4 sm:py-2.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 group border border-blue-500/20"
              title="Move Selected"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={2.5}><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              <span className="text-xs font-bold hidden sm:block">MOVE</span>
            </button>

            <button
              onClick={() => {
                setDeleteModal({
                  show: true,
                  isBulk: true,
                  count: selectedFiles.length + selectedFolders.length,
                  items: { files: [...selectedFiles], folders: [...selectedFolders] }
                });
              }}
              className="p-2 sm:px-4 sm:py-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 group border border-rose-500/20"
              title="Delete All"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <span className="text-xs font-bold hidden sm:block">DELETE</span>
            </button>

            <button
              onClick={clearSelection}
              className="p-2 sm:px-4 sm:py-2.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-slate-200 transition-all flex items-center gap-2 border border-[var(--border-color)]"
              title="Unselect All"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
              <span className="text-xs font-bold hidden sm:block">CLEAR</span>
            </button>
          </div>
        </div>
      )}

      {/* Main File List (Table View or Grid View) */} {/* 6. Render Grid view condition */}
      <div
        className="card flex-1 min-h-0 overflow-auto flex flex-col p-0 bg-[var(--bg-primary)] border-[var(--border-color)] shadow-sm"
        onClick={clearSelection} /* 8. Click blank area to deselect */
      >
        {viewMode === 'details' ? (
          <>
            {/* Desktop Table Header - Technical Design */}
            <div className="hidden lg:grid grid-cols-[50px_1fr_180px_140px_100px_50px] gap-4 px-6 py-4 border-b border-[var(--border-color)] text-[10px] uppercase font-black tracking-[0.2em] text-[var(--text-muted)] sticky top-0 bg-[var(--bg-primary)] z-20 backdrop-blur-xl">
              <div className="flex justify-center flex-none">
                <div className="w-4 h-4 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]"></div>
              </div>
              <div className="cursor-pointer hover:text-[var(--accent-primary)] transition-colors flex items-center gap-2 group" onClick={() => setSortBy('name')}>
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </div>
              <div className="cursor-pointer hover:text-[var(--accent-primary)] transition-colors flex items-center gap-2" onClick={() => setSortBy('date')}>
                Date Modified {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </div>
              <div className="cursor-pointer hover:text-[var(--accent-primary)] transition-colors flex items-center gap-2" onClick={() => setSortBy('type')}>
                Type {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
              </div>
              <div className="text-right cursor-pointer hover:text-[var(--accent-primary)] transition-colors flex items-center justify-end gap-2" onClick={() => setSortBy('size')}>
                Size {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
              </div>
              <div></div>
            </div>

            {/* Tablet/Mobile Header Spacer */}
            <div className="block lg:hidden px-6 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Inventory Nodes</span>
            </div>

            {/* Details Body */}
            <div className="overflow-y-auto flex-1 p-2 sm:p-4 space-y-2" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, currentFolder)}>
              {sortedItems.folders.length === 0 && sortedItems.files.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] opacity-60 pb-20">
                  <div className="w-20 h-20 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center mb-6">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10" strokeWidth={1}><path d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v5.5M15 21h-5m0 0v-2m0 2c-1.66 0-3-1.34-3-3m3 3c1.66 0 3-1.34 3-3" /></svg>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest">Container empty</p>
                </div>
              )}

              {/* Folders List - Premium Workstation Design */}
              {sortedItems.folders.map(folder => (
                <div
                  key={folder._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, folder, 'folder')}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, folder)}
                  onDoubleClick={(e) => { e.stopPropagation(); handleNavigate(folder); }}
                  onClick={(e) => toggleSelection(e, folder._id, 'folder')}
                  onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
                  className={`grid grid-cols-[auto_1fr_auto] lg:grid-cols-[50px_1fr_180px_140px_100px_50px] gap-2 lg:gap-4 px-3 sm:px-6 py-3 sm:py-4 rounded-[1.5rem] items-center cursor-pointer group transition-all border relative overflow-hidden
                    ${selectedFolders.includes(folder._id)
                      ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 shadow-sm ring-1 ring-[var(--accent-primary)]/20'
                      : 'hover:bg-[var(--bg-secondary)] border-transparent hover:border-[var(--border-color)] hover:-translate-x-1'
                    }`}
                >
                  {/* Selection Indicator */}
                  <div className="flex justify-center flex-none">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelection(e, folder._id, 'folder'); }}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300
                        ${selectedFolders.includes(folder._id)
                          ? 'bg-cyan-600 border-cyan-500 shadow-sm'
                          : 'bg-[var(--bg-primary)] border-[var(--border-color)] group-hover:border-slate-300'}`}
                    >
                      {selectedFolders.includes(folder._id) && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-white" strokeWidth={5}><path d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>
                  </div>

                  {/* Icon & Name Container */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-amber-500">
                        <path d="M4 4h4.5l2 2H20a2 2 0 012 2v10a3 3 0 01-3 3H5a3 3 0 01-3-3V7a3 3 0 013-3z" fill="currentColor" fillOpacity={0.15} />
                        <path d="M2.5 10.5h19v6.5c0 1.38-1.12 2.5-2.5 2.5H5c-1.38 0-2.5-1.12-2.5-2.5v-6.5z" fill="currentColor" fillOpacity={0.25} />
                        <path d="M4 4h4.5l2 2H20a2 2 0 012 2" stroke="currentColor" strokeWidth={1.5} />
                      </svg>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-black text-[var(--text-primary)] text-[15px] tracking-tight group-hover:text-amber-600 transition-colors uppercase mb-1">{folder.name}</span>
                      <div className="flex items-center gap-2 lg:hidden">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Directory</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-slate-200"></span>
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase whitespace-nowrap">{formatDate(folder.createdAt || new Date())}</span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Columns */}
                  <div className="hidden lg:block truncate text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{formatDate(folder.createdAt || new Date())}</div>
                  <div className="hidden lg:block text-[10px] font-black uppercase text-[var(--text-muted)] tracking-[0.2em]">Storage Node</div>
                  <div className="hidden lg:block text-right text-[11px] font-mono text-[var(--text-secondary)]">--</div>

                  {/* Options Button */}
                  <div className="flex justify-end pr-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleContextMenu(e, folder, 'folder'); }}
                      className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] hover:bg-cyan-600 text-[var(--text-muted)] hover:text-white transition-all border border-[var(--border-color)] hover:border-cyan-500 flex items-center justify-center active:scale-90"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Files List - Premium Workstation Design */}
              {sortedItems.files.map(file => (
                <div
                  key={file._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, file, 'file')}
                  onClick={(e) => toggleSelection(e, file._id, 'file')}
                  onDoubleClick={(e) => { e.stopPropagation(); handleFileAction('preview', file); }}
                  onContextMenu={(e) => handleContextMenu(e, file, 'file')}
                  className={`grid grid-cols-[auto_1fr_auto] lg:grid-cols-[40px_1fr_160px_120px_90px_40px] gap-2 lg:gap-3 px-3 sm:px-5 py-2.5 sm:py-3 rounded-2xl items-center cursor-pointer group transition-all border relative overflow-hidden
                    ${selectedFiles.includes(file._id)
                      ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 shadow-sm ring-1 ring-[var(--accent-primary)]/20'
                      : 'hover:bg-[var(--bg-secondary)] border-transparent hover:border-[var(--border-color)] hover:translate-x-0.5'
                    }`}
                >
                  {/* Selection Indicator */}
                  <div className="flex justify-center flex-none">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelection(e, file._id, 'file'); }}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300
                        ${selectedFiles.includes(file._id)
                          ? 'bg-cyan-600 border-cyan-500 shadow-sm'
                          : 'bg-[var(--bg-primary)] border-[var(--border-color)] group-hover:border-slate-300'}`}
                    >
                      {selectedFiles.includes(file._id) && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-white" strokeWidth={5}><path d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>
                  </div>

                  {/* Icon & Name Container */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="shrink-0">
                      <FileIcon fileName={file.originalName || file.filename} className="w-8 h-8 text-[var(--accent-primary)]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-bold text-[var(--text-primary)] text-[14px] tracking-tight group-hover:text-[var(--accent-primary)] transition-colors uppercase leading-tight mb-1" title={file.originalName || file.filename}>{file.originalName || file.filename}</span>
                      {file.userId !== localStorage.getItem('userId') && (
                        <span className="text-[9px] text-blue-600 font-black uppercase tracking-widest">Shared with you</span>
                      )}
                      <div className="flex items-center gap-2 lg:hidden">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{formatFileSize(file.size)}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-slate-200"></span>
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase whitespace-nowrap">{(file.originalName?.split('.').pop() || 'FILE')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Columns */}
                  <div className="hidden lg:block truncate text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{formatDate(file.uploadedAt)}</div>
                  <div className="hidden lg:block text-[10px] font-black uppercase text-[var(--text-muted)] tracking-[0.2em] whitespace-nowrap">{(file.originalName?.split('.').pop() || 'FILE') + ' OBJ'}</div>
                  <div className="hidden lg:block text-right text-[11px] font-black text-[var(--text-muted)] font-mono tracking-tight">{formatFileSize(file.size)}</div>

                  {/* Options Button */}
                  <div className="flex justify-end pr-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleContextMenu(e, file, 'file'); }}
                      className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-cyan-600 text-[var(--text-muted)] hover:text-white transition-all border border-[var(--border-color)] hover:border-cyan-500 flex items-center justify-center active:scale-90"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="overflow-y-auto flex-1 p-4" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, currentFolder)}>
            {/* Grid View */}
            {/* Folders Layout Redesign */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--accent-primary)]/60 flex items-center gap-3">
                  <span className="w-8 h-[1px] bg-cyan-600/30"></span>
                  Folders
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] font-bold ml-11 block sm:hidden uppercase">Tip: Long press to select items</p>
              </div>

              <button
                onClick={() => setIsCreatingFolder(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-cyan-300 hover:bg-[var(--accent-primary)]/10 transition-all flex items-center gap-2 group shadow-sm"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:rotate-90" strokeWidth={3}><path d="M12 5v14M5 12h14" /></svg>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">New Folder</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-6 mb-12">
              {sortedItems.folders.map(folder => (
                <div
                  key={folder._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, folder, 'folder')}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, folder)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleNavigate(folder);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
                  className={`group relative flex flex-col p-3.5 rounded-3xl border transition-all duration-500 bg-[var(--bg-primary)] hover:-translate-y-1.5
                    ${selectedFolders.includes(folder._id)
                      ? 'border-cyan-400 bg-[var(--accent-primary)]/10 shadow-md ring-1 ring-cyan-200'
                      : 'border-[var(--border-color)] hover:border-[var(--border-color)] hover:bg-[var(--bg-secondary)] hover:shadow-lg'
                    }`}
                >
                  {/* Top Section: Selection & Options */}
                  <div className="flex justify-between items-start mb-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelection(e, folder._id, 'folder'); }}
                      className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all duration-300
                        ${selectedFolders.includes(folder._id)
                          ? 'bg-cyan-600 border-cyan-500 scale-105 shadow-md'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-cyan-400/60 hover:bg-[var(--bg-secondary)]'}`}
                    >
                      {selectedFolders.includes(folder._id) ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-white" strokeWidth={5}><path d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-[var(--accent-primary)]/100 transition-colors"></div>
                      )}
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleContextMenu(e, folder, 'folder'); }}
                      className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] hover:bg-cyan-600 text-[var(--text-secondary)] hover:text-white transition-all border border-[var(--border-color)] flex items-center justify-center shadow-sm z-40 active:scale-90"
                      title="More Options"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                  </div>

                  {/* Center Section: Unique Liquid Glass Folder Design */}
                  <div
                    className="flex flex-col items-center justify-center py-4 cursor-pointer relative"
                    onClick={(e) => { e.stopPropagation(); handleNavigate(folder); }}
                  >
                    <div className="relative mb-3 group/icon">
                      {/* Hyper-Subtle Ambient Glow */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-amber-500/[0.02] rounded-full blur-[15px] group-hover:bg-amber-400/[0.05] transition-all duration-700"></div>

                      {/* Technical Liquid Folder Icon - Synced with Picker Style */}
                      <svg viewBox="0 0 24 24" fill="none" className="w-20 h-20 relative z-10 transition-all duration-700 group-hover:scale-105 drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)] text-amber-500">
                        <path d="M4 4h4.5l2 2H20a2 2 0 012 2v10a3 3 0 01-3 3H5a3 3 0 01-3-3V7a3 3 0 013-3z" fill="currentColor" fillOpacity={0.15} />
                        <path d="M2.5 10.5h19v6.5c0 1.38-1.12 2.5-2.5 2.5H5c-1.38 0-2.5-1.12-2.5-2.5v-6.5z" fill="currentColor" fillOpacity={0.25} />
                        <path d="M4 4h4.5l2 2H20a2 2 0 012 2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                        <path d="M5 21h14" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </div>

                    <div className="text-center w-full px-4">
                      <h3 className="text-xl font-black text-[var(--text-primary)] truncate mb-1.5 group-hover:text-amber-600 transition-colors tracking-tighter">
                        {folder.name}
                      </h3>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] mx-auto">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
                        <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.25em]">
                          Sub-Directory
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section: Primary Action */}
                  <div className="mt-auto pt-6 border-t border-[var(--border-color)]">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNavigate(folder); }}
                      className="w-full py-3.5 rounded-2xl bg-amber-50 hover:bg-amber-600 text-amber-600 hover:text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2.5 group/btn border border-amber-200 hover:border-amber-600 shadow-sm"
                    >
                      Open Folder
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" strokeWidth={3.5}><path d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-8 group/header">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--accent-primary)]/60 flex items-center gap-3">
                <span className="w-8 h-[1px] bg-cyan-600/30 group-hover/header:w-16 transition-all duration-500"></span>
                Files
              </h3>

              <button
                onClick={handleSelectAllFiles}
                className="px-4 py-2 rounded-lg bg-[var(--accent-primary)]/10 hover:bg-cyan-100 text-[var(--accent-primary)] hover:text-cyan-700 text-[10px] font-black uppercase tracking-widest transition-all border border-cyan-100 hover:border-[var(--accent-primary)]/30 flex items-center gap-2"
              >
                {isAllFilesSelected ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    Deselect All Files
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    Select All Files
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 sm:gap-8">
              {sortedItems.files.map(file => (
                <div
                  key={file._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, file, 'file')}
                  onContextMenu={(e) => handleContextMenu(e, file, 'file')}
                  className="h-full"
                >
                  <FileCard
                    file={file}
                    className="h-full"
                    isSelected={selectedFiles.includes(file._id)}
                    downloadProgress={downloadProgress[file._id]}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectionMode) {
                        toggleSelection(null, file._id, 'file');
                      } else {
                        handleFileAction('preview', file);
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (!selectionMode) handleFileAction('preview', file);
                    }}
                    onSelectToggle={(e) => {
                      e.stopPropagation();
                      toggleSelection(e, file._id, 'file');
                    }}
                    onMoreOptions={(e) => handleContextMenu(e, file, 'file')}
                    onDownload={async (id) => {
                      await handleFileAction('download', file);
                    }}
                    onDelete={(id) => {
                      setDeleteModal({ show: true, file: file });
                    }}
                    onPreview={(fileObj) => handleFileAction('preview', file)}
                    onRename={(fileObj) => {
                      setRenameModal({ show: true, file: { ...file, type: 'file' }, newName: file.originalName || file.filename });
                    }}
                    onInspect={(fileObj) => setInfoModalItem({ ...file, type: 'file' })}
                    onMove={(fileObj) => {
                      setMoveModal({ show: true, items: [{ _id: file._id, type: 'file', name: file.originalName || file.filename }] });
                    }}
                    currentUserId={localStorage.getItem('userId')}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ContextMenu // 7. Render ContextMenu component
        {...contextMenu}
        onClose={() => setContextMenu({ ...contextMenu, show: false })}
      />

       {/* Selection Mode Header / Exit Selection */}
      {selectionMode && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-2xl bg-[var(--bg-primary)]/95 backdrop-blur-3xl border border-[var(--accent-primary)]/30 rounded-3xl p-4 shadow-xl shadow-[var(--accent-primary)]/20 animate-in slide-in-from-top-10">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-2xl bg-cyan-600/10 border border-cyan-600/20 flex items-center justify-center text-[var(--accent-primary)]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 4.5v15m7.5-7.5h-15" /></svg>
                 </div>
                 <div>
                    <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tighter">Selection Mode</h3>
                    <p className="text-[var(--accent-primary)]/70 text-[10px] uppercase font-bold tracking-widest">
                       Sharing to: <span className="text-[var(--text-primary)]">{targetCircle?.name || targetCircle?.email}</span>
                    </p>
                 </div>
              </div>
              <button 
                onClick={() => navigate('/shared')}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-rose-500/20"
              >
                Exit Selection
              </button>
           </div>
        </div>
      )}

      {/* Finalize Share Button (Selection Mode) */}
      {selectionMode && selectedFiles.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10">
           <button 
             onClick={async () => {
               try {
                 setLoading(true);
                 for (const fileId of selectedFiles) {
                   if (targetCircle.isIndividual) {
                     await filesAPI.shareFile(fileId, targetCircle.email);
                   } else {
                     await groupsAPI.shareWithGroup(fileId, targetCircle._id);
                   }
                 }
                 showToast(`Shared ${selectedFiles.length} updates to the circle`, 'success');
                 navigate('/shared');
               } catch (err) {
                 showToast(err.message || 'Sharing failed', 'error');
               } finally {
                 setLoading(false);
               }
             }}
             className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-full shadow-lg shadow-emerald-100 hover:shadow-emerald-200 transition-all hover:scale-105 flex items-center gap-3 active:scale-95"
           >
             Send to {targetCircle?.name || 'Circle'} ({selectedFiles.length})
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
           </button>
        </div>
      )}
      {infoModalItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md" onClick={() => setInfoModalItem(null)}>
          <div className="card w-96 max-w-full m-4 p-6 bg-[var(--bg-primary)] border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter mb-4">Properties</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
                <span className="text-[var(--text-muted)]">Name</span>
                <span className="text-[var(--text-primary)] truncate max-w-[200px]">{infoModalItem.name || infoModalItem.originalName || infoModalItem.filename}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
                <span className="text-[var(--text-muted)]">Type</span>
                <span className="text-[var(--text-primary)]">{infoModalItem.type === 'folder' ? 'Folder' : 'File'}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
                <span className="text-[var(--text-muted)]">Size</span>
                <span className="text-[var(--text-primary)]">{infoModalItem.type === 'folder' ? '12.4 MB' : formatFileSize(infoModalItem.size)}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
                <span className="text-[var(--text-muted)]">Location</span>
                <span className="text-[var(--text-primary)] truncate max-w-[200px] font-mono text-[11px]">
                  root{folderPath.length > 0 ? '/' : ''}{folderPath.map(f => f.name).join('/')}/{infoModalItem.originalName || infoModalItem.filename || infoModalItem.name}
                </span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setInfoModalItem(null)} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <PreviewModal
          file={previewFile}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={async (id) => {
            try {
              await filesAPI.downloadFile(id);
              showToast('Download started', 'success');
            } catch (error) {
              showToast('Download failed', 'error');
            }
          }}
        />
      )}

      {/* Rename Modal */}
      {renameModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md" onClick={() => setRenameModal({ show: false, file: null, newName: '' })}>
          <div className="card w-96 max-w-full m-4 p-6 bg-[var(--bg-primary)] border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Rename {renameModal.file?.type === 'folder' ? 'Folder' : 'File'}</h3>
            <input
              type="text"
              value={renameModal.newName}
              onChange={e => setRenameModal({ ...renameModal, newName: e.target.value })}
              className="input-field w-full mb-4 bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
              placeholder="Enter new name"
              autoFocus
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && renameModal.newName.trim()) {
                  try {
                    if (renameModal.file.type === 'folder') {
                      await foldersAPI.renameFolder(renameModal.file._id, renameModal.newName);
                    } else {
                      await filesAPI.renameFile(renameModal.file._id, renameModal.newName);
                    }
                    showToast(`${renameModal.file.type === 'folder' ? 'Folder' : 'File'} renamed successfully`, 'success');
                    setRenameModal({ show: false, file: null, newName: '' });
                    fetchContent();
                  } catch (error) {
                    showToast(error.message || 'Rename failed', 'error');
                  }
                } else if (e.key === 'Escape') {
                  setRenameModal({ show: false, file: null, newName: '' });
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRenameModal({ show: false, file: null, newName: '' })} className="btn-ghost">Cancel</button>
              <button
                onClick={async () => {
                  if (renameModal.newName.trim()) {
                    try {
                      if (renameModal.file.type === 'folder') {
                        await foldersAPI.renameFolder(renameModal.file._id, renameModal.newName);
                      } else {
                        await filesAPI.renameFile(renameModal.file._id, renameModal.newName);
                      }
                      showToast(`${renameModal.file.type === 'folder' ? 'Folder' : 'File'} renamed successfully`, 'success');
                      setRenameModal({ show: false, file: null, newName: '' });
                      fetchContent();
                    } catch (error) {
                      showToast(error.message || 'Rename failed', 'error');
                    }
                  }
                }}
                className="btn-primary"
                disabled={!renameModal.newName.trim()}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4" onClick={() => setDeleteModal({ show: false, file: null })}>
          <div className="card w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-inner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>

              <div className="text-center">
                <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">
                  Delete {deleteModal.isBulk ? `${deleteModal.count} Items` : (deleteModal.file?.type === 'folder' ? 'Folder' : 'File')}
                </h3>
                <p className="text-[var(--text-muted)] text-sm mt-2 leading-relaxed">
                  {deleteModal.isBulk
                    ? `Are you sure you want to permanently delete these ${deleteModal.count} selected items?`
                    : `Are you sure you want to delete "${deleteModal.file?.originalName || deleteModal.file?.filename || deleteModal.file?.name}"?`}
                  <br />
                  <span className="text-rose-500/60 font-bold uppercase text-[10px] tracking-widest mt-2 block">This action cannot be undone</span>
                </p>
              </div>

              <div className="w-full flex gap-3">
                <button
                  onClick={() => setDeleteModal({ show: false, file: null })}
                  className="flex-1 px-4 py-4 rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-muted)] font-bold uppercase tracking-wider hover:bg-[var(--bg-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (deleteModal.isBulk) {
                        await handleBulkDelete();
                      } else if (deleteModal.file.type === 'folder') {
                        await foldersAPI.deleteFolder(deleteModal.file._id);
                      } else {
                        await filesAPI.deleteFile(deleteModal.file._id);
                      }
                      showToast(`${deleteModal.isBulk ? 'Items' : (deleteModal.file.type === 'folder' ? 'Folder' : 'File')} deleted successfully`, 'success');
                      setDeleteModal({ show: false, file: null });
                      fetchContent();
                    } catch (error) {
                      showToast(error.message || 'Delete failed', 'error');
                    }
                  }}
                  className="flex-[2] px-4 py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest transition-all shadow-[0_10px_30px_rgba(244,63,94,0.3)]"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move Modal */}
      {/* Move Modal */}
      {moveModal.show && (
        <FolderPicker
          movingItemName={moveModal.items?.length > 1 ? `${moveModal.items.length} items` : (moveModal.items[0]?.name || moveModal.items[0]?.originalName || moveModal.items[0]?.filename)}
          onCancel={() => setMoveModal({ show: false, items: [], targetId: '' })}
          onMove={async (targetId) => {
            try {
              const promises = moveModal.items.map(item => {
                if (item.type === 'folder') {
                  return foldersAPI.moveFolder(item._id, targetId);
                }
                return filesAPI.moveFile(item._id, targetId);
              });

              await Promise.all(promises);
              showToast(`Moved ${moveModal.items.length} item(s) successfully`, 'success');
              fetchContent();
              setMoveModal({ show: false, items: [], targetId: '' });
              clearSelection();
            } catch (error) {
              showToast(error.message || 'Move failed', 'error');
            }
          }}
        />
      )}
      {/* Popup / Modal for New Folder */}
      {isCreatingFolder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsCreatingFolder(false)}></div>
          <div className="relative w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] shadow-inner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Create New Folder</h2>
                <p className="text-[var(--text-muted)] text-sm mt-1 uppercase font-bold tracking-widest">Organize your digital space</p>
              </div>

              <div className="w-full space-y-4">
                <div className="relative group">
                  <input
                    autoFocus
                    type="text"
                    className="w-full bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-2xl px-6 py-4 text-[var(--text-primary)] font-bold transition-all focus:border-[var(--accent-primary)] focus:bg-[var(--bg-primary)] outline-none placeholder-[var(--text-muted)]"
                    placeholder="E.g. Summer Memories"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createFolder()}
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 right-4 opacity-50 group-focus-within:opacity-100 transition-opacity">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-[var(--accent-primary)]" strokeWidth={3}><path d="M5 12h14" /></svg>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setIsCreatingFolder(false)} className="flex-1 px-4 py-4 rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-muted)] font-bold uppercase tracking-wider hover:bg-[var(--bg-primary)] transition-colors">Cancel</button>
                  <button onClick={createFolder} className="flex-[2] px-4 py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-[var(--accent-primary)]/20">Create Now</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {shareModal.show && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShareModal({ show: false, file: null, email: '' })}></div>
          <div className="relative w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight">Share File</h2>
                    <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-widest truncate max-w-[200px]">{shareModal.file?.originalName}</p>
                  </div>
                </div>
                <button onClick={() => setShareModal({ show: false, file: null, email: '' })} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="relative group">
                <input
                  autoFocus
                  type="text"
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] transition-all focus:border-[var(--accent-primary)] outline-none placeholder-[var(--text-muted)]"
                  placeholder="Search Users or Enter Email..."
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" strokeWidth={2.5}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>

              {/* Internal User List / Results */}
              <div className="max-h-64 overflow-y-auto custom-scrollbar pr-1 space-y-1">
                {isSearchingUsers ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3 opacity-50">
                    <div className="w-6 h-6 border-2 border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Scanning Network</span>
                  </div>
                ) : foundUsers.length > 0 ? (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-primary)]/60 mb-2 px-1">Network Results</p>
                    {foundUsers.map(user => (
                      <div key={user._id} className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-transparent hover:border-[var(--border-color)] transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] overflow-hidden shadow-sm">
                            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : (user.name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[var(--text-primary)] leading-none mb-1">{user.name || user.email}</span>
                            <span className="text-[9px] text-[var(--text-muted)] font-medium">{user.email}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleShareWithUser(user)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--accent-primary)] hover:text-white transition-all border border-[var(--accent-primary)]/20"
                        >
                          Send
                        </button>
                      </div>
                    ))}
                  </>
                ) : userSearchQuery.length >= 2 ? (
                  <div className="text-center py-6 opacity-40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">No matching identifiers found</p>
                  </div>
                ) : userSearchQuery.includes('@') ? (
                  <div className="p-3 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-[var(--accent-primary)]">Direct Share</span>
                        <span className="text-[9px] text-[var(--text-muted)]">{userSearchQuery}</span>
                    </div>
                    <button 
                      onClick={() => handleShareWithUser({ email: userSearchQuery, name: userSearchQuery })}
                      className="px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[var(--accent-primary)]/80 shadow-md"
                    >
                      Send
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 py-2">
                    {availableGroups.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-primary)]/60 px-1">Your Circles</p>
                        <div className="grid grid-cols-1 gap-2">
                          {availableGroups.map(group => (
                            <div key={group._id} className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-transparent hover:border-[var(--border-color)] transition-all group">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-500 border border-indigo-500/20 shadow-sm">
                                   GRP
                                </div>
                                <div>
                                  <span className="text-[11px] font-bold text-[var(--text-primary)] block leading-none mb-1">{group.name}</span>
                                  <span className="text-[9px] text-[var(--text-muted)] block">{group.members.length} Members</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleShareWithGroup(group)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20"
                              >
                                Share
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {recentUsers.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]/60 px-1">Recently Shared</p>
                        {recentUsers.map(user => (
                          <div key={user.email} className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--bg-secondary)] transition-all group border border-transparent hover:border-[var(--border-color)]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)] shadow-sm">
                                {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : (user.name || user.email).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-[11px] font-bold text-[var(--text-primary)] block leading-none mb-1">{user.name || user.email}</span>
                                <span className="text-[9px] text-[var(--text-muted)] block">{user.email}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleShareWithUser(user)}
                              className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--accent-primary)] hover:text-white transition-all border border-[var(--border-color)]"
                            >
                              Send
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 opacity-40">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Start typing to find users...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
