'use client';

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface Connection {
  id: string;
  source: string;
  target: string;
  sourcePosition: { x: number; y: number };
  targetPosition: { x: number; y: number };
  type: 'default' | 'success' | 'error' | 'conditional';
  label?: string;
  animated?: boolean;
}

export interface NodeConnectorProps {
  connections: Connection[];
  onConnectionCreate: (source: string, target: string) => void;
  onConnectionDelete: (connectionId: string) => void;
  onConnectionUpdate: (
    connectionId: string,
    updates: Partial<Connection>,
  ) => void;
  isReadOnly?: boolean;
  className?: string;
}

interface DragState {
  isDragging: boolean;
  sourceNode?: string;
  startPosition?: { x: number; y: number };
  currentPosition?: { x: number; y: number };
}

export function NodeConnector({
  connections,
  onConnectionCreate,
  onConnectionDelete,
  onConnectionUpdate,
  isReadOnly = false,
  className,
}: NodeConnectorProps) {
  const [dragState, setDragState] = useState<DragState>({ isDragging: false });
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(
    null,
  );
  const svgRef = useRef<SVGSVGElement>(null);

  const handleConnectionStart = useCallback(
    (sourceNode: string, startPosition: { x: number; y: number }) => {
      if (isReadOnly) return;

      setDragState({
        isDragging: true,
        sourceNode,
        startPosition,
        currentPosition: startPosition,
      });
    },
    [isReadOnly],
  );

  const handleConnectionDrag = useCallback(
    (event: React.MouseEvent) => {
      if (!dragState.isDragging || !svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const currentPosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      setDragState((prev) => ({
        ...prev,
        currentPosition,
      }));
    },
    [dragState.isDragging],
  );

  const handleConnectionEnd = useCallback(
    (targetNode?: string) => {
      if (
        dragState.isDragging &&
        dragState.sourceNode &&
        targetNode &&
        targetNode !== dragState.sourceNode
      ) {
        onConnectionCreate(dragState.sourceNode, targetNode);
      }

      setDragState({ isDragging: false });
    },
    [dragState, onConnectionCreate],
  );

  const createConnectionPath = (connection: Connection): string => {
    const { sourcePosition, targetPosition } = connection;

    // Calculate control points for smooth curves
    const dx = targetPosition.x - sourcePosition.x;
    const dy = targetPosition.y - sourcePosition.y;

    // Adjust control points based on direction
    const controlPoint1X = sourcePosition.x + Math.abs(dx) * 0.5;
    const controlPoint1Y = sourcePosition.y;
    const controlPoint2X = targetPosition.x - Math.abs(dx) * 0.5;
    const controlPoint2Y = targetPosition.y;

    return `M ${sourcePosition.x} ${sourcePosition.y} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${targetPosition.x} ${targetPosition.y}`;
  };

  const createTempConnectionPath = (): string => {
    if (!dragState.startPosition || !dragState.currentPosition) return '';

    const { startPosition, currentPosition } = dragState;
    const dx = currentPosition.x - startPosition.x;
    const controlPoint1X = startPosition.x + Math.abs(dx) * 0.5;
    const controlPoint1Y = startPosition.y;
    const controlPoint2X = currentPosition.x - Math.abs(dx) * 0.5;
    const controlPoint2Y = currentPosition.y;

    return `M ${startPosition.x} ${startPosition.y} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${currentPosition.x} ${currentPosition.y}`;
  };

  const getConnectionStyle = (connection: Connection) => {
    const baseStyle = {
      stroke: '#6366f1',
      strokeWidth: 2,
      fill: 'none',
    };

    switch (connection.type) {
      case 'success':
        return { ...baseStyle, stroke: '#10b981' };
      case 'error':
        return { ...baseStyle, stroke: '#ef4444' };
      case 'conditional':
        return { ...baseStyle, stroke: '#f59e0b', strokeDasharray: '5,5' };
      default:
        return baseStyle;
    }
  };

  const getMarkerStyle = (connection: Connection) => {
    switch (connection.type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'conditional':
        return '#f59e0b';
      default:
        return '#6366f1';
    }
  };

  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="absolute inset-0"
        style={{ zIndex: 1 }}
        onMouseMove={handleConnectionDrag}
        onMouseUp={() => handleConnectionEnd()}
      >
        {/* Arrow markers */}
        <defs>
          {['default', 'success', 'error', 'conditional'].map((type) => (
            <marker
              key={type}
              id={`arrowhead-${type}`}
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={getMarkerStyle({ type } as Connection)}
              />
            </marker>
          ))}
        </defs>

        {/* Existing connections */}
        {connections.map((connection) => (
          <g key={connection.id}>
            {/* Connection path */}
            <path
              d={createConnectionPath(connection)}
              style={getConnectionStyle(connection)}
              markerEnd={`url(#arrowhead-${connection.type})`}
              className={cn(
                'pointer-events-auto cursor-pointer transition-all duration-200',
                connection.animated && 'animate-pulse',
                hoveredConnection === connection.id && 'drop-shadow-lg',
              )}
              onMouseEnter={() => setHoveredConnection(connection.id)}
              onMouseLeave={() => setHoveredConnection(null)}
              onClick={() => {
                if (!isReadOnly) {
                  // Show connection options/delete
                }
              }}
            />

            {/* Connection label */}
            {connection.label && (
              <text
                x={
                  (connection.sourcePosition.x + connection.targetPosition.x) /
                  2
                }
                y={
                  (connection.sourcePosition.y + connection.targetPosition.y) /
                    2 -
                  10
                }
                textAnchor="middle"
                className="fill-gray-600 text-xs pointer-events-none select-none"
                fontSize="12"
              >
                {connection.label}
              </text>
            )}

            {/* Delete button on hover */}
            {hoveredConnection === connection.id && !isReadOnly && (
              <circle
                cx={
                  (connection.sourcePosition.x + connection.targetPosition.x) /
                  2
                }
                cy={
                  (connection.sourcePosition.y + connection.targetPosition.y) /
                  2
                }
                r="8"
                fill="white"
                stroke="#ef4444"
                strokeWidth="2"
                className="pointer-events-auto cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onConnectionDelete(connection.id);
                }}
              />
            )}
            {hoveredConnection === connection.id && !isReadOnly && (
              <text
                x={
                  (connection.sourcePosition.x + connection.targetPosition.x) /
                  2
                }
                y={
                  (connection.sourcePosition.y + connection.targetPosition.y) /
                    2 +
                  2
                }
                textAnchor="middle"
                className="fill-red-500 text-xs pointer-events-none select-none font-bold"
                fontSize="10"
              >
                ×
              </text>
            )}
          </g>
        ))}

        {/* Temporary connection while dragging */}
        {dragState.isDragging && (
          <path
            d={createTempConnectionPath()}
            stroke="#6366f1"
            strokeWidth="2"
            strokeDasharray="5,5"
            fill="none"
            className="pointer-events-none"
          />
        )}
      </svg>
    </div>
  );
}

