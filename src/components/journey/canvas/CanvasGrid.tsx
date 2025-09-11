'use client';

import React from 'react';

export interface CanvasGridProps {
  zoom: number;
  position: { x: number; y: number };
  gridSize?: number;
  showRuler?: boolean;
  snapToGrid?: boolean;
}

export function CanvasGrid({
  zoom,
  position,
  gridSize = 20,
  showRuler = true,
  snapToGrid = true,
}: CanvasGridProps) {
  const scaledGridSize = gridSize * zoom;
  const offsetX = position.x % scaledGridSize;
  const offsetY = position.y % scaledGridSize;

  // Generate grid lines
  const gridLines = [];
  const viewportWidth =
    typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight =
    typeof window !== 'undefined' ? window.innerHeight : 800;

  // Vertical lines
  for (let x = offsetX; x < viewportWidth; x += scaledGridSize) {
    gridLines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={viewportHeight}
        stroke="rgba(99, 102, 241, 0.1)"
        strokeWidth={1}
      />,
    );
  }

  // Horizontal lines
  for (let y = offsetY; y < viewportHeight; y += scaledGridSize) {
    gridLines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={viewportWidth}
        y2={y}
        stroke="rgba(99, 102, 241, 0.1)"
        strokeWidth={1}
      />,
    );
  }

  // Timeline ruler marks
  const rulerMarks = [];
  if (showRuler) {
    const timelineSteps = [
      'Booking',
      '8 weeks',
      '6 weeks',
      '4 weeks',
      '2 weeks',
      '1 week',
      'Wedding Day',
      '1 week after',
      '2 weeks after',
      '1 month after',
    ];
    const stepWidth = viewportWidth / timelineSteps.length;

    timelineSteps.forEach((step, index) => {
      const x = index * stepWidth + stepWidth / 2;
      rulerMarks.push(
        <g key={`ruler-${index}`}>
          <line
            x1={x}
            y1={0}
            x2={x}
            y2={30}
            stroke="rgba(99, 102, 241, 0.3)"
            strokeWidth={2}
          />
          <text
            x={x}
            y={45}
            textAnchor="middle"
            fontSize={12}
            fill="rgba(99, 102, 241, 0.7)"
            className="select-none"
          >
            {step}
          </text>
        </g>,
      );
    });
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg
        width="100%"
        height="100%"
        className="absolute inset-0"
        style={{ zIndex: 0 }}
      >
        <defs>
          <pattern
            id="grid-pattern"
            width={scaledGridSize}
            height={scaledGridSize}
            patternUnits="userSpaceOnUse"
            x={offsetX}
            y={offsetY}
          >
            <circle
              cx={scaledGridSize / 2}
              cy={scaledGridSize / 2}
              r={0.5}
              fill="rgba(99, 102, 241, 0.2)"
            />
          </pattern>

          <pattern
            id="major-grid-pattern"
            width={scaledGridSize * 5}
            height={scaledGridSize * 5}
            patternUnits="userSpaceOnUse"
            x={offsetX}
            y={offsetY}
          >
            <rect
              width={scaledGridSize * 5}
              height={scaledGridSize * 5}
              fill="none"
              stroke="rgba(99, 102, 241, 0.15)"
              strokeWidth={1}
            />
          </pattern>
        </defs>

        {/* Grid background */}
        {snapToGrid && (
          <>
            <rect
              width="100%"
              height="100%"
              fill="url(#grid-pattern)"
              opacity={zoom > 0.5 ? 1 : 0}
            />
            <rect
              width="100%"
              height="100%"
              fill="url(#major-grid-pattern)"
              opacity={zoom > 0.3 ? 1 : 0}
            />
          </>
        )}

        {/* Grid lines (fallback for low zoom) */}
        {snapToGrid && zoom <= 0.5 && <g opacity={0.5}>{gridLines}</g>}

        {/* Timeline ruler */}
        {showRuler && (
          <g className="timeline-ruler">
            <rect
              x={0}
              y={0}
              width="100%"
              height={60}
              fill="rgba(255, 255, 255, 0.9)"
              stroke="rgba(99, 102, 241, 0.2)"
              strokeWidth={1}
            />
            {rulerMarks}
          </g>
        )}
      </svg>

      {/* Coordinate indicator */}
      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm rounded-md px-3 py-1 text-xs text-muted-foreground border shadow-sm">
        <div className="flex items-center gap-4">
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <span>X: {Math.round(-position.x)}</span>
          <span>Y: {Math.round(-position.y)}</span>
          {snapToGrid && (
            <span className="text-primary">Grid: {gridSize}px</span>
          )}
        </div>
      </div>

      {/* Grid controls */}
      <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm rounded-md px-3 py-1 text-xs border shadow-sm">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={snapToGrid}
              readOnly
              className="w-3 h-3"
            />
            <span>Snap to Grid</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showRuler}
              readOnly
              className="w-3 h-3"
            />
            <span>Timeline Ruler</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// Utility function to snap coordinates to grid
export function snapToGrid(
  position: { x: number; y: number },
  gridSize: number = 20,
  enabled: boolean = true,
): { x: number; y: number } {
  if (!enabled) return position;

  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}

// Utility function to get grid coordinates
export function getGridCoordinates(
  position: { x: number; y: number },
  gridSize: number = 20,
): { gridX: number; gridY: number } {
  return {
    gridX: Math.floor(position.x / gridSize),
    gridY: Math.floor(position.y / gridSize),
  };
}

// Utility function to convert grid coordinates to pixel coordinates
export function gridToPixel(
  gridPosition: { gridX: number; gridY: number },
  gridSize: number = 20,
): { x: number; y: number } {
  return {
    x: gridPosition.gridX * gridSize,
    y: gridPosition.gridY * gridSize,
  };
}

export default CanvasGrid;
