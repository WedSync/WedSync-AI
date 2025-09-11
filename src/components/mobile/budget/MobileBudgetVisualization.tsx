'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BudgetData {
  categories: Array<{
    name: string;
    value: number;
    color: string;
    percentage: number;
  }>;
  total: number;
}

interface MobileBudgetVisualizationProps {
  budgetData: BudgetData;
  chartType: 'pie' | 'bar' | 'progress';
  compactMode: boolean;
  touchInteractive: boolean;
}

interface TouchState {
  isDragging: boolean;
  startX: number;
  startY: number;
  scale: number;
  translateX: number;
  translateY: number;
}

export function MobileBudgetVisualization({
  budgetData,
  chartType: initialChartType,
  compactMode,
  touchInteractive,
}: MobileBudgetVisualizationProps) {
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'progress'>(
    initialChartType,
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [touchState, setTouchState] = useState<TouchState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  // Haptic feedback
  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if (!touchInteractive || !('vibrate' in navigator)) return;

      const patterns = {
        light: 10,
        medium: 20,
        heavy: 50,
      };
      navigator.vibrate(patterns[type]);
    },
    [touchInteractive],
  );

  // Generate pie chart path
  const generatePieSlice = useCallback(
    (
      centerX: number,
      centerY: number,
      radius: number,
      startAngle: number,
      endAngle: number,
      innerRadius = 0,
    ) => {
      const startAngleRad = (startAngle - 90) * (Math.PI / 180);
      const endAngleRad = (endAngle - 90) * (Math.PI / 180);

      const x1 = centerX + radius * Math.cos(startAngleRad);
      const y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad);
      const y2 = centerY + radius * Math.sin(endAngleRad);

      const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

      if (innerRadius > 0) {
        // Donut chart
        const x3 = centerX + innerRadius * Math.cos(endAngleRad);
        const y3 = centerY + innerRadius * Math.sin(endAngleRad);
        const x4 = centerX + innerRadius * Math.cos(startAngleRad);
        const y4 = centerY + innerRadius * Math.sin(startAngleRad);

        return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
      } else {
        // Pie chart
        return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      }
    },
    [],
  );

  // Calculate pie chart segments
  const pieSegments = useMemo(() => {
    let currentAngle = 0;
    return budgetData.categories.map((category) => {
      const angle = (category.value / budgetData.total) * 360;
      const segment = {
        ...category,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        angle,
      };
      currentAngle += angle;
      return segment;
    });
  }, [budgetData]);

  // Touch handlers for zoom and pan
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!touchInteractive) return;

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        setTouchState((prev) => ({
          ...prev,
          isDragging: true,
          startX: touch.clientX - prev.translateX,
          startY: touch.clientY - prev.translateY,
        }));
      }
    },
    [touchInteractive],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchState.isDragging || !touchInteractive) return;

      e.preventDefault();

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        setTouchState((prev) => ({
          ...prev,
          translateX: touch.clientX - prev.startX,
          translateY: touch.clientY - prev.startY,
        }));
      }
    },
    [touchState.isDragging, touchInteractive],
  );

  const handleTouchEnd = useCallback(() => {
    setTouchState((prev) => ({
      ...prev,
      isDragging: false,
    }));
  }, []);

  // Handle category selection
  const handleCategoryClick = useCallback(
    (categoryName: string) => {
      setSelectedCategory(
        selectedCategory === categoryName ? null : categoryName,
      );
      triggerHaptic('light');
    },
    [selectedCategory, triggerHaptic],
  );

  // Chart type switcher
  const ChartTypeSwitcher = () => (
    <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
      {(['pie', 'bar', 'progress'] as const).map((type) => (
        <button
          key={type}
          onClick={() => {
            setChartType(type);
            triggerHaptic('light');
          }}
          className={cn(
            'flex-1 py-2 px-3 rounded-md text-sm font-medium capitalize transition-all',
            chartType === type
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900',
          )}
        >
          {type === 'pie' && '🥧'}
          {type === 'bar' && '📊'}
          {type === 'progress' && '📈'}
          <span className="ml-1">{type}</span>
        </button>
      ))}
    </div>
  );

  // Pie Chart Component
  const PieChart = () => {
    const size = compactMode ? 280 : 320;
    const radius = compactMode ? 100 : 120;
    const innerRadius = compactMode ? 40 : 50;
    const centerX = size / 2;
    const centerY = size / 2;

    return (
      <div className="relative flex items-center justify-center">
        <motion.svg
          ref={svgRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translate(${touchState.translateX}px, ${touchState.translateY}px) scale(${touchState.scale})`,
          }}
        >
          {pieSegments.map((segment, index) => (
            <motion.path
              key={segment.name}
              d={generatePieSlice(
                centerX,
                centerY,
                radius,
                segment.startAngle,
                segment.endAngle,
                innerRadius,
              )}
              fill={segment.color}
              stroke="white"
              strokeWidth={2}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity:
                  selectedCategory === null || selectedCategory === segment.name
                    ? 1
                    : 0.3,
                scale: selectedCategory === segment.name ? 1.05 : 1,
              }}
              transition={{
                delay: index * 0.1,
                duration: 0.5,
                type: 'spring',
                stiffness: 200,
              }}
              className="cursor-pointer"
              onClick={() => handleCategoryClick(segment.name)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            />
          ))}

          {/* Center Text */}
          <text
            x={centerX}
            y={centerY - 10}
            textAnchor="middle"
            className="text-lg font-bold fill-gray-900"
          >
            {formatCurrency(budgetData.total)}
          </text>
          <text
            x={centerX}
            y={centerY + 10}
            textAnchor="middle"
            className="text-xs fill-gray-500"
          >
            Total Spent
          </text>
        </motion.svg>

        {/* Interactive labels */}
        {!compactMode && (
          <div className="absolute inset-0 pointer-events-none">
            {pieSegments.map((segment) => {
              const angle = segment.startAngle + segment.angle / 2;
              const labelRadius = radius + 30;
              const x =
                centerX +
                labelRadius * Math.cos((angle - 90) * (Math.PI / 180));
              const y =
                centerY +
                labelRadius * Math.sin((angle - 90) * (Math.PI / 180));

              return (
                <motion.div
                  key={segment.name}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 text-center"
                  style={{ left: x, top: y }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: segment.percentage > 5 ? 1 : 0,
                    scale: 1,
                  }}
                  transition={{ delay: segment.startAngle / 360 }}
                >
                  <div className="text-xs font-medium text-gray-900">
                    {Math.round(segment.percentage)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {segment.name}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Bar Chart Component
  const BarChart = () => {
    const maxValue = Math.max(...budgetData.categories.map((c) => c.value));

    return (
      <div className="space-y-3">
        {budgetData.categories.map((category, index) => (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'bg-white rounded-lg p-4 border-2 transition-all cursor-pointer',
              selectedCategory === category.name
                ? 'border-blue-300 shadow-lg'
                : 'border-gray-200',
            )}
            onClick={() => handleCategoryClick(category.name)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="font-medium text-gray-900">
                  {category.name}
                </span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  {formatCurrency(category.value)}
                </div>
                <div className="text-xs text-gray-500">
                  {category.percentage.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div
                  className="h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(category.value / maxValue) * 100}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // Progress Chart Component
  const ProgressChart = () => (
    <div className="space-y-4">
      {budgetData.categories.map((category, index) => (
        <motion.div
          key={category.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            'relative overflow-hidden rounded-xl p-4',
            selectedCategory === category.name ? 'ring-2 ring-blue-300' : '',
          )}
          style={{ backgroundColor: `${category.color}15` }}
          onClick={() => handleCategoryClick(category.name)}
        >
          {/* Background pattern */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `radial-gradient(circle, ${category.color} 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }}
          />

          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{category.name}</h3>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {category.percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">
                  {formatCurrency(category.value)}
                </div>
              </div>
            </div>

            {/* Circular progress indicator */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <svg
                  className="w-16 h-16 transform -rotate-90"
                  viewBox="0 0 64 64"
                >
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-gray-300"
                  />
                  <motion.circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    style={{ color: category.color }}
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                    animate={{
                      strokeDashoffset:
                        2 * Math.PI * 28 * (1 - category.percentage / 100),
                    }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-700">
                    {Math.round(category.percentage)}%
                  </span>
                </div>
              </div>

              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-1">
                  Share of total budget
                </div>
                <div className="w-full bg-white/50 rounded-full h-2">
                  <motion.div
                    className="h-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${category.percentage}%` }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Budget Breakdown
          </h2>
          <div className="text-sm text-gray-500">
            {budgetData.categories.length} categories
          </div>
        </div>

        <ChartTypeSwitcher />
      </div>

      {/* Instructions */}
      {touchInteractive && chartType === 'pie' && (
        <div className="bg-blue-50 border-b px-4 py-2">
          <p className="text-sm text-blue-800">
            Tap segments to highlight, pinch to zoom, drag to pan
          </p>
        </div>
      )}

      {/* Chart Content */}
      <div className="flex-1 overflow-y-auto p-4" ref={containerRef}>
        <AnimatePresence mode="wait">
          <motion.div
            key={chartType}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            {chartType === 'pie' && <PieChart />}
            {chartType === 'bar' && <BarChart />}
            {chartType === 'progress' && <ProgressChart />}
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        {!compactMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 bg-white rounded-xl p-4 shadow-sm"
          >
            <h3 className="font-medium text-gray-900 mb-3">
              Category Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {budgetData.categories.map((category) => (
                <div
                  key={category.name}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all',
                    selectedCategory === category.name
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50',
                  )}
                  onClick={() => handleCategoryClick(category.name)}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">
                      {category.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(category.value)} (
                      {category.percentage.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
