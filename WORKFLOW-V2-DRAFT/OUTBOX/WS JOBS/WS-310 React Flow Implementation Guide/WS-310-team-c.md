# WS-310 React Flow Implementation Guide - Team C
## Performance & Accessibility Optimization Specialist

### 🎯 ROLE DEFINITION
**Specialist**: React Flow Performance & Accessibility Engineer
**Focus**: Mobile performance, accessibility compliance, and React Flow optimization
**Wedding Context**: Journey building must work flawlessly on mobile at wedding venues

### 📋 PRIMARY TASK
Create comprehensive React Flow performance optimization and accessibility implementation for wedding journey builders, focusing on mobile-first performance and WCAG 2.1 AA compliance.

### 🛠 CORE RESPONSIBILITIES

#### 1. React Flow Performance Optimization
```typescript
// Implement memoized node components
const OptimizedVendorNode = React.memo(({ data, isConnectable, selected }: NodeProps) => {
  const nodeStyle = useMemo(() => ({
    background: selected ? '#fef3c7' : '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    minWidth: '200px',
    boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)'
  }), [selected]);

  return (
    <div style={nodeStyle}>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{ borderRadius: '50%', backgroundColor: '#10b981' }}
      />
      
      <div className="flex items-center gap-3">
        {data.icon && (
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            {data.icon}
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">{data.title}</h3>
          <p className="text-xs text-gray-600">{data.description}</p>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{ borderRadius: '50%', backgroundColor: '#10b981' }}
      />
    </div>
  );
});
OptimizedVendorNode.displayName = 'OptimizedVendorNode';
```

#### 2. Mobile Performance Implementation
```typescript
// Mobile-optimized React Flow configuration
const mobileFlowConfig = {
  // Reduce rendering overhead on mobile
  nodesDraggable: window.innerWidth > 768,
  nodesConnectable: true,
  elementsSelectable: true,
  
  // Optimize for touch interactions
  defaultViewport: { x: 0, y: 0, zoom: window.innerWidth < 768 ? 0.8 : 1 },
  minZoom: 0.5,
  maxZoom: 2,
  
  // Performance optimizations
  snapToGrid: [10, 10],
  snapGrid: [10, 10],
  
  // Mobile-friendly controls
  panOnDrag: window.innerWidth > 768 ? [1, 2] : false, // Disable pan on mobile
  selectionOnDrag: window.innerWidth < 768,
  
  // Reduce animations on mobile
  connectionLineStyle: {
    strokeWidth: 2,
    stroke: '#10b981',
    strokeDasharray: window.innerWidth < 768 ? '0' : '5,5'
  }
};

// Mobile-first viewport management
const useMobileViewport = () => {
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  
  const fitToMobile = useCallback(() => {
    if (window.innerWidth < 768) {
      setViewport({ x: 20, y: 20, zoom: 0.7 });
    }
  }, []);
  
  useEffect(() => {
    fitToMobile();
    window.addEventListener('resize', fitToMobile);
    return () => window.removeEventListener('resize', fitToMobile);
  }, [fitToMobile]);
  
  return { viewport, setViewport };
};
```

#### 3. Accessibility Implementation
```typescript
// WCAG 2.1 AA compliant node component
const AccessibleJourneyNode = ({ data, isConnectable }: NodeProps) => {
  const nodeId = useId();
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div
      id={nodeId}
      role="button"
      tabIndex={0}
      aria-label={`${data.title}: ${data.description}`}
      aria-describedby={`${nodeId}-details`}
      className={`
        journey-node relative bg-white border-2 rounded-xl p-4 min-w-[200px]
        focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
        ${isFocused ? 'ring-2 ring-amber-500' : 'border-gray-200'}
        hover:shadow-lg transition-shadow duration-200
      `}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          data.onClick?.(data);
        }
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        aria-label={`Connection point for ${data.title}`}
        className="w-3 h-3 border-2 border-green-500 bg-white rounded-full"
      />
      
      <div className="flex items-start gap-3">
        {data.icon && (
          <div 
            className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            {data.icon}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
            {data.title}
          </h3>
          <p 
            id={`${nodeId}-details`}
            className="text-xs text-gray-600 mt-1 line-clamp-2"
          >
            {data.description}
          </p>
          
          {data.status && (
            <div className="flex items-center gap-1 mt-2">
              <div 
                className={`w-2 h-2 rounded-full ${
                  data.status === 'completed' ? 'bg-green-500' :
                  data.status === 'in-progress' ? 'bg-amber-500' :
                  'bg-gray-300'
                }`}
                aria-hidden="true"
              />
              <span className="text-xs text-gray-500 capitalize">
                {data.status.replace('-', ' ')}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        aria-label={`Output connection for ${data.title}`}
        className="w-3 h-3 border-2 border-green-500 bg-white rounded-full"
      />
    </div>
  );
};
```

