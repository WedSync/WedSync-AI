'use client';

// WS-211 Touch-Optimized Drag and Drop for Template Widgets
// Mobile-first drag and drop specifically for template building

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  GripVertical,
  Move3D,
  Eye,
  Settings,
  Plus,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Zap,
  TouchpadIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateWidget {
  id: string;
  type:
    | 'header'
    | 'stats'
    | 'form'
    | 'gallery'
    | 'timeline'
    | 'contact'
    | 'social'
    | 'custom';
  title: string;
  icon: React.ElementType;
  config: {
    width: number;
    height: number;
    backgroundColor?: string;
    textColor?: string;
    cornerRadius?: number;
    padding?: number;
    margin?: number;
    isLocked?: boolean;
  };
  content: any;
  position: { row: number; col: number };
  size: { width: number; height: number };
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface DragState {
  isDragging: boolean;
  dragWidget: TemplateWidget | null;
  startPosition: TouchPoint | null;
  currentPosition: TouchPoint | null;
  dropPosition: { row: number; col: number } | null;
  offset: { x: number; y: number };
  originalPosition: { row: number; col: number } | null;
}

interface GridCell {
  row: number;
  col: number;
  isOccupied: boolean;
  widget?: TemplateWidget;
  isDropTarget: boolean;
  isValid: boolean;
}

interface TouchDragDropProps {
  widgets: TemplateWidget[];
  gridColumns: number;
  gridRows: number;
  cellWidth: number;
  cellHeight: number;
  onWidgetMove?: (
    widgetId: string,
    newPosition: { row: number; col: number },
  ) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetDuplicate?: (widget: TemplateWidget) => void;
  onWidgetConfigure?: (widget: TemplateWidget) => void;
  className?: string;
  disabled?: boolean;
  showGrid?: boolean;
  snapToGrid?: boolean;
  multiSelect?: boolean;
}

export function TouchDragDrop({
  widgets,
  gridColumns,
  gridRows,
  cellWidth,
  cellHeight,
  onWidgetMove,
  onWidgetRemove,
  onWidgetDuplicate,
  onWidgetConfigure,
  className,
  disabled = false,
  showGrid = true,
  snapToGrid = true,
  multiSelect = false,
}: TouchDragDropProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragWidget: null,
    startPosition: null,
    currentPosition: null,
    dropPosition: null,
    offset: { x: 0, y: 0 },
    originalPosition: null,
  });

  const [selectedWidgets, setSelectedWidgets] = useState<Set<string>>(
    new Set(),
  );
  const [hoveredWidget, setHoveredWidget] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  // Generate grid cells
  const gridCells: GridCell[][] = Array.from({ length: gridRows }, (_, row) =>
    Array.from({ length: gridColumns }, (_, col) => {
      const widget = widgets.find(
        (w) => w.position.row === row && w.position.col === col,
      );
      return {
        row,
        col,
        isOccupied: !!widget,
        widget,
        isDropTarget:
          dragState.dropPosition?.row === row &&
          dragState.dropPosition?.col === col,
        isValid: !widget || widget.id === dragState.dragWidget?.id,
      };
    }),
  );

  // Handle touch start for widget dragging
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, widget: TemplateWidget) => {
      if (disabled || widget.config.isLocked) return;

      e.preventDefault();
      e.stopPropagation();

      const touch = e.touches[0];
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }

      setDragState({
        isDragging: true,
        dragWidget: widget,
        startPosition: {
          x: touch.clientX,
          y: touch.clientY,
          timestamp: Date.now(),
        },
        currentPosition: {
          x: touch.clientX,
          y: touch.clientY,
          timestamp: Date.now(),
        },
        dropPosition: null,
        offset: {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        },
        originalPosition: {
          row: widget.position.row,
          col: widget.position.col,
        },
      });

      // Select widget for multi-select
      if (multiSelect) {
        setSelectedWidgets((prev) => new Set([...prev, widget.id]));
      }
    },
    [disabled, multiSelect],
  );

  // Handle touch move during drag
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragState.isDragging || !dragState.dragWidget || disabled) return;

      e.preventDefault();
      const touch = e.touches[0];

      setDragState((prev) => ({
        ...prev,
        currentPosition: {
          x: touch.clientX,
          y: touch.clientY,
          timestamp: Date.now(),
        },
      }));

      // Calculate drop position based on grid
      if (canvasRef.current && snapToGrid) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        const col = Math.floor(x / cellWidth);
        const row = Math.floor(y / cellHeight);

        if (col >= 0 && col < gridColumns && row >= 0 && row < gridRows) {
          // Check if position is valid (not occupied by another widget)
          const isValidPosition = !widgets.some(
            (w) =>
              w.position.row === row &&
              w.position.col === col &&
              w.id !== dragState.dragWidget!.id,
          );

          if (isValidPosition) {
            setDragState((prev) => ({
              ...prev,
              dropPosition: { row, col },
            }));
          }
        }
      }
    },
    [
      dragState.isDragging,
      dragState.dragWidget,
      disabled,
      snapToGrid,
      cellWidth,
      cellHeight,
      gridColumns,
      gridRows,
      widgets,
    ],
  );

  // Handle touch end to complete drag
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!dragState.isDragging || !dragState.dragWidget || disabled) return;

      e.preventDefault();

      const dragDuration =
        Date.now() - (dragState.startPosition?.timestamp || 0);
      const dragDistance =
        dragState.startPosition && dragState.currentPosition
          ? Math.sqrt(
              Math.pow(
                dragState.currentPosition.x - dragState.startPosition.x,
                2,
              ) +
                Math.pow(
                  dragState.currentPosition.y - dragState.startPosition.y,
                  2,
                ),
            )
          : 0;

      // If it's a quick tap or short drag, treat as selection
      if (dragDuration < 200 || dragDistance < 10) {
        if (multiSelect) {
          setSelectedWidgets((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(dragState.dragWidget!.id)) {
              newSet.delete(dragState.dragWidget!.id);
            } else {
              newSet.add(dragState.dragWidget!.id);
            }
            return newSet;
          });
        }
      } else if (dragState.dropPosition && onWidgetMove) {
        // Valid drop - move widget
        onWidgetMove(dragState.dragWidget.id, dragState.dropPosition);

        // Haptic feedback for successful drop
        if ('vibrate' in navigator) {
          navigator.vibrate([20, 10, 20]);
        }
      }

      setDragState({
        isDragging: false,
        dragWidget: null,
        startPosition: null,
        currentPosition: null,
        dropPosition: null,
        offset: { x: 0, y: 0 },
        originalPosition: null,
      });
    },
    [dragState, disabled, multiSelect, onWidgetMove],
  );

  // Handle widget actions
  const handleRemoveWidget = (widget: TemplateWidget, e: React.MouseEvent) => {
    e.stopPropagation();
    onWidgetRemove?.(widget.id);
  };

  const handleDuplicateWidget = (
    widget: TemplateWidget,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    onWidgetDuplicate?.(widget);
  };

  const handleConfigureWidget = (
    widget: TemplateWidget,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    onWidgetConfigure?.(widget);
  };

  // Clear selection on canvas click
  const handleCanvasClick = () => {
    if (multiSelect) {
      setSelectedWidgets(new Set());
    }
  };

  return (
    <div className={cn('relative touch-none select-none', className)}>
      {/* Main Grid Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full h-full"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, ${cellWidth}px)`,
          gridTemplateRows: `repeat(${gridRows}, ${cellHeight}px)`,
          gap: '8px',
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCanvasClick}
      >
        {/* Grid Background */}
        {showGrid &&
          gridCells.flat().map((cell, index) => (
            <div
              key={`grid-${cell.row}-${cell.col}`}
              className={cn(
                'border border-dashed border-gray-200 rounded-lg transition-all duration-200',
                cell.isDropTarget &&
                  cell.isValid &&
                  'border-blue-400 bg-blue-50 shadow-sm',
                cell.isDropTarget &&
                  !cell.isValid &&
                  'border-red-400 bg-red-50',
                cell.isOccupied && 'border-transparent',
              )}
              style={{
                gridColumn: cell.col + 1,
                gridRow: cell.row + 1,
              }}
            />
          ))}

        {/* Widget Elements */}
        {widgets.map((widget) => {
          const isSelected = selectedWidgets.has(widget.id);
          const isDragging = dragState.dragWidget?.id === widget.id;
          const isHovered = hoveredWidget === widget.id;

          return (
            <div
              key={widget.id}
              className={cn(
                'relative group rounded-lg shadow-sm border transition-all duration-200 overflow-hidden cursor-move',
                'hover:shadow-md hover:scale-[1.02] active:scale-95',
                isDragging && 'opacity-50 scale-95',
                isSelected && 'ring-2 ring-blue-400 shadow-lg',
                widget.config.isLocked && 'cursor-not-allowed opacity-75',
                'min-w-[48px] min-h-[48px]', // Ensure minimum touch target
              )}
              style={{
                gridColumn: `${widget.position.col + 1} / span ${widget.size.width}`,
                gridRow: `${widget.position.row + 1} / span ${widget.size.height}`,
                backgroundColor: widget.config.backgroundColor || '#ffffff',
                color: widget.config.textColor || '#1e293b',
                borderRadius: `${widget.config.cornerRadius || 8}px`,
                padding: `${widget.config.padding || 12}px`,
                margin: `${widget.config.margin || 0}px`,
              }}
              onTouchStart={(e) => handleTouchStart(e, widget)}
              onMouseEnter={() => setHoveredWidget(widget.id)}
              onMouseLeave={() => setHoveredWidget(null)}
            >
              {/* Widget Content */}
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <widget.icon className="h-4 w-4 flex-shrink-0" />
                    {widget.config.isLocked && (
                      <Lock className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <GripVertical className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                <div className="flex-1 min-h-0">
                  <p className="text-sm font-medium mb-1 truncate">
                    {widget.title}
                  </p>
                  <p className="text-xs opacity-70 truncate">{widget.type}</p>
                </div>
              </div>

              {/* Widget Actions Overlay */}
              <div
                className={cn(
                  'absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-md shadow-lg border p-1',
                  isHovered && 'opacity-100',
                )}
              >
                {!widget.config.isLocked && (
                  <>
                    <button
                      onClick={(e) => handleConfigureWidget(widget, e)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors min-w-[24px] min-h-[24px]"
                      title="Configure"
                    >
                      <Settings className="h-3 w-3 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => handleDuplicateWidget(widget, e)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors min-w-[24px] min-h-[24px]"
                      title="Duplicate"
                    >
                      <Copy className="h-3 w-3 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => handleRemoveWidget(widget, e)}
                      className="p-1 hover:bg-red-100 rounded transition-colors min-w-[24px] min-h-[24px]"
                      title="Remove"
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </button>
                  </>
                )}
              </div>

              {/* Multi-select indicator */}
              {isSelected && (
                <div className="absolute top-1 left-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          );
        })}

        {/* Drag Preview */}
        {dragState.isDragging &&
          dragState.dragWidget &&
          dragState.currentPosition && (
            <div
              ref={dragPreviewRef}
              className="fixed pointer-events-none z-50 bg-white shadow-xl rounded-lg border border-blue-400 opacity-90 transform -rotate-3"
              style={{
                left: dragState.currentPosition.x - dragState.offset.x,
                top: dragState.currentPosition.y - dragState.offset.y,
                width: cellWidth,
                height: cellHeight,
                padding: '8px',
              }}
            >
              <div className="flex items-center gap-2 h-full">
                <dragState.dragWidget.icon className="h-4 w-4 text-gray-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {dragState.dragWidget.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {dragState.dragWidget.type}
                  </p>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Multi-select Actions Bar */}
      {multiSelect && selectedWidgets.size > 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg border p-2 flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {selectedWidgets.size} selected
          </span>
          <div className="w-px h-4 bg-gray-300" />
          <button
            onClick={() => {
              selectedWidgets.forEach((id) => onWidgetRemove?.(id));
              setSelectedWidgets(new Set());
            }}
            className="p-2 hover:bg-red-100 rounded transition-colors text-red-600"
            title="Remove selected"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSelectedWidgets(new Set())}
            className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-600"
            title="Clear selection"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

export default TouchDragDrop;
