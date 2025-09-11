'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface WidgetContainerProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large' | 'full';
  gradient?: string;
  onTap?: () => void;
  loading?: boolean;
  error?: string;
  className?: string;
}

export function WidgetContainer({
  title,
  icon: Icon,
  children,
  size = 'medium',
  gradient = 'from-blue-500 to-purple-600',
  onTap,
  loading = false,
  error,
  className = '',
}: WidgetContainerProps) {
  const sizeClasses = {
    small: 'col-span-1 h-32',
    medium: 'col-span-1 h-40',
    large: 'col-span-2 h-40',
    full: 'col-span-2 h-48',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        ${sizeClasses[size]}
        bg-gradient-to-br ${gradient}
        rounded-2xl p-4 shadow-lg
        touch-manipulation
        ${onTap ? 'cursor-pointer active:scale-95' : ''}
        ${className}
      `}
      onClick={onTap}
      style={{ minHeight: '44px' }} // Ensure touch target
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {Icon && (
            <div className="p-1 bg-white/20 rounded-lg">
              <Icon className="w-4 h-4 text-white" />
            </div>
          )}
          <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
        </div>

        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        {error ? (
          <div className="text-center">
            <p className="text-xs text-white/80">Error loading data</p>
          </div>
        ) : loading ? (
          <div className="animate-pulse space-y-2 w-full">
            <div className="h-2 bg-white/30 rounded w-3/4" />
            <div className="h-2 bg-white/30 rounded w-1/2" />
          </div>
        ) : (
          children
        )}
      </div>
    </motion.div>
  );
}

export default WidgetContainer;