#### 4. React Flow Bundle Optimization
```typescript
// Lazy load React Flow components
const ReactFlow = lazy(() => import('reactflow'));
const Background = lazy(() => import('reactflow').then(module => ({ 
  default: module.Background 
})));
const Controls = lazy(() => import('reactflow').then(module => ({ 
  default: module.Controls 
})));
const MiniMap = lazy(() => import('reactflow').then(module => ({ 
  default: module.MiniMap 
})));

// Optimized React Flow wrapper with Suspense
const OptimizedJourneyFlow = ({ nodes, edges, onNodesChange, onEdgesChange }) => {
  return (
    <div className="h-full w-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading journey builder...</p>
          </div>
        </div>
      }>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={memoizedNodeTypes}
          edgeTypes={memoizedEdgeTypes}
          {...mobileFlowConfig}
        >
          <Background color="#f3f4f6" gap={16} />
          
          {window.innerWidth > 768 && (
            <Controls
              position="bottom-right"
              showZoom={true}
              showFitView={true}
              showInteractive={false}
            />
          )}
          
          {window.innerWidth > 1024 && (
            <MiniMap
              nodeColor="#10b981"
              maskColor="#f3f4f660"
              position="top-right"
              className="bg-white border border-gray-200 rounded-lg"
            />
          )}
        </ReactFlow>
      </Suspense>
    </div>
  );
};
```

#### 5. Performance Monitoring & Analytics
```typescript
// React Flow performance monitoring
const useFlowPerformance = () => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    nodeCount: 0,
    edgeCount: 0,
    memoryUsage: 0
  });
  
  const trackRenderPerformance = useCallback((nodeCount: number, edgeCount: number) => {
    const startTime = performance.now();
    
    // Track rendering
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Get memory usage if available
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize : 0;
      
      setMetrics({
        renderTime,
        nodeCount,
        edgeCount,
        memoryUsage
      });
      
      // Log performance warnings
      if (renderTime > 100) {
        console.warn(`Slow React Flow render: ${renderTime}ms for ${nodeCount} nodes`);
      }
      
      // Send analytics for optimization
      if (typeof gtag !== 'undefined') {
        gtag('event', 'flow_performance', {
          render_time: Math.round(renderTime),
          node_count: nodeCount,
          edge_count: edgeCount,
          device_type: window.innerWidth < 768 ? 'mobile' : 'desktop'
        });
      }
    });
  }, []);
  
  return { metrics, trackRenderPerformance };
};
```

### 📱 MOBILE-FIRST REQUIREMENTS
1. **Touch Optimization**
   - 48px minimum touch targets
   - Gesture-friendly interactions
   - Mobile-specific controls

2. **Performance Targets**
   - <100ms node rendering
   - <2s initial load
   - 60fps interactions
   - <50MB memory usage

3. **Offline Capability**
   - ServiceWorker caching
   - Local state persistence
   - Offline indicator

### ♿ ACCESSIBILITY CHECKLIST
- [ ] Screen reader compatibility
- [ ] Keyboard navigation
- [ ] Focus management
- [ ] Color contrast >4.5:1
- [ ] ARIA labels and descriptions
- [ ] Skip links implementation
- [ ] High contrast mode support

### 🎯 WEDDING-SPECIFIC OPTIMIZATIONS
1. **Venue Performance**: Optimize for poor WiFi at wedding venues
2. **Mobile Usage**: 80% of wedding coordination happens on mobile
3. **Vendor Handoffs**: Quick loading for vendor transitions
4. **Timeline Critical**: Real-time updates during wedding day

### 🔧 TESTING REQUIREMENTS
1. **Performance Testing**
   - Lighthouse audits (>90 score)
   - Bundle analysis
   - Memory leak detection
   - Mobile performance profiling

2. **Accessibility Testing**
   - Screen reader testing (NVDA, JAWS, VoiceOver)
   - Keyboard-only navigation
   - Color blindness simulation
   - High contrast mode testing

### 📊 SUCCESS METRICS
- Performance score: >90
- Accessibility score: AA compliant
- Mobile load time: <2 seconds
- Bundle size: <200KB gzipped
- Memory usage: <50MB peak
- User engagement: >95% completion rate

### 🚀 DELIVERABLES
1. **Optimized React Flow Components** - Memoized, performant nodes/edges
2. **Mobile Performance Package** - Touch optimization & responsive design
3. **Accessibility Implementation** - WCAG 2.1 AA compliant components
4. **Performance Monitoring** - Analytics and performance tracking
5. **Bundle Optimization** - Code splitting and lazy loading
6. **Testing Suite** - Performance and accessibility tests

Focus on creating React Flow implementations that work flawlessly on mobile devices during high-stress wedding coordination scenarios!