'use client';

import React, {
  useCallback,
  useState,
  useRef,
  useMemo,
  useEffect,
} from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  getIncomers,
  getOutgoers,
  getConnectedEdges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  DndProvider,
  DndContext,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useCanvasStore } from '../journey-builder/hooks/useCanvasState';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Import canvas-specific components
import { CanvasGrid, snapToGrid } from './canvas/CanvasGrid';
import { NodeLibrary } from './canvas/NodeLibrary';
import { TimelineAnchor } from './canvas/TimelineAnchor';
import { NodeConnector, ConnectionHandle } from './canvas/NodeConnector';

// Import existing node types
import {
  OverflowEmailNode,
  OverflowTimelineNode,
  OverflowFormNode,
  OverflowConditionNode,
  OverflowReviewNode,
  OverflowMeetingNode,
  OverflowSplitNode,
  OverflowStartNode,
  OverflowEndNode,
  OverflowDelayNode,
} from '../journey-builder/nodes/OverflowNodes';

const nodeTypes = {
  email: OverflowEmailNode,
  timeline: OverflowTimelineNode,
  form: OverflowFormNode,
  condition: OverflowConditionNode,
  review: OverflowReviewNode,
  meeting: OverflowMeetingNode,
  split: OverflowSplitNode,
  start: OverflowStartNode,
  end: OverflowEndNode,
  delay: OverflowDelayNode,
};

const defaultEdgeOptions = {
  animated: true,
  type: 'bezier',
  style: {
    strokeWidth: 2,
    stroke: '#6366f1',
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 25,
    height: 25,
    color: '#6366f1',
  },
};

export interface JourneyCanvasProps {
  canvasId?: string;
  readOnly?: boolean;
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onPreview?: () => void;
  className?: string;
  enableGrid?: boolean;
  enableSnapToGrid?: boolean;
  tierLevel?: 'basic' | 'pro' | 'enterprise';
}

