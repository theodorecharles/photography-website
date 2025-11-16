/**
 * Setup Wizard Component
 * Guides users through initial configuration of the photography website
 */

import { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import './SetupWizard.css';
import type { SetupStatus } from './types';

export default function SetupWizard() {
  const [loading, setLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form data
  const [siteName, setSiteName] = useState('');
  const [authorizedEmail, setAuthorizedEmail] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4ade80');
  const [secondaryColor, setSecondaryColor] = useState('#22c55e');
  const [metaDescription, setMetaDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Account registration data
  const [authMethod, setAuthMethod] = useState<'google' | 'password'>('password');
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');

  // Check setup status on mount
  useEffect(() => {
    checkSetupStatus();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Avatar image must be less than 5MB');
        return;
      }
      
      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const checkSetupStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/setup/status`);
      const data = await response.json();
      setSetupStatus(data);
      
      if (data.setupComplete) {
        // Setup is complete, redirect to home
        window.location.href = '/';
      }
    } catch (err) {
      setError('Failed to check setup status. Please try again.');
      console.error('Setup status check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validation
    if (!siteName.trim()) {
      setError('Site name is required');
      return;
    }
    
    if (!authorizedEmail.trim()) {
      setError('Email is required');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authorizedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate based on auth method
    if (authMethod === 'password') {
      if (!adminName.trim()) {
        setError('Name is required');
        return;
      }
      if (adminPassword.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      if (adminPassword !== adminPasswordConfirm) {
        setError('Passwords do not match');
        return;
      }
    } else {
      if (!googleClientId.trim() || !googleClientSecret.trim()) {
        setError('Both Google Client ID and Secret are required');
        return;
      }
    }

    try {
      setSubmitting(true);
      
      // Initialize the configuration with user account data
      const response = await fetch(`${API_URL}/api/setup/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteName,
          authorizedEmail,
          authMethod,
          adminName: authMethod === 'password' ? adminName : undefined,
          adminPassword: authMethod === 'password' ? adminPassword : undefined,
          googleClientId: authMethod === 'google' ? googleClientId : undefined,
          googleClientSecret: authMethod === 'google' ? googleClientSecret : undefined,
          primaryColor,
          secondaryColor,
          metaDescription: metaDescription || `Photography portfolio by ${siteName}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Setup failed');
      }

      // If avatar was uploaded, save it
      if (avatarFile) {
        try {
          const formData = new FormData();
          formData.append('avatar', avatarFile);
          
          const avatarResponse = await fetch(`${API_URL}/api/setup/upload-avatar`, {
            method: 'POST',
            body: formData,
          });
          
          if (!avatarResponse.ok) {
            console.warn('Avatar upload failed, but continuing with setup');
          }
        } catch (err) {
          console.warn('Avatar upload failed:', err);
          // Don't fail the entire setup if avatar upload fails
        }
      }

      setSuccess('Setup complete!');
      setCurrentStep(4);

      // Show countdown while server restarts
      let countdown = 5;
      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          setSuccess(`Setup complete! Hang on while the server starts up with your new configuration... (${countdown})`);
        } else {
          clearInterval(countdownInterval);
          setSuccess('Setup complete! Redirecting...');
        }
      }, 1000);

      // Redirect after 5 seconds (matching backend restart delay)
      setTimeout(() => {
        clearInterval(countdownInterval);
        if (authMethod === 'google') {
          // For Google auth, redirect to Google OAuth flow
          window.location.href = `${API_URL}/api/auth/google`;
        } else {
          // For password auth, redirect to admin portal (will show login)
          window.location.href = '/admin';
        }
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed. Please try again.');
      console.error('Setup initialization failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="setup-wizard">
        <div className="setup-container">
          <div className="setup-loading">
            <div className="loading-spinner"></div>
            <p>Checking setup status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!setupStatus) {
    return (
      <div className="setup-wizard">
        <div className="setup-container">
          <div className="setup-error">
            <h2>⚠️ Setup Error</h2>
            <p>{error || 'Failed to load setup status'}</p>
            <button onClick={checkSetupStatus} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-wizard">
      <div className="setup-container">
        <div className="setup-header">
          <h1>📸 Setup Galleria</h1>
          <p>Let's get your portfolio set up in just a few steps</p>
        </div>

        <div className="setup-progress">
          <div className={`progress-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'complete' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Basic Info</div>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'complete' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Account</div>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'complete' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Customize</div>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${currentStep >= 4 ? 'active' : ''}`}>
            <div className="step-number">4</div>
            <div className="step-label">Complete</div>
          </div>
        </div>

        {error && (
          <div className="setup-message error">
            <span className="message-icon">❌</span>
            {error}
          </div>
        )}

        {success && (
          <div className="setup-message success">
            <span className="message-icon">✅</span>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="setup-form">
          {currentStep === 1 && (
            <div className="setup-step">
              <h2>Basic Information</h2>
              <p className="step-description">
                Tell us a bit about yourself and your site
              </p>

              <div className="form-group">
                <label htmlFor="siteName">
                  Site Name / Your Name *
                  <span className="field-hint">This will appear in the header and page titles</span>
                </label>
                <input
                  type="text"
                  id="siteName"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="John Doe Photography"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="metaDescription">
                  Site Description
                  <span className="field-hint">Brief description for search engines (optional)</span>
                </label>
                <textarea
                  id="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder={`Photography portfolio by ${siteName || 'your name'}`}
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => setCurrentStep(2)}
                  className="button button-primary"
                  disabled={!siteName.trim()}
                >
                  Next: Create Account →
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="setup-step">
              <h2>Create Your Admin Account</h2>
              <p className="step-description">
                Set up your account to access the admin panel
              </p>

              <div className="form-group">
                <label htmlFor="authorizedEmail">
                  Your Email Address *
                  <span className="field-hint">This will be your login email</span>
                </label>
                <input
                  type="email"
                  id="authorizedEmail"
                  value={authorizedEmail}
                  onChange={(e) => setAuthorizedEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>
                  Choose Authentication Method *
                  <span className="field-hint">How would you like to sign in?</span>
                </label>
                <div className="auth-method-choice">
                  <label className="auth-method-option">
                    <input
                      type="radio"
                      name="authMethod"
                      value="password"
                      checked={authMethod === 'password'}
                      onChange={(e) => setAuthMethod(e.target.value as 'password' | 'google')}
                    />
                    <div className="auth-method-label">
                      <strong>🔑 Password</strong>
                      <span>Sign in with email and password</span>
                    </div>
                  </label>
                  <label className="auth-method-option">
                    <input
                      type="radio"
                      name="authMethod"
                      value="google"
                      checked={authMethod === 'google'}
                      onChange={(e) => setAuthMethod(e.target.value as 'password' | 'google')}
                    />
                    <div className="auth-method-label">
                      <strong>🔐 Google OAuth</strong>
                      <span>Sign in with your Google account</span>
                    </div>
                  </label>
                </div>
              </div>

              {authMethod === 'password' && (
                <>
                  <div className="form-group">
                    <label htmlFor="adminName">
                      Your Full Name *
                      <span className="field-hint">This will be displayed in your profile</span>
                    </label>
                    <input
                      type="text"
                      id="adminName"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="adminPassword">
                      Password *
                      <span className="field-hint">Minimum 8 characters</span>
                    </label>
                    <input
                      type="password"
                      id="adminPassword"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="adminPasswordConfirm">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      id="adminPasswordConfirm"
                      value={adminPasswordConfirm}
                      onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                  </div>
                </>
              )}

              {authMethod === 'google' && (
                <>
                  <div className="info-box">
                    <p>
                      <strong>How to get Google OAuth credentials:</strong>
                    </p>
                    <ol>
                      <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
                      <li>Create a new project or select an existing one</li>
                      <li>Enable the Google+ API</li>
                      <li>Create OAuth 2.0 credentials</li>
                      <li>Add redirect URI: <code>{window.location.origin.replace(':3000', ':3001')}/api/auth/google/callback</code></li>
                      <li>Copy the Client ID and Client Secret below</li>
                    </ol>
                  </div>

                  <div className="form-group">
                    <label htmlFor="googleClientId">
                      Google Client ID *
                    </label>
                    <input
                      type="text"
                      id="googleClientId"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                      placeholder="xxxxx.apps.googleusercontent.com"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="googleClientSecret">
                      Google Client Secret *
                    </label>
                    <input
                      type="password"
                      id="googleClientSecret"
                      value={googleClientSecret}
                      onChange={(e) => setGoogleClientSecret(e.target.value)}
                      placeholder="GOCSPX-xxxxx"
                      required
                    />
                  </div>
                </>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => setCurrentStep(1)}
                  className="button button-secondary"
                >
                  ← Back
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    // Validation
                    if (!authorizedEmail.trim()) {
                      setError('Email is required');
                      return;
                    }
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(authorizedEmail)) {
                      setError('Please enter a valid email address');
                      return;
                    }
                    
                    if (authMethod === 'password') {
                      if (!adminName.trim()) {
                        setError('Name is required');
                        return;
                      }
                      if (adminPassword.length < 8) {
                        setError('Password must be at least 8 characters');
                        return;
                      }
                      if (adminPassword !== adminPasswordConfirm) {
                        setError('Passwords do not match');
                        return;
                      }
                    } else {
                      if (!googleClientId.trim() || !googleClientSecret.trim()) {
                        setError('Both Google Client ID and Secret are required');
                        return;
                      }
                    }
                    
                    setError(null);
                    setCurrentStep(3);
                  }}
                  className="button button-primary"
                >
                  Next: Customize →
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="setup-step">
              <h2>Customize Your Site</h2>
              <p className="step-description">
                Choose colors and upload your profile picture
              </p>

              <div className="form-group">
                <label>
                  Brand Colors
                  <span className="field-hint">Choose your primary and secondary colors</span>
                </label>
                <div className="color-inputs">
                  <div className="color-input-group">
                    <label htmlFor="primaryColor">Primary</label>
                    <input
                      type="color"
                      id="primaryColor"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                    />
                    <span className="color-value">{primaryColor}</span>
                  </div>
                  <div className="color-input-group">
                    <label htmlFor="secondaryColor">Secondary</label>
                    <input
                      type="color"
                      id="secondaryColor"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                    />
                    <span className="color-value">{secondaryColor}</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="avatar">
                  Avatar Image (Optional)
                  <span className="field-hint">Upload your profile picture (max 5MB)</span>
                </label>
                <div className="avatar-upload">
                  {avatarPreview && (
                    <div className="avatar-preview">
                      <img src={avatarPreview} alt="Avatar preview" />
                    </div>
                  )}
                  <input
                    type="file"
                    id="avatar"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="file-input"
                  />
                  <label htmlFor="avatar" className="file-label">
                    {avatarFile ? '✓ Image selected' : 'Choose Image'}
                  </label>
                  {avatarFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                      className="button-text"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => setCurrentStep(2)}
                  className="button button-secondary"
                >
                  ← Back
                </button>
                <button 
                  type="submit"
                  className="button button-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Setting up...' : 'Complete Setup ✓'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="setup-step setup-complete">
              <div className="complete-icon">✓</div>
              <h2>Setup Complete!</h2>
              <p>Your configuration has been saved successfully.</p>
              <p className="complete-subtext">Redirecting to login page...</p>
              
              <div className="next-steps">
                <h3>What We Set Up:</h3>
                <ul>
                  <li>✅ Site configuration saved</li>
                  <li>✅ Admin account created</li>
                  <li>✅ Database initialized</li>
                  <li>✅ Directories created</li>
                  <li>✅ Authentication configured</li>
                  <li>🔐 You'll be redirected to sign in</li>
                  <li>📸 Then you can upload your first album!</li>
                </ul>
              </div>
            </div>
          )}
        </form>

        <div className="setup-footer">
          <p>
            Need help? Check the{' '}
            <a 
              href="https://github.com/theodoreroddy/photography-website" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

