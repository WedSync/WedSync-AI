'use client';

import React, { memo, useMemo, useCallback, useState, useRef } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import { usePerformanceMonitor } from '@/hooks/usePerformanceOptimization';

// Generic interfaces for flexible data grid usage
export interface DataGridColumn<T = any> {
  id: string;
  label: string;
  width: number;
  sortable?: boolean;
  sortField?: keyof T;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, columnId: string) => React.ReactNode;
  className?: string;
}

export interface DataGridSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DataGridProps<T = any> {
  data: T[];
  columns: DataGridColumn<T>[];
  selectedItems: Set<string>;
  onItemSelect: (itemId: string) => void;
  onSort?: (sort: DataGridSort) => void;
  sort?: DataGridSort;
  getItemId: (item: T) => string;
  height?: number;
  rowHeight?: number;
  headerHeight?: number;
  loading?: boolean;
  onLoadMore?: () => void;
  enableBulkSelection?: boolean;
  enableVirtualization?: boolean;
  overscanCount?: number;
  className?: string;
  emptyStateMessage?: string;
}

// Memoized cell component for maximum performance
const MemoizedCell = memo<{
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    items: any[];
    columns: DataGridColumn[];
    selectedItems: Set<string>;
    onItemSelect: (itemId: string) => void;
    getItemId: (item: any) => string;
    headerHeight: number;
  };
}>(
  ({ columnIndex, rowIndex, style, data }) => {
    const {
      items,
      columns,
      selectedItems,
      onItemSelect,
      getItemId,
      headerHeight,
    } = data;

    // Header row
    if (rowIndex === 0) {
      const column = columns[columnIndex];
      if (!column) return null;

      return (
        <div
          style={{
            ...style,
            height: headerHeight,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            borderRight:
              columnIndex < columns.length - 1 ? '1px solid #e5e7eb' : 'none',
            fontWeight: 600,
            fontSize: '12px',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '0 12px',
          }}
        >
          {column.label}
        </div>
      );
    }

    // Data rows
    const item = items[rowIndex - 1];
    const column = columns[columnIndex];

    if (!item || !column) return null;

    const itemId = getItemId(item);
    const isSelected = selectedItems.has(itemId);

    // Special handling for selection column
    if (column.id === '__selection__') {
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isSelected ? '#fef3f2' : 'white',
            borderBottom: '1px solid #f3f4f6',
            borderRight: '1px solid #e5e7eb',
          }}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onItemSelect(itemId)}
            aria-label={`Select item ${itemId}`}
          />
        </div>
      );
    }

    // Regular data cells
    const value = item[column.sortField || column.id];
    const cellContent = column.render
      ? column.render(value, item, column.id)
      : String(value || '');

    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          backgroundColor: isSelected ? '#fef3f2' : 'white',
          borderBottom: '1px solid #f3f4f6',
          borderRight:
            columnIndex < columns.length - 1 ? '1px solid #e5e7eb' : 'none',
          justifyContent:
            column.align === 'center'
              ? 'center'
              : column.align === 'right'
                ? 'flex-end'
                : 'flex-start',
          // Performance optimizations
          contain: 'layout style paint',
          willChange: 'auto',
        }}
        className={column.className}
      >
        {cellContent}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for optimal memoization
    return (
      prevProps.columnIndex === nextProps.columnIndex &&
      prevProps.rowIndex === nextProps.rowIndex &&
      JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style) &&
      prevProps.data.items === nextProps.data.items &&
      prevProps.data.columns === nextProps.data.columns &&
      prevProps.data.selectedItems === nextProps.data.selectedItems
    );
  },
);

MemoizedCell.displayName = 'MemoizedCell';

