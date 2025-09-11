'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { TableCard } from './TableCard';
import { type Table, type Guest, type Position } from '@/types/seating';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableLayoutProps {
  tables: Table[];
  guests: Guest[];
  onTableUpdate: (tableId: string, updates: Partial<Table>) => void;
  onTableMove: (tableId: string, position: Position) => void;
  onTableAdd: (position: Position) => void;
  onTableDelete: (tableId: string) => void;
  className?: string;
  readonly?: boolean;
}

const GRID_SIZE = 20;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const DEFAULT_ZOOM = 1;

export function TableLayout({
  tables,
  guests,
  onTableUpdate,
  onTableMove,
  onTableAdd,
  onTableDelete,
  className,
  readonly = false,
}: TableLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: 'table-layout',
  });

  // Handle mouse wheel zoom
  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prevZoom) =>
        Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom + delta)),
      );
    }
  }, []);

  // Handle pan start
  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button === 1 || (event.button === 0 && event.altKey)) {
        // Middle click or Alt+left click
        event.preventDefault();
        setIsDragging(true);
        setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
      }
    },
    [pan],
  );

  // Handle pan move
  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (isDragging) {
        setPan({
          x: event.clientX - dragStart.x,
          y: event.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart],
  );

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle canvas click for adding tables
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent) => {
      if (readonly || selectedTable || isDragging) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (event.clientX - rect.left - pan.x) / zoom;
      const y = (event.clientY - rect.top - pan.y) / zoom;

      // Snap to grid
      const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;

      onTableAdd({ x: snappedX, y: snappedY });
    },
    [readonly, selectedTable, isDragging, pan, zoom, onTableAdd],
  );

  // Zoom controls
  const zoomIn = useCallback(() => {
    setZoom((prevZoom) => Math.min(MAX_ZOOM, prevZoom + 0.25));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prevZoom) => Math.max(MIN_ZOOM, prevZoom - 0.25));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setPan({ x: 0, y: 0 });
  }, []);

  // Get guests for a specific table
  const getTableGuests = useCallback(
    (tableId: string) => {
      return guests.filter((guest) => guest.assignedTableId === tableId);
    },
    [guests],
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key) {
        case '+':
        case '=':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            zoomIn();
          }
          break;
        case '-':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            zoomOut();
          }
          break;
        case '0':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            resetZoom();
          }
          break;
        case 'g':
          if (!event.ctrlKey && !event.metaKey) {
            setShowGrid((prev) => !prev);
          }
          break;
        case 'Escape':
          setSelectedTable(null);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom]);

  // Grid pattern SVG
  const gridPattern = (
    <defs>
      <pattern
        id="grid"
        width={GRID_SIZE * zoom}
        height={GRID_SIZE * zoom}
        patternUnits="userSpaceOnUse"
        patternTransform={`translate(${pan.x % (GRID_SIZE * zoom)}, ${pan.y % (GRID_SIZE * zoom)})`}
      >
        <path
          d={`M ${GRID_SIZE * zoom} 0 L 0 0 0 ${GRID_SIZE * zoom}`}
          fill="none"
          stroke="rgba(148, 163, 184, 0.2)"
          strokeWidth="1"
        />
      </pattern>
    </defs>
  );

  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden bg-slate-50',
        className,
      )}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <div className="flex items-center gap-1 bg-white rounded-lg shadow-sm border p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 bg-white rounded-lg shadow-sm border p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetZoom}
            className="h-8 w-8 p-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant={showGrid ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
            className="h-8 w-8 p-0"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Zoom level indicator */}
      <div className="absolute bottom-4 right-4 z-20 bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-slate-600">
        Zoom: {Math.round(zoom * 100)}%
      </div>

      {/* Main canvas */}
      <div
        ref={(node) => {
          containerRef.current = node;
          setNodeRef(node);
        }}
        className={cn(
          'w-full h-full cursor-default',
          isDragging && 'cursor-grabbing',
          isOver && 'bg-blue-50',
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        {/* SVG overlay for grid */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ display: showGrid ? 'block' : 'none' }}
        >
          {gridPattern}
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Tables */}
        <div
          className="relative w-full h-full"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: '0 0',
          }}
        >
          {tables.map((table) => {
            const tableGuests = getTableGuests(table.id);
            return (
              <TableCard
                key={table.id}
                table={table}
                guests={tableGuests}
                isSelected={selectedTable === table.id}
                onUpdate={(updates) => onTableUpdate(table.id, updates)}
                onMove={(position) => onTableMove(table.id, position)}
                onSelect={() => setSelectedTable(table.id)}
                onDelete={() => onTableDelete(table.id)}
                readonly={readonly}
                gridSize={GRID_SIZE}
                style={{
                  position: 'absolute',
                  left: table.position.x,
                  top: table.position.y,
                }}
              />
            );
          })}
        </div>

        {/* Drop zone indicator */}
        {isOver && !readonly && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 pointer-events-none" />
        )}
      </div>

      {/* Instructions */}
      {!readonly && (
        <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-xs text-slate-600">
          <div className="space-y-1">
            <div>Click empty space to add table</div>
            <div>Alt+drag or middle-click+drag to pan</div>
            <div>Ctrl+scroll to zoom</div>
            <div>Press 'G' to toggle grid</div>
            <div>Press Escape to deselect</div>
          </div>
        </div>
      )}
    </div>
  );
}
