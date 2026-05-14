import { formatFileSize, formatDate } from './fileUtils';

export const generateAIResponse = (query, files) => {
    const lowerQuery = query.toLowerCase();

    // Large files handler - MUST come before file search
    if ((lowerQuery.includes('large') || lowerQuery.includes('largest') || lowerQuery.includes('biggest') || lowerQuery.includes('big')) &&
        (lowerQuery.includes('show') || lowerQuery.includes('find') || lowerQuery.includes('list') || lowerQuery.includes('files'))) {
        const sortedFiles = [...files].sort((a, b) => (b.size || 0) - (a.size || 0));
        const largeFiles = sortedFiles.slice(0, 10);

        if (largeFiles.length > 0) {
            const totalLargeSize = largeFiles.reduce((sum, f) => sum + (f.size || 0), 0);
            return `**Largest Files:**\n\n${largeFiles
                .map((f, i) => `${i + 1}. ${f.originalName || f.filename}\n   ${formatFileSize(f.size || 0)} • ${formatDate(f.uploadedAt)}`)
                .join('\n\n')}\n\nTotal: ${formatFileSize(totalLargeSize)}\n\n💡 Consider deleting or compressing unused large files.`;
        }
        return '✅ Great job! You don\'t have any very large files. Your storage is optimized!';
    }

    // Statistics query
    if (lowerQuery.includes('statistic') || lowerQuery.includes('stats') || lowerQuery.includes('summary')) {
        const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
        const byType = {};
        files.forEach((file) => {
            const ext = ((file.originalName || file.filename || '').split('.').pop() || 'other').toLowerCase();
            byType[ext] = (byType[ext] || 0) + 1;
        });

        const topTypes = Object.entries(byType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        let typeBreakdown = topTypes.length > 0
            ? `\n\n📊 Top file types:\n${topTypes.map(([type, count], i) => `${i + 1}. .${type}: ${count} files`).join('\n')}`
            : '';

        return `**Storage Statistics:**\n\n• Total Files: ${files.length}\n• Total Storage: ${formatFileSize(totalSize)}\n• Average File Size: ${formatFileSize(files.length > 0 ? totalSize / files.length : 0)}${typeBreakdown}`;
    }

    // Enhanced file search with fuzzy matching and type detection
    if (lowerQuery.includes('find') || lowerQuery.includes('search') || lowerQuery.includes('file') || lowerQuery.includes('where') || lowerQuery.includes('show') || lowerQuery.includes('list')) {
        // Check for specific commands first
        if (lowerQuery.includes('organize') || lowerQuery.includes('organiz')) {
            // Pass
        } else if (lowerQuery.includes('largest') || lowerQuery.includes('large') || lowerQuery.includes('big')) {
            // Pass
        } else {
            let searchTerm = query;
            searchTerm = searchTerm.replace(/^(find|search|show|list|where|are|is)\s+/gi, '');
            searchTerm = searchTerm.replace(/\s+(files?|file|for|my|the)$/gi, '');
            searchTerm = searchTerm.trim();

            if (!searchTerm || searchTerm.length < 1) {
                return `I can help you find files! Try asking:\n• "Find all my documents"\n• "Search for resume"\n• "Where are my images?"\n• "Show PDF files"\n• "List videos"`;
            }

            const fileTypes = {
                'pdf': ['pdf'],
                'document': ['doc', 'docx', 'txt', 'rtf', 'md'],
                'image': ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'],
                'video': ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'flv', 'webm'],
                'audio': ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'],
                'spreadsheet': ['xls', 'xlsx', 'csv'],
                'presentation': ['ppt', 'pptx'],
                'archive': ['zip', 'rar', '7z', 'tar', 'gz'],
                'code': ['js', 'ts', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'xml'],
            };

            let typeFilter = null;
            for (const [type, extensions] of Object.entries(fileTypes)) {
                if (lowerQuery.includes(type)) {
                    typeFilter = extensions;
                    break;
                }
            }

            const matches = files.filter((file) => {
                const fileName = (file.originalName || file.filename || '').toLowerCase();
                const ext = fileName.split('.').pop();

                if (typeFilter && !typeFilter.includes(ext)) {
                    return false;
                }

                const termLower = searchTerm.toLowerCase();
                return fileName.includes(termLower) || ext.includes(termLower);
            });

            if (matches.length > 0) {
                const totalSize = matches.reduce((sum, f) => sum + (f.size || 0), 0);
                return `✅ Found ${matches.length} file(s):\n\n${matches
                    .slice(0, 10)
                    .map((f, i) => `${i + 1}. ${f.originalName || f.filename} (${formatFileSize(f.size || 0)})`)
                    .join('\n')}${matches.length > 10 ? `\n\n...and ${matches.length - 10} more files.` : ''}\n\n📦 Total size: ${formatFileSize(totalSize)}`;
            }

            const suggestions = files.length > 0
                ? `\n\n💡 Suggestions:\n• Try file types: "find images", "show PDFs", "list videos"\n• Use partial filename matches\n• Check recent uploads`
                : `\n\nYou don't have any files yet. Upload some files to get started!`;

            return `❌ No files found matching "${searchTerm}".${suggestions}`;
        }
    }

    // Storage questions with detailed analysis
    if (lowerQuery.includes('storage') || lowerQuery.includes('space') || lowerQuery.includes('used') || lowerQuery.includes('capacity') || lowerQuery.includes('how much')) {
        const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
        const fileCount = files.length;

        const byType = {};
        files.forEach((file) => {
            const ext = ((file.originalName || file.filename || '').split('.').pop() || 'other').toLowerCase();
            byType[ext] = (byType[ext] || 0) + (file.size || 0);
        });

        const topTypes = Object.entries(byType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        let typeBreakdown = '';
        if (topTypes.length > 0) {
            typeBreakdown = `\n\n📊 Storage by type:\n${topTypes.map(([type, size], i) => `${i + 1}. .${type}: ${formatFileSize(size)} (${((size / totalSize) * 100).toFixed(1)}%)`).join('\n')}`;
        }

        const percentage = ((totalSize / (10 * 1024 * 1024 * 1024)) * 100).toFixed(1); // Assuming 10GB quota

        return `**Storage Usage:**\n\n• Total: ${formatFileSize(totalSize)}\n• Files: ${fileCount}\n• Usage: ~${percentage}% of quota${typeBreakdown}\n\nWould you like me to:\n• Find large files to delete?\n• Help organize files?\n• Optimize storage?`;
    }

    // Organization suggestions
    if (lowerQuery.includes('clean') || lowerQuery.includes('tidy') || lowerQuery.includes('organize') || lowerQuery.includes('suggestion')) {
        const suggestions = [];
        const byType = {};

        files.forEach((file) => {
            const ext = (file.originalName || file.filename || '').split('.').pop()?.toLowerCase() || 'other';
            byType[ext] = (byType[ext] || 0) + 1;
        });

        const topTypes = Object.entries(byType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        if (topTypes.length > 0 && topTypes[0][1] > 5) {
            suggestions.push(`📁 Create folder "Documents" for ${topTypes[0][1]} ${topTypes[0][0]} files`);
        }

        if (files.length > 20) {
            suggestions.push(`🗂️ Organize ${files.length} files into folders by type or date`);
        }

        const filesWithoutFolders = files.filter(f => !f.folder);
        if (filesWithoutFolders.length > 10) {
            suggestions.push(`📂 ${filesWithoutFolders.length} files are not organized in folders`);
        }

        return suggestions.length > 0
            ? `**Organization Suggestions:**\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nI can help you create folders and organize files!`
            : 'Your files are well organized! Keep up the good work!';
    }

    // Recent files query
    if (lowerQuery.includes('recent') || lowerQuery.includes('latest') || lowerQuery.includes('new')) {
        const sortedByDate = [...files].sort((a, b) => {
            const dateA = new Date(a.uploadedAt || 0);
            const dateB = new Date(b.uploadedAt || 0);
            return dateB - dateA;
        });

        const recent = sortedByDate.slice(0, 10);
        if (recent.length > 0) {
            return `**Recent Files:**\n\n${recent
                .map((f, i) => `${i + 1}. ${f.originalName || f.filename}\n   ${formatFileSize(f.size || 0)} • ${formatDate(f.uploadedAt)}`)
                .join('\n\n')}`;
        }
        return '📭 You don\'t have any files yet. Upload some files to get started!';
    }

    // Duplicate files detection
    if (lowerQuery.includes('duplicate') || lowerQuery.includes('duplicates') || lowerQuery.includes('same')) {
        const nameMap = {};
        files.forEach((file) => {
            const name = (file.originalName || file.filename || '').toLowerCase();
            if (!nameMap[name]) nameMap[name] = [];
            nameMap[name].push(file);
        });

        const duplicates = Object.entries(nameMap).filter(([, fileList]) => fileList.length > 1);
        if (duplicates.length > 0) {
            const totalDuplicateSize = duplicates.reduce((sum, [, fileList]) => {
                return sum + fileList.reduce((fileSum, f) => fileSum + (f.size || 0), 0);
            }, 0);

            return `**Duplicate Files Found:**\n\n${duplicates
                .slice(0, 10)
                .map(([name, fileList], i) => `${i + 1}. "${name}"\n   Appears ${fileList.length} times (${formatFileSize(fileList.reduce((s, f) => s + (f.size || 0), 0))})`)
                .join('\n\n')}\n\nTotal duplicate storage: ${formatFileSize(totalDuplicateSize)}\n\nConsider deleting duplicates to free up space.`;
        }
        return '✅ Excellent! No duplicate files found. Your storage is clean!';
    }

    // Help/General
    if (lowerQuery.includes('help') || lowerQuery.includes('what can you do') || lowerQuery.includes('capabilities')) {
        return `**AI Assistant Capabilities:**\n\n**Finding Files**\n• "Find all documents"\n• "Show PDF files"\n\n**Storage Analysis**\n• "How much storage am I using?"\n• "Show statistics"\n\n**Organization**\n• "Help organize files"\n• "Find duplicates"\n\n**Optimization**\n• "Show largest files"\n• "Give recommendations"\n\nJust ask in natural language!`;
    }

    // Greetings
    if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
        const greeting = files.length > 0
            ? `You have ${files.length} files in your storage. How can I help you today?`
            : `Welcome! You're just getting started. Upload some files and I'll help you manage them!`;
        return `👋 Hello! ${greeting}`;
    }

    // Security/privacy questions
    if (lowerQuery.includes('security') || lowerQuery.includes('encrypt') || lowerQuery.includes('privacy') || lowerQuery.includes('secure') || lowerQuery.includes('safe')) {
        return `**Security & Privacy:**\n\nZero-Knowledge Encryption\n• Files encrypted on your device\n• Keys never leave your device\n• We cannot access your files\n\nAES-256 Encryption\n• Industry-standard security\n• Unique keys per file\n• PBKDF2 key derivation\n\nPrivacy Protection\n• Complete data privacy\n• Protection from breaches\n• You own your data\n\nYour data is completely safe!`;
    }

    // Default response
    const suggestions = files.length > 0
        ? `I can help you manage your ${files.length} file(s). Try:\n• "Find files"\n• "Storage statistics"\n• "Organize files"\n• "Show recommendations"`
        : `Get started by uploading files. Then I can help you:\n• Organize files\n• Analyze storage\n• Find duplicates`;

    return `🤔 I'm not sure how to help with that. ${suggestions}\n\n💡 Try: "help" to see all my capabilities!`;
};
