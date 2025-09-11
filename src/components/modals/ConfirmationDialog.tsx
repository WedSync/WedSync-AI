'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

export type ConfirmationDialogType = 'info' | 'warning' | 'success' | 'danger';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  type?: ConfirmationDialogType;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type = 'info',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
}: ConfirmationDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = () => {
    const iconProps = { className: 'h-6 w-6' };
    const iconVariants = {
      initial: { scale: 0, rotate: -180 },
      animate: { scale: 1, rotate: 0 },
      exit: { scale: 0, rotate: 180 },
    };

    switch (type) {
      case 'warning':
        return (
          <motion.div
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-yellow-600"
          >
            <AlertTriangle {...iconProps} />
          </motion.div>
        );
      case 'success':
        return (
          <motion.div
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-green-600"
          >
            <CheckCircle {...iconProps} />
          </motion.div>
        );
      case 'danger':
        return (
          <motion.div
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-red-600"
          >
            <XCircle {...iconProps} />
          </motion.div>
        );
      default:
        return (
          <motion.div
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-blue-600"
          >
            <Info {...iconProps} />
          </motion.div>
        );
    }
  };

  const getButtonStyles = () => {
    if (isDestructive || type === 'danger') {
      return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
    }
    switch (type) {
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
      default:
        return '';
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="mt-3">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={getButtonStyles()}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Processing...
              </div>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Convenience hook for managing confirmation dialogs
export function useConfirmationDialog() {
  const [dialogState, setDialogState] = React.useState({
    isOpen: false,
    title: '',
    description: '',
    type: 'info' as ConfirmationDialogType,
    onConfirm: () => {},
  });

  const showConfirmation = React.useCallback(
    (options: {
      title: string;
      description: string;
      type?: ConfirmationDialogType;
      onConfirm: () => void | Promise<void>;
    }) => {
      setDialogState({
        isOpen: true,
        title: options.title,
        description: options.description,
        type: options.type || 'info',
        onConfirm: options.onConfirm,
      });
    },
    [],
  );

  const hideConfirmation = React.useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    dialogProps: {
      ...dialogState,
      onClose: hideConfirmation,
    },
    showConfirmation,
    hideConfirmation,
  };
}