// Memoized header component
const MemoizedHeader = memo<{
  columns: DataGridColumn[];
  sort?: DataGridSort;
  onSort?: (sort: DataGridSort) => void;
  selectedItems: Set<string>;
  allItems: any[];
  onBulkSelect: (selectAll: boolean) => void;
  enableBulkSelection: boolean;
}>(
  ({
    columns,
    sort,
    onSort,
    selectedItems,
    allItems,
    onBulkSelect,
    enableBulkSelection,
  }) => {
    const isAllSelected =
      allItems.length > 0 &&
      allItems.every((item) =>
        selectedItems.has(String(item.id || item.uuid || item.key)),
      );
    const isPartiallySelected =
      allItems.some((item) =>
        selectedItems.has(String(item.id || item.uuid || item.key)),
      ) && !isAllSelected;

    const handleSort = useCallback(
      (field: string) => {
        if (!onSort) return;

        if (sort?.field === field) {
          onSort({
            field,
            direction: sort.direction === 'asc' ? 'desc' : 'asc',
          });
        } else {
          onSort({ field, direction: 'asc' });
        }
      },
      [sort, onSort],
    );

    const renderSortIcon = (field: string) => {
      if (sort?.field !== field) return null;
      return sort.direction === 'asc' ? (
        <ChevronUpIcon className="w-4 h-4 ml-1" />
      ) : (
        <ChevronDownIcon className="w-4 h-4 ml-1" />
      );
    };

    return (
      <div className="bg-gray-50 border-b border-gray-200 flex items-center sticky top-0 z-10">
        {enableBulkSelection && (
          <div className="w-12 px-4 py-3 flex items-center justify-center border-r border-gray-200">
            <Checkbox
              checked={isAllSelected}
              indeterminate={isPartiallySelected}
              onCheckedChange={onBulkSelect}
              aria-label="Select all items"
            />
          </div>
        )}

        {columns.map((column, index) => (
          <div
            key={column.id}
            className={cn(
              'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center',
              column.sortable
                ? 'cursor-pointer hover:bg-gray-100 select-none'
                : '',
              index < columns.length - 1 ? 'border-r border-gray-200' : '',
            )}
            style={{ width: column.width }}
            onClick={
              column.sortable
                ? () => handleSort(column.sortField || column.id)
                : undefined
            }
          >
            {column.label}
            {column.sortable && renderSortIcon(column.sortField || column.id)}
          </div>
        ))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.columns === nextProps.columns &&
      prevProps.sort === nextProps.sort &&
      prevProps.selectedItems.size === nextProps.selectedItems.size &&
      prevProps.allItems.length === nextProps.allItems.length &&
      prevProps.enableBulkSelection === nextProps.enableBulkSelection
    );
  },
);

MemoizedHeader.displayName = 'MemoizedHeader';

// Main memoized data grid component
export const MemoizedDataGrid = memo<DataGridProps>(
  ({
    data,
    columns,
    selectedItems,
    onItemSelect,
    onSort,
    sort,
    getItemId,
    height = 400,
    rowHeight = 48,
    headerHeight = 44,
    loading = false,
    onLoadMore,
    enableBulkSelection = true,
    enableVirtualization = true,
    overscanCount = 5,
    className,
    emptyStateMessage = 'No data available',
  }) => {
    const gridRef = useRef<Grid>(null);
    const { recordMetric } = usePerformanceMonitor();

    // Add selection column if bulk selection is enabled
    const finalColumns = useMemo(() => {
      const cols = [...columns];
      if (enableBulkSelection) {
        cols.unshift({
          id: '__selection__',
          label: '',
          width: 48,
          sortable: false,
        });
      }
      return cols;
    }, [columns, enableBulkSelection]);

    // Calculate total width for horizontal scrolling
    const totalWidth = useMemo(() => {
      return finalColumns.reduce((sum, col) => sum + col.width, 0);
    }, [finalColumns]);

    // Bulk selection handler
    const handleBulkSelect = useCallback(
      (selectAll: boolean) => {
        const startTime = performance.now();

        if (selectAll) {
          data.forEach((item) => {
            const itemId = getItemId(item);
            if (!selectedItems.has(itemId)) {
              onItemSelect(itemId);
            }
          });
        } else {
          data.forEach((item) => {
            const itemId = getItemId(item);
            if (selectedItems.has(itemId)) {
              onItemSelect(itemId);
            }
          });
        }

        const endTime = performance.now();
        recordMetric('data_grid_bulk_select', endTime - startTime);
      },
      [data, selectedItems, onItemSelect, getItemId, recordMetric],
    );

    // Grid data for virtualized rendering
    const gridData = useMemo(
      () => ({
        items: data,
        columns: finalColumns,
        selectedItems,
        onItemSelect,
        getItemId,
        headerHeight,
      }),
      [
        data,
        finalColumns,
        selectedItems,
        onItemSelect,
        getItemId,
        headerHeight,
      ],
    );

    // Performance monitoring
    React.useEffect(() => {
      recordMetric('data_grid_items', data.length);
      recordMetric('data_grid_selected', selectedItems.size);
      recordMetric('data_grid_columns', finalColumns.length);
    }, [data.length, selectedItems.size, finalColumns.length, recordMetric]);

    // Empty state
    if (data.length === 0 && !loading) {
      return (
        <div
          className={cn(
            'bg-white rounded-lg border border-gray-200 p-8 text-center',
            className,
          )}
        >
          <p className="text-gray-500">{emptyStateMessage}</p>
        </div>
      );
    }

    // Non-virtualized rendering for small datasets
    if (!enableVirtualization || data.length < 50) {
      return (
        <div
          className={cn(
            'bg-white rounded-lg border border-gray-200 overflow-hidden',
            className,
          )}
        >
          <MemoizedHeader
            columns={finalColumns.slice(enableBulkSelection ? 1 : 0)}
            sort={sort}
            onSort={onSort}
            selectedItems={selectedItems}
            allItems={data}
            onBulkSelect={handleBulkSelect}
            enableBulkSelection={enableBulkSelection}
          />

          <div className="overflow-auto" style={{ maxHeight: height }}>
            {data.map((item, rowIndex) => (
              <div
                key={getItemId(item)}
                className="flex border-b border-gray-100 last:border-b-0"
              >
                {finalColumns.map((column, columnIndex) => (
                  <MemoizedCell
                    key={`${columnIndex}-${rowIndex}`}
                    columnIndex={columnIndex}
                    rowIndex={rowIndex + 1}
                    style={{
                      width: column.width,
                      height: rowHeight,
                      minWidth: column.width,
                    }}
                    data={gridData}
                  />
                ))}
              </div>
            ))}
          </div>

          {onLoadMore && !loading && (
            <div className="px-6 py-4 border-t border-gray-200 text-center">
              <Button variant="outline" onClick={onLoadMore}>
                Load More
              </Button>
            </div>
          )}

          {loading && (
            <div className="px-6 py-4 border-t border-gray-200 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          )}
        </div>
      );
    }

    // Virtualized rendering for large datasets
    return (
      <div
        className={cn(
          'bg-white rounded-lg border border-gray-200 overflow-hidden',
          className,
        )}
      >
        <Grid
          ref={gridRef}
          columnCount={finalColumns.length}
          rowCount={data.length + 1} // +1 for header row
          columnWidth={(index) => finalColumns[index]?.width || 100}
          rowHeight={(index) => (index === 0 ? headerHeight : rowHeight)}
          height={height}
          width={Math.min(totalWidth, 800)} // Max width to prevent horizontal overflow
          overscanRowCount={overscanCount}
          overscanColumnCount={1}
          itemData={gridData}
        >
          {MemoizedCell}
        </Grid>

        {onLoadMore && !loading && (
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <Button variant="outline" onClick={onLoadMore}>
              Load More
            </Button>
          </div>
        )}

        {loading && (
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading data...</p>
          </div>
        )}

        {/* Performance Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500">
            Items: {data.length} | Selected: {selectedItems.size} | Columns:{' '}
            {finalColumns.length} | Virtualized:{' '}
            {enableVirtualization ? 'Yes' : 'No'}
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Deep comparison for memoization
    return (
      prevProps.data === nextProps.data &&
      prevProps.columns === nextProps.columns &&
      prevProps.selectedItems === nextProps.selectedItems &&
      prevProps.sort === nextProps.sort &&
      prevProps.loading === nextProps.loading &&
      prevProps.height === nextProps.height &&
      prevProps.rowHeight === nextProps.rowHeight &&
      prevProps.enableBulkSelection === nextProps.enableBulkSelection &&
      prevProps.enableVirtualization === nextProps.enableVirtualization
    );
  },
);

MemoizedDataGrid.displayName = 'MemoizedDataGrid';
