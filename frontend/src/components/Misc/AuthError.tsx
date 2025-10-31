/**
 * Authentication Error Page
 * Displays when login fails or user is not authorized
 */

import { useSearchParams, Link } from 'react-router-dom';
import './AuthError.css';

export default function AuthError() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason') || 'unknown';

  const getErrorMessage = () => {
    switch (reason) {
      case 'unauthorized':
        return {
          title: 'Login Not Authorized',
          message: 'Your email address is not authorized to access this system.',
          details: 'If you believe this is an error, please contact the site administrator.'
        };
      case 'failed':
        return {
          title: 'Authentication Failed',
          message: 'Unable to complete the login process.',
          details: 'Please try again or contact support if the problem persists.'
        };
      case 'no_email':
        return {
          title: 'Email Required',
          message: 'No email address was found in your Google account.',
          details: 'Please ensure your Google account has a valid email address.'
        };
      default:
        return {
          title: 'Login Error',
          message: 'An unexpected error occurred during login.',
          details: 'Please try again later.'
        };
    }
  };

  const error = getErrorMessage();

  return (
    <div className="auth-error-page">
      <div className="auth-error-container">
        <div className="error-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
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

