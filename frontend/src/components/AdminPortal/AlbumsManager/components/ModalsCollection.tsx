/**
 * ModalsCollection Component
 * Contains all modal dialogs used in AlbumsManager
 */

import React from 'react';
import { createPortal } from 'react-dom';
import ShareModal from '../../ShareModal';
import { Photo, Folder } from '../types';
import { cacheBustValue } from '../../../../config';

const API_URL = import.meta.env.VITE_API_URL || '';

interface ConfirmModalConfig {
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  isDanger?: boolean;
}

interface ModalsCollectionProps {
  // Edit Photo Modal
  showEditModal: boolean;
  editingPhoto: Photo | null;
  editTitleValue: string;
  setEditTitleValue: (value: string) => void;
  handleCloseEditModal: () => void;
  handleSaveTitle: () => void;
  
  // Rename Album Modal
  showRenameModal: boolean;
  renamingAlbum: string | null;
  newAlbumName: string;
  setNewAlbumName: (value: string) => void;
  setShowRenameModal: (show: boolean) => void;
  handleRenameAlbum: () => void;
  
  // New Folder Modal
  showFolderModal: boolean;
  setShowFolderModal: (show: boolean) => void;
  folderModalError: string;
  setFolderModalError: (error: string) => void;
  folderManagement: {
    newFolderName: string;
    setNewFolderName: (value: string) => void;
    isCreatingFolder: boolean;
    handleCreateFolder: () => Promise<void>;
  };
  
  // Delete Folder Modal
  showDeleteFolderModal: boolean;
  deletingFolderName: string | null;
  setShowDeleteFolderModal: (show: boolean) => void;
  handleDeleteFolder: (folderName: string) => void;
  localFolders: Folder[];
  localAlbums: any[];
  
  // New Album Modal
  showNewAlbumModal: boolean;
  setShowNewAlbumModal: (show: boolean) => void;
  newAlbumNameInput: string;
  setNewAlbumNameInput: (value: string) => void;
  newAlbumPublished: boolean;
  setNewAlbumPublished: (value: boolean) => void;
  newAlbumModalError: string;
  handleCreateAlbumSubmit: () => void;
  
  // Share Modal
  showShareModal: boolean;
  shareAlbumName: string | null;
  setShowShareModal: (show: boolean) => void;
  
  // Confirm Modal
  showConfirmModal: boolean;
  confirmConfig: ConfirmModalConfig | null;
  setShowConfirmModal: (show: boolean) => void;
}

