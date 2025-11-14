import React from 'react';
import type { NewUserState } from './types';

interface NewUserFormProps {
  newUser: NewUserState;
  loading: boolean;
  onChange: (newUser: NewUserState) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export const NewUserForm: React.FC<NewUserFormProps> = ({
  newUser,
  loading,
  onChange,
  onCancel,
  onSubmit,
}) => {
  return (
    <>
      <div className="branding-group">
        <label className="branding-label">Email *</label>
        <input
          type="email"
          value={newUser.email}
          onChange={(e) => onChange({ ...newUser, email: e.target.value })}
          className="branding-input"
          placeholder="user@example.com"
        />
        <p
          style={{
            fontSize: '0.85rem',
            color: '#9ca3af',
            margin: '0.5rem 0 0 0',
          }}
        >
          An invitation email will be sent to this address. The user will set up their name, password, and MFA.
        </p>
      </div>
      <div className="branding-group">
        <label className="branding-label">Role *</label>
        <select
          value={newUser.role}
          onChange={(e) => onChange({ ...newUser, role: e.target.value })}
          className="branding-input"
        >
          <option value="viewer">Viewer</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="section-button-group">
        <button onClick={onCancel} className="btn-secondary" disabled={loading}>
          Cancel
        </button>
        <button onClick={onSubmit} className="btn-primary" disabled={loading}>
          {loading ? 'Sending...' : 'Send Invitation'}
        </button>
      </div>
    </>
  );
};