// Connection handle component for nodes
export interface ConnectionHandleProps {
  nodeId: string;
  position: 'top' | 'right' | 'bottom' | 'left';
  type: 'source' | 'target' | 'both';
  onConnectionStart?: (
    nodeId: string,
    position: { x: number; y: number },
  ) => void;
  onConnectionEnd?: (nodeId: string) => void;
  className?: string;
}

export function ConnectionHandle({
  nodeId,
  position,
  type,
  onConnectionStart,
  onConnectionEnd,
  className,
}: ConnectionHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (type === 'target') return;
    if (!onConnectionStart || !handleRef.current) return;

    event.stopPropagation();

    const rect = handleRef.current.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    onConnectionStart(nodeId, position);
  };

  const handleMouseUp = (event: React.MouseEvent) => {
    if (type === 'source') return;
    if (!onConnectionEnd) return;

    event.stopPropagation();
    onConnectionEnd(nodeId);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'right':
        return 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2';
      case 'bottom':
        return 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2';
      case 'left':
        return 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2';
      default:
        return '';
    }
  };

  const getTypeClasses = () => {
    switch (type) {
      case 'source':
        return 'bg-blue-500 border-blue-600';
      case 'target':
        return 'bg-green-500 border-green-600';
      case 'both':
        return 'bg-purple-500 border-purple-600';
      default:
        return 'bg-gray-500 border-gray-600';
    }
  };

  return (
    <div
      ref={handleRef}
      className={cn(
        'absolute w-3 h-3 rounded-full border-2 cursor-pointer transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-125',
        getPositionClasses(),
        getTypeClasses(),
        className,
      )}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      title={`${type} connection handle`}
    />
  );
}

// Helper function to calculate connection positions
export function getConnectionPosition(
  nodePosition: { x: number; y: number },
  nodeSize: { width: number; height: number },
  handlePosition: 'top' | 'right' | 'bottom' | 'left',
): { x: number; y: number } {
  switch (handlePosition) {
    case 'top':
      return {
        x: nodePosition.x + nodeSize.width / 2,
        y: nodePosition.y,
      };
    case 'right':
      return {
        x: nodePosition.x + nodeSize.width,
        y: nodePosition.y + nodeSize.height / 2,
      };
    case 'bottom':
      return {
        x: nodePosition.x + nodeSize.width / 2,
        y: nodePosition.y + nodeSize.height,
      };
    case 'left':
      return {
        x: nodePosition.x,
        y: nodePosition.y + nodeSize.height / 2,
      };
    default:
      return nodePosition;
  }
}

export default NodeConnector;
