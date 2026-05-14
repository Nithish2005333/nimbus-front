import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { filesAPI, groupsAPI, userAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import FileIcon from '../components/FileIcon';
import { formatFileSize, formatDate } from '../utils/fileUtils';
import PreviewModal from '../components/PreviewModal';

export default function ShareHub() {
  const [files, setFiles] = useState([]);
  const [recentShares, setRecentShares] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Group Modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);

  const { showToast } = useToast();
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    fetchData(true);
    const poller = setInterval(() => fetchData(false), 10000);
    return () => clearInterval(poller);
  }, []);

  const fetchData = async (isFirstLoad = false) => {
    try {
      if (isFirstLoad) setLoading(true);
      const [filesData, recentData, groupsData] = await Promise.all([
        filesAPI.getFiles(),
        recentDataFallback(), // Some files might missing metadata let's get recent explicitly
        groupsAPI.getGroups()
      ]);

      // Shared files = (Shared with me) OR (Shared by me)
      const allFiles = filesData.files || [];
      const sharedRelevant = allFiles.filter(f => {
        const isMeOwner = (f.userId?._id || f.userId) === currentUserId;
        const isSharedDirectlyWithMe = f.sharedWith?.some(s => s.userId === currentUserId);
        const isSharedToGroup = (f.sharedWithGroups?.length > 0);
        
        return !isMeOwner || isSharedToGroup || f.sharedWith?.length > 0;
      });

      setFiles(sharedRelevant);
      setRecentShares(recentData || []);
      setGroups(groupsData.groups || []);
    } catch (error) {
      console.error('ShareHub refresh error:', error);
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  };

  const recentDataFallback = async () => {
     try {
       const res = await filesAPI.getRecentShares();
       return res.shares;
     } catch (e) { return []; }
  };

  // Search users for group
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (userSearch.length >= 2) {
        try {
          const response = await userAPI.searchUsers(userSearch);
          if (response.success) {
            setFoundUsers(response.users.filter(u => u._id !== currentUserId));
          }
        } catch (error) {
          console.error('Search users error:', error);
        }
      } else {
        setFoundUsers([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [userSearch]);

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      showToast('Name and at least one member required', 'warning');
      return;
    }

    try {
      const emails = selectedUsers.map(u => u.email);
      await groupsAPI.createGroup(groupName, emails);
      showToast('Group created successfully', 'success');
      setShowGroupModal(false);
      setGroupName('');
      setSelectedUsers([]);
      fetchData();
    } catch (error) {
      showToast(error.message || 'Failed to create group', 'error');
    }
  };

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(f => (f.originalName || f.filename).toLowerCase().includes(q));
  }, [files, searchQuery]);

  const scrollRef = useRef(null);
  const [selectedCircle, setSelectedCircle] = useState(null);

  const activeCircleFiles = useMemo(() => {
    if (!selectedCircle) return [];
    let filtered = files;
    
    if (selectedCircle !== 'all') {
      filtered = files.filter(f => {
        if (!selectedCircle.isIndividual) {
          return f.sharedWithGroups?.some(g => g.groupId === selectedCircle._id);
        }
        // Match files shared BY this user TO me OR files shared BY me TO this user
        const isFromHim = (f.userId?._id || f.userId) === selectedCircle.userId;
        const isToHim = f.sharedWith?.some(s => s.userId === selectedCircle.userId);
        return isFromHim || isToHim;
      });
    }
    
    return [...filtered].sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
  }, [selectedCircle, files]);

  // Derive Individual Contacts from shared files
  const contacts = useMemo(() => {
    const userMap = new Map();
    
    files.forEach(f => {
      // 1. Files shared WITH me (Sender is owner)
      const sender = f.userId;
      if (sender && sender._id && sender._id !== currentUserId) {
         if (!userMap.has(sender._id)) {
           userMap.set(sender._id, { 
             _id: sender._id, 
             name: sender.name || (sender.email ? sender.email.split('@')[0] : 'User'), 
             avatar: sender.avatar,
             email: sender.email || '',
             isIndividual: true,
             userId: sender._id
           });
         }
      }
      
      // 2. Files shared BY me directly to someone (Recipient)
      if ((f.userId?._id || f.userId) === currentUserId) {
         f.sharedWith?.forEach(s => {
            const recipient = s.userId; // This is now populated
            if (recipient && recipient._id && recipient._id !== currentUserId) {
               if (!userMap.has(recipient._id)) {
                 userMap.set(recipient._id, {
                   _id: recipient._id,
                   name: recipient.name || (recipient.email ? recipient.email.split('@')[0] : 'User'),
                   avatar: recipient.avatar,
                   email: recipient.email || '',
                   isIndividual: true,
                   userId: recipient._id
                 });
               }
            }
         });
      }
    });
    
    return Array.from(userMap.values());
  }, [files, currentUserId]);

  // Auto-scroll to bottom of "chat" on new files or group switch
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [activeCircleFiles, selectedCircle]);

  return (
    <div className="absolute inset-0 bg-[var(--bg-primary)] flex overflow-hidden z-10">
      {/* Sidebar - Contacts/Groups */}
      <div className={`
        ${selectedCircle ? 'hidden md:flex' : 'flex'}
        w-full md:w-[350px] lg:w-[400px] border-r border-[var(--border-color)] flex-col bg-[var(--bg-secondary)] shrink-0
      `}>
        {/* Sidebar Header */}
        <div className="p-4 bg-[var(--bg-primary)] flex items-center justify-between border-b border-[var(--border-color)]">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] font-black shadow-sm">
                {localStorage.getItem('userName')?.[0] || 'U'}
              </div>
              <h1 className="text-[var(--text-primary)] font-bold text-sm">Circles</h1>
           </div>
           <button 
             onClick={() => setShowGroupModal(true)}
             className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all border border-emerald-200 active:scale-95 group shadow-sm"
             title="Create New Group"
           >
             <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4.5v15m7.5-7.5h-15" /></svg>
             <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">New Group</span>
           </button>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-[var(--border-color)]">
          <div className="relative">
             <input 
               type="text" 
               placeholder="Search circles..."
               className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm py-2 pl-12 pr-4 rounded-xl outline-none placeholder:text-[var(--text-muted)] border border-[var(--border-color)] focus:border-[var(--accent-primary)] transition-all shadow-sm"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
             <svg className="w-4 h-4 absolute left-4 top-2.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Default "All Shared" */}
          <div 
            onClick={() => setSelectedCircle('all')}
            className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-[var(--bg-primary)] transition-colors border-b border-[var(--border-color)]/30 ${selectedCircle === 'all' ? 'bg-[var(--bg-primary)]' : ''}`}
          >
             <div className="w-12 h-12 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white shadow-md">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V9h2v7zm4 0h-2V7h2v9z"/></svg>
             </div>
             <div className="flex-1">
                <div className="flex items-center justify-between">
                   <h3 className="text-[var(--text-primary)] font-bold">All Shared Library</h3>
                   <span className="text-[10px] text-[var(--text-muted)] font-bold">{files.length}</span>
                </div>
                <p className="text-[var(--text-muted)] text-xs truncate">Every file shared with you</p>
             </div>
          </div>

          {groups.map(group => (
            <div 
              key={group._id}
              onClick={() => setSelectedCircle(group)}
              className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-[var(--bg-primary)] transition-colors border-b border-[var(--border-color)]/30 ${selectedCircle?._id === group._id ? 'bg-[var(--bg-primary)]' : ''}`}
            >
               <div className="w-12 h-12 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] text-lg font-bold shadow-sm">
                  {group.name[0]}
               </div>
               <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                     <h3 className="text-[var(--text-primary)] font-bold truncate">{group.name}</h3>
                     <span className="text-[10px] text-[var(--text-muted)] font-black">GROUP</span>
                  </div>
                  <p className="text-[var(--text-muted)] text-xs truncate">Click to view circle shared files</p>
               </div>
            </div>
          ))}

          {/* CONTACTS / INDIVIDUALS */}
          {contacts.map(contact => (
            <div 
              key={contact._id}
              onClick={() => setSelectedCircle(contact)}
              className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-[var(--bg-primary)] transition-colors border-b border-[var(--border-color)]/30 ${selectedCircle?.userId === contact._id ? 'bg-[var(--bg-primary)]' : ''}`}
            >
               <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] font-bold shadow-sm">
                  {contact.avatar ? <img src={contact.avatar} className="w-full h-full object-cover" /> : contact.name[0]}
               </div>
               <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                     <h3 className="text-[var(--text-primary)] font-bold truncate">{contact.name}</h3>
                     <span className="text-[10px] text-[var(--accent-primary)] font-black">DIRECT</span>
                  </div>
                  <p className="text-[var(--text-muted)] text-xs truncate">{contact.email}</p>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`
        ${!selectedCircle ? 'hidden md:flex' : 'flex'}
        flex-1 flex-col bg-[var(--bg-primary)] relative
      `}>
        {selectedCircle ? (
          <>
             {/* Header */}
            <div className="p-4 bg-[var(--bg-secondary)] flex items-center justify-between border-l border-[var(--border-color)] z-10 shrink-0 shadow-sm">
               <div className="flex items-center gap-4">
                  {/* Back button for mobile */}
                  <button 
                    onClick={() => setSelectedCircle(null)}
                    className="md:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] font-bold shadow-sm">
                    {selectedCircle === 'all' ? 'A' : (selectedCircle.name?.[0] || 'G')}
                  </div>
                  <div>
                    <h2 className="text-[var(--text-primary)] font-bold text-sm">{selectedCircle === 'all' ? 'All Shared Library' : selectedCircle.name}</h2>
                    <p className="text-[10px] text-[var(--accent-primary)] font-bold uppercase tracking-widest mt-0.5 animate-pulse">Online Workspace</p>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <svg className="w-5 h-5 text-[var(--text-muted)] cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <svg className="w-5 h-5 text-[var(--text-muted)] cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" /></svg>
               </div>
            </div>

            {/* Messages / Files Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[var(--bg-primary)] relative"
            >
               {/* THEMED BACKGROUND DOODLE */}
               <div 
                 className="absolute inset-0 opacity-[0.05] pointer-events-none"
                 style={{ 
                   backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
                   backgroundRepeat: 'repeat',
                 }}
               />
               
               <div className="relative z-10 space-y-4">
                 {activeCircleFiles.map(file => {
                 const isMe = (file.userId?._id || file.userId) === currentUserId;
                 return (
                    <div key={file._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-md rounded-2xl p-2 shadow-2xl relative transition-all hover:scale-[1.01] ${
                          isMe 
                           ? 'bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[var(--text-primary)] rounded-tr-none' 
                           : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-tl-none'
                      }`}>
                         {/* Tail hack using absolute positioning */}
                         <div className={`absolute top-0 w-3 h-3 ${
                           isMe 
                             ? 'right-[-8px] border-l-[8px] border-l-[var(--accent-primary)]/10 border-b-[8px] border-b-transparent' 
                             : 'left-[-8px] border-r-[8px] border-r-[var(--bg-secondary)] border-b-[8px] border-b-transparent'
                         }`} />

                         {/* Sender Info (only for groups and received) */}
                         {!isMe && (
                           <p className="text-[10px] font-black tracking-widest uppercase text-[var(--accent-primary)] mb-1.5 pl-2 opacity-80">
                             {file.userId?.name || file.userId?.email?.split('@')[0]}
                           </p>
                         )}
                        
                        <div 
                          onClick={() => setPreviewFile(file)}
                          className="flex items-center gap-4 p-3 bg-[var(--bg-primary)]/50 rounded-lg cursor-pointer hover:bg-[var(--bg-primary)]/80 transition-colors"
                        >
                          <div className="w-12 h-12 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
                             <FileIcon fileName={file.originalName || file.filename} className="w-8 h-8" />
                          </div>
                          <div className="min-w-0 pr-8">
                             <h4 className="text-[var(--text-primary)] text-sm font-bold truncate">{file.originalName || file.filename}</h4>
                             <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase font-black">{formatFileSize(file.size)}</p>
                          </div>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); filesAPI.downloadFile(file._id); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 15l-4-4m8 0l-4 4m0 0V3m-9 13v1a3 3 0 003 3h12a3 3 0 003-3v-1" /></svg>
                          </button>
                        </div>

                        {/* Timestamp */}
                        <div className="flex justify-end mt-1 px-1">
                           <span className="text-[9px] text-[var(--text-muted)] uppercase font-black">{formatDate(file.uploadedAt)}</span>
                        </div>
                     </div>
                   </div>
                 );
               })}

               {activeCircleFiles.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-4 py-20 relative z-10">
                    <div className="w-20 h-20 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center">
                       <svg className="w-10 h-10 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5l5 5 5-5m-5 5V3"/></svg>
                    </div>
                    <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">No files shared in this circle yet.</p>
                 </div>
               )}
               </div>
            </div>
            {/* Footer / Input Area */}
            {selectedCircle !== 'all' && (
              <div className="p-4 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] flex items-center gap-3 shadow-inner">
                 <div className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl flex items-center px-4 py-2 text-[var(--text-muted)]">
                    <span className="text-sm">Click the icon to share a new file to this circle...</span>
                 </div>
                 <button 
                   onClick={() => navigate('/files', { state: { selectionMode: true, targetCircle: selectedCircle } })}
                   className="w-12 h-12 rounded-full bg-[var(--accent-primary)] hover:opacity-90 flex items-center justify-center text-white transition-all shadow-lg active:scale-90"
                   title="Select & Share"
                 >
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 4.5v15m7.5-7.5h-15" /></svg>
                 </button>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-[var(--bg-primary)] text-center p-12">
             <div className="w-64 h-64 opacity-50 mb-8 bg-[var(--accent-primary)]/5 rounded-full flex items-center justify-center">
                <svg className="w-32 h-32 text-[var(--text-muted)]/30" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
             </div>
             <h2 className="text-3xl font-light text-[var(--text-primary)] mb-2">Nimbus Cloud Share</h2>
             <p className="text-[var(--text-muted)] text-sm max-w-sm mb-8 font-medium">Select a circle to view shared files or start a new collaboration. All communications are end-to-end encrypted.</p>
             
             <button 
               onClick={() => setShowGroupModal(true)}
               className="flex items-center gap-2 px-8 py-3 bg-[var(--accent-primary)] hover:opacity-90 text-white rounded-xl font-bold transition-all shadow-lg shadow-[var(--accent-primary)]/20 hover:-translate-y-1 active:scale-95"
             >
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4.5v15m7.5-7.5h-15" /></svg>
               Create New Circle
             </button>

             <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
                <svg className="w-3 h-3 text-[var(--text-muted)]/40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.39 2.1-1.39 1.47 0 2.01.59 2.1 1.58h1.85c-.05-1.53-1.11-2.48-2.56-2.7V4.5h-2v2.39c-1.54.35-2.61 1.42-2.61 2.7 0 1.9 1.58 2.85 3.8 3.4 2.12.53 2.52 1.2 2.52 1.9 0 1.1-.91 1.63-2.1 1.63-1.77 0-2.38-.83-2.51-1.63h-1.89c.07 1.63 1.34 2.53 2.71 2.78V20h2v-2.1c1.55-.3 2.81-1.1 2.81-2.73 0-2.14-1.76-2.73-3.73-3.03z"/></svg>
                <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">End-to-End Encrypted</span>
             </div>
          </div>
        )}
      </div>

      {/* Group Creation Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[var(--bg-primary)]/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">New Circle</h2>
              <button 
                onClick={() => setShowGroupModal(false)} 
                className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Circle Name</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Marketing Team"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl h-12 px-4 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Add Members</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl h-12 px-4 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all outline-none"
                  />
                  
                   {foundUsers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-2xl z-[110] max-h-48 overflow-y-auto">
                      {foundUsers.map(user => (
                        <div 
                          key={user._id}
                          onClick={() => {
                            if (!selectedUsers.find(u => u._id === user._id)) {
                              setSelectedUsers([...selectedUsers, user]);
                            }
                            setUserSearch('');
                            setFoundUsers([]);
                          }}
                          className="p-3 hover:bg-[var(--bg-primary)] flex items-center gap-3 cursor-pointer border-b border-[var(--border-color)] last:border-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[10px] text-[var(--text-primary)] font-bold shadow-sm">
                            {user.name?.[0].toUpperCase() || user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[var(--text-primary)]">{user.name || user.email}</p>
                            <p className="text-[9px] text-[var(--text-muted)] font-medium">{user.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 py-2">
                  {selectedUsers.map(user => (
                    <div key={user._id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-[10px] font-bold">
                      {user.email}
                      <button onClick={() => setSelectedUsers(selectedUsers.filter(u => u._id !== user._id))} className="text-[var(--accent-primary)] hover:opacity-80">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button 
                onClick={handleCreateGroup}
                className="w-full h-12 mt-4 bg-[var(--accent-primary)] hover:opacity-90 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-[var(--accent-primary)]/20"
              >
                Create Circle
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
