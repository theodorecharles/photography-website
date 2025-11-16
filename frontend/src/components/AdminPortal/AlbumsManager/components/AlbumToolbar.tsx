/**
 * AlbumToolbar Component
 * Toolbar with folder creation and save/cancel buttons
 */

import React from 'react';
import { FolderPlusIcon } from '../../../icons';

interface AlbumToolbarProps {
  hasUnsavedChanges: boolean;
  localFoldersCount: number;
  onCreateFolder: () => void;
  onSaveChanges: () => void;
  onCancelChanges: () => void;
  canEdit: boolean;
}

const AlbumToolbar: React.FC<AlbumToolbarProps> = ({
  hasUnsavedChanges,
  localFoldersCount,
  onCreateFolder,
  onSaveChanges,
  onCancelChanges,
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
      {hasUnsavedChanges && (
        <div className="album-toolbar-unsaved">
          <span className="unsaved-text">
            ● Unsaved changes
          </span>
          <div className="unsaved-actions">
            <button
              onClick={onCancelChanges}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem' }}
            >
              Cancel
            </button>
            <button
              onClick={onSaveChanges}
              className="btn-action btn-upload"
              style={{ padding: '0.5rem 1.5rem' }}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumToolbar;

