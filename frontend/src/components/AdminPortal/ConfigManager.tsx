/**
 * Config Manager Component
 * Manages all configuration settings from config.json
 */

import { useState, useEffect, useRef } from 'react';
import './ConfigManager.css';

const API_URL = import.meta.env.VITE_API_URL || '';

interface EnvironmentConfig {
  frontend: {
    port: number;
    apiUrl: string;
  };
  backend: {
    port: number;
    photosDir: string;
    allowedOrigins: string[];
  };
  optimization: {
    concurrency: number;
    images: {
      thumbnail: { quality: number; maxDimension: number; };
      modal: { quality: number; maxDimension: number; };
      download: { quality: number; maxDimension: number; };
    };
  };
  security: {
    allowedHosts: string[];
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  };
  auth: {
    google: {
      clientId: string;
      clientSecret: string;
    };
    sessionSecret: string;
    authorizedEmails: string[];
  };
}

interface OpenAIConfig {
  apiKey: string;
}

interface AnalyticsConfig {
  scriptPath: string;
  openobserve: {
    enabled: boolean;
    endpoint: string;
    organization: string;
    stream: string;
    username: string;
    password: string;
  };
  hmacSecret: string;
}

interface ConfigData {
  environment: EnvironmentConfig;
  openai: OpenAIConfig;
  analytics: AnalyticsConfig;
}

interface ConfigManagerProps {
  setMessage: (message: { type: 'success' | 'error'; text: string } | null) => void;
}

