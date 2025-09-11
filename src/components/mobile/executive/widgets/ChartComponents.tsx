'use client';

import React, { useRef, useEffect } from 'react';

interface ChartData {
  labels: string[];
  values: number[];
}

interface BaseChartProps {
  data: ChartData;
  height?: number;
  color?: string;
  gradient?: boolean;
}

// Lightweight Line Chart Component
export function LineChart({
  data,
  height = 100,
  color = '#3b82f6',
  gradient = false,
}: BaseChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.values.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // For retina displays
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calculate dimensions
    const padding = 10;
    const chartWidth = rect.width - 2 * padding;
    const chartHeight = rect.height - 2 * padding;

    // Calculate data ranges
    const maxValue = Math.max(...data.values);
    const minValue = Math.min(...data.values);
    const valueRange = maxValue - minValue || 1;

    // Create gradient if requested
    if (gradient) {
      const lineGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
      lineGradient.addColorStop(0, color);
      lineGradient.addColorStop(1, color + '40');
      ctx.strokeStyle = lineGradient;
      ctx.fillStyle = lineGradient;
    } else {
      ctx.strokeStyle = color;
    }

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw the line
    ctx.beginPath();
    data.values.forEach((value, index) => {
      const x = padding + (index / (data.values.length - 1)) * chartWidth;
      const y =
        padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Fill area under curve if gradient
    if (gradient) {
      ctx.lineTo(padding + chartWidth, padding + chartHeight);
      ctx.lineTo(padding, padding + chartHeight);
      ctx.closePath();
      ctx.globalAlpha = 0.3;
      ctx.fill();
    }
  }, [data, height, color, gradient]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: `${height}px` }}
    />
  );
}

// Donut Chart Component
export function DonutChart({
  data,
  height = 100,
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
}: BaseChartProps & { colors?: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.values.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calculate total
    const total = data.values.reduce((sum, value) => sum + value, 0);
    if (total === 0) return;

    // Draw donut
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const innerRadius = radius * 0.6;

    let currentAngle = -Math.PI / 2; // Start from top

    data.values.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI;
      const color = colors[index % colors.length];

      // Draw outer arc
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        radius,
        currentAngle,
        currentAngle + sliceAngle,
      );
      ctx.arc(
        centerX,
        centerY,
        innerRadius,
        currentAngle + sliceAngle,
        currentAngle,
        true,
      );
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      currentAngle += sliceAngle;
    });
  }, [data, height, colors]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: `${height}px` }}
    />
  );
}

// Bar Chart Component
export function BarChart({
  data,
  height = 100,
  color = '#3b82f6',
}: BaseChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.values.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calculate dimensions
    const padding = 10;
    const chartWidth = rect.width - 2 * padding;
    const chartHeight = rect.height - 2 * padding;
    const barWidth = (chartWidth / data.values.length) * 0.8;
    const barSpacing = (chartWidth / data.values.length) * 0.2;

    // Calculate data range
    const maxValue = Math.max(...data.values);

    // Draw bars
    data.values.forEach((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
      const y = padding + chartHeight - barHeight;

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }, [data, height, color]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: `${height}px` }}
    />
  );
}

// Gauge Chart Component
export function GaugeChart({
  value,
  max = 100,
  height = 100,
  color = '#3b82f6',
  label = '',
}: {
  value: number;
  max?: number;
  height?: number;
  color?: string;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 0, false);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value arc
    const percentage = Math.min(value / max, 1);
    const endAngle = Math.PI + percentage * Math.PI;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, endAngle, false);
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();
  }, [value, max, height, color]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: `${height}px` }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold text-white">{value}</div>
          {label && <div className="text-xs text-white/80">{label}</div>}
        </div>
      </div>
    </div>
  );
}

// Progress Ring Component
export function ProgressRing({
  percentage,
  size = 40,
  strokeWidth = 4,
  color = '#3b82f6',
  backgroundColor = '#e5e7eb',
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-block">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.3s ease-in-out',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-white">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}
