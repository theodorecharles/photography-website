/**
 * Settings Component
 * Unified settings management for branding, links, OpenAI, optimization, and advanced config
 */

import { useState, useEffect, useRef } from "react";
import "./ConfigManager.css";
import "./BrandingManager.css";
import "./LinksManager.css";
import { BrandingConfig, ExternalLink } from "./types";
import {
  trackBrandingUpdate,
  trackAvatarUpload,
  trackExternalLinksUpdate,
} from "../../utils/analytics";

const API_URL = import.meta.env.VITE_API_URL || "";

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
      thumbnail: { quality: number; maxDimension: number };
      modal: { quality: number; maxDimension: number };
      download: { quality: number; maxDimension: number };
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

interface AIConfig {
  autoGenerateTitlesOnUpload: boolean;
}

interface ConfigData {
  environment: EnvironmentConfig;
  openai: OpenAIConfig;
  analytics: AnalyticsConfig;
  ai?: AIConfig;
}

interface ConfigManagerProps {
  setMessage: (message: { type: "success" | "error"; text: string }) => void;
  branding: BrandingConfig;
  setBranding: (branding: BrandingConfig) => void;
  loadBranding: () => Promise<void>;
  externalLinks: ExternalLink[];
  setExternalLinks: (links: ExternalLink[]) => void;
}

