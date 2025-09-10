// Performance monitoring hook for scalability metrics
import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  
  // Custom metrics
  renderTime: number;
  memoryUsage?: number;
  domNodes: number;
  apiResponseTime: number[];
  cacheHitRate: number;
  
  // Real-time metrics
  timestamp: number;
}

interface UsePerformanceMonitorOptions {
  trackWebVitals?: boolean;
  trackMemory?: boolean;
  trackAPI?: boolean;
  sampleRate?: number; // 0-1, percentage of sessions to monitor
}

export const usePerformanceMonitor = ({
  trackWebVitals = true,
  trackMemory = true,
  trackAPI = true,
  sampleRate = 0.1, // Monitor 10% of sessions by default
}: UsePerformanceMonitorOptions = {}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    domNodes: 0,
    apiResponseTime: [],
    cacheHitRate: 0,
    timestamp: Date.now(),
  });
  
  const renderStartRef = useRef<number>(Date.now());
  const apiTimingsRef = useRef<number[]>([]);
  const shouldMonitor = useRef(Math.random() < sampleRate);

  // Track render performance
  const trackRenderTime = useCallback(() => {
    if (!shouldMonitor.current) return;
    
    const renderTime = Date.now() - renderStartRef.current;
    setMetrics(prev => ({ ...prev, renderTime }));
  }, []);

  // Track API response times
  const trackAPICall = useCallback((responseTime: number) => {
    if (!shouldMonitor.current || !trackAPI) return;
    
    apiTimingsRef.current.push(responseTime);
    
    // Keep only last 50 API calls
    if (apiTimingsRef.current.length > 50) {
      apiTimingsRef.current = apiTimingsRef.current.slice(-50);
    }
    
    setMetrics(prev => ({
      ...prev,
      apiResponseTime: [...apiTimingsRef.current],
    }));
  }, [trackAPI]);

  // Track memory usage
  const trackMemoryUsage = useCallback(() => {
    if (!shouldMonitor.current || !trackMemory) return;
    
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memoryUsage * 100, // Convert to percentage
      }));
    }
  }, [trackMemory]);

  // Track DOM complexity
  const trackDOMComplexity = useCallback(() => {
    if (!shouldMonitor.current) return;
    
    const domNodes = document.querySelectorAll('*').length;
    setMetrics(prev => ({ ...prev, domNodes }));
  }, []);

  // Track Core Web Vitals
  useEffect(() => {
    if (!shouldMonitor.current || !trackWebVitals) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        setMetrics(prev => {
          const updated = { ...prev };
          
          switch (entry.entryType) {
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                updated.fcp = entry.startTime;
              }
              break;
              
            case 'largest-contentful-paint':
              updated.lcp = entry.startTime;
              break;
              
            case 'first-input':
              updated.fid = (entry as any).processingStart - entry.startTime;
              break;
              
            case 'layout-shift':
              if (!(entry as any).hadRecentInput) {
                updated.cls = (updated.cls || 0) + (entry as any).value;
              }
              break;
          }
          
          return updated;
        });
      });
    });

    // Observe different entry types
    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (e) {
      // Fallback for browsers that don't support all entry types
      console.warn('Some performance metrics not available:', e);
    }

    return () => observer.disconnect();
  }, [trackWebVitals]);

  // Performance monitoring loop
  useEffect(() => {
    if (!shouldMonitor.current) return;

    const interval = setInterval(() => {
      trackMemoryUsage();
      trackDOMComplexity();
      trackRenderTime();
      
      setMetrics(prev => ({ ...prev, timestamp: Date.now() }));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [trackMemoryUsage, trackDOMComplexity, trackRenderTime]);

  // Performance analysis helpers
  const getPerformanceScore = useCallback((): number => {
    let score = 100;
    
    // Deduct points for poor performance
    if (metrics.lcp && metrics.lcp > 2500) score -= 20;
    if (metrics.fid && metrics.fid > 100) score -= 15;
    if (metrics.cls && metrics.cls > 0.1) score -= 15;
    if (metrics.memoryUsage && metrics.memoryUsage > 80) score -= 10;
    if (metrics.domNodes > 5000) score -= 10;
    
    const avgApiTime = metrics.apiResponseTime.length > 0 
      ? metrics.apiResponseTime.reduce((a, b) => a + b, 0) / metrics.apiResponseTime.length 
      : 0;
    if (avgApiTime > 1000) score -= 20;
    
    return Math.max(0, score);
  }, [metrics]);

  const getRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];
    
    if (metrics.lcp && metrics.lcp > 2500) {
      recommendations.push('Optimize Largest Contentful Paint - consider image optimization or code splitting');
    }
    
    if (metrics.fid && metrics.fid > 100) {
      recommendations.push('Reduce First Input Delay - minimize JavaScript execution time');
    }
    
    if (metrics.cls && metrics.cls > 0.1) {
      recommendations.push('Fix Cumulative Layout Shift - ensure images have dimensions');
    }
    
    if (metrics.memoryUsage && metrics.memoryUsage > 80) {
      recommendations.push('High memory usage detected - check for memory leaks');
    }
    
    if (metrics.domNodes > 5000) {
      recommendations.push('DOM complexity is high - consider virtualization for large lists');
    }
    
    const avgApiTime = metrics.apiResponseTime.length > 0 
      ? metrics.apiResponseTime.reduce((a, b) => a + b, 0) / metrics.apiResponseTime.length 
      : 0;
    if (avgApiTime > 1000) {
      recommendations.push('API responses are slow - implement caching or optimize queries');
    }
    
    return recommendations;
  }, [metrics]);

  // Log performance data for analytics
  const logPerformanceData = useCallback(() => {
    if (!shouldMonitor.current) return;
    
    const data = {
      ...metrics,
      score: getPerformanceScore(),
      recommendations: getRecommendations(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    // In a real app, you'd send this to your analytics service
    console.log('Performance Data:', data);
    
    // Could integrate with services like:
    // - Google Analytics
    // - DataDog
    // - New Relic
    // - Custom analytics endpoint
  }, [metrics, getPerformanceScore, getRecommendations]);

  return {
    metrics,
    trackAPICall,
    trackRenderTime,
    getPerformanceScore,
    getRecommendations,
    logPerformanceData,
    isMonitoring: shouldMonitor.current,
  };
};

export default usePerformanceMonitor;
