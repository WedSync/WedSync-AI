'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface CircularProgressProps {
  percentage: number;
  size: number;
  strokeWidth: number;
  color: string;
  children?: ReactNode;
  className?: string;
}

export function CircularProgress({
  percentage,
  size,
  strokeWidth,
  color,
  children,
  className = '',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{
            duration: 1.5,
            ease: 'easeInOut',
            delay: 0.5,
          }}
        />
      </svg>

      {/* Content in the center */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

// Preset variants for common use cases
export function ProgressRing({
  percentage,
  label,
  size = 100,
  color = '#10b981',
}: {
  percentage: number;
  label: string;
  size?: number;
  color?: string;
}) {
  return (
    <CircularProgress
      percentage={percentage}
      size={size}
      strokeWidth={8}
      color={color}
    >
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900">{percentage}%</div>
        <div className="text-xs text-gray-500 font-medium">{label}</div>
      </div>
    </CircularProgress>
  );
}

export function MiniProgressRing({
  percentage,
  size = 60,
  color = '#10b981',
}: {
  percentage: number;
  size?: number;
  color?: string;
}) {
  return (
    <CircularProgress
      percentage={percentage}
      size={size}
      strokeWidth={4}
      color={color}
    >
      <div className="text-sm font-semibold text-gray-900">{percentage}%</div>
    </CircularProgress>
  );
}
