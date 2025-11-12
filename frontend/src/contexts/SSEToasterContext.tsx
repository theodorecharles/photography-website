import { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';

interface SSEToasterContextType {
  // Titles job state
  generatingTitles: boolean;
  setGeneratingTitles: (value: boolean) => void;
  titlesOutput: string[];
  setTitlesOutput: (value: string[] | ((prev: string[]) => string[])) => void;
  titlesProgress: number;
  setTitlesProgress: (value: number) => void;
  titlesWaiting: number | null;
  setTitlesWaiting: (value: number | null) => void;
  titlesOutputRef: React.RefObject<HTMLDivElement>;
  titlesAbortController: React.MutableRefObject<AbortController | null>;
  
  // Optimization job state
  isOptimizationRunning: boolean;
  setIsOptimizationRunning: (value: boolean) => void;
  optimizationLogs: string[];
  setOptimizationLogs: (value: string[] | ((prev: string[]) => string[])) => void;
  optimizationProgress: number;
  setOptimizationProgress: (value: number) => void;
  optimizationOutputRef: React.RefObject<HTMLDivElement>;
  optimizationAbortController: React.MutableRefObject<AbortController | null>;
  
  // Toaster UI state
  isToasterCollapsed: boolean;
  setIsToasterCollapsed: (value: boolean) => void;
  isToasterMaximized: boolean;
  setIsToasterMaximized: (value: boolean) => void;
  toasterPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  setToasterPosition: (value: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left') => void;
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  dragStart: { x: number; y: number } | null;
  setDragStart: (value: { x: number; y: number } | null) => void;
  dragOffset: { x: number; y: number };
  setDragOffset: (value: { x: number; y: number }) => void;
  hasToasterAnimated: boolean;
  setHasToasterAnimated: (value: boolean) => void;
  
  // Helper methods
  resetToasterState: () => void;
}

const SSEToasterContext = createContext<SSEToasterContextType | undefined>(undefined);

export function SSEToasterProvider({ children }: { children: ReactNode }) {
  // Titles job state
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [titlesOutput, setTitlesOutput] = useState<string[]>([]);
  const [titlesProgress, setTitlesProgress] = useState(0);
  const [titlesWaiting, setTitlesWaiting] = useState<number | null>(null);
  const titlesOutputRef = useRef<HTMLDivElement>(null);
  const titlesAbortController = useRef<AbortController | null>(null);
  
  // Optimization job state
  const [isOptimizationRunning, setIsOptimizationRunning] = useState(false);
  const [optimizationLogs, setOptimizationLogs] = useState<string[]>([]);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const optimizationOutputRef = useRef<HTMLDivElement>(null);
  const optimizationAbortController = useRef<AbortController | null>(null);
  
  // Toaster UI state
  const [isToasterCollapsed, setIsToasterCollapsed] = useState(false);
  const [isToasterMaximized, setIsToasterMaximized] = useState(false);
  const [toasterPosition, setToasterPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasToasterAnimated, setHasToasterAnimated] = useState(false);
  
  // Reset toaster to default state
  const resetToasterState = () => {
    setToasterPosition('top-right');
    setIsToasterCollapsed(false);
    setIsToasterMaximized(false);
    setHasToasterAnimated(false);
  };
  
  // Disable page scrolling when toaster is maximized
  useEffect(() => {
    if (isToasterMaximized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isToasterMaximized]);
  
  // Mark toaster as animated after initial slide-in completes
  useEffect(() => {
    const isAnyJobRunning = generatingTitles || isOptimizationRunning;
    if (isAnyJobRunning && !hasToasterAnimated) {
      const timer = setTimeout(() => {
        setHasToasterAnimated(true);
      }, 300); // Match animation duration
      
      return () => clearTimeout(timer);
    }
  }, [generatingTitles, isOptimizationRunning, hasToasterAnimated]);
  
  const value = {
    generatingTitles,
    setGeneratingTitles,
    titlesOutput,
    setTitlesOutput,
    titlesProgress,
    setTitlesProgress,
    titlesWaiting,
    setTitlesWaiting,
    titlesOutputRef,
    titlesAbortController,
    isOptimizationRunning,
    setIsOptimizationRunning,
    optimizationLogs,
    setOptimizationLogs,
    optimizationProgress,
    setOptimizationProgress,
    optimizationOutputRef,
    optimizationAbortController,
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
    resetToasterState,
  };
  
  return (
    <SSEToasterContext.Provider value={value}>
      {children}
    </SSEToasterContext.Provider>
  );
}

export function useSSEToaster() {
  const context = useContext(SSEToasterContext);
  if (context === undefined) {
    throw new Error('useSSEToaster must be used within a SSEToasterProvider');
  }
  return context;
}

