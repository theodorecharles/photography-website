import { useEffect } from 'react';
import { useSSEToaster } from '../contexts/SSEToasterContext';
import './AdminPortal/ConfigManager.css'; // Reuse the CSS

/**
 * Global SSE Toaster component that displays job progress across all pages.
 * Uses SSEToasterContext for state management.
 * Features drag-and-drop positioning, collapse/expand, maximize/minimize.
 */
export default function SSEToaster() {
  const {
    generatingTitles,
    titlesOutput,
    titlesProgress,
    titlesWaiting,
    titlesOutputRef,
    isOptimizationRunning,
    optimizationLogs,
    optimizationProgress,
    optimizationOutputRef,
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
    setHasToasterAnimated,
    stopTitlesHandler,
    stopOptimizationHandler,
  } = useSSEToaster();

  const isAnyJobRunning = generatingTitles || isOptimizationRunning;

  // Drag handlers
  const handleToasterDragStart = (e: React.MouseEvent) => {
    if (isToasterMaximized || window.innerWidth <= 768) return; // Don't drag when maximized or on mobile
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({ x: 0, y: 0 });
  };

  const handleToasterDrag = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    e.preventDefault();
    
    const offsetX = e.clientX - dragStart.x;
    const offsetY = e.clientY - dragStart.y;
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleToasterDragEnd = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    
    setIsDragging(false);
    
    // Calculate which corner to snap to based on mouse position
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const x = e.clientX;
    const y = e.clientY;
    
    // Simple 50/50 split makes it much easier to reach bottom corners
    const isLeft = x < viewportWidth / 2;
    const isRight = x >= viewportWidth / 2;
    const isTop = y < viewportHeight / 2;
    const isBottom = y >= viewportHeight / 2;
    
    if (isBottom && isLeft) {
      setToasterPosition('bottom-left');
    } else if (isBottom && isRight) {
      setToasterPosition('bottom-right');
    } else if (isTop && isLeft) {
      setToasterPosition('top-left');
    } else {
      setToasterPosition('top-right');
    }
    
    setDragStart(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Global mouse event handlers for better drag tracking
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!dragStart) return;
      const offsetX = e.clientX - dragStart.x;
      const offsetY = e.clientY - dragStart.y;
      setDragOffset({ x: offsetX, y: offsetY });
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (!dragStart) return;
      setIsDragging(false);
      
      // Calculate which corner to snap to based on mouse position
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const x = e.clientX;
      const y = e.clientY;
      
      // Simple 50/50 split makes it much easier to reach bottom corners
      const isLeft = x < viewportWidth / 2;
      const isRight = x >= viewportWidth / 2;
      const isTop = y < viewportHeight / 2;
      const isBottom = y >= viewportHeight / 2;
      
      if (isBottom && isLeft) {
        setToasterPosition('bottom-left');
      } else if (isBottom && isRight) {
        setToasterPosition('bottom-right');
      } else if (isTop && isLeft) {
        setToasterPosition('top-left');
      } else {
        setToasterPosition('top-right');
      }
      
      setDragStart(null);
      setDragOffset({ x: 0, y: 0 });
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart, setDragOffset, setDragStart, setIsDragging, setToasterPosition]);

  // Auto-scroll optimization output to bottom when new logs arrive (only if already at bottom)
  useEffect(() => {
    if (optimizationOutputRef.current && isOptimizationRunning) {
      const element = optimizationOutputRef.current;
      const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
      
      if (isAtBottom) {
        setTimeout(() => {
          if (optimizationOutputRef.current) {
            optimizationOutputRef.current.scrollTop = optimizationOutputRef.current.scrollHeight;
          }
        }, 0);
      }
    }
  }, [optimizationLogs, isOptimizationRunning, optimizationOutputRef]);

  // Auto-scroll titles output to bottom when new lines arrive (only if already at bottom)
  useEffect(() => {
    if (titlesOutputRef.current && generatingTitles) {
      const element = titlesOutputRef.current;
      const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
      
      if (isAtBottom) {
        setTimeout(() => {
          if (titlesOutputRef.current) {
            titlesOutputRef.current.scrollTop = titlesOutputRef.current.scrollHeight;
          }
        }, 0);
      }
    }
  }, [titlesOutput, generatingTitles, titlesOutputRef]);

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
    
    // If we were at the bottom, scroll to bottom after transition
    if (wasAtBottom && element) {
      setTimeout(() => {
        element.scrollTop = element.scrollHeight;
      }, 350); // Wait for CSS transition (300ms) + small buffer
    }
  };

  // Don't render if no job is running
  if (!isAnyJobRunning) {
    return null;
  }

  return (
    <div 
      className={`sse-toaster ${isToasterCollapsed ? 'collapsed' : 'expanded'} ${isToasterMaximized ? 'maximized' : ''} ${toasterPosition} ${isDragging ? 'dragging' : ''} ${!hasToasterAnimated ? 'initial-animation' : ''}`}
      onMouseMove={handleToasterDrag}
      onMouseUp={handleToasterDragEnd}
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
          <span className="sse-toaster-icon">⚙️</span>
          <span className="sse-toaster-label">
            {generatingTitles ? "Title Generation" : "Image Optimization"}
          </span>
          <span className="sse-toaster-progress">
            {generatingTitles ? titlesProgress : optimizationProgress}%
          </span>
        </div>
        <div className="sse-toaster-actions">
          {/* Stop button - only shown when handler is available */}
          {((generatingTitles && stopTitlesHandler) || (isOptimizationRunning && stopOptimizationHandler)) && (
            <button
              className="sse-toaster-stop-btn"
              onClick={generatingTitles ? stopTitlesHandler! : stopOptimizationHandler!}
              title="Stop"
            >
              ⏹
            </button>
          )}
          <button
            className="sse-toaster-maximize-btn"
            onClick={handleMaximizeClick}
            title={isToasterMaximized ? "Restore" : "Maximize"}
          >
            {isToasterMaximized ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </button>
          <button
            className="sse-toaster-collapse-btn"
            onClick={() => setIsToasterCollapsed(!isToasterCollapsed)}
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
            width: `${generatingTitles ? titlesProgress : optimizationProgress}%`,
          }}
        />
      </div>

      {!isToasterCollapsed && (
        <>
          {/* Output Console */}
          <div
            className="sse-toaster-output"
            ref={generatingTitles ? titlesOutputRef : optimizationOutputRef}
          >
            <div className="sse-toaster-output-content">
              {generatingTitles ? (
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

