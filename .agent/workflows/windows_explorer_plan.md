# Windows-like File Explorer Plan

## 1. Backend Architecture
- [ ] **Create Folder Model**: `models/Folder.js` (name, userId, parentId).
- [ ] **Update File Model**: Add `folderId` key to `models/File.js`.
- [ ] **Folder Routes**: Create `routes/folders.js`.
    - `POST /` - Create new folder.
    - `GET /` - Get all folders for user (or by parentId).
    - `PATCH /:id` - Rename or move folder.
    - `DELETE /:id` - Delete folder (and contents?).
- [ ] **Update File Routes**:
    - Update `upload` to accept `folderId`.
    - Update `move` to support moving to `folderId`.

## 2. Frontend Components
- [ ] **Folder Icon Component**: Visual representation of folders.
- [ ] **Explorer Interface**:
    - State management for `currentFolderId` and `folderStack` (history).
    - Breadcrumb navigation component.
    - "New Folder" modal/inline edit.
    - Context Menu (Right-click) for folders and files.
- [ ] **Drag and Drop**:
    - Implement drag drop zones for moving files into folders.
- [ ] **Upload Integration**:
    - Update global uploader to allow picking a destination folder.

## 3. Operations
- [ ] **Navigation**: Enter/Exit folders.
- [ ] **CRUD**:
    - Create Folder
    - Rename File/Folder
    - Delete File/Folder
    - Move File/Folder (Drag & Drop or Cut/Paste)
    - Copy File (Duplicate)

## 4. Mobile Responsiveness
- [ ] Touch gestures (long press for context menu).
- [ ] Adaptive Grid/List layout.
