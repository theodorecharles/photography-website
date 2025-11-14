/**
 * Error message utilities
 */

export interface ErrorInfo {
  title: string;
  message: string;
  details: string;
}

/**
 * Get error message info based on reason code
 */
export const getErrorMessage = (reason: string): ErrorInfo => {
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

