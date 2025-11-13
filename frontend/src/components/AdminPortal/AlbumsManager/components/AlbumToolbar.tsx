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
}

const AlbumToolbar: React.FC<AlbumToolbarProps> = ({
  hasUnsavedChanges,
  localFoldersCount,
  onCreateFolder,
  onSaveChanges,
  onCancelChanges,
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginTop: '3rem', 
      marginBottom: '1rem' 
    }}>
      {/* Left side - Create Folder Button */}
      <div>
        <button 
          className="btn-action btn-upload" 
          onClick={onCreateFolder} 
          style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
        >
          <FolderPlusIcon width="16" height="16" />
          {localFoldersCount === 0 ? 'Create First Folder' : 'New Folder'}
        </button>
      </div>
      
      {/* Right side - Save/Cancel buttons and unsaved indicator */}
      {hasUnsavedChanges && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#fbbf24', fontSize: '0.9rem', fontWeight: 500 }}>
            ● Unsaved changes
          </span>
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
      )}
    </div>
  );
};

export default AlbumToolbar;