const ModalsCollection: React.FC<ModalsCollectionProps> = ({
  // Edit Photo Modal
  showEditModal,
  editingPhoto,
  editTitleValue,
  setEditTitleValue,
  handleCloseEditModal,
  handleSaveTitle,
  
  // Rename Album Modal
  showRenameModal,
  renamingAlbum,
  newAlbumName,
  setNewAlbumName,
  setShowRenameModal,
  handleRenameAlbum,
  
  // New Folder Modal
  showFolderModal,
  setShowFolderModal,
  folderModalError,
  setFolderModalError,
  folderManagement,
  
  // Delete Folder Modal
  showDeleteFolderModal,
  deletingFolderName,
  setShowDeleteFolderModal,
  handleDeleteFolder,
  localFolders,
  localAlbums,
  
  // New Album Modal
  showNewAlbumModal,
  setShowNewAlbumModal,
  newAlbumNameInput,
  setNewAlbumNameInput,
  newAlbumPublished,
  setNewAlbumPublished,
  newAlbumModalError,
  handleCreateAlbumSubmit,
  
  // Share Modal
  showShareModal,
  shareAlbumName,
  setShowShareModal,
  
  // Confirm Modal
  showConfirmModal,
  confirmConfig,
  setShowConfirmModal,
}) => {
  return (
    <>
      {/* Edit Photo Title Modal */}
      {showEditModal && editingPhoto && createPortal(
        <div 
          className="edit-title-modal" 
          onClick={handleCloseEditModal}
        >
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Edit Photo Title</h3>
              <button 
                className="modal-close-btn"
                onClick={handleCloseEditModal}
                title="Close"
              >
                ×
              </button>
            </div>
            
            <div className="edit-modal-body">
              <div className="edit-modal-photo">
                <img 
                  src={`${API_URL}${editingPhoto.thumbnail}?i=${cacheBustValue}`}
                  alt={editingPhoto.title}
                />
              </div>
              
              <div className="edit-modal-info">
                <label className="edit-modal-label">
                  Filename: <span className="filename-display">{editingPhoto.id.split('/').pop()}</span>
                </label>
                
                <label className="edit-modal-label">Title</label>
                <input
                  type="text"
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  className="edit-modal-input"
                  placeholder="Enter title..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveTitle();
                    } else if (e.key === 'Escape') {
                      handleCloseEditModal();
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="edit-modal-footer">
              <button 
                onClick={handleCloseEditModal}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleSaveTitle}
              >
                Save Title
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Rename Album Modal */}
      {showRenameModal && renamingAlbum && createPortal(
        <div 
          className="edit-title-modal" 
          onClick={() => setShowRenameModal(false)}
        >
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Rename Album</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowRenameModal(false)}
                title="Close"
              >
                ×
              </button>
            </div>
            
            <div className="edit-modal-body">
              <div className="edit-modal-info" style={{ width: '100%' }}>
                <label className="edit-modal-label">Current Name</label>
                <div style={{ 
                  padding: '0.5rem', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  color: '#888'
                }}>
                  {renamingAlbum}
                </div>
                
                <label className="edit-modal-label">New Name</label>
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  className="edit-modal-input"
                  placeholder="Enter new album name..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameAlbum();
                    } else if (e.key === 'Escape') {
                      setShowRenameModal(false);
                    }
                  }}
                />
                <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Only letters, numbers, spaces, hyphens, and underscores are allowed
                </p>
              </div>
            </div>
            
            <div className="edit-modal-footer">
              <button
                onClick={() => setShowRenameModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameAlbum}
                className="btn-primary"
              >
                Rename Album
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* New Folder Modal */}
      {showFolderModal && createPortal(
        <div 
          className="edit-title-modal" 
          onClick={() => {
            setShowFolderModal(false);
            setFolderModalError('');
          }}
        >
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Create New Folder</h3>
              <button 
                className="modal-close-btn"
                onClick={() => {
                  setShowFolderModal(false);
                  setFolderModalError('');
                }}
                title="Close"
              >
                ×
              </button>
            </div>
            
            <div className="edit-modal-body">
              <div className="edit-modal-info" style={{ width: '100%' }}>
                <label className="edit-modal-label">Folder Name</label>
                <input
                  type="text"
                  value={folderManagement.newFolderName}
                  onChange={(e) => folderManagement.setNewFolderName(e.target.value)}
                  className="edit-modal-input"
                  placeholder="Enter folder name..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !folderManagement.isCreatingFolder) {
                      folderManagement.handleCreateFolder();
                    } else if (e.key === 'Escape') {
                      setShowFolderModal(false);
                      setFolderModalError('');
                    }
                  }}
                />
                {folderModalError && (
                  <p style={{ color: '#ff4444', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    {folderModalError}
                  </p>
                )}
                <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Folders help organize multiple albums. Unpublished by default.
                </p>
              </div>
            </div>
            
            <div className="edit-modal-footer">
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setFolderModalError('');
                }}
                className="btn-secondary"
                disabled={folderManagement.isCreatingFolder}
              >
                Cancel
              </button>
              <button
                onClick={folderManagement.handleCreateFolder}
                className="btn-primary"
                disabled={folderManagement.isCreatingFolder}
              >
                {folderManagement.isCreatingFolder ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Folder Confirmation Modal */}
      {showDeleteFolderModal && deletingFolderName && createPortal(
        <div 
          className="edit-title-modal" 
          onClick={() => setShowDeleteFolderModal(false)}
        >
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Delete Folder</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowDeleteFolderModal(false)}
                title="Close"
              >
                ×
              </button>
            </div>
            
            <div className="edit-modal-body">
              <div className="edit-modal-info" style={{ width: '100%' }}>
                <p style={{ marginBottom: '1rem' }}>
                  Are you sure you want to delete the folder <strong>"{deletingFolderName}"</strong>?
                </p>
                
                {(() => {
                  const folder = localFolders.find(f => f.name === deletingFolderName);
                  const albumsInFolder = localAlbums.filter(a => a.folder_id === folder?.id);
                  
                  if (albumsInFolder.length > 0) {
                    return (
                      <div style={{ 
                        padding: '1rem', 
                        background: 'rgba(255, 180, 0, 0.1)', 
                        border: '1px solid rgba(255, 180, 0, 0.3)',
                        borderRadius: '4px',
                        marginBottom: '1rem'
                      }}>
                        <p style={{ color: '#ffb400', marginBottom: '0.5rem', fontWeight: 600 }}>
                          ⚠️ Warning
                        </p>
                        <p style={{ color: '#ffb400', marginBottom: '0.5rem' }}>
                          This folder contains <strong>{albumsInFolder.length}</strong> album{albumsInFolder.length !== 1 ? 's' : ''}:
                        </p>
                        <ul style={{ 
                          color: '#ffb400', 
                          marginLeft: '1.5rem', 
                          marginTop: '0.5rem',
                          marginBottom: '0.5rem'
                        }}>
                          {albumsInFolder.slice(0, 5).map(album => (
                            <li key={album.name}>{album.name}</li>
                          ))}
                          {albumsInFolder.length > 5 && (
                            <li>...and {albumsInFolder.length - 5} more</li>
                          )}
                        </ul>
                        <p style={{ color: '#ffb400', marginTop: '0.5rem' }}>
                          These albums will be moved to <strong>Uncategorized</strong> and keep their current published status.
                        </p>
                      </div>
                    );
                  }
                  
                  return null;
                })()}
                
                <p style={{ color: '#888', fontSize: '0.9rem' }}>
                  This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="edit-modal-footer">
              <button
                onClick={() => setShowDeleteFolderModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteFolder(deletingFolderName);
                  setShowDeleteFolderModal(false);
                }}
                className="btn-danger"
              >
                Delete Folder
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* New Album Modal */}
      {showNewAlbumModal && createPortal(
        <div 
          className="edit-title-modal" 
          onClick={() => setShowNewAlbumModal(false)}
        >
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Create New Album</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowNewAlbumModal(false)}
                title="Close"
              >
                ×
              </button>
            </div>
            
            <div className="edit-modal-body">
              <div className="edit-modal-info" style={{ width: '100%' }}>
                <label className="edit-modal-label">Album Name</label>
                <input
                  type="text"
                  value={newAlbumNameInput}
                  onChange={(e) => setNewAlbumNameInput(e.target.value)}
                  className="edit-modal-input"
                  placeholder="Enter album name..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateAlbumSubmit();
                    } else if (e.key === 'Escape') {
                      setShowNewAlbumModal(false);
                    }
                  }}
                />
                {newAlbumModalError && (
                  <p style={{ color: '#ff4444', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    {newAlbumModalError}
                  </p>
                )}
                <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Only letters, numbers, spaces, hyphens, and underscores are allowed
                </p>
                
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newAlbumPublished}
                      onChange={(e) => setNewAlbumPublished(e.target.checked)}
                      style={{ 
                        marginRight: '0.75rem',
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ color: '#fff', fontSize: '1rem' }}>Publish album immediately</span>
                  </label>
                  <p style={{ color: '#aaa', fontSize: '0.875rem', marginTop: '0.375rem', marginLeft: '1.875rem' }}>
                    Published albums are visible on the public gallery
                  </p>
                </div>
              </div>
            </div>
            
            <div className="edit-modal-footer">
              <button
                onClick={() => setShowNewAlbumModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAlbumSubmit}
                className="btn-primary"
              >
                Create Album
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Share Modal */}
      {showShareModal && shareAlbumName && (
        <ShareModal
          album={shareAlbumName}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Generic Confirmation Modal */}
      {showConfirmModal && confirmConfig && (
        <div 
          className="edit-title-modal" 
          onClick={() => setShowConfirmModal(false)}
        >
          <div className="edit-modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Confirm Action</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowConfirmModal(false)}
                title="Close"
              >
                ×
              </button>
            </div>
            
            <div className="edit-modal-body">
              <p style={{ color: '#ccc' }}>{confirmConfig.message}</p>
            </div>
            
            <div className="edit-modal-footer">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmConfig.onConfirm();
                  setShowConfirmModal(false);
                }}
                className={confirmConfig.isDanger ? 'btn-danger' : 'btn-primary'}
              >
                {confirmConfig.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModalsCollection;

