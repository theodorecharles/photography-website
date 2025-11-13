/**
 * Authentication Error Page
 * Displays when login fails or user is not authorized
 */

import { useSearchParams, Link } from 'react-router-dom';
import './AuthError.css';
import { getErrorMessage } from '../../utils/errorMessages';
import { ErrorCircleIcon } from '../icons';

export default function AuthError() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason') || 'unknown';
  const error = getErrorMessage(reason);

  return (
    <div className="auth-error-page">
      <div className="auth-error-container">
        <div className="error-icon">
          <ErrorCircleIcon width="64" height="64" />
        </div>
        
        <h1>{error.title}</h1>
        <p className="error-message">{error.message}</p>
        <p className="error-details">{error.details}</p>
        
        <div className="error-actions">
          <Link to="/" className="btn-home">
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

