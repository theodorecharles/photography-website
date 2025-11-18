import { useEffect, useRef } from 'react';
import { useSSEToaster } from '../contexts/SSEToasterContext';
import './AdminPortal/ConfigManager.css'; // Reuse the CSS
import { StopIcon, FullscreenIcon } from './icons/';
import { info } from '../utils/logger';

/**
 * Global SSE Toaster component that displays job progress across all pages.
 * Uses SSEToasterContext for state management.
 * Features drag-and-drop positioning, collapse/expand, maximize/minimize.
 */
export default function SSEToaster() {
  const toasterRef = useRef<HTMLDivElement>(null);
  const {
    generatingTitles,
    titlesOutput,
    titlesProgress,
    titlesWaiting,
    titlesOutputRef,
    isOptimizationRunning,
    optimizationLogs,
    optimizationProgress,
    optimizationComplete,
    optimizationOutputRef,
    isUploading,
    uploadAlbum,
    uploadCompleted,
    uploadTotal,
    isToasterCollapsed,
    setIsToasterCollapsed,
    isToasterMaximized,
    setIsToasterMaximized,
    toasterPosition,
    setToasterPosition,
    isDragging,
    setIsDragging,
    dragStart,
    setDragStart,
    dragOffset,
    setDragOffset,
    hasToasterAnimated,
    isScrollLocked,
    setIsScrollLocked,
    stopTitlesHandler,
    stopOptimizationHandler,
  } = useSSEToaster();

  const isAnyJobRunning = generatingTitles || isOptimizationRunning || isUploading;

  // Drag handlers
  const handleToasterDragStart = (e: React.MouseEvent) => {
    if (isToasterMaximized || window.innerWidth <= 768) return; // Don't drag when maximized or on mobile
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({ x: 0, y: 0 });
  };


  // Global mouse event handlers for better drag tracking
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!dragStart) return;
      // Don't prevent default - allow normal interactions
      const offsetX = e.clientX - dragStart.x;
      const offsetY = e.clientY - dragStart.y;
      setDragOffset({ x: offsetX, y: offsetY });
    };

    const handleGlobalMouseUp = () => {
      if (!dragStart || !toasterRef.current) return;
      // Don't prevent default - allow normal interactions
      setIsDragging(false);
      
      // Calculate which corner to snap to based on toaster's center position (not mouse)
      const rect = toasterRef.current.getBoundingClientRect();
      const toasterCenterX = rect.left + rect.width / 2;
      const toasterCenterY = rect.top + rect.height / 2;
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Simple 50/50 split based on where the toaster center is
      const isLeft = toasterCenterX < viewportWidth / 2;
      const isTop = toasterCenterY < viewportHeight / 2;
      
      if (!isTop && isLeft) {
        setToasterPosition('bottom-left');
      } else if (!isTop && !isLeft) {
        setToasterPosition('bottom-right');
      } else if (isTop && isLeft) {
        setToasterPosition('top-left');
      } else {
        setToasterPosition('top-right');
      }
      
      setDragStart(null);
      setDragOffset({ x: 0, y: 0 });
    };

    // Add event listeners without options to ensure they're properly removed
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart, setDragOffset, setDragStart, setIsDragging, setToasterPosition]);
  
  // Safety: Reset dragging state if mouse leaves window
  useEffect(() => {
    const handleMouseLeave = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
        setDragOffset({ x: 0, y: 0 });
      }
    };
    
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [isDragging, setIsDragging, setDragStart, setDragOffset]);

  // Listen for manual scroll to unlock auto-scroll
  useEffect(() => {
    const element = generatingTitles ? titlesOutputRef.current : optimizationOutputRef.current;
    if (!element || isToasterCollapsed) return;

    const handleScroll = () => {
      if (!element) return;
      const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
      
      // Lock if at bottom, unlock if scrolled up
      if (isAtBottom && !isScrollLocked) {
        info('[SSEToaster] Re-locking scroll (user scrolled back to bottom)');
        setIsScrollLocked(true);
      } else if (!isAtBottom && isScrollLocked) {
        info('[SSEToaster] Unlocking scroll (user scrolled up)');
        setIsScrollLocked(false);
      }
    };

    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, [generatingTitles, titlesOutputRef, optimizationOutputRef, isToasterCollapsed, isScrollLocked, setIsScrollLocked]);

  // Auto-scroll to bottom when new content arrives (only if scroll-locked)
  useEffect(() => {
    if (isScrollLocked && !isToasterCollapsed) {
      const element = generatingTitles ? titlesOutputRef.current : optimizationOutputRef.current;
      if (element) {
        // Use double requestAnimationFrame for reliable timing
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (element) {
              element.scrollTop = element.scrollHeight;
            }
          });
        });
      }
    }
  }, [optimizationLogs, titlesOutput, isScrollLocked, isToasterCollapsed, generatingTitles, titlesOutputRef, optimizationOutputRef]);

  // Handle maximize/restore button click
  const handleMaximizeClick = () => {
    // Check if we're at the bottom before toggling
    const outputRef = generatingTitles ? titlesOutputRef : optimizationOutputRef;
    const element = outputRef.current;
    const wasAtBottom = element 
      ? element.scrollHeight - element.scrollTop - element.clientHeight < 50
      : false;
    
    setIsToasterMaximized(!isToasterMaximized);
    if (!isToasterMaximized) {
      setIsToasterCollapsed(false); // Auto-expand when maximizing
    }
    
    // If we were at the bottom, scroll to bottom immediately (no transition)
    if (wasAtBottom && element) {
      requestAnimationFrame(() => {
        element.scrollTop = element.scrollHeight;
      });
    }
  };

  // Handle collapse/expand button click
  const handleCollapseClick = () => {
    const newCollapsedState = !isToasterCollapsed;
    setIsToasterCollapsed(newCollapsedState);
    
    // When expanding, re-activate scroll lock and scroll to bottom
    if (!newCollapsedState) {
      info('[SSEToaster] Expanding - activating scroll lock');
      setIsScrollLocked(true);
      
      const outputRef = generatingTitles ? titlesOutputRef : optimizationOutputRef;
      const element = outputRef.current;
      if (element) {
        // Wait for multiple frames to ensure content is fully rendered
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (element) {
                element.scrollTop = element.scrollHeight;
                info('[SSEToaster] Scrolled to bottom on expand:', element.scrollTop, element.scrollHeight);
              }
            });
          });
        });
      }
    }
  };

  // Don't render if no job is running
  if (!isAnyJobRunning) {
    return null;
  }

  return (
    <div 
      ref={toasterRef}
      className={`sse-toaster ${isToasterCollapsed ? 'collapsed' : 'expanded'} ${isToasterMaximized ? 'maximized' : ''} ${toasterPosition} ${isDragging ? 'dragging' : ''} ${!hasToasterAnimated ? 'initial-animation' : ''}`}
      style={isDragging && !isToasterMaximized ? {
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
        transition: 'none'
      } : undefined}
    >
      <div 
        className="sse-toaster-header"
        onMouseDown={handleToasterDragStart}
        style={{ cursor: isToasterMaximized || window.innerWidth <= 768 ? 'default' : 'move' }}
      >
        <div className="sse-toaster-title">
          <span className="sse-toaster-icon">{isUploading ? "📤" : "⚙️"}</span>
          <span className="sse-toaster-label">
            {isUploading ? `Uploading to ${uploadAlbum}` : (generatingTitles ? "Title Generation" : "Image Optimization")}
          </span>
          <span className="sse-toaster-progress">
            {isUploading ? `${uploadCompleted}/${uploadTotal}` : `${generatingTitles ? titlesProgress : optimizationProgress}%`}
          </span>
        </div>
        <div className="sse-toaster-actions">
          {/* Stop/Close button */}
          {(generatingTitles || isOptimizationRunning || optimizationComplete) && (
            <button
              className="sse-toaster-stop-btn"
              onClick={() => {
                // If job is complete, just hide the toaster
                if (optimizationComplete && !isOptimizationRunning) {
                  info('[SSEToaster Close Button] Hiding completed optimization toaster');
                  // Just visually hide - don't reset state yet
                  setIsToasterCollapsed(true);
                  return;
                }
                
                // Otherwise stop the running job
                info('[SSEToaster Stop Button] Clicked. generatingTitles:', generatingTitles, 'stopTitlesHandler:', typeof stopTitlesHandler);
                info('[SSEToaster Stop Button] isOptimizationRunning:', isOptimizationRunning, 'stopOptimizationHandler:', typeof stopOptimizationHandler);
                if (generatingTitles && stopTitlesHandler) {
                  info('[SSEToaster Stop Button] Calling stopTitlesHandler');
                  stopTitlesHandler();
                } else if (isOptimizationRunning && stopOptimizationHandler) {
                  info('[SSEToaster Stop Button] Calling stopOptimizationHandler');
                  stopOptimizationHandler();
                }
              }}
              title={optimizationComplete && !isOptimizationRunning ? "Close" : "Stop"}
            >
              {optimizationComplete && !isOptimizationRunning ? "✕" : <StopIcon width="14" height="14" />}
            </button>
          )}
          <button
            className="sse-toaster-maximize-btn"
            onClick={handleMaximizeClick}
            title={isToasterMaximized ? "Restore" : "Maximize"}
          >
            <FullscreenIcon width="16" height="16" isExit={isToasterMaximized} />
          </button>
          <button
            className="sse-toaster-collapse-btn"
            onClick={handleCollapseClick}
            title={isToasterCollapsed ? "Expand" : "Collapse"}
            disabled={isToasterMaximized}
          >
            {isToasterCollapsed ? "▼" : "▲"}
          </button>
        </div>
      </div>

      {/* Progress Bar - always visible */}
      <div className="sse-toaster-progress-bar-container">
        <div
          className="sse-toaster-progress-bar"
          style={{
            width: isUploading 
              ? `${(uploadCompleted / uploadTotal) * 100}%` 
              : `${generatingTitles ? titlesProgress : optimizationProgress}%`,
          }}
        />
      </div>

      {!isToasterCollapsed && (
        <>
          {/* Output Console */}
          <div
            className="sse-toaster-output"
            ref={isUploading ? null : (generatingTitles ? titlesOutputRef : optimizationOutputRef)}
          >
            <div className="sse-toaster-output-content">
              {isUploading ? (
                <>
                  <div className="output-line">
                    Uploading {uploadCompleted} of {uploadTotal} photos...
                  </div>
                  <div className="output-line" style={{ marginTop: "0.5rem", color: "#4ade80" }}>
                    ⏳ {uploadCompleted === uploadTotal ? "Completing upload..." : "Uploading..."}
                  </div>
                </>
              ) : generatingTitles ? (
                <>
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
                        color: titlesWaiting !== null ? "#fbbf24" : "#4ade80",
                      }}
                    >
                      ⏳{" "}
                      {titlesWaiting !== null
                        ? `Waiting... ${titlesWaiting}s`
                        : "Running..."}
                    </div>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

