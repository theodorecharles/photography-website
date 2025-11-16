/**
 * Config Manager - Main Orchestrator
 * Coordinates all configuration sections and manages global state
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { ConfigManagerProps, ConfigData } from './types';
import { useSSEToaster } from '../../../contexts/SSEToasterContext';
import BrandingSection from './sections/BrandingSection';
import LinksSection from './sections/LinksSection';
import UserManagementSection from './sections/UserManagementSection';
import OpenAISection from './sections/OpenAISection';
import ImageOptimizationSection from './sections/ImageOptimizationSection';
import AdvancedSettingsSection from './sections/AdvancedSettingsSection';
import '../ConfigManager.css';

const API_URL = import.meta.env.VITE_API_URL || "";

const ConfigManager: React.FC<ConfigManagerProps> = ({
  setMessage,
  branding,
  setBranding,
  loadBranding,
  externalLinks,
  setExternalLinks,
}) => {
  // Get global SSE toaster context
  const sseToaster = useSSEToaster();

  // Debug logging for props
  useEffect(() => {
    console.log('[ConfigManager] Received branding prop:', branding);
  }, [branding]);

  useEffect(() => {
    console.log('[ConfigManager] Received externalLinks prop:', externalLinks);
  }, [externalLinks]);
  
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [originalConfig, setOriginalConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  
  // Local state (not related to SSE jobs)
  const [hasMissingTitles, setHasMissingTitles] = useState(false);
  const [optimizationComplete, setOptimizationComplete] = useState(false);
  
  // Navigation state for SMTP settings
  const [scrollToSmtp, setScrollToSmtp] = useState(false);
  const advancedSectionRef = useRef<HTMLDivElement>(null);
  
  // Navigation state for OpenAI settings
  const [scrollToOpenAI, setScrollToOpenAI] = useState(false);
  const openAISectionRef = useRef<HTMLDivElement>(null);

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Refs removed - handled by individual sections now

  // Helper function to show confirmation modal
  const showConfirmation = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmConfig({
        message,
        onConfirm: () => {
          setShowConfirmModal(false);
          setConfirmConfig(null);
          resolve(true);
        },
      });
      setShowConfirmModal(true);
      // Store reject function for cancel
      const originalResolve = resolve;
      (window as any).__modalResolve = originalResolve;
    });
  };

  // Handler to navigate to SMTP settings
  const handleNavigateToSmtp = () => {
    setScrollToSmtp(true);
  };
  
  // Handler to navigate to OpenAI settings  
  const handleSetupOpenAI = () => {
    setScrollToOpenAI(true);
  };

  const handleModalCancel = () => {
    setShowConfirmModal(false);
    setConfirmConfig(null);
    if ((window as any).__modalResolve) {
      (window as any).__modalResolve(false);
      delete (window as any).__modalResolve;
    }
  };

  useEffect(() => {
    console.log('[ConfigManager Mount] generatingTitles:', sseToaster.generatingTitles, 'isOptimizationRunning:', sseToaster.isOptimizationRunning);
    loadConfig();
    // Only check for running jobs if there's no job already running in the global context
    if (!sseToaster.generatingTitles && !sseToaster.isOptimizationRunning) {
      console.log('[ConfigManager] No active job in context, checking backend for running jobs');
      checkForRunningJobs();
    } else {
      console.log('[ConfigManager] Job already running in context, skipping backend check');
    }
    checkMissingTitles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for running jobs on mount and reconnect if needed
  const checkForRunningJobs = async () => {
    try {
      // Check AI titles job
      const titlesRes = await fetch(`${API_URL}/api/ai-titles/status`, {
        credentials: "include",
      });
      if (titlesRes.ok) {
        const titlesStatus = await titlesRes.json();
        if (titlesStatus.running && !titlesStatus.isComplete) {
          console.log("Reconnecting to AI titles job...");
          
          // Parse stored output
          const parsedOutput: string[] = [];
          let lastProgress = 0;
          let lastWaiting: number | null = null;
          
          for (const item of titlesStatus.output || []) {
            try {
              const parsed = JSON.parse(item);
              if (parsed.type === "progress") {
                lastProgress = parsed.percent;
                parsedOutput.push(parsed.message);
              } else if (parsed.type === "waiting") {
                lastWaiting = parsed.seconds;
              }
            } catch {
              parsedOutput.push(item);
            }
          }

          // Update global context to show toaster
          sseToaster.setGeneratingTitles(true);
          sseToaster.setTitlesOutput(parsedOutput);
          sseToaster.setTitlesProgress(lastProgress);
          sseToaster.setTitlesWaiting(lastWaiting);

          // Reconnect to the SSE stream
          reconnectToTitlesJob();
        }
      }

      // Check optimization job
      const optRes = await fetch(`${API_URL}/api/image-optimization/status`, {
        credentials: "include",
      });
      if (optRes.ok) {
        const optStatus = await optRes.json();
        if (optStatus.running && !optStatus.isComplete) {
          console.log("Reconnecting to optimization job...");

          // Parse stored output
          const parsedOutput: string[] = [];
          let lastProgress = 0;
          
          for (const item of optStatus.output || []) {
            try {
              const parsed = JSON.parse(item);
              if (parsed.type === "progress") {
                lastProgress = parsed.percent;
                parsedOutput.push(parsed.message);
              } else if (parsed.type === "stdout" || parsed.type === "stderr") {
                parsedOutput.push(parsed.message);
              }
            } catch {
              parsedOutput.push(item);
            }
          }

          // Update global context to show toaster
          sseToaster.setIsOptimizationRunning(true);
          sseToaster.setOptimizationLogs(parsedOutput);
          sseToaster.setOptimizationProgress(lastProgress);

          // Reconnect to the SSE stream
          reconnectToOptimizationJob();
        }
      }
    } catch (err) {
      console.error("Error checking for running jobs:", err);
    }
  };

  // Reconnect to AI titles SSE stream
  const reconnectToTitlesJob = async () => {
    // Create new abort controller for this reconnection
    const controller = new AbortController();
    sseToaster.titlesAbortController.current = controller;

    try {
      const res = await fetch(`${API_URL}/api/ai-titles/generate`, {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error("Failed to reconnect to AI title generation");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);

            if (data === "__COMPLETE__") {
              setMessage({
                type: "success",
                text: "AI title generation completed successfully!",
              });
              sseToaster.setGeneratingTitles(false);
              sseToaster.titlesAbortController.current = null;
            } else if (data.startsWith("__ERROR__")) {
              setMessage({ type: "error", text: data.substring(10) });
              sseToaster.setGeneratingTitles(false);
              sseToaster.titlesAbortController.current = null;
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "progress") {
                  sseToaster.setTitlesProgress(parsed.percent);
                  sseToaster.setTitlesWaiting(null);
                  sseToaster.setTitlesOutput((prev) => [...prev, parsed.message]);
                } else if (parsed.type === "waiting") {
                  sseToaster.setTitlesWaiting(parsed.seconds);
                } else {
                  sseToaster.setTitlesOutput((prev) => [...prev, data]);
                }
              } catch {
                sseToaster.setTitlesOutput((prev) => [...prev, data]);
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("AI titles job stopped by user");
        sseToaster.titlesAbortController.current = null;
      } else {
        console.error("Failed to reconnect to titles job:", err);
        sseToaster.setGeneratingTitles(false);
        sseToaster.titlesAbortController.current = null;
      }
    }
  };

  // Reconnect to optimization SSE stream
  const reconnectToOptimizationJob = async () => {
    // Create new abort controller for this reconnection
    const controller = new AbortController();
    sseToaster.optimizationAbortController.current = controller;

    try {
      const res = await fetch(`${API_URL}/api/image-optimization/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ force: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        sseToaster.setIsOptimizationRunning(false);
        sseToaster.optimizationAbortController.current = null;
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        sseToaster.setIsOptimizationRunning(false);
        sseToaster.optimizationAbortController.current = null;
        return;
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "progress") {
                sseToaster.setOptimizationProgress(data.percent);
                sseToaster.setOptimizationLogs((prev) => [...prev, data.message]);
              } else if (data.type === "stdout" || data.type === "stderr") {
                sseToaster.setOptimizationLogs((prev) => [...prev, data.message]);
              } else if (data.type === "complete") {
                setOptimizationComplete(true);
                sseToaster.setIsOptimizationRunning(false);
                sseToaster.optimizationAbortController.current = null;
              } else if (data.type === "error") {
                setMessage({ type: "error", text: data.message });
                sseToaster.setIsOptimizationRunning(false);
                sseToaster.optimizationAbortController.current = null;
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Optimization job stopped by user");
        sseToaster.optimizationAbortController.current = null;
      } else {
        console.error("Failed to reconnect to optimization job:", err);
        sseToaster.setIsOptimizationRunning(false);
        sseToaster.optimizationAbortController.current = null;
      }
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/config`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setOriginalConfig(structuredClone(data));
      } else {
        setMessage({ type: "error", text: "Failed to load configuration" });
      }
    } catch (err) {
      console.error("Failed to load config:", err);
      setMessage({ type: "error", text: "Failed to load configuration" });
    } finally {
      setLoading(false);
    }
  };

  const checkMissingTitles = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ai-titles/check-missing`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setHasMissingTitles(data.hasMissingTitles);
      }
    } catch (err) {
      console.error("Failed to check missing titles:", err);
    }
  };

  const handleStopTitles = useCallback(async () => {
    console.log('[handleStopTitles] Called');
    try {
      // Call backend to kill the process
      const response = await fetch(`${API_URL}/api/ai-titles/stop`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log('[handleStopTitles] Backend response:', response.ok);

      // Abort the SSE connection using global context
      if (sseToaster.titlesAbortController.current) {
        console.log('[handleStopTitles] Aborting SSE connection');
        sseToaster.titlesAbortController.current.abort();
        sseToaster.titlesAbortController.current = null;
      }

      // Clear output and reset state using global context setters
      console.log('[handleStopTitles] Clearing global state');
      sseToaster.setGeneratingTitles(false);
      sseToaster.setTitlesOutput([]);
      sseToaster.setTitlesProgress(0);
      sseToaster.setTitlesWaiting(null);
      console.log('[handleStopTitles] Done');
    } catch (err) {
      console.error("Failed to stop AI titles job:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStopOptimization = useCallback(async () => {
    console.log('[handleStopOptimization] Called');
    try {
      // Call backend to kill the process
      const response = await fetch(`${API_URL}/api/image-optimization/stop`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();
      console.log('[handleStopOptimization] Backend response:', result.success);

      // Abort the SSE connection using global context
      if (sseToaster.optimizationAbortController.current) {
        console.log('[handleStopOptimization] Aborting SSE connection');
        sseToaster.optimizationAbortController.current.abort();
        sseToaster.optimizationAbortController.current = null;
      }

      // Clear output and reset state using global context setters
      console.log('[handleStopOptimization] Clearing global state');
      sseToaster.setIsOptimizationRunning(false);
      sseToaster.setOptimizationLogs([]);
      sseToaster.setOptimizationProgress(0);
      setOptimizationComplete(false);
      console.log('[handleStopOptimization] Done');
    } catch (err) {
      console.error("Failed to stop optimization job:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Register stop handlers with global context
  useEffect(() => {
    console.log('[ConfigManager] Registering stop handlers');
    sseToaster.setStopTitlesHandler(() => handleStopTitles);
    sseToaster.setStopOptimizationHandler(() => handleStopOptimization);
    console.log('[ConfigManager] Stop handlers registered');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateTitles = async (forceRegenerate = false) => {
    // Initialize global context state to show toaster
    sseToaster.setGeneratingTitles(true);
    sseToaster.setTitlesOutput([]);
    sseToaster.setTitlesProgress(0);
    sseToaster.setTitlesWaiting(null);
    
    // Reset toaster to default state
    sseToaster.resetToasterState();

    try {
      const abortController = new AbortController();
      sseToaster.titlesAbortController.current = abortController;

      const res = await fetch(
        `${API_URL}/api/ai-titles/generate?forceRegenerate=${forceRegenerate}`,
        {
          method: "POST",
          credentials: "include",
          signal: abortController.signal,
        }
      );

      if (!res.ok) {
        throw new Error("Failed to start AI title generation");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);

            if (data === "__COMPLETE__") {
              setMessage({
                type: "success",
                text: "AI title generation completed successfully!",
              });
              sseToaster.setGeneratingTitles(false);
              sseToaster.titlesAbortController.current = null;
              checkMissingTitles(); // Refresh button visibility
            } else if (data.startsWith("__ERROR__")) {
              setMessage({ type: "error", text: data.substring(10) });
              sseToaster.setGeneratingTitles(false);
              sseToaster.titlesAbortController.current = null;
              checkMissingTitles(); // Refresh button visibility
            } else if (data.startsWith("TITLE_UPDATE:")) {
              // Handle real-time title updates
              try {
                const titleData = JSON.parse(data.substring(13));
                sseToaster.addTitleUpdate(titleData.album, titleData.filename, titleData.title);
              } catch (err) {
                console.error("Failed to parse TITLE_UPDATE:", err);
              }
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "progress") {
                  sseToaster.setTitlesProgress(parsed.percent);
                  sseToaster.setTitlesWaiting(null);
                  sseToaster.setTitlesOutput((prev) => [...prev, parsed.message]);
                } else if (parsed.type === "waiting") {
                  sseToaster.setTitlesWaiting(parsed.seconds);
                } else {
                  sseToaster.setTitlesOutput((prev) => [...prev, data]);
                }
              } catch {
                sseToaster.setTitlesOutput((prev) => [...prev, data]);
              }
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      const errorMessage =
        err instanceof Error ? err.message : "Error generating titles";
      setMessage({ type: "error", text: errorMessage });
      console.error("Failed to generate titles:", err);
      sseToaster.setGeneratingTitles(false);
      sseToaster.titlesAbortController.current = null;
      checkMissingTitles(); // Refresh button visibility
    }
  };

  const handleRunOptimization = async (force: boolean = false) => {
    const confirmed = await showConfirmation(
      force
        ? "Force regenerate ALL images? This will take a while."
        : "Run image optimization on all photos?"
    );
    if (!confirmed) return;

    // Initialize global context state to show toaster
    sseToaster.setIsOptimizationRunning(true);
    sseToaster.setOptimizationLogs([]);
    sseToaster.setOptimizationProgress(0);
    setOptimizationComplete(false);
    
    // Reset toaster to default state
    sseToaster.resetToasterState();

    try {
      const abortController = new AbortController();
      sseToaster.optimizationAbortController.current = abortController;

      const res = await fetch(`${API_URL}/api/image-optimization/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ force }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        let errorMessage = "Failed to start optimization";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response isn't JSON, use default message
        }
        setMessage({
          type: "error",
          text: `${errorMessage} (Status: ${res.status})`,
        });
        sseToaster.setIsOptimizationRunning(false);
        sseToaster.optimizationAbortController.current = null;
        return;
      }

      // Parse SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setMessage({ type: "error", text: "Failed to read response stream" });
        sseToaster.setIsOptimizationRunning(false);
        return;
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "progress") {
                sseToaster.setOptimizationProgress(data.percent);
                sseToaster.setOptimizationLogs((prev) => [...prev, data.message]);
              } else if (data.type === "stdout" || data.type === "stderr") {
                sseToaster.setOptimizationLogs((prev) => [...prev, data.message]);
              } else if (data.type === "complete") {
                // Only mark as complete and show final message for the last completion
                if (data.message.includes("AI title generation")) {
                  setOptimizationComplete(true);
                  sseToaster.setOptimizationLogs((prev) =>
                    prev.filter((log) => !log.startsWith("Generating"))
                  );
                  setMessage({
                    type: data.exitCode === 0 ? "success" : "error",
                    text:
                      data.exitCode === 0
                        ? "Optimization and AI title generation completed!"
                        : "AI title generation failed",
                  });
                } else {
                  sseToaster.setOptimizationLogs((prev) => [...prev, data.message]);
                }
              } else if (data.type === "error") {
                setMessage({ type: "error", text: data.message });
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      console.error("Optimization error:", err);
      setMessage({ type: "error", text: "Network error occurred" });
      sseToaster.setIsOptimizationRunning(false);
      sseToaster.optimizationAbortController.current = null;
    }
  };

  if (loading) {
    return (
      <div
        className="loading-container"
        style={{
          minHeight: "400px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <section className="admin-section">
        <h2>Settings</h2>
        <p>Failed to load configuration</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <h2>Settings</h2>
      <p className="section-description">
        Manage branding, links, and system configuration
      </p>

      <div className="config-grid">
        <BrandingSection
          branding={branding}
          setBranding={setBranding}
          loadBranding={loadBranding}
          setMessage={setMessage}
        />

        <LinksSection
          externalLinks={externalLinks}
          setExternalLinks={setExternalLinks}
          setMessage={setMessage}
        />

        <UserManagementSection
          setMessage={setMessage}
          onNavigateToSmtp={handleNavigateToSmtp}
        />

        <OpenAISection
          config={config}
          originalConfig={originalConfig}
          setConfig={setConfig}
          setOriginalConfig={setOriginalConfig}
          savingSection={savingSection}
          setSavingSection={setSavingSection}
          setMessage={setMessage}
          scrollToOpenAI={scrollToOpenAI}
          setScrollToOpenAI={setScrollToOpenAI}
          sectionRef={openAISectionRef}
        />

        <ImageOptimizationSection
          config={config}
          originalConfig={originalConfig}
          setConfig={setConfig}
          setOriginalConfig={setOriginalConfig}
          savingSection={savingSection}
          setSavingSection={setSavingSection}
          setMessage={setMessage}
        />

        <AdvancedSettingsSection
          config={config}
          originalConfig={originalConfig}
          setConfig={setConfig}
          setOriginalConfig={setOriginalConfig}
          savingSection={savingSection}
          setSavingSection={setSavingSection}
          setMessage={setMessage}
          hasMissingTitles={hasMissingTitles}
          optimizationComplete={optimizationComplete}
          generatingTitles={sseToaster.generatingTitles}
          isOptimizationRunning={sseToaster.isOptimizationRunning}
          onGenerateTitles={handleGenerateTitles}
          onStopTitles={handleStopTitles}
          onRunOptimization={handleRunOptimization}
          onStopOptimization={handleStopOptimization}
          onSetupOpenAI={handleSetupOpenAI}
          showConfirmation={showConfirmation}
          scrollToSmtp={scrollToSmtp}
          setScrollToSmtp={setScrollToSmtp}
          sectionRef={advancedSectionRef}
        />
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && confirmConfig && (
        <div className="modal-overlay" onClick={handleModalCancel}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="share-modal-header">
              <h2>Confirm Action</h2>
              <button className="close-button" onClick={handleModalCancel} aria-label="Close">
                ×
              </button>
            </div>
            <div className="share-modal-content">
              <p className="share-description">{confirmConfig.message}</p>
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  paddingTop: '1rem',
                  borderTop: '1px solid #3a3a3a',
                }}
              >
                <button onClick={handleModalCancel} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={confirmConfig.onConfirm} className="btn-primary">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ConfigManager;
