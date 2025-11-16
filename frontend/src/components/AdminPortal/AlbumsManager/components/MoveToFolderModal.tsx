/**
 * Move to Folder Modal
 * Modal for selecting a folder to move an album into
 */

import React from 'react';
import { AlbumFolder } from '../types';
import { CloseIcon } from '../../../icons';

interface MoveToFolderModalProps {
  albumName: string;
  folders: AlbumFolder[];
  currentFolderId?: number | null;
  onClose: () => void;
  onMoveToFolder: (albumName: string, folderId: number | null) => void;
}

const MoveToFolderModal: React.FC<MoveToFolderModalProps> = ({
  albumName,
  folders,
  currentFolderId,
  onClose,
  onMoveToFolder,
}) => {
  const handleMove = (folderId: number | null) => {
    onMoveToFolder(albumName, folderId);
    onClose();
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="move-folder-modal">
        <div className="move-folder-modal-header">
          <h3>Move "{albumName}" to Folder</h3>
          <button onClick={onClose} className="modal-close-btn">
            <CloseIcon width="20" height="20" />
          </button>
        </div>
        <div className="move-folder-modal-body">
          <p className="move-folder-hint">
            Select a destination folder or choose Uncategorized to remove from any folder.
          </p>
          
          <div className="folder-list">
            {/* Uncategorized option */}
            <button
              className={`folder-option ${currentFolderId === null ? 'current' : ''}`}
              onClick={() => handleMove(null)}
              disabled={currentFolderId === null}
            >
              <span className="folder-option-icon">📚</span>
              <span className="folder-option-name">Uncategorized</span>
              {currentFolderId === null && (
                <span className="current-badge">Current</span>
              )}
            </button>
            
            {/* Folder options */}
            {folders.map((folder) => (
              <button
                key={folder.id}
                className={`folder-option ${currentFolderId === folder.id ? 'current' : ''}`}
                onClick={() => handleMove(folder.id)}
                disabled={currentFolderId === folder.id}
              >
                <span className="folder-option-icon">
                  {folder.published ? '📁' : '🔒'}
                </span>
                <span className="folder-option-name">{folder.name}</span>
                {currentFolderId === folder.id && (
                  <span className="current-badge">Current</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default MoveToFolderModal;

