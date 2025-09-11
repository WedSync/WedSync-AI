'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// useAnimation // useAnimation removed - use motion controls
// useInView // useInView removed - use Intersection Observer
import { cn } from '@/lib/utils';

// Animation variants
export const fadeInUp = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

export const slideInFromRight = {
  hidden: {
    opacity: 0,
    x: 100,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export const scaleIn = {
  hidden: {
    scale: 0.8,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

export const staggerChildren = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const pulseGlow = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(59, 130, 246, 0.4)',
      '0 0 0 10px rgba(59, 130, 246, 0)',
      '0 0 0 0 rgba(59, 130, 246, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Animated Components

export const AnimatedCard = motion.div;

export const AnimatedButton = motion.button;

export const AnimatedBadge = motion.div;

// Guest drag animations
export const GuestDragOverlay = ({ guest }: { guest: any }) => (
  <motion.div
    className="bg-white border-2 border-blue-400 rounded-lg p-3 shadow-2xl cursor-grabbing"
    initial={{ scale: 0.9, rotate: 0 }}
    animate={{
      scale: 1.05,
      rotate: 3,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    }}
    transition={{ duration: 0.2 }}
  >
    <div className="font-medium text-sm">{guest.name}</div>
    <div className="text-xs text-muted-foreground">{guest.email}</div>
    {guest.dietaryRequirements && guest.dietaryRequirements.length > 0 && (
      <motion.div
        className="flex flex-wrap gap-1 mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {guest.dietaryRequirements
          .slice(0, 2)
          .map((req: string, index: number) => (
            <span
              key={index}
              className="bg-orange-100 text-orange-800 text-xs px-1.5 py-0.5 rounded"
            >
              {req}
            </span>
          ))}
      </motion.div>
    )}
  </motion.div>
);

// Table hover effects
export const TableHoverEffect = ({
  children,
  isHovered,
  canDrop,
}: {
  children: React.ReactNode;
  isHovered: boolean;
  canDrop: boolean;
}) => (
  <motion.div
    className={cn('relative', canDrop && 'cursor-pointer')}
    whileHover={canDrop ? { scale: 1.02 } : {}}
    animate={
      isHovered
        ? {
            boxShadow: canDrop
              ? '0 0 0 3px rgba(34, 197, 94, 0.3)'
              : '0 0 0 3px rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
          }
        : {}
    }
    transition={{ duration: 0.2 }}
  >
    {children}
    <AnimatePresence>
      {isHovered && (
        <motion.div
          className={cn(
            'absolute inset-0 rounded-lg border-2 border-dashed pointer-events-none',
            canDrop
              ? 'border-green-400 bg-green-50/20'
              : 'border-red-400 bg-red-50/20',
          )}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
        />
      )}
    </AnimatePresence>
  </motion.div>
);

// Conflict alert animations
export const ConflictAlert = ({
  message,
  severity,
  onDismiss,
}: {
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  onDismiss: () => void;
}) => {
  const severityColors = {
    low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    medium: 'bg-orange-50 border-orange-200 text-orange-800',
    high: 'bg-red-50 border-red-200 text-red-800',
    critical: 'bg-red-100 border-red-300 text-red-900',
  };

  return (
    <motion.div
      className={cn(
        'p-3 rounded-lg border flex items-start space-x-3',
        severityColors[severity],
      )}
      initial={{ opacity: 0, x: -50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      layout
    >
      <motion.div
        className="flex-shrink-0 mt-0.5"
        animate={
          severity === 'critical'
            ? {
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0],
              }
            : {}
        }
        transition={{ duration: 2, repeat: Infinity }}
      >
        ⚠️
      </motion.div>
      <div className="flex-1 text-sm">{message}</div>
      <motion.button
        className="flex-shrink-0 text-lg leading-none opacity-60 hover:opacity-100"
        onClick={onDismiss}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.1 }}
      >
        ×
      </motion.button>
    </motion.div>
  );
};

// Loading animations
export const LoadingSpinner = ({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <motion.div
      className={cn(
        'border-2 border-primary border-t-transparent rounded-full',
        sizeClasses[size],
      )}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  );
};

export const PulsingDots = () => (
  <div className="flex space-x-1">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-2 h-2 bg-primary rounded-full"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [1, 0.5, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: i * 0.2,
        }}
      />
    ))}
  </div>
);

// Progress animations
export const AnimatedProgress = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => (
  <div className={cn('w-full bg-muted rounded-full h-2', className)}>
    <motion.div
      className="h-2 bg-primary rounded-full"
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    />
  </div>
);

// Success/completion animations
export const SuccessCheckmark = ({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <motion.div
      className={cn(
        'rounded-full bg-green-500 flex items-center justify-center text-white',
        sizeClasses[size],
      )}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
    >
      <motion.svg
        className={cn('w-3/4 h-3/4')}
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="m6 10 2 2 6-6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      </motion.svg>
    </motion.div>
  );
};

// Floating action animations
export const FloatingActionButton = ({
  children,
  onClick,
  className,
  ...props
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) => (
  <motion.button
    className={cn(
      'fixed bottom-6 right-6 bg-primary text-primary-foreground rounded-full p-4 shadow-lg hover:shadow-xl z-50',
      className,
    )}
    onClick={onClick}
    whileHover={{
      scale: 1.1,
      boxShadow:
        '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    }}
    whileTap={{ scale: 0.95 }}
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{
      type: 'spring',
      stiffness: 260,
      damping: 20,
    }}
    {...props}
  >
    {children}
  </motion.button>
);

// Statistics counter animation
export const CounterAnimation = ({
  value,
  duration = 1.5,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const increment = value / (duration * 60); // 60fps

    const timer = setInterval(() => {
      start += increment;
      if (ref.current) {
        ref.current.textContent = Math.floor(start).toString();
      }
      if (start >= value) {
        if (ref.current) {
          ref.current.textContent = value.toString();
        }
        clearInterval(timer);
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
};

// Smooth list animations
export const AnimatedList = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.div
    className={className}
    variants={staggerChildren}
    initial="hidden"
    animate="visible"
  >
    {React.Children.map(children, (child, index) => (
      <motion.div key={index} variants={fadeInUp}>
        {child}
      </motion.div>
    ))}
  </motion.div>
);

// Notification toast animation
export const ToastNotification = ({
  message,
  type = 'info',
  onClose,
}: {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}) => {
  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const typeIcons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <motion.div
      className={cn(
        'fixed top-4 right-4 p-4 rounded-lg border shadow-lg max-w-sm z-50',
        typeStyles[type],
      )}
      initial={{ opacity: 0, y: -50, x: 100 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -50, x: 100 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      layout
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">{typeIcons[type]}</div>
        <div className="flex-1 text-sm">{message}</div>
        <motion.button
          className="flex-shrink-0 text-lg leading-none opacity-60 hover:opacity-100"
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          ×
        </motion.button>
      </div>
    </motion.div>
  );
};

// Optimization loading animation
export const OptimizationLoadingAnimation = () => (
  <motion.div className="flex flex-col items-center space-y-4">
    <div className="relative">
      <motion.div
        className="w-16 h-16 border-4 border-blue-200 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-0 w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent"
        animate={{ rotate: -360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-2 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white"
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        ✨
      </motion.div>
    </div>

    <div className="text-center">
      <motion.div
        className="font-medium"
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Optimizing seating arrangement...
      </motion.div>
      <div className="text-sm text-muted-foreground mt-1">
        This may take a few moments
      </div>
    </div>

    <PulsingDots />
  </motion.div>
);