const ConfigManager: React.FC<ConfigManagerProps> = ({ setMessage }) => {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [originalConfig, setOriginalConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [titlesOutput, setTitlesOutput] = useState<string[]>([]);
  const [titlesProgress, setTitlesProgress] = useState(0);
  const [optimizationLogs, setOptimizationLogs] = useState<string[]>([]);
  const [isOptimizationRunning, setIsOptimizationRunning] = useState(false);
  const [optimizationComplete, setOptimizationComplete] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [restartingBackend, setRestartingBackend] = useState(false);
  const [restartingFrontend, setRestartingFrontend] = useState(false);
  
  // Refs for auto-scroll and scroll-into-view
  const optimizationOutputRef = useRef<HTMLDivElement>(null);
  const titlesOutputRef = useRef<HTMLDivElement>(null);
  const regenerateButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  // Auto-scroll optimization output to bottom when new logs arrive
  useEffect(() => {
    if (optimizationOutputRef.current) {
      optimizationOutputRef.current.scrollTop = optimizationOutputRef.current.scrollHeight;
    }
  }, [optimizationLogs]);

  // Auto-scroll titles output to bottom when new lines arrive
  useEffect(() => {
    if (titlesOutputRef.current) {
      titlesOutputRef.current.scrollTop = titlesOutputRef.current.scrollHeight;
    }
  }, [titlesOutput]);

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/config`, {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setOriginalConfig(JSON.parse(JSON.stringify(data))); // Deep clone
      } else {
        setMessage({ type: 'error', text: 'Failed to load configuration' });
      }
    } catch (err) {
      console.error('Failed to load config:', err);
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  const hasUnsavedChanges = (sectionName: string): boolean => {
    if (!config || !originalConfig) return false;

    switch (sectionName) {
      case 'OpenAI':
        return config.openai?.apiKey !== originalConfig.openai?.apiKey;
      
      case 'Image Optimization':
        return JSON.stringify(config.environment.optimization) !== JSON.stringify(originalConfig.environment.optimization);
      
      case 'Backend':
        return JSON.stringify(config.environment.backend) !== JSON.stringify(originalConfig.environment.backend);
      
      case 'Frontend':
        return JSON.stringify(config.environment.frontend) !== JSON.stringify(originalConfig.environment.frontend);
      
      case 'Security':
        return JSON.stringify(config.environment.security) !== JSON.stringify(originalConfig.environment.security);
      
      case 'Authentication':
        return JSON.stringify(config.environment.auth) !== JSON.stringify(originalConfig.environment.auth);
      
      default:
        return false;
    }
  };

  const handleSaveSection = async (sectionName: string) => {
    if (!config) return;
    
    setSavingSection(sectionName);
    setMessage(null);
    
    try {
      const res = await fetch(`${API_URL}/api/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `${sectionName} settings saved!` });
        // Update original config after successful save
        setOriginalConfig(JSON.parse(JSON.stringify(config)));
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setMessage({ type: 'error', text: errorData.error || 'Failed to save configuration' });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error saving configuration';
      setMessage({ type: 'error', text: errorMessage });
      console.error('Failed to save config:', err);
    } finally {
      setSavingSection(null);
    }
  };

  const handleGenerateTitles = async () => {
    setGeneratingTitles(true);
    setTitlesOutput([]);
    setTitlesProgress(0);
    setMessage(null);

    // Scroll to OpenAI section to show output
    setTimeout(() => {
      if (titlesOutputRef.current) {
        const yOffset = -100; // Offset to account for header
        const element = titlesOutputRef.current;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);

    try {
      const res = await fetch(`${API_URL}/api/ai-titles/generate`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to start AI title generation');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            
            if (data === '__COMPLETE__') {
              setMessage({ type: 'success', text: 'AI title generation completed successfully!' });
              setGeneratingTitles(false);
            } else if (data.startsWith('__ERROR__')) {
              setMessage({ type: 'error', text: data.substring(10) });
              setGeneratingTitles(false);
            } else {
              // Try to parse JSON progress data
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'progress') {
                  setTitlesProgress(parsed.percent);
                  setTitlesOutput((prev) => [...prev, parsed.message]);
                } else {
                  setTitlesOutput((prev) => [...prev, data]);
                }
              } catch {
                // Not JSON, treat as plain text
                setTitlesOutput((prev) => [...prev, data]);
              }
            }
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error generating titles';
      setMessage({ type: 'error', text: errorMessage });
      console.error('Failed to generate titles:', err);
      setGeneratingTitles(false);
    }
  };

  const handleRestartBackend = async () => {
    if (!confirm('⚠️ Restart the backend server? This will temporarily disconnect all users.')) return;

    setRestartingBackend(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/system/restart/backend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: 'Backend server restarting... Please wait 5-10 seconds and refresh the page.' 
        });
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setMessage({ type: 'error', text: errorData.error || 'Failed to restart backend' });
      }
    } catch (err) {
      // Expected error since server is restarting
      setMessage({ 
        type: 'success', 
        text: 'Backend server restarting... Please wait 5-10 seconds and refresh the page.' 
      });
    } finally {
      setRestartingBackend(false);
    }
  };

  const handleRestartFrontend = async () => {
    if (!confirm('⚠️ Restart the frontend server? This requires manual restart if in development mode.')) return;

    setRestartingFrontend(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/system/restart/frontend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: 'success', text: data.message });
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setMessage({ type: 'error', text: errorData.error || 'Failed to restart frontend' });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setRestartingFrontend(false);
    }
  };

  const handleRunOptimization = async (force: boolean = false) => {
    if (!confirm(force ? 'Force regenerate ALL images? This will take a while.' : 'Run image optimization on all photos?')) return;

    setIsOptimizationRunning(true);
    setOptimizationComplete(false);
    setOptimizationLogs([]);
    setOptimizationProgress(0);
    setMessage(null);

    // Scroll to regenerate button to show output
    setTimeout(() => {
      if (regenerateButtonRef.current) {
        const yOffset = -100; // Offset to account for header
        const element = regenerateButtonRef.current;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);

    try {
      const res = await fetch(`${API_URL}/api/image-optimization/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ force }),
      });

      if (!res.ok) {
        let errorMessage = 'Failed to start optimization';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response isn't JSON, use default message
        }
        setMessage({ type: 'error', text: `${errorMessage} (Status: ${res.status})` });
        setIsOptimizationRunning(false);
        return;
      }

      // Parse SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        setMessage({ type: 'error', text: 'Failed to read response stream' });
        setIsOptimizationRunning(false);
        return;
      }

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress') {
                setOptimizationProgress(data.percent);
                setOptimizationLogs(prev => [...prev, data.message]);
              } else if (data.type === 'stdout' || data.type === 'stderr') {
                setOptimizationLogs(prev => [...prev, data.message]);
              } else if (data.type === 'complete') {
                // Only mark as complete and show final message for the last completion
                // (AI title generation is the final step)
                if (data.message.includes('AI title generation')) {
                  setOptimizationComplete(true);
                  // Filter out "Generating" entries when complete
                  setOptimizationLogs(prev => prev.filter(log => !log.startsWith('Generating')));
                  setMessage({ 
                    type: data.exitCode === 0 ? 'success' : 'error', 
                    text: data.exitCode === 0 ? 'Optimization and AI title generation completed!' : 'AI title generation failed' 
                  });
                } else {
                  // This is the intermediate optimization completion message
                  setOptimizationLogs(prev => [...prev, data.message]);
                }
              } else if (data.type === 'error') {
                setMessage({ type: 'error', text: data.message });
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Optimization error:', err);
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setIsOptimizationRunning(false);
    }
  };

  const updateConfig = (path: string[], value: any) => {
    if (!config) return;
    
    const newConfig = { ...config };
    let current: any = newConfig;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...current[path[i]] };
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    setConfig(newConfig);
  };

  const updateArrayItem = (path: string[], index: number, value: string) => {
    if (!config) return;
    
    const newConfig = { ...config };
    let current: any = newConfig;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...current[path[i]] };
      current = current[path[i]];
    }
    
    const array = [...current[path[path.length - 1]]];
    array[index] = value;
    current[path[path.length - 1]] = array;
    setConfig(newConfig);
  };

  const addArrayItem = (path: string[]) => {
    if (!config) return;
    
    const newConfig = { ...config };
    let current: any = newConfig;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...current[path[i]] };
      current = current[path[i]];
    }
    
    const array = [...current[path[path.length - 1]]];
    array.push('');
    current[path[path.length - 1]] = array;
    setConfig(newConfig);
  };

  const removeArrayItem = (path: string[], index: number) => {
    if (!config) return;
    
    const newConfig = { ...config };
    let current: any = newConfig;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...current[path[i]] };
      current = current[path[i]];
    }
    
    const array = [...current[path[path.length - 1]]];
    array.splice(index, 1);
    current[path[path.length - 1]] = array;
    setConfig(newConfig);
  };

  if (loading) {
    return (
      <section className="admin-section">
        <h2>⚙️ Configuration</h2>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading configuration...</p>
        </div>
      </section>
    );
  }

  if (!config) {
    return (
      <section className="admin-section">
        <h2>⚙️ Configuration</h2>
        <p>Failed to load configuration</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <h2>⚙️ Configuration</h2>
      <p className="section-description">Manage server configuration settings</p>
      
      <div className="config-grid">
        {/* OpenAI Settings */}
        <div className="config-group full-width">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 className="config-section-title" style={{ margin: 0 }}>OpenAI</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {hasUnsavedChanges('OpenAI') && (
                <span className="unsaved-indicator">Unsaved changes</span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSection('OpenAI')}
                disabled={savingSection !== null}
                className="btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                {savingSection === 'OpenAI' ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          <p className="config-section-description">
            Configure OpenAI API integration for generating AI-powered image titles
          </p>
          <div className="branding-group">
            <label className="branding-label">API Key</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <input
                type="password"
                value={config.openai?.apiKey || ''}
                onChange={(e) => updateConfig(['openai', 'apiKey'], e.target.value)}
                className="branding-input"
                placeholder="sk-..."
                style={{ flex: 1, minWidth: '300px' }}
              />
              {generatingTitles && (
                <div className="progress-circle" style={{ width: '60px', height: '60px' }}>
                  <svg className="progress-ring" width="60" height="60">
                    <circle
                      className="progress-ring-circle"
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="4"
                      fill="transparent"
                      r="26"
                      cx="30"
                      cy="30"
                    />
                    <circle
                      className="progress-ring-circle"
                      stroke="var(--primary-color)"
                      strokeWidth="4"
                      fill="transparent"
                      r="26"
                      cx="30"
                      cy="30"
                      strokeDasharray={`${2 * Math.PI * 26}`}
                      strokeDashoffset={`${2 * Math.PI * 26 * (1 - titlesProgress / 100)}`}
                      style={{ 
                        transition: 'stroke-dashoffset 0.3s ease',
                        transform: 'rotate(-90deg)',
                        transformOrigin: '50% 50%'
                      }}
                    />
                  </svg>
                  <span className="progress-percentage" style={{ fontSize: '0.9rem' }}>{titlesProgress}%</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleGenerateTitles}
                disabled={generatingTitles || !config.openai?.apiKey}
                className="btn-secondary"
                style={{ whiteSpace: 'nowrap' }}
              >
                {generatingTitles ? 'Generating...' : 'Generate AI Titles'}
              </button>
            </div>
            {generatingTitles && (
              <div className="titles-output" ref={titlesOutputRef}>
                <div className="titles-output-content">
                  {titlesOutput.map((line, index) => (
                    <div key={index} className="output-line">{line}</div>
                  ))}
                  {titlesOutput.length === 0 && (
                    <div className="output-line">Starting AI title generation...</div>
                  )}
                  {generatingTitles && (
                    <div className="output-line" style={{ marginTop: '0.5rem', color: '#4ade80' }}>⏳ Running...</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Image Optimization Settings */}
        <div className="config-group full-width">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 className="config-section-title" style={{ margin: 0 }}>Image Optimization</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {hasUnsavedChanges('Image Optimization') && (
                <span className="unsaved-indicator">Unsaved changes</span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSection('Image Optimization')}
                disabled={savingSection !== null}
                className="btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                {savingSection === 'Image Optimization' ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          <p className="config-section-description">
            Control quality and dimensions for thumbnail, modal, and download versions of your images. Higher quality means larger file sizes.
          </p>
          <div className="config-grid-inner">
            <div className="branding-group">
              <label className="branding-label">Thumbnail Quality</label>
              <input
                type="number"
                value={config.environment.optimization.images.thumbnail.quality}
                onChange={(e) => updateConfig(['environment', 'optimization', 'images', 'thumbnail', 'quality'], parseInt(e.target.value))}
                className="branding-input"
                min="1"
                max="100"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">Thumbnail Max Dimension</label>
              <input
                type="number"
                value={config.environment.optimization.images.thumbnail.maxDimension}
                onChange={(e) => updateConfig(['environment', 'optimization', 'images', 'thumbnail', 'maxDimension'], parseInt(e.target.value))}
                className="branding-input"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">Modal Quality</label>
              <input
                type="number"
                value={config.environment.optimization.images.modal.quality}
                onChange={(e) => updateConfig(['environment', 'optimization', 'images', 'modal', 'quality'], parseInt(e.target.value))}
                className="branding-input"
                min="1"
                max="100"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">Modal Max Dimension</label>
              <input
                type="number"
                value={config.environment.optimization.images.modal.maxDimension}
                onChange={(e) => updateConfig(['environment', 'optimization', 'images', 'modal', 'maxDimension'], parseInt(e.target.value))}
                className="branding-input"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">Download Quality</label>
              <input
                type="number"
                value={config.environment.optimization.images.download.quality}
                onChange={(e) => updateConfig(['environment', 'optimization', 'images', 'download', 'quality'], parseInt(e.target.value))}
                className="branding-input"
                min="1"
                max="100"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">Download Max Dimension</label>
              <input
                type="number"
                value={config.environment.optimization.images.download.maxDimension}
                onChange={(e) => updateConfig(['environment', 'optimization', 'images', 'download', 'maxDimension'], parseInt(e.target.value))}
                className="branding-input"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">Concurrency</label>
              <input
                type="number"
                value={config.environment.optimization.concurrency}
                onChange={(e) => updateConfig(['environment', 'optimization', 'concurrency'], parseInt(e.target.value))}
                className="branding-input"
              />
            </div>
          </div>

          {/* Force Regenerate All */}
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ color: '#e5e7eb', margin: 0, fontSize: '1rem', fontWeight: 600 }}>Regenerate All Images</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {isOptimizationRunning && (
                  <div className="progress-circle" style={{ width: '60px', height: '60px' }}>
                    <svg className="progress-ring" width="60" height="60">
                      <circle
                        className="progress-ring-circle"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="4"
                        fill="transparent"
                        r="26"
                        cx="30"
                        cy="30"
                      />
                      <circle
                        className="progress-ring-circle"
                        stroke="var(--primary-color)"
                        strokeWidth="4"
                        fill="transparent"
                        r="26"
                        cx="30"
                        cy="30"
                        strokeDasharray={`${2 * Math.PI * 26}`}
                        strokeDashoffset={`${2 * Math.PI * 26 * (1 - optimizationProgress / 100)}`}
                        style={{ 
                          transition: 'stroke-dashoffset 0.3s ease',
                          transform: 'rotate(-90deg)',
                          transformOrigin: '50% 50%'
                        }}
                      />
                    </svg>
                    <span className="progress-percentage" style={{ fontSize: '0.9rem' }}>{optimizationProgress}%</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRunOptimization(true)}
                  disabled={isOptimizationRunning}
                  className="btn-force-regenerate"
                >
                  {isOptimizationRunning ? 'Running...' : 'Force Regenerate All'}
                </button>
                {optimizationComplete && !isOptimizationRunning && (
                  <span style={{ color: 'var(--primary-color)', fontSize: '1.5rem' }}>✓</span>
                )}
              </div>
            </div>

            {optimizationLogs.length > 0 && (
              <div className="titles-output" style={{ maxHeight: '500px' }} ref={optimizationOutputRef}>
                <div className="titles-output-content">
                  {optimizationLogs.map((log, index) => (
                    <div key={index} className="output-line">{log}</div>
                  ))}
                  {isOptimizationRunning && (
                    <div className="output-line" style={{ marginTop: '0.5rem', color: '#4ade80' }}>⏳ Running...</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Settings - Collapsible */}
        <div className="config-group full-width">
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '0.5rem',
              cursor: 'pointer',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <h3 className="config-section-title" style={{ margin: 0 }}>
              {showAdvanced ? '▼' : '▶'} Advanced Settings
            </h3>
            <span style={{ color: '#888', fontSize: '0.9rem' }}>
              {showAdvanced ? 'Click to collapse' : 'Click to expand'}
            </span>
          </div>
          <p className="config-section-description" style={{ marginTop: '0.5rem' }}>
            Backend, frontend, security, and authentication settings. ⚠️ Changing these may require a server restart.
          </p>

          {showAdvanced && (
            <>
              {/* Backend Settings */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ color: 'var(--primary-color)', margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Backend</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {hasUnsavedChanges('Backend') && (
                      <span className="unsaved-indicator">Unsaved changes</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSaveSection('Backend'); }}
                      disabled={savingSection !== null}
                      className="btn-primary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      {savingSection === 'Backend' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
                <p className="config-section-description">
                  Server configuration including port, photos directory, and CORS allowed origins
                </p>
                <div className="config-grid-inner">
                  <div className="branding-group">
                    <label className="branding-label">Port</label>
                    <input
                      type="number"
                      value={config.environment.backend.port}
                      onChange={(e) => updateConfig(['environment', 'backend', 'port'], parseInt(e.target.value))}
                      className="branding-input"
                    />
                  </div>

                  <div className="branding-group">
                    <label className="branding-label">Photos Directory</label>
                    <input
                      type="text"
                      value={config.environment.backend.photosDir}
                      onChange={(e) => updateConfig(['environment', 'backend', 'photosDir'], e.target.value)}
                      className="branding-input"
                    />
                  </div>

                  <div className="branding-group full-width">
                    <label className="branding-label">Allowed Origins</label>
                    {config.environment.backend.allowedOrigins.map((origin, index) => (
                      <div key={index} className="array-item">
                        <input
                          type="text"
                          value={origin}
                          onChange={(e) => updateArrayItem(['environment', 'backend', 'allowedOrigins'], index, e.target.value)}
                          className="branding-input"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem(['environment', 'backend', 'allowedOrigins'], index)}
                          className="btn-remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem(['environment', 'backend', 'allowedOrigins'])}
                      className="btn-add"
                    >
                      + Add Origin
                    </button>
                  </div>
                </div>
                
                {/* Backend Restart Button */}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <button
                    type="button"
                    onClick={handleRestartBackend}
                    disabled={restartingBackend}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    🔄 {restartingBackend ? 'Restarting...' : 'Restart Backend Server'}
                  </button>
                  <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.5rem', marginBottom: 0 }}>
                    Server will restart automatically if using a process manager (pm2, nodemon, systemd)
                  </p>
                </div>
              </div>

              {/* Frontend Settings */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ color: 'var(--primary-color)', margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Frontend</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {hasUnsavedChanges('Frontend') && (
                      <span className="unsaved-indicator">Unsaved changes</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSaveSection('Frontend'); }}
                      disabled={savingSection !== null}
                      className="btn-primary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      {savingSection === 'Frontend' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
                <p className="config-section-description">
                  Frontend development server port and API URL for connecting to the backend
                </p>
                <div className="config-grid-inner">
                  <div className="branding-group">
                    <label className="branding-label">Port</label>
                    <input
                      type="number"
                      value={config.environment.frontend.port}
                      onChange={(e) => updateConfig(['environment', 'frontend', 'port'], parseInt(e.target.value))}
                      className="branding-input"
                    />
                  </div>

                  <div className="branding-group">
                    <label className="branding-label">API URL</label>
                    <input
                      type="text"
                      value={config.environment.frontend.apiUrl}
                      onChange={(e) => updateConfig(['environment', 'frontend', 'apiUrl'], e.target.value)}
                      className="branding-input"
                    />
                  </div>
                </div>
                
                {/* Frontend Restart Button */}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <button
                    type="button"
                    onClick={handleRestartFrontend}
                    disabled={restartingFrontend}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    🔄 {restartingFrontend ? 'Restarting...' : 'Restart Frontend Server'}
                  </button>
                  <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.5rem', marginBottom: 0 }}>
                    In development, manually restart your dev server. In production, use your process manager.
                  </p>
                </div>
              </div>

              {/* Security Settings */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ color: 'var(--primary-color)', margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Security</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {hasUnsavedChanges('Security') && (
                      <span className="unsaved-indicator">Unsaved changes</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSaveSection('Security'); }}
                      disabled={savingSection !== null}
                      className="btn-primary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      {savingSection === 'Security' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
                <p className="config-section-description">
                  Rate limiting and allowed hosts for protecting against abuse and unauthorized access
                </p>
                <div className="config-grid-inner">
            <div className="branding-group">
              <label className="branding-label">Rate Limit Window (ms)</label>
              <input
                type="number"
                value={config.environment.security.rateLimitWindowMs}
                onChange={(e) => updateConfig(['environment', 'security', 'rateLimitWindowMs'], parseInt(e.target.value))}
                className="branding-input"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">Rate Limit Max Requests</label>
              <input
                type="number"
                value={config.environment.security.rateLimitMaxRequests}
                onChange={(e) => updateConfig(['environment', 'security', 'rateLimitMaxRequests'], parseInt(e.target.value))}
                className="branding-input"
              />
            </div>

            <div className="branding-group full-width">
              <label className="branding-label">Allowed Hosts</label>
              {config.environment.security.allowedHosts.map((host, index) => (
                <div key={index} className="array-item">
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => updateArrayItem(['environment', 'security', 'allowedHosts'], index, e.target.value)}
                    className="branding-input"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem(['environment', 'security', 'allowedHosts'], index)}
                    className="btn-remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem(['environment', 'security', 'allowedHosts'])}
                className="btn-add"
              >
                + Add Host
              </button>
            </div>
          </div>
        </div>

              {/* Auth Settings */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ color: 'var(--primary-color)', margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Authentication</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {hasUnsavedChanges('Authentication') && (
                      <span className="unsaved-indicator">Unsaved changes</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSaveSection('Authentication'); }}
                      disabled={savingSection !== null}
                      className="btn-primary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      {savingSection === 'Authentication' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
                <p className="config-section-description">
                  Google OAuth credentials and authorized email addresses for admin access
                </p>
                <div className="config-grid-inner">
            <div className="branding-group">
              <label className="branding-label">Google Client ID</label>
              <input
                type="text"
                value={config.environment.auth.google.clientId}
                onChange={(e) => updateConfig(['environment', 'auth', 'google', 'clientId'], e.target.value)}
                className="branding-input"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">Google Client Secret</label>
              <input
                type="password"
                value={config.environment.auth.google.clientSecret}
                onChange={(e) => updateConfig(['environment', 'auth', 'google', 'clientSecret'], e.target.value)}
                className="branding-input"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">Session Secret</label>
              <input
                type="password"
                value={config.environment.auth.sessionSecret}
                onChange={(e) => updateConfig(['environment', 'auth', 'sessionSecret'], e.target.value)}
                className="branding-input"
              />
            </div>

            <div className="branding-group full-width">
              <label className="branding-label">Authorized Emails</label>
              {config.environment.auth.authorizedEmails.map((email, index) => (
                <div key={index} className="array-item">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateArrayItem(['environment', 'auth', 'authorizedEmails'], index, e.target.value)}
                    className="branding-input"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem(['environment', 'auth', 'authorizedEmails'], index)}
                    className="btn-remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem(['environment', 'auth', 'authorizedEmails'])}
                className="btn-add"
              >
                + Add Email
              </button>
            </div>
          </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default ConfigManager;

