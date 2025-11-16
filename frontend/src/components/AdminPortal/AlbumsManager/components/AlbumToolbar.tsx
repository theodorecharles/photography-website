/**
 * AlbumToolbar Component
 * Toolbar with folder creation and save/cancel buttons
 */

import React from 'react';
import { FolderPlusIcon } from '../../../icons';

interface AlbumToolbarProps {
  localFoldersCount: number;
  onCreateFolder: () => void;
  canEdit: boolean;
}

const AlbumToolbar: React.FC<AlbumToolbarProps> = ({
  localFoldersCount,
  onCreateFolder,
  canEdit,
}) => {
  // If user cannot edit, don't show the toolbar at all
  if (!canEdit) {
    return null;
  }

  return (
    <div className="album-toolbar">
      {/* Top - Create Folder Button */}
      <div className="album-toolbar-top">
        <button 
          className="btn-action btn-upload" 
          onClick={onCreateFolder} 
          style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
        >
          <FolderPlusIcon width="16" height="16" />
          {localFoldersCount === 0 ? 'Create First Folder' : 'New Folder'}
        </button>
      </div>
      
      {/* Bottom - Save/Cancel buttons and unsaved indicator */}
    </div>
  );
};

export default AlbumToolbar;