function JourneyCanvasInner({
  canvasId,
  readOnly = false,
  onSave,
  className,
  enableGrid = true,
  enableSnapToGrid = true,
  tierLevel = 'basic',
}: JourneyCanvasProps) {
  const {
    nodes: storedNodes,
    edges: storedEdges,
    loadCanvas,
    saveToDatabase,
    autoSave,
    setNodes: setStoredNodes,
    setEdges: setStoredEdges,
    isLoading,
    isSaving,
    error,
  } = useCanvasStore();

  const [nodes, setNodes, onNodesChange] = useNodesState(
    storedNodes.length > 0
      ? storedNodes
      : [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 100, y: 200 },
            data: { label: 'Journey Start' },
          },
        ],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(storedEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [showNodeLibrary, setShowNodeLibrary] = useState(true);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  const onConnect = useCallback(
    (params: Connection | Edge) =>
      setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      setEdges(
        deleted.reduce((acc, node) => {
          const incomers = getIncomers(node, nodes, edges);
          const outgoers = getOutgoers(node, nodes, edges);
          const connectedEdges = getConnectedEdges([node], edges);

          const remainingEdges = acc.filter(
            (edge) => !connectedEdges.includes(edge),
          );

          const createdEdges = incomers.flatMap(({ id: source }) =>
            outgoers.map(({ id: target }) => ({
              id: `${source}-${target}`,
              source,
              target,
              ...defaultEdgeOptions,
            })),
          );

          return [...remainingEdges, ...createdEdges];
        }, edges),
      );
    },
    [nodes, edges, setEdges],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!event.over || !reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const nodeType = event.active.id as string;

      if (!nodeType) return;

      let position = {
        x:
          (event.active.rect.current.translated?.left || 100) -
          reactFlowBounds.left,
        y:
          (event.active.rect.current.translated?.top || 100) -
          reactFlowBounds.top,
      };

      // Adjust for canvas transform
      position = {
        x: (position.x - canvasPosition.x) / canvasZoom,
        y: (position.y - canvasPosition.y) / canvasZoom,
      };

      // Snap to grid if enabled
      if (enableSnapToGrid) {
        position = snapToGrid(position);
      }

      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position,
        data: {
          label: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} Node`,
          description: '',
          config: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setActiveId(null);
    },
    [setNodes, canvasPosition, canvasZoom, enableSnapToGrid],
  );

  const handleCanvasPan = useCallback((deltaX: number, deltaY: number) => {
    setCanvasPosition((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));
  }, []);

  const handleZoom = useCallback(
    (zoomDelta: number, centerPoint: { x: number; y: number }) => {
      setCanvasZoom((prevZoom) => {
        const newZoom = Math.max(0.25, Math.min(2, prevZoom + zoomDelta));

        // Adjust offset to zoom towards center point
        const zoomFactor = newZoom / prevZoom;
        setCanvasPosition((prev) => ({
          x: centerPoint.x - (centerPoint.x - prev.x) * zoomFactor,
          y: centerPoint.y - (centerPoint.y - prev.y) * zoomFactor,
        }));

        return newZoom;
      });
    },
    [],
  );

  // Load canvas on mount if canvasId is provided
  useEffect(() => {
    if (canvasId) {
      loadCanvas(canvasId).catch(console.error);
    }
  }, [canvasId, loadCanvas]);

  // Sync local state with store when canvas loads
  useEffect(() => {
    if (storedNodes.length > 0 || storedEdges.length > 0) {
      setNodes(storedNodes);
      setEdges(storedEdges);
    }
  }, [storedNodes, storedEdges, setNodes, setEdges]);

  // Update store when nodes or edges change
  useEffect(() => {
    setStoredNodes(nodes);
    setStoredEdges(edges);

    // Auto-save after 30 seconds of inactivity (as per spec)
    if (canvasId && !readOnly) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave(canvasId).catch(console.error);
      }, 30000); // 30 seconds as specified
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    nodes,
    edges,
    canvasId,
    readOnly,
    setStoredNodes,
    setStoredEdges,
    autoSave,
  ]);

  const handleSave = useCallback(async () => {
    if (onSave) {
      onSave(nodes, edges);
    }

    if (canvasId) {
      try {
        await saveToDatabase(canvasId);
        toast.success('Journey saved successfully');
      } catch (error) {
        console.error('Failed to save canvas:', error);
        toast.error('Failed to save journey');
      }
    }
  }, [nodes, edges, onSave, canvasId, saveToDatabase]);

  const handleValidate = useCallback(async () => {
    if (!canvasId) return;

    try {
      const response = await fetch(`/api/journeys/${canvasId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, connections: edges }),
      });

      const validation = await response.json();

      if (validation.errors?.length > 0) {
        validation.errors.forEach((error: any) => {
          toast.error(error.message);
        });
      }

      if (validation.warnings?.length > 0) {
        validation.warnings.forEach((warning: any) => {
          toast.warning(warning.message);
        });
      }

      if (validation.isValid) {
        toast.success('Journey validation passed');
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate journey');
    }
  }, [canvasId, nodes, edges]);

  const handleNodeDrag = useCallback((nodeType: string, config: any) => {
    // This will be handled by the DragEndEvent
  }, []);

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading canvas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-destructive">
          <p className="font-semibold mb-2">Error loading canvas</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <DndContext
        onDragEnd={handleDragEnd}
        onDragStart={(e) => setActiveId(e.active.id as string)}
      >
        <div className={cn('flex h-full bg-gray-50', className)}>
          {/* Node Library */}
          {showNodeLibrary && !readOnly && (
            <NodeLibrary onNodeDrag={handleNodeDrag} tierLevel={tierLevel} />
          )}

          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNodeLibrary(!showNodeLibrary)}
                  className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                >
                  {showNodeLibrary ? 'Hide' : 'Show'} Library
                </button>
                <div className="h-4 w-px bg-gray-300" />
                <span className="text-sm text-gray-600">
                  Zoom: {Math.round(canvasZoom * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleValidate}
                  className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                  disabled={!canvasId}
                >
                  Validate
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  disabled={isSaving || readOnly}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            <div
              ref={reactFlowWrapper}
              className="flex-1 relative overflow-hidden"
              onWheel={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
                  handleZoom(zoomDelta, { x: e.clientX, y: e.clientY });
                }
              }}
            >
              {/* Canvas Grid */}
              {enableGrid && (
                <CanvasGrid
                  zoom={canvasZoom}
                  position={canvasPosition}
                  snapToGrid={enableSnapToGrid}
                />
              )}

              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onNodesDelete={onNodesDelete}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                fitView
                proOptions={proOptions}
                deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
                className="journey-canvas"
                onMove={(_, viewport) => {
                  setCanvasPosition({ x: viewport.x, y: viewport.y });
                  setCanvasZoom(viewport.zoom);
                }}
              >
                <Controls
                  className="bg-card/80 backdrop-blur-sm border rounded-lg"
                  showInteractive={false}
                />
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={2}
                  color="#6366f1"
                  className="opacity-30"
                />
              </ReactFlow>
            </div>
          </div>

          {/* Node Configuration Panel */}
          {selectedNode && (
            <div className="w-80 border-l bg-card p-4">
              <h3 className="font-semibold mb-4">Node Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Label</label>
                  <input
                    type="text"
                    value={selectedNode.data.label || ''}
                    onChange={(e) => {
                      setNodes((nds) =>
                        nds.map((node) =>
                          node.id === selectedNode.id
                            ? {
                                ...node,
                                data: { ...node.data, label: e.target.value },
                              }
                            : node,
                        ),
                      );
                    }}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    value={selectedNode.data.description || ''}
                    onChange={(e) => {
                      setNodes((nds) =>
                        nds.map((node) =>
                          node.id === selectedNode.id
                            ? {
                                ...node,
                                data: {
                                  ...node.data,
                                  description: e.target.value,
                                },
                              }
                            : node,
                        ),
                      );
                    }}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    rows={3}
                    disabled={readOnly}
                  />
                </div>

                {/* Timeline Configuration for timeline nodes */}
                {selectedNode.type === 'timeline' && (
                  <TimelineAnchor
                    position={{ x: 0, y: 0 }}
                    anchorType={
                      selectedNode.data.config?.anchor_type || 'wedding_date'
                    }
                    config={
                      selectedNode.data.config || {
                        anchor_type: 'wedding_date',
                        offset: {
                          value: 1,
                          unit: 'weeks',
                          direction: 'before',
                        },
                        skip_weekends: true,
                        timezone: 'America/New_York',
                      }
                    }
                    onConfigChange={(config) => {
                      setNodes((nds) =>
                        nds.map((node) =>
                          node.id === selectedNode.id
                            ? { ...node, data: { ...node.data, config } }
                            : node,
                        ),
                      );
                    }}
                    className="relative"
                  />
                )}
              </div>
            </div>
          )}

          <DragOverlay>
            {activeId && (
              <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md shadow-lg">
                {activeId}
              </div>
            )}
          </DragOverlay>
        </div>
      </DndContext>
    </DndProvider>
  );
}

export function JourneyCanvas(props: JourneyCanvasProps) {
  return (
    <ReactFlowProvider>
      <JourneyCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export default JourneyCanvas;