const ConfigManager: React.FC<ConfigManagerProps> = ({
  setMessage,
  branding,
  setBranding,
  loadBranding,
  externalLinks,
  setExternalLinks,
}) => {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [originalConfig, setOriginalConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [titlesOutput, setTitlesOutput] = useState<string[]>([]);
  const [titlesProgress, setTitlesProgress] = useState(0);
  const [titlesWaiting, setTitlesWaiting] = useState<number | null>(null);
  const [optimizationLogs, setOptimizationLogs] = useState<string[]>([]);
  const [isOptimizationRunning, setIsOptimizationRunning] = useState(false);
  const [optimizationComplete, setOptimizationComplete] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);

  // Section collapse state - all collapsed by default
  const [showBranding, setShowBranding] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showImageOptimization, setShowImageOptimization] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [restartingBackend, setRestartingBackend] = useState(false);
  const [restartingFrontend, setRestartingFrontend] = useState(false);

  // Branding and Links state
  const [savingBranding, setSavingBranding] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [savingLinks, setSavingLinks] = useState(false);

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Refs for auto-scroll and scroll-into-view
  const optimizationOutputRef = useRef<HTMLDivElement>(null);
  const titlesOutputRef = useRef<HTMLDivElement>(null);
  const regenerateButtonRef = useRef<HTMLDivElement>(null);
  const openAISectionRef = useRef<HTMLDivElement>(null);
  const apiKeyInputRef = useRef<HTMLInputElement>(null);

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

  const handleModalCancel = () => {
    setShowConfirmModal(false);
    setConfirmConfig(null);
    if ((window as any).__modalResolve) {
      (window as any).__modalResolve(false);
      delete (window as any).__modalResolve;
    }
  };

  // Function to scroll to and highlight OpenAI API key input
  const handleSetupOpenAI = () => {
    // Expand the OpenAI section
    setShowOpenAI(true);
    
    // Wait for the section to expand, then scroll and focus
    setTimeout(() => {
      if (openAISectionRef.current) {
        const yOffset = -100; // Offset to account for header
        const element = openAISectionRef.current;
        const y =
          element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
      
      // Focus and highlight the input field
      setTimeout(() => {
        if (apiKeyInputRef.current) {
          apiKeyInputRef.current.focus();
          apiKeyInputRef.current.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
          apiKeyInputRef.current.style.borderColor = 'rgba(59, 130, 246, 0.8)';
          
          // Remove highlight after 2 seconds
          setTimeout(() => {
            if (apiKeyInputRef.current) {
              apiKeyInputRef.current.style.boxShadow = '';
              apiKeyInputRef.current.style.borderColor = '';
            }
          }, 2000);
        }
      }, 400);
    }, 100);
  };

  useEffect(() => {
    loadConfig();
    checkForRunningJobs();
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
          setGeneratingTitles(true);

          // Parse stored output
          const parsedOutput: string[] = [];
          for (const item of titlesStatus.output || []) {
            try {
              const parsed = JSON.parse(item);
              if (parsed.type === "progress") {
                setTitlesProgress(parsed.percent);
                parsedOutput.push(parsed.message);
              } else if (parsed.type === "waiting") {
                setTitlesWaiting(parsed.seconds);
              }
            } catch {
              parsedOutput.push(item);
            }
          }
          setTitlesOutput(parsedOutput);

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
          setIsOptimizationRunning(true);

          // Parse stored output
          const parsedOutput: string[] = [];
          for (const item of optStatus.output || []) {
            try {
              const parsed = JSON.parse(item);
              if (parsed.type === "progress") {
                setOptimizationProgress(parsed.percent);
                parsedOutput.push(parsed.message);
              } else if (parsed.type === "stdout" || parsed.type === "stderr") {
                parsedOutput.push(parsed.message);
              }
            } catch {
              parsedOutput.push(item);
            }
          }
          setOptimizationLogs(parsedOutput);

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
    titlesAbortController.current = controller;

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
              setGeneratingTitles(false);
              titlesAbortController.current = null;
            } else if (data.startsWith("__ERROR__")) {
              setMessage({ type: "error", text: data.substring(10) });
              setGeneratingTitles(false);
              titlesAbortController.current = null;
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "progress") {
                  setTitlesProgress(parsed.percent);
                  setTitlesWaiting(null);
                  setTitlesOutput((prev) => [...prev, parsed.message]);
                } else if (parsed.type === "waiting") {
                  setTitlesWaiting(parsed.seconds);
                } else {
                  setTitlesOutput((prev) => [...prev, data]);
                }
              } catch {
                setTitlesOutput((prev) => [...prev, data]);
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("AI titles job stopped by user");
        setGeneratingTitles(false);
        titlesAbortController.current = null;
      } else {
        console.error("Failed to reconnect to titles job:", err);
        setGeneratingTitles(false);
        titlesAbortController.current = null;
      }
    }
  };

  // Reconnect to optimization SSE stream
  const reconnectToOptimizationJob = async () => {
    // Create new abort controller for this reconnection
    const controller = new AbortController();
    optimizationAbortController.current = controller;

    try {
      const res = await fetch(`${API_URL}/api/image-optimization/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ force: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        setIsOptimizationRunning(false);
        optimizationAbortController.current = null;
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setIsOptimizationRunning(false);
        optimizationAbortController.current = null;
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
                setOptimizationProgress(data.percent);
                setOptimizationLogs((prev) => [...prev, data.message]);
              } else if (data.type === "stdout" || data.type === "stderr") {
                setOptimizationLogs((prev) => [...prev, data.message]);
              } else if (data.type === "complete") {
                setOptimizationComplete(true);
                setIsOptimizationRunning(false);
                optimizationAbortController.current = null;
              } else if (data.type === "error") {
                setMessage({ type: "error", text: data.message });
                setIsOptimizationRunning(false);
                optimizationAbortController.current = null;
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
        setIsOptimizationRunning(false);
        optimizationAbortController.current = null;
      } else {
        console.error("Failed to reconnect to optimization job:", err);
        setIsOptimizationRunning(false);
        optimizationAbortController.current = null;
      }
    }
  };

  // Auto-scroll optimization output to bottom when new logs arrive
  useEffect(() => {
    if (optimizationOutputRef.current && isOptimizationRunning) {
      setTimeout(() => {
        if (optimizationOutputRef.current) {
          optimizationOutputRef.current.scrollTop =
            optimizationOutputRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [optimizationLogs, isOptimizationRunning]);

  // Auto-scroll titles output to bottom when new lines arrive
  useEffect(() => {
    if (titlesOutputRef.current && generatingTitles) {
      setTimeout(() => {
        if (titlesOutputRef.current) {
          titlesOutputRef.current.scrollTop =
            titlesOutputRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [titlesOutput, generatingTitles]);

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/config`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setOriginalConfig(JSON.parse(JSON.stringify(data))); // Deep clone
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

  const hasUnsavedChanges = (sectionName: string): boolean => {
    if (!config || !originalConfig) return false;

    switch (sectionName) {
      case "OpenAI":
        // Only check API key, not the auto-generate toggle (which auto-saves)
        return config.openai?.apiKey !== originalConfig.openai?.apiKey;

      case "Image Optimization":
        return (
          JSON.stringify(config.environment.optimization) !==
          JSON.stringify(originalConfig.environment.optimization)
        );

      case "Thumbnail":
        return (
          JSON.stringify(config.environment.optimization.images.thumbnail) !==
          JSON.stringify(
            originalConfig.environment.optimization.images.thumbnail
          )
        );

      case "Modal":
        return (
          JSON.stringify(config.environment.optimization.images.modal) !==
          JSON.stringify(originalConfig.environment.optimization.images.modal)
        );

      case "Download":
        return (
          JSON.stringify(config.environment.optimization.images.download) !==
          JSON.stringify(
            originalConfig.environment.optimization.images.download
          )
        );

      case "Concurrency":
        return (
          config.environment.optimization.concurrency !==
          originalConfig.environment.optimization.concurrency
        );

      case "Backend":
        return (
          JSON.stringify(config.environment.backend) !==
          JSON.stringify(originalConfig.environment.backend)
        );

      case "Frontend":
        return (
          JSON.stringify(config.environment.frontend) !==
          JSON.stringify(originalConfig.environment.frontend)
        );

      case "Security":
        return (
          JSON.stringify(config.environment.security) !==
          JSON.stringify(originalConfig.environment.security)
        );

      case "Authentication":
        return (
          JSON.stringify(config.environment.auth) !==
          JSON.stringify(originalConfig.environment.auth)
        );

      case "Analytics":
        return (
          JSON.stringify(config.analytics) !==
          JSON.stringify(originalConfig.analytics)
        );

      default:
        return false;
    }
  };

  const handleSaveSection = async (sectionName: string) => {
    if (!config) return;

    setSavingSection(sectionName);

    try {
      const res = await fetch(`${API_URL}/api/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setMessage({ type: "success", text: `${sectionName} settings saved!` });
        // Update original config after successful save
        setOriginalConfig(JSON.parse(JSON.stringify(config)));
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        setMessage({
          type: "error",
          text: errorData.error || "Failed to save configuration",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error saving configuration";
      setMessage({ type: "error", text: errorMessage });
      console.error("Failed to save config:", err);
    } finally {
      setSavingSection(null);
    }
  };

  // Store abort controllers to allow stopping jobs
  const titlesAbortController = useRef<AbortController | null>(null);
  const optimizationAbortController = useRef<AbortController | null>(null);

  const handleStopTitles = async () => {
    try {
      // Call backend to kill the process
      await fetch(`${API_URL}/api/ai-titles/stop`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Abort the SSE connection
      if (titlesAbortController.current) {
        titlesAbortController.current.abort();
        titlesAbortController.current = null;
      }

      // Clear output and reset state
      setGeneratingTitles(false);
      setTitlesOutput([]);
      setTitlesProgress(0);
      setTitlesWaiting(null);
      setMessage({ type: "success", text: "AI title generation stopped" });
    } catch (err) {
      console.error("Failed to stop AI titles job:", err);
      setMessage({ type: "error", text: "Failed to stop AI titles job" });
    }
  };

  const handleStopOptimization = async () => {
    try {
      // Call backend to kill the process
      await fetch(`${API_URL}/api/image-optimization/stop`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Abort the SSE connection
      if (optimizationAbortController.current) {
        optimizationAbortController.current.abort();
        optimizationAbortController.current = null;
      }

      // Clear output and reset state
      setIsOptimizationRunning(false);
      setOptimizationLogs([]);
      setOptimizationProgress(0);
      setOptimizationComplete(false);
      setMessage({ type: "success", text: "Optimization job stopped" });
    } catch (err) {
      console.error("Failed to stop optimization job:", err);
      setMessage({ type: "error", text: "Failed to stop optimization job" });
    }
  };

  const handleGenerateTitles = async (forceRegenerate = false) => {
    setGeneratingTitles(true);
    setTitlesOutput([]);
    setTitlesProgress(0);

    // Scroll to OpenAI section to show output
    setTimeout(() => {
      if (titlesOutputRef.current) {
        const yOffset = -100; // Offset to account for header
        const element = titlesOutputRef.current;
        const y =
          element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 100);

    try {
      const abortController = new AbortController();
      titlesAbortController.current = abortController;

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
              setGeneratingTitles(false);
              titlesAbortController.current = null;
            } else if (data.startsWith("__ERROR__")) {
              setMessage({ type: "error", text: data.substring(10) });
              setGeneratingTitles(false);
              titlesAbortController.current = null;
            } else {
              // Try to parse JSON progress data
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "progress") {
                  setTitlesProgress(parsed.percent);
                  setTitlesWaiting(null);
                  setTitlesOutput((prev) => [...prev, parsed.message]);
                } else if (parsed.type === "waiting") {
                  setTitlesWaiting(parsed.seconds);
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
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled, message already set
        return;
      }
      const errorMessage =
        err instanceof Error ? err.message : "Error generating titles";
      setMessage({ type: "error", text: errorMessage });
      console.error("Failed to generate titles:", err);
      setGeneratingTitles(false);
      titlesAbortController.current = null;
    }
  };

  const handleRestartBackend = async () => {
    const confirmed = await showConfirmation(
      "⚠️ Restart the backend server? This will temporarily disconnect all users."
    );
    if (!confirmed) return;

    setRestartingBackend(true);

    try {
      const res = await fetch(`${API_URL}/api/system/restart/backend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: "Backend server restarting... Please wait 5-10 seconds and refresh the page.",
        });
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        setMessage({
          type: "error",
          text: errorData.error || "Failed to restart backend",
        });
      }
    } catch (err) {
      // Expected error since server is restarting
      setMessage({
        type: "success",
        text: "Backend server restarting... Please wait 5-10 seconds and refresh the page.",
      });
    } finally {
      setRestartingBackend(false);
    }
  };

  const handleRestartFrontend = async () => {
    const confirmed = await showConfirmation(
      "⚠️ Restart the frontend server? This requires manual restart if in development mode."
    );
    if (!confirmed) return;

    setRestartingFrontend(true);

    try {
      const res = await fetch(`${API_URL}/api/system/restart/frontend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: data.message });
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        setMessage({
          type: "error",
          text: errorData.error || "Failed to restart frontend",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Network error occurred";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setRestartingFrontend(false);
    }
  };

  // ===== Branding Handlers =====
  const handleAvatarFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    setPendingAvatarFile(file);
  };

  const handleBrandingChange = (field: keyof BrandingConfig, value: string) => {
    setBranding({
      ...branding,
      [field]: value,
    });
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);

    try {
      let updatedBranding = { ...branding };

      // Upload avatar if there's a pending file
      if (pendingAvatarFile) {
        const formData = new FormData();
        formData.append("avatar", pendingAvatarFile);

        const avatarRes = await fetch(`${API_URL}/api/branding/upload-avatar`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (avatarRes.ok) {
          const data = await avatarRes.json();
          updatedBranding.avatarPath = data.avatarPath;
          setBranding({
            ...branding,
            avatarPath: data.avatarPath,
          });
          trackAvatarUpload();
          setPendingAvatarFile(null);
          setAvatarPreviewUrl(null);
        } else {
          const errorData = await avatarRes
            .json()
            .catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || "Failed to upload avatar");
        }
      }

      // Save branding settings
      const res = await fetch(`${API_URL}/api/branding`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updatedBranding),
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: "Branding settings saved successfully!",
        });
        const updatedFields = Object.keys(branding).filter(
          (key) => branding[key as keyof BrandingConfig]
        );
        trackBrandingUpdate(updatedFields);
        await loadBranding();
        window.dispatchEvent(new Event("branding-updated"));
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        setMessage({
          type: "error",
          text: errorData.error || "Failed to save branding settings",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error saving branding settings";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSavingBranding(false);
    }
  };

  // ===== Links Handlers =====
  const handleAddLink = () => {
    setExternalLinks([...externalLinks, { title: "", url: "" }]);
  };

  const handleDeleteLink = (index: number) => {
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
  };

  const handleLinkChange = (
    index: number,
    field: "title" | "url",
    value: string
  ) => {
    const newLinks = [...externalLinks];
    newLinks[index][field] = value;
    setExternalLinks(newLinks);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newLinks = [...externalLinks];
    const temp = newLinks[index];
    newLinks[index] = newLinks[index - 1];
    newLinks[index - 1] = temp;
    setExternalLinks(newLinks);
  };

  const handleMoveDown = (index: number) => {
    if (index === externalLinks.length - 1) return;
    const newLinks = [...externalLinks];
    const temp = newLinks[index];
    newLinks[index] = newLinks[index + 1];
    newLinks[index + 1] = temp;
    setExternalLinks(newLinks);
  };

  const handleSaveLinks = async () => {
    setSavingLinks(true);

    try {
      const res = await fetch(`${API_URL}/api/external-links`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ links: externalLinks }),
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: "External links saved successfully!",
        });
        trackExternalLinksUpdate(externalLinks.length);
        window.dispatchEvent(new Event("external-links-updated"));
      } else {
        const errorData = await res.json();
        setMessage({
          type: "error",
          text: errorData.error || "Failed to save external links",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error occurred" });
    } finally {
      setSavingLinks(false);
    }
  };

  const handleRunOptimization = async (force: boolean = false) => {
    const confirmed = await showConfirmation(
      force
        ? "Force regenerate ALL images? This will take a while."
        : "Run image optimization on all photos?"
    );
    if (!confirmed) return;

    setIsOptimizationRunning(true);
    setOptimizationComplete(false);
    setOptimizationLogs([]);
    setOptimizationProgress(0);

    // Scroll to regenerate button to show output
    setTimeout(() => {
      if (regenerateButtonRef.current) {
        const yOffset = -100; // Offset to account for header
        const element = regenerateButtonRef.current;
        const y =
          element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 100);

    try {
      const abortController = new AbortController();
      optimizationAbortController.current = abortController;

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
        setIsOptimizationRunning(false);
        optimizationAbortController.current = null;
        return;
      }

      // Parse SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setMessage({ type: "error", text: "Failed to read response stream" });
        setIsOptimizationRunning(false);
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
                setOptimizationProgress(data.percent);
                setOptimizationLogs((prev) => [...prev, data.message]);
              } else if (data.type === "stdout" || data.type === "stderr") {
                setOptimizationLogs((prev) => [...prev, data.message]);
              } else if (data.type === "complete") {
                // Only mark as complete and show final message for the last completion
                // (AI title generation is the final step)
                if (data.message.includes("AI title generation")) {
                  setOptimizationComplete(true);
                  // Filter out "Generating" entries when complete
                  setOptimizationLogs((prev) =>
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
                  // This is the intermediate optimization completion message
                  setOptimizationLogs((prev) => [...prev, data.message]);
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
        // User cancelled, message already set
        return;
      }
      console.error("Optimization error:", err);
      setMessage({ type: "error", text: "Network error occurred" });
    } finally {
      setIsOptimizationRunning(false);
      optimizationAbortController.current = null;
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

  // Auto-save handler for AI toggle (like published toggle for albums)
  const handleToggleAutoAI = async () => {
    if (!config) return;

    const newValue = !(config.ai?.autoGenerateTitlesOnUpload || false);

    // Optimistically update UI
    const newConfig = {
      ...config,
      ai: {
        ...config.ai,
        autoGenerateTitlesOnUpload: newValue,
      },
    };
    setConfig(newConfig);

    try {
      const res = await fetch(`${API_URL}/api/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newConfig),
      });

      if (res.ok) {
        // Update original config to match
        setOriginalConfig(JSON.parse(JSON.stringify(newConfig)));
        setMessage({
          type: "success",
          text: `Auto-generate AI titles ${newValue ? "enabled" : "disabled"}`,
        });
      } else {
        const error = await res.json();
        setMessage({
          type: "error",
          text: error.error || "Failed to update setting",
        });
        // Revert on error
        setConfig(config);
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error occurred" });
      // Revert on error
      setConfig(config);
    }
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
    array.push("");
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
      <h2>⚙️ Settings</h2>
      <p className="section-description">
        Manage branding, links, and system configuration
      </p>

      <div className="config-grid">
        {/* Branding Settings */}
        <div className="config-group full-width">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
              cursor: "pointer",
              padding: "1rem",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
            onClick={() => setShowBranding(!showBranding)}
          >
            <h3
              className="config-section-title"
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  transition: "transform 0.2s",
                  transform: showBranding ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Branding
            </h3>
            <span style={{ color: "#888", fontSize: "0.9rem" }}>
              {showBranding ? "Click to collapse" : "Click to expand"}
            </span>
          </div>

          <div
            className={`collapsible-content ${
              showBranding ? "expanded" : "collapsed"
            }`}
            style={{
              maxHeight: showBranding ? "10000px" : "0",
            }}
          >
            <div className="branding-grid">
              <div className="branding-group">
                <div className="avatar-upload-container">
                  {(avatarPreviewUrl || branding.avatarPath) && (
                    <img
                      src={
                        avatarPreviewUrl ||
                        `${API_URL}${branding.avatarPath}?v=${Date.now()}`
                      }
                      alt="Current avatar"
                      className="current-avatar-preview"
                      key={avatarPreviewUrl || branding.avatarPath}
                    />
                  )}
                  <label className="btn-secondary upload-avatar-btn">
                    {pendingAvatarFile ? "Upload Logo" : "Edit Logo"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleAvatarFileSelect(file);
                        }
                      }}
                      style={{ display: "none" }}
                      disabled={savingBranding}
                    />
                  </label>
                </div>
              </div>

              <div className="branding-group">
                <label className="branding-label">Site Name</label>
                <input
                  type="text"
                  value={branding.siteName}
                  onChange={(e) =>
                    handleBrandingChange("siteName", e.target.value)
                  }
                  className="branding-input"
                  placeholder="Your site name"
                />
              </div>

              <div className="branding-group">
                <label className="branding-label">Primary Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={branding.primaryColor}
                    onChange={(e) =>
                      handleBrandingChange("primaryColor", e.target.value)
                    }
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={branding.primaryColor}
                    onChange={(e) =>
                      handleBrandingChange("primaryColor", e.target.value)
                    }
                    className="branding-input color-text"
                    placeholder="#4ade80"
                  />
                </div>
              </div>

              <div className="branding-group">
                <label className="branding-label">Secondary Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={branding.secondaryColor}
                    onChange={(e) =>
                      handleBrandingChange("secondaryColor", e.target.value)
                    }
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={branding.secondaryColor}
                    onChange={(e) =>
                      handleBrandingChange("secondaryColor", e.target.value)
                    }
                    className="branding-input color-text"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div className="branding-group full-width">
                <label className="branding-label">Meta Description</label>
                <textarea
                  value={branding.metaDescription}
                  onChange={(e) =>
                    handleBrandingChange("metaDescription", e.target.value)
                  }
                  className="branding-textarea"
                  placeholder="Brief description of your site for search engines"
                  rows={3}
                />
              </div>

              <div className="branding-group full-width">
                <label className="branding-label">Meta Keywords</label>
                <input
                  type="text"
                  value={branding.metaKeywords}
                  onChange={(e) =>
                    handleBrandingChange("metaKeywords", e.target.value)
                  }
                  className="branding-input"
                  placeholder="photography, portfolio, your name (comma separated)"
                />
              </div>

              <div className="section-actions">
                <button
                  onClick={handleSaveBranding}
                  className="btn-primary"
                  disabled={savingBranding}
                >
                  {savingBranding ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* External Links Settings */}
        <div className="config-group full-width">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
              cursor: "pointer",
              padding: "1rem",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
            onClick={() => setShowLinks(!showLinks)}
          >
            <h3
              className="config-section-title"
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  transition: "transform 0.2s",
                  transform: showLinks ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Links
            </h3>
            <span style={{ color: "#888", fontSize: "0.9rem" }}>
              {showLinks ? "Click to collapse" : "Click to expand"}
            </span>
          </div>

          <div
            className={`collapsible-content ${
              showLinks ? "expanded" : "collapsed"
            }`}
            style={{
              maxHeight: showLinks ? "10000px" : "0",
            }}
          >
            <div className="links-list">
              {externalLinks.map((link, index) => (
                <div key={index} className="link-wrapper">
                  <div className="link-item">
                    <div className="link-fields">
                      <input
                        type="text"
                        placeholder="Title"
                        value={link.title}
                        onChange={(e) =>
                          handleLinkChange(index, "title", e.target.value)
                        }
                        className="link-input"
                      />
                      <input
                        type="text"
                        placeholder="URL"
                        value={link.url}
                        onChange={(e) =>
                          handleLinkChange(index, "url", e.target.value)
                        }
                        className="link-input"
                      />
                    </div>
                    <div className="link-controls">
                      <div className="reorder-buttons">
                        <button
                          onClick={() => handleMoveUp(index)}
                          className="btn-reorder"
                          title="Move up"
                          disabled={index === 0}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          className="btn-reorder"
                          title="Move down"
                          disabled={index === externalLinks.length - 1}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteLink(index)}
                        className="btn-delete-link"
                        title="Delete link"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="section-actions">
              <button onClick={handleAddLink} className="btn-secondary">
                + Add Link
              </button>
              <button
                onClick={handleSaveLinks}
                className="btn-primary"
                disabled={savingLinks}
              >
                {savingLinks ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        {/* OpenAI Settings */}
        <div className="config-group full-width" ref={openAISectionRef}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
              cursor: "pointer",
              padding: "1rem",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
            onClick={() => setShowOpenAI(!showOpenAI)}
          >
            <h3
              className="config-section-title"
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  transition: "transform 0.2s",
                  transform: showOpenAI ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              OpenAI
            </h3>
            <span style={{ color: "#888", fontSize: "0.9rem" }}>
              {showOpenAI ? "Click to collapse" : "Click to expand"}
            </span>
          </div>

          <div
            className={`collapsible-content ${
              showOpenAI ? "expanded" : "collapsed"
            }`}
            style={{
              maxHeight: showOpenAI ? "10000px" : "0",
            }}
          >
            <div className="openai-settings-grid">
              {/* Left: API Key Section */}
              <div className="openai-section">
                <label className="openai-section-label">API KEY</label>
                <input
                  ref={apiKeyInputRef}
                  type="password"
                  value={config.openai?.apiKey || ""}
                  onChange={(e) =>
                    updateConfig(["openai", "apiKey"], e.target.value)
                  }
                  className="branding-input"
                  placeholder="sk-..."
                />

                {/* Save/Cancel buttons */}
                {hasUnsavedChanges("OpenAI") && (
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSaveSection("OpenAI")}
                      disabled={savingSection !== null}
                      className="btn-primary"
                      style={{ flex: 1 }}
                    >
                      {savingSection === "OpenAI" ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfig(originalConfig);
                      }}
                      disabled={savingSection !== null}
                      className="btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Auto-generate Toggle Section */}
              <div className="openai-section">
                <label className="openai-section-label">
                  Auto-generate AI Titles on Upload
                </label>
                <div className="ai-toggle-container">
                  <div className="ai-toggle-controls">
                    <button
                      type="button"
                      onClick={handleToggleAutoAI}
                      className={`toggle-button ${
                        config.ai?.autoGenerateTitlesOnUpload ? "active" : ""
                      }`}
                      style={{
                        width: "48px",
                        height: "24px",
                        borderRadius: "12px",
                        border: "none",
                        cursor: "pointer",
                        position: "relative",
                        transition: "background-color 0.2s",
                        backgroundColor: config.ai?.autoGenerateTitlesOnUpload
                          ? "var(--primary-color)"
                          : "rgba(255, 255, 255, 0.1)",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: "2px",
                          left: config.ai?.autoGenerateTitlesOnUpload
                            ? "26px"
                            : "2px",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          backgroundColor: "white",
                          transition: "left 0.2s",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        }}
                      />
                    </button>
                    <span
                      style={{
                        color: config.ai?.autoGenerateTitlesOnUpload
                          ? "var(--primary-color)"
                          : "#888",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {config.ai?.autoGenerateTitlesOnUpload
                        ? "Enabled"
                        : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image Optimization Settings */}
        <div className="config-group full-width">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
              cursor: "pointer",
              padding: "1rem",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
            onClick={() => setShowImageOptimization(!showImageOptimization)}
          >
            <h3
              className="config-section-title"
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  transition: "transform 0.2s",
                  transform: showImageOptimization
                    ? "rotate(90deg)"
                    : "rotate(0deg)",
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Image Optimization
            </h3>
            <span style={{ color: "#888", fontSize: "0.9rem" }}>
              {showImageOptimization ? "Click to collapse" : "Click to expand"}
            </span>
          </div>

          <div
            className={`collapsible-content ${
              showImageOptimization ? "expanded" : "collapsed"
            }`}
            style={{
              maxHeight: showImageOptimization ? "10000px" : "0",
            }}
          >
            {/* Grid of optimization subsections */}
            <div className="config-grid-inner">
              {/* Thumbnail Settings */}
              <div className="openai-section">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <label className="openai-section-label">THUMBNAIL</label>
                  {hasUnsavedChanges("Thumbnail") && (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setConfig(originalConfig);
                        }}
                        disabled={savingSection !== null}
                        className="btn-secondary"
                        style={{
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveSection("Thumbnail")}
                        disabled={savingSection !== null}
                        className="btn-primary"
                        style={{
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        {savingSection === "Thumbnail" ? "Saving..." : "Save"}
                      </button>
                    </div>
                  )}
                </div>
                <div className="branding-group">
                  <label className="branding-label">Quality</label>
                  <input
                    type="number"
                    value={
                      config.environment.optimization.images.thumbnail.quality
                    }
                    onChange={(e) =>
                      updateConfig(
                        [
                          "environment",
                          "optimization",
                          "images",
                          "thumbnail",
                          "quality",
                        ],
                        parseInt(e.target.value)
                      )
                    }
                    className="branding-input"
                    min="1"
                    max="100"
                  />
                </div>
                <div className="branding-group">
                  <label className="branding-label">Max Dimension</label>
                  <input
                    type="number"
                    value={
                      config.environment.optimization.images.thumbnail
                        .maxDimension
                    }
                    onChange={(e) =>
                      updateConfig(
                        [
                          "environment",
                          "optimization",
                          "images",
                          "thumbnail",
                          "maxDimension",
                        ],
                        parseInt(e.target.value)
                      )
                    }
                    className="branding-input"
                  />
                </div>
              </div>

              {/* Modal Settings */}
              <div className="openai-section">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <label className="openai-section-label">MODAL</label>
                  {hasUnsavedChanges("Modal") && (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setConfig(originalConfig);
                        }}
                        disabled={savingSection !== null}
                        className="btn-secondary"
                        style={{
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveSection("Modal")}
                        disabled={savingSection !== null}
                        className="btn-primary"
                        style={{
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        {savingSection === "Modal" ? "Saving..." : "Save"}
                      </button>
                    </div>
                  )}
                </div>
                <div className="branding-group">
                  <label className="branding-label">Quality</label>
                  <input
                    type="number"
                    value={config.environment.optimization.images.modal.quality}
                    onChange={(e) =>
                      updateConfig(
                        [
                          "environment",
                          "optimization",
                          "images",
                          "modal",
                          "quality",
                        ],
                        parseInt(e.target.value)
                      )
                    }
                    className="branding-input"
                    min="1"
                    max="100"
                  />
                </div>
                <div className="branding-group">
                  <label className="branding-label">Max Dimension</label>
                  <input
                    type="number"
                    value={
                      config.environment.optimization.images.modal.maxDimension
                    }
                    onChange={(e) =>
                      updateConfig(
                        [
                          "environment",
                          "optimization",
                          "images",
                          "modal",
                          "maxDimension",
                        ],
                        parseInt(e.target.value)
                      )
                    }
                    className="branding-input"
                  />
                </div>
              </div>

              {/* Download Settings */}
              <div className="openai-section">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <label className="openai-section-label">DOWNLOAD</label>
                  {hasUnsavedChanges("Download") && (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setConfig(originalConfig);
                        }}
                        disabled={savingSection !== null}
                        className="btn-secondary"
                        style={{
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveSection("Download")}
                        disabled={savingSection !== null}
                        className="btn-primary"
                        style={{
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        {savingSection === "Download" ? "Saving..." : "Save"}
                      </button>
                    </div>
                  )}
                </div>
                <div className="branding-group">
                  <label className="branding-label">Quality</label>
                  <input
                    type="number"
                    value={
                      config.environment.optimization.images.download.quality
                    }
                    onChange={(e) =>
                      updateConfig(
                        [
                          "environment",
                          "optimization",
                          "images",
                          "download",
                          "quality",
                        ],
                        parseInt(e.target.value)
                      )
                    }
                    className="branding-input"
                    min="1"
                    max="100"
                  />
                </div>
                <div className="branding-group">
                  <label className="branding-label">Max Dimension</label>
                  <input
                    type="number"
                    value={
                      config.environment.optimization.images.download
                        .maxDimension
                    }
                    onChange={(e) =>
                      updateConfig(
                        [
                          "environment",
                          "optimization",
                          "images",
                          "download",
                          "maxDimension",
                        ],
                        parseInt(e.target.value)
                      )
                    }
                    className="branding-input"
                  />
                </div>
              </div>

              {/* Concurrency Settings */}
              <div className="openai-section">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <label className="openai-section-label">CONCURRENCY</label>
                  {hasUnsavedChanges("Concurrency") && (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setConfig(originalConfig);
                        }}
                        disabled={savingSection !== null}
                        className="btn-secondary"
                        style={{
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveSection("Concurrency")}
                        disabled={savingSection !== null}
                        className="btn-primary"
                        style={{
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        {savingSection === "Concurrency" ? "Saving..." : "Save"}
                      </button>
                    </div>
                  )}
                </div>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#888",
                    marginTop: "0",
                    marginBottom: "1rem",
                  }}
                >
                  Maximum number of images to process simultaneously. Higher
                  values speed up batch processing but use more CPU and memory.
                </p>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#888",
                    marginTop: "0",
                    marginBottom: "1rem",
                  }}
                >
                  Rule of thumb: ~4× your logical CPU cores. Recommended: 8-16
                  for typical systems, 32-64 for high-performance servers.
                </p>
                <div className="branding-group">
                  <label className="branding-label">Max Parallel Jobs</label>
                  <input
                    type="number"
                    value={config.environment.optimization.concurrency}
                    onChange={(e) =>
                      updateConfig(
                        ["environment", "optimization", "concurrency"],
                        parseInt(e.target.value)
                      )
                    }
                    className="branding-input"
                    min="1"
                    max="256"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Settings - Collapsible */}
        <div className="config-group full-width">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
              cursor: "pointer",
              padding: "1rem",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <h3
              className="config-section-title"
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  transition: "transform 0.2s",
                  transform: showAdvanced ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Advanced Settings
            </h3>
            <span style={{ color: "#888", fontSize: "0.9rem" }}>
              {showAdvanced ? "Click to collapse" : "Click to expand"}
            </span>
          </div>

          <div
            className={`collapsible-content ${
              showAdvanced ? "expanded" : "collapsed"
            }`}
            style={{
              maxHeight: showAdvanced ? "10000px" : "0",
            }}
          >
            {/* Danger Zone Warning */}
            <div
              style={{
                marginBottom: "2rem",
                padding: "1rem 1.5rem",
                background:
                  "linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(153, 27, 27, 0.15) 100%)",
                border: "2px solid rgba(220, 38, 38, 0.5)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>⚠️</span>
              <div>
                <div
                  style={{
                    color: "#fca5a5",
                    fontWeight: 700,
                    fontSize: "1rem",
                    letterSpacing: "0.1em",
                    marginBottom: "0.25rem",
                  }}
                >
                  [ DANGER ZONE ]
                </div>
                <div style={{ color: "#fecaca", fontSize: "0.9rem" }}>
                  Make sure you know what you're doing!
                </div>
              </div>
            </div>

            {/* Force Regenerate All Titles */}
            <div className="openai-section" style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <label className="openai-section-label">TITLE GENERATION</label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  {!config.openai?.apiKey ? (
                    <button
                      type="button"
                      onClick={handleSetupOpenAI}
                      className="btn-secondary"
                    >
                      Set Up OpenAI
                    </button>
                  ) : !generatingTitles ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          handleGenerateTitles(false);
                        }}
                        className="btn-secondary"
                      >
                        Backfill Missing Titles
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const confirmed = await showConfirmation(
                            "⚠️ This will regenerate ALL image titles and overwrite any custom titles you have set. This action cannot be undone.\n\nAre you sure you want to continue?"
                          );
                          if (confirmed) {
                            handleGenerateTitles(true);
                          }
                        }}
                        className="btn-force-regenerate"
                      >
                        Force Regenerate All
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopTitles}
                      className="btn-force-regenerate"
                      style={{
                        backgroundColor: "#dc2626",
                        borderColor: "#dc2626",
                      }}
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>

              {generatingTitles && titlesOutput.length > 0 && (
                <>
                  <div style={{ marginTop: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                        fontSize: "0.9rem",
                      }}
                    >
                      <span style={{ color: "#9ca3af" }}>Progress</span>
                      <span
                        style={{
                          color: "var(--primary-color)",
                          fontWeight: 600,
                        }}
                      >
                        {titlesProgress}%
                      </span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "8px",
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${titlesProgress}%`,
                          backgroundColor: "var(--primary-color)",
                          transition: "width 0.3s ease",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className="titles-output"
                    style={{ maxHeight: "500px" }}
                    ref={titlesOutputRef}
                  >
                    <div className="titles-output-content">
                      {titlesOutput.map((line, index) => (
                        <div key={index} className="output-line">
                          {line}
                        </div>
                      ))}
                      {titlesOutput.length === 0 && (
                        <div className="output-line">
                          Starting AI title generation...
                        </div>
                      )}
                      {generatingTitles && (
                        <div
                          className="output-line"
                          style={{
                            marginTop: "0.5rem",
                            color:
                              titlesWaiting !== null ? "#fbbf24" : "#4ade80",
                          }}
                        >
                          ⏳{" "}
                          {titlesWaiting !== null
                            ? `Waiting... ${titlesWaiting}s`
                            : "Running..."}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Force Regenerate All Images */}
            <div className="openai-section" style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <label className="openai-section-label">
                  REGENERATE ALL IMAGES
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  {!isOptimizationRunning ? (
                    <button
                      type="button"
                      onClick={() => handleRunOptimization(true)}
                      className="btn-force-regenerate"
                    >
                      Force Regenerate All
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopOptimization}
                      className="btn-force-regenerate"
                      style={{
                        backgroundColor: "#dc2626",
                        borderColor: "#dc2626",
                      }}
                    >
                      Stop
                    </button>
                  )}
                  {optimizationComplete && !isOptimizationRunning && (
                    <span
                      style={{
                        color: "var(--primary-color)",
                        fontSize: "1.5rem",
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
              </div>

              {optimizationLogs.length > 0 && (
                <>
                  {isOptimizationRunning && (
                    <div style={{ marginTop: "1rem" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                          fontSize: "0.9rem",
                        }}
                      >
                        <span style={{ color: "#9ca3af" }}>Progress</span>
                        <span
                          style={{
                            color: "var(--primary-color)",
                            fontWeight: 600,
                          }}
                        >
                          {optimizationProgress}%
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "8px",
                          backgroundColor: "rgba(255, 255, 255, 0.1)",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${optimizationProgress}%`,
                            backgroundColor: "var(--primary-color)",
                            transition: "width 0.3s ease",
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div
                    className="titles-output"
                    style={{ maxHeight: "500px" }}
                    ref={optimizationOutputRef}
                  >
                    <div className="titles-output-content">
                      {optimizationLogs.map((log, index) => (
                        <div key={index} className="output-line">
                          {log}
                        </div>
                      ))}
                      {isOptimizationRunning && (
                        <div
                          className="output-line"
                          style={{ marginTop: "0.5rem", color: "#4ade80" }}
                        >
                          ⏳ Running...
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Backend Settings */}
            <div className="openai-section" style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <label className="openai-section-label">BACKEND</label>
                {hasUnsavedChanges("Backend") && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveSection("Backend");
                    }}
                    disabled={savingSection !== null}
                    className="btn-primary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                  >
                    {savingSection === "Backend" ? "Saving..." : "Save"}
                  </button>
                )}
              </div>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#888",
                  marginTop: "0",
                  marginBottom: "1rem",
                }}
              >
                Server configuration including port, photos directory, and CORS
                allowed origins
              </p>
              <div className="config-grid-inner">
                <div className="branding-group">
                  <label className="branding-label">Port</label>
                  <input
                    type="number"
                    value={config.environment.backend.port}
                    onChange={(e) =>
                      updateConfig(
                        ["environment", "backend", "port"],
                        parseInt(e.target.value)
                      )
                    }
                    className="branding-input"
                  />
                </div>

                <div className="branding-group">
                  <label className="branding-label">Photos Directory</label>
                  <input
                    type="text"
                    value={config.environment.backend.photosDir}
                    onChange={(e) =>
                      updateConfig(
                        ["environment", "backend", "photosDir"],
                        e.target.value
                      )
                    }
                    className="branding-input"
                  />
                </div>

                <div className="branding-group full-width">
                  <label className="branding-label">Allowed Origins</label>
                  {config.environment.backend.allowedOrigins.map(
                    (origin, index) => (
                      <div key={index} className="array-item">
                        <input
                          type="text"
                          value={origin}
                          onChange={(e) =>
                            updateArrayItem(
                              ["environment", "backend", "allowedOrigins"],
                              index,
                              e.target.value
                            )
                          }
                          className="branding-input"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            removeArrayItem(
                              ["environment", "backend", "allowedOrigins"],
                              index
                            )
                          }
                          className="btn-remove"
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      addArrayItem(["environment", "backend", "allowedOrigins"])
                    }
                    className="btn-add"
                  >
                    + Add Origin
                  </button>
                </div>
              </div>

              {/* Backend Restart Button */}
              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <button
                  type="button"
                  onClick={handleRestartBackend}
                  disabled={restartingBackend}
                  className="btn-secondary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  🔄{" "}
                  {restartingBackend
                    ? "Restarting..."
                    : "Restart Backend Server"}
                </button>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#888",
                    marginTop: "0.5rem",
                    marginBottom: 0,
                  }}
                >
                  Server will restart automatically if using a process manager
                  (pm2, nodemon, systemd)
                </p>
              </div>
            </div>

            {/* Frontend Settings */}
            <div className="openai-section" style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <label className="openai-section-label">FRONTEND</label>
                {hasUnsavedChanges("Frontend") && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveSection("Frontend");
                    }}
                    disabled={savingSection !== null}
                    className="btn-primary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                  >
                    {savingSection === "Frontend" ? "Saving..." : "Save"}
                  </button>
                )}
              </div>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#888",
                  marginTop: "0",
                  marginBottom: "1rem",
                }}
              >
                Frontend development server port and API URL for connecting to
                the backend
              </p>
              <div className="config-grid-inner">
                <div className="branding-group">
                  <label className="branding-label">Port</label>
                  <input
                    type="number"
                    value={config.environment.frontend.port}
                    onChange={(e) =>
                      updateConfig(
                        ["environment", "frontend", "port"],
                        parseInt(e.target.value)
                      )
                    }
                    className="branding-input"
                  />
                </div>

                <div className="branding-group">
                  <label className="branding-label">API URL</label>
                  <input
                    type="text"
                    value={config.environment.frontend.apiUrl}
                    onChange={(e) =>
                      updateConfig(
                        ["environment", "frontend", "apiUrl"],
                        e.target.value
                      )
                    }
                    className="branding-input"
                  />
                </div>
              </div>

              {/* Frontend Restart Button */}
              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <button
                  type="button"
                  onClick={handleRestartFrontend}
                  disabled={restartingFrontend}
                  className="btn-secondary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  🔄{" "}
                  {restartingFrontend
                    ? "Restarting..."
                    : "Restart Frontend Server"}
                </button>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#888",
                    marginTop: "0.5rem",
                    marginBottom: 0,
                  }}
                >
                  In development, manually restart your dev server. In
                  production, use your process manager.
                </p>
              </div>
            </div>

            {/* Security Settings */}
            <div className="openai-section" style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <label className="openai-section-label">SECURITY</label>
                {hasUnsavedChanges("Security") && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveSection("Security");
                    }}
                    disabled={savingSection !== null}
                    className="btn-primary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                  >
                    {savingSection === "Security" ? "Saving..." : "Save"}
                  </button>
                )}
              </div>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#888",
                  marginTop: "0",
                  marginBottom: "1rem",
                }}
              >
                Rate limiting and allowed hosts for protecting against abuse and
                unauthorized access
              </p>
              <div className="config-grid-inner">
                <div className="branding-group">
                  <label className="branding-label">
                    Rate Limit Window (ms)
                  </label>
                  <input
                    type="number"
                    value={config.environment.security.rateLimitWindowMs}
                    onChange={(e) =>
                      updateConfig(
                        ["environment", "security", "rateLimitWindowMs"],
                        parseInt(e.target.value)
                      )
                    }
                    className="branding-input"
                  />
                </div>

                <div className="branding-group">
                  <label className="branding-label">
                    Rate Limit Max Requests
                  </label>
                  <input
                    type="number"
                    value={config.environment.security.rateLimitMaxRequests}
                    onChange={(e) =>
                      updateConfig(
                        ["environment", "security", "rateLimitMaxRequests"],
                        parseInt(e.target.value)
                      )
                    }
                    className="branding-input"
                  />
                </div>

                <div className="branding-group full-width">
                  <label className="branding-label">Allowed Hosts</label>
                  {config.environment.security.allowedHosts.map(
                    (host, index) => (
                      <div key={index} className="array-item">
                        <input
                          type="text"
                          value={host}
                          onChange={(e) =>
                            updateArrayItem(
                              ["environment", "security", "allowedHosts"],
                              index,
                              e.target.value
                            )
                          }
                          className="branding-input"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            removeArrayItem(
                              ["environment", "security", "allowedHosts"],
                              index
                            )
                          }
                          className="btn-remove"
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      addArrayItem(["environment", "security", "allowedHosts"])
                    }
                    className="btn-add"
                  >
                    + Add Host
                  </button>
                </div>
              </div>
            </div>

            {/* Auth Settings */}
            <div className="openai-section" style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <label className="openai-section-label">AUTHENTICATION</label>
                {hasUnsavedChanges("Authentication") && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveSection("Authentication");
                    }}
                    disabled={savingSection !== null}
                    className="btn-primary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                  >
                    {savingSection === "Authentication" ? "Saving..." : "Save"}
                  </button>
                )}
              </div>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#888",
                  marginTop: "0",
                  marginBottom: "1rem",
                }}
              >
                Google OAuth credentials and authorized email addresses for
                admin access
              </p>
              <div className="config-grid-inner">
                <div className="branding-group">
                  <label className="branding-label">Google Client ID</label>
                  <input
                    type="text"
                    value={config.environment.auth.google.clientId}
                    onChange={(e) =>
                      updateConfig(
                        ["environment", "auth", "google", "clientId"],
                        e.target.value
                      )
                    }
                    className="branding-input"
                  />
                </div>

                <div className="branding-group">
                  <label className="branding-label">Google Client Secret</label>
                  <input
                    type="password"
                    value={config.environment.auth.google.clientSecret}
                    onChange={(e) =>
                      updateConfig(
                        ["environment", "auth", "google", "clientSecret"],
                        e.target.value
                      )
                    }
                    className="branding-input"
                  />
                </div>

                <div className="branding-group">
                  <label className="branding-label">Session Secret</label>
                  <input
                    type="password"
                    value={config.environment.auth.sessionSecret}
                    onChange={(e) =>
                      updateConfig(
                        ["environment", "auth", "sessionSecret"],
                        e.target.value
                      )
                    }
                    className="branding-input"
                  />
                </div>

                <div className="branding-group full-width">
                  <label className="branding-label">Authorized Emails</label>
                  {config.environment.auth.authorizedEmails.map(
                    (email, index) => (
                      <div key={index} className="array-item">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) =>
                            updateArrayItem(
                              ["environment", "auth", "authorizedEmails"],
                              index,
                              e.target.value
                            )
                          }
                          className="branding-input"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            removeArrayItem(
                              ["environment", "auth", "authorizedEmails"],
                              index
                            )
                          }
                          className="btn-remove"
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      addArrayItem(["environment", "auth", "authorizedEmails"])
                    }
                    className="btn-add"
                  >
                    + Add Email
                  </button>
                </div>
              </div>
            </div>

            {/* Analytics Settings */}
            <div className="openai-section" style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <label className="openai-section-label">ANALYTICS</label>
                {hasUnsavedChanges("Analytics") && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveSection("Analytics");
                    }}
                    disabled={savingSection !== null}
                    className="btn-primary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                  >
                    {savingSection === "Analytics" ? "Saving..." : "Save"}
                  </button>
                )}
              </div>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#888",
                  marginTop: "0",
                  marginBottom: "1rem",
                }}
              >
                Analytics tracking configuration including OpenObserve
                integration
              </p>
              <div className="config-grid-inner">
                <div className="branding-group">
                  <label className="branding-label">Script Path</label>
                  <input
                    type="text"
                    value={config.analytics.scriptPath}
                    onChange={(e) =>
                      updateConfig(["analytics", "scriptPath"], e.target.value)
                    }
                    className="branding-input"
                    placeholder="/analytics.js"
                  />
                </div>

                <div className="branding-group">
                  <label className="branding-label">HMAC Secret</label>
                  <input
                    type="password"
                    value={config.analytics.hmacSecret}
                    onChange={(e) =>
                      updateConfig(["analytics", "hmacSecret"], e.target.value)
                    }
                    className="branding-input"
                    placeholder="Secret key for HMAC"
                  />
                </div>

                <div className="branding-group full-width">
                  <label className="branding-label">
                    <input
                      type="checkbox"
                      checked={config.analytics.openobserve.enabled}
                      onChange={(e) =>
                        updateConfig(
                          ["analytics", "openobserve", "enabled"],
                          e.target.checked
                        )
                      }
                      style={{ marginRight: "0.5rem" }}
                    />
                    Enable OpenObserve Integration
                  </label>
                </div>

                {config.analytics.openobserve.enabled && (
                  <>
                    <div className="branding-group">
                      <label className="branding-label">
                        OpenObserve Endpoint
                      </label>
                      <input
                        type="text"
                        value={config.analytics.openobserve.endpoint}
                        onChange={(e) =>
                          updateConfig(
                            ["analytics", "openobserve", "endpoint"],
                            e.target.value
                          )
                        }
                        className="branding-input"
                        placeholder="https://api.openobserve.ai"
                      />
                    </div>

                    <div className="branding-group">
                      <label className="branding-label">Organization</label>
                      <input
                        type="text"
                        value={config.analytics.openobserve.organization}
                        onChange={(e) =>
                          updateConfig(
                            ["analytics", "openobserve", "organization"],
                            e.target.value
                          )
                        }
                        className="branding-input"
                      />
                    </div>

                    <div className="branding-group">
                      <label className="branding-label">Stream</label>
                      <input
                        type="text"
                        value={config.analytics.openobserve.stream}
                        onChange={(e) =>
                          updateConfig(
                            ["analytics", "openobserve", "stream"],
                            e.target.value
                          )
                        }
                        className="branding-input"
                      />
                    </div>

                    <div className="branding-group">
                      <label className="branding-label">Username</label>
                      <input
                        type="text"
                        value={config.analytics.openobserve.username}
                        onChange={(e) =>
                          updateConfig(
                            ["analytics", "openobserve", "username"],
                            e.target.value
                          )
                        }
                        className="branding-input"
                      />
                    </div>

                    <div className="branding-group">
                      <label className="branding-label">Password</label>
                      <input
                        type="password"
                        value={config.analytics.openobserve.password}
                        onChange={(e) =>
                          updateConfig(
                            ["analytics", "openobserve", "password"],
                            e.target.value
                          )
                        }
                        className="branding-input"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && confirmConfig && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "1rem",
          }}
          onClick={handleModalCancel}
        >
          <div
            style={{
              backgroundColor: "#1a1a1a",
              border: "2px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "500px",
              width: "100%",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                color: "#e5e7eb",
                fontSize: "1.1rem",
                lineHeight: "1.6",
                marginBottom: "2rem",
                whiteSpace: "pre-wrap",
              }}
            >
              {confirmConfig.message}
            </div>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleModalCancel}
                className="btn-secondary"
                style={{ minWidth: "100px" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmConfig.onConfirm}
                className="btn-primary"
                style={{ minWidth: "100px" }}
                autoFocus
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ConfigManager;
