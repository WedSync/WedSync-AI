'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { FixedSizeList as List } from 'react-window';
import {
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  confidence?: number;
  isApproved?: boolean;
  isRejected?: boolean;
  originalIndex?: number;
}

interface TouchOptimizedFAQReviewProps {
  faqs: FAQItem[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string, updates: Partial<FAQItem>) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  className?: string;
  allowEditing?: boolean;
  allowReordering?: boolean;
  showCategories?: boolean;
}

interface GestureState {
  isPanning: boolean;
  panDirection: 'left' | 'right' | null;
  panDistance: number;
  scale: number;
  isLongPress: boolean;
  longPressTimer: NodeJS.Timeout | null;
}

interface EditState {
  isEditing: boolean;
  editingId: string | null;
  editForm: {
    question: string;
    answer: string;
    category?: string;
  };
}

export default function TouchOptimizedFAQReview({
  faqs,
  onApprove,
  onReject,
  onEdit,
  onReorder,
  className,
  allowEditing = true,
  allowReordering = true,
  showCategories = true,
}: TouchOptimizedFAQReviewProps) {
  const [gestureState, setGestureState] = useState<GestureState>({
    isPanning: false,
    panDirection: null,
    panDistance: 0,
    scale: 1,
    isLongPress: false,
    longPressTimer: null,
  });

  const [editState, setEditState] = useState<EditState>({
    isEditing: false,
    editingId: null,
    editForm: { question: '', answer: '', category: '' },
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hapticSupported, setHapticSupported] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pinchStartDistance = useRef(0);
  const initialPinchScale = useRef(1);

  // Check device capabilities
  useEffect(() => {
    setHapticSupported('vibrate' in navigator);
  }, []);

  // Filter and search FAQs
  const filteredFAQs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesSearch =
        !searchTerm ||
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        !selectedCategory || faq.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [faqs, searchTerm, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(faqs.map((faq) => faq.category).filter(Boolean)),
    );
    return cats.sort();
  }, [faqs]);

  // Haptic feedback
  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' | 'error' | 'success' = 'light') => {
      if (!hapticSupported) return;

      const patterns = {
        light: [10],
        medium: [20],
        heavy: [40],
        error: [100, 50, 100],
        success: [20, 50, 20],
      };

      navigator.vibrate(patterns[type]);
    },
    [hapticSupported],
  );

  // Touch distance calculator
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2),
    );
  };

  // Long press handlers
  const startLongPress = useCallback(
    (faqId: string) => {
      const timer = setTimeout(() => {
        setGestureState((prev) => ({ ...prev, isLongPress: true }));
        triggerHaptic('medium');

        if (allowEditing) {
          const faq = faqs.find((f) => f.id === faqId);
          if (faq) {
            setEditState({
              isEditing: true,
              editingId: faqId,
              editForm: {
                question: faq.question,
                answer: faq.answer,
                category: faq.category,
              },
            });
          }
        }
      }, 500); // 500ms for long press

      setGestureState((prev) => ({ ...prev, longPressTimer: timer }));
    },
    [allowEditing, faqs, triggerHaptic],
  );

  const cancelLongPress = useCallback(() => {
    if (gestureState.longPressTimer) {
      clearTimeout(gestureState.longPressTimer);
      setGestureState((prev) => ({
        ...prev,
        longPressTimer: null,
        isLongPress: false,
      }));
    }
  }, [gestureState.longPressTimer]);

  // Double tap handler for quick approve
  const handleDoubleTap = useCallback(
    (faqId: string) => {
      const now = Date.now();
      const timeDiff = now - lastTap;

      if (timeDiff < 300 && timeDiff > 0) {
        // Double tap detected
        onApprove(faqId);
        triggerHaptic('success');
      }

      setLastTap(now);
    },
    [lastTap, onApprove, triggerHaptic],
  );

  // Pan gesture handlers
  const handlePanStart = useCallback(() => {
    setGestureState((prev) => ({
      ...prev,
      isPanning: true,
      panDirection: null,
      panDistance: 0,
    }));
  }, []);

  const handlePanUpdate = useCallback(
    (info: PanInfo, faqId: string) => {
      const { offset } = info;
      const absDistance = Math.abs(offset.x);
      const direction = offset.x > 0 ? 'right' : 'left';

      setGestureState((prev) => ({
        ...prev,
        panDirection: direction,
        panDistance: absDistance,
      }));

      // Haptic feedback at threshold
      if (absDistance > 100 && prev.panDistance <= 100) {
        triggerHaptic('light');
      }
    },
    [triggerHaptic],
  );

  const handlePanEnd = useCallback(
    (info: PanInfo, faqId: string) => {
      const { offset } = info;
      const absDistance = Math.abs(offset.x);

      if (absDistance > 120) {
        // Threshold for action
        if (offset.x > 0) {
          // Swipe right - approve
          onApprove(faqId);
          triggerHaptic('success');
        } else {
          // Swipe left - reject
          onReject(faqId);
          triggerHaptic('error');
        }
      }

      setGestureState((prev) => ({
        ...prev,
        isPanning: false,
        panDirection: null,
        panDistance: 0,
      }));
    },
    [onApprove, onReject, triggerHaptic],
  );

  // Pinch to zoom handlers
  const handlePinchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDistance.current = getTouchDistance(e.touches);
        initialPinchScale.current = gestureState.scale;
      }
    },
    [gestureState.scale],
  );

  const handlePinchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const currentDistance = getTouchDistance(e.touches);
      const scale =
        initialPinchScale.current *
        (currentDistance / pinchStartDistance.current);
      const boundedScale = Math.min(Math.max(scale, 0.5), 2.0);

      setGestureState((prev) => ({ ...prev, scale: boundedScale }));
    }
  }, []);

  // Drag to reorder handlers
  const handleDragStart = useCallback(
    (index: number) => {
      if (!allowReordering) return;

      setDraggedIndex(index);
      triggerHaptic('medium');
    },
    [allowReordering, triggerHaptic],
  );

  const handleDragOver = useCallback(
    (index: number) => {
      if (draggedIndex === null || draggedIndex === index) return;
      setDropTargetIndex(index);
    },
    [draggedIndex],
  );

  const handleDragEnd = useCallback(() => {
    if (
      draggedIndex !== null &&
      dropTargetIndex !== null &&
      draggedIndex !== dropTargetIndex
    ) {
      onReorder(draggedIndex, dropTargetIndex);
      triggerHaptic('success');
    }

    setDraggedIndex(null);
    setDropTargetIndex(null);
  }, [draggedIndex, dropTargetIndex, onReorder, triggerHaptic]);

  // Edit form handlers
  const handleSaveEdit = useCallback(() => {
    if (editState.editingId) {
      onEdit(editState.editingId, editState.editForm);
      setEditState({
        isEditing: false,
        editingId: null,
        editForm: { question: '', answer: '', category: '' },
      });
      triggerHaptic('success');
    }
  }, [editState, onEdit, triggerHaptic]);

  const handleCancelEdit = useCallback(() => {
    setEditState({
      isEditing: false,
      editingId: null,
      editForm: { question: '', answer: '', category: '' },
    });
  }, []);

  // FAQ Item Component
  const FAQItemComponent = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const faq = filteredFAQs[index];
      const isBeingEdited =
        editState.isEditing && editState.editingId === faq.id;
      const isDragging = draggedIndex === index;
      const isDropTarget = dropTargetIndex === index;

      return (
        <div style={style}>
          <motion.div
            drag={allowReordering ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragStart={() => handleDragStart(index)}
            onDragEnd={handleDragEnd}
            whileDrag={{
              scale: 1.05,
              zIndex: 1000,
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            }}
            animate={{
              scale: gestureState.scale * (isDragging ? 1.05 : 1),
              y: isDragging ? -5 : 0,
            }}
            className={cn(
              'mx-4 mb-4',
              isDragging && 'z-50',
              isDropTarget && 'bg-blue-50 dark:bg-blue-900/20',
            )}
          >
            <motion.div
              drag="x"
              dragConstraints={{ left: -200, right: 200 }}
              onDragStart={handlePanStart}
              onDrag={(_, info) => handlePanUpdate(info, faq.id)}
              onDragEnd={(_, info) => handlePanEnd(info, faq.id)}
              whileDrag={{ scale: 0.95 }}
              animate={{
                x: gestureState.isPanning ? 0 : 0,
                backgroundColor:
                  gestureState.panDistance > 100
                    ? gestureState.panDirection === 'right'
                      ? '#10B981' // green for approve
                      : '#EF4444' // red for reject
                    : undefined,
              }}
              onTouchStart={(e) => {
                startLongPress(faq.id);
                handlePinchStart(e);
              }}
              onTouchMove={(e) => {
                handlePinchMove(e);
                // Cancel long press if moving
                if (
                  Math.abs(e.touches[0].clientX - e.touches[0].clientX) > 10
                ) {
                  cancelLongPress();
                }
              }}
              onTouchEnd={() => {
                cancelLongPress();
                handleDoubleTap(faq.id);
              }}
              onMouseEnter={() => handleDragOver(index)}
              className="relative"
            >
              {/* Swipe Action Indicators */}
              <AnimatePresence>
                {gestureState.isPanning && gestureState.panDistance > 50 && (
                  <>
                    {/* Approve indicator (right swipe) */}
                    {gestureState.panDirection === 'right' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-10
                                 bg-green-500 text-white p-2 rounded-full"
                      >
                        <CheckIcon className="w-6 h-6" />
                      </motion.div>
                    )}

                    {/* Reject indicator (left swipe) */}
                    {gestureState.panDirection === 'left' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-10
                                 bg-red-500 text-white p-2 rounded-full"
                      >
                        <XMarkIcon className="w-6 h-6" />
                      </motion.div>
                    )}
                  </>
                )}
              </AnimatePresence>

              <Card
                className={cn(
                  'p-4 border-2 transition-all duration-200',
                  faq.isApproved &&
                    'border-green-500 bg-green-50 dark:bg-green-900/20',
                  faq.isRejected &&
                    'border-red-500 bg-red-50 dark:bg-red-900/20',
                  isBeingEdited &&
                    'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
                  gestureState.isPanning && 'shadow-lg',
                  'min-h-[120px]', // Minimum touch-friendly height
                )}
              >
                {/* FAQ Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    {showCategories && faq.category && (
                      <Badge variant="secondary" className="mb-2 text-xs">
                        {faq.category}
                      </Badge>
                    )}

                    {faq.confidence && (
                      <div className="flex items-center gap-1 mb-2">
                        <div className="text-xs text-gray-500">
                          {Math.round(faq.confidence * 100)}% confident
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${faq.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    {allowReordering && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-w-[44px] min-h-[44px] p-2"
                        onTouchStart={() => handleDragStart(index)}
                      >
                        <ArrowsUpDownIcon className="w-5 h-5 text-gray-400" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-w-[44px] min-h-[44px] p-2"
                      onClick={() =>
                        setEditState({
                          isEditing: true,
                          editingId: faq.id,
                          editForm: {
                            question: faq.question,
                            answer: faq.answer,
                            category: faq.category,
                          },
                        })
                      }
                    >
                      <PencilIcon className="w-5 h-5 text-gray-400" />
                    </Button>
                  </div>
                </div>

                {/* FAQ Content */}
                {isBeingEdited ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                        Question
                      </label>
                      <Textarea
                        value={editState.editForm.question}
                        onChange={(e) =>
                          setEditState((prev) => ({
                            ...prev,
                            editForm: {
                              ...prev.editForm,
                              question: e.target.value,
                            },
                          }))
                        }
                        className="min-h-[60px] text-base"
                        placeholder="Enter the question..."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                        Answer
                      </label>
                      <Textarea
                        value={editState.editForm.answer}
                        onChange={(e) =>
                          setEditState((prev) => ({
                            ...prev,
                            editForm: {
                              ...prev.editForm,
                              answer: e.target.value,
                            },
                          }))
                        }
                        className="min-h-[80px] text-base"
                        placeholder="Enter the answer..."
                      />
                    </div>

                    {showCategories && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                          Category
                        </label>
                        <Input
                          value={editState.editForm.category || ''}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              editForm: {
                                ...prev.editForm,
                                category: e.target.value,
                              },
                            }))
                          }
                          className="text-base min-h-[44px]"
                          placeholder="Enter category..."
                        />
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleSaveEdit}
                        className="flex-1 min-h-[44px] bg-green-600 hover:bg-green-700"
                      >
                        <CheckIcon className="w-5 h-5 mr-2" />
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="flex-1 min-h-[44px]"
                      >
                        <XMarkIcon className="w-5 h-5 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-relaxed">
                        {faq.question}
                      </h3>
                    </div>

                    <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                      {faq.answer}
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onApprove(faq.id);
                          triggerHaptic('success');
                        }}
                        disabled={faq.isApproved}
                        className={cn(
                          'flex-1 min-h-[44px]',
                          faq.isApproved &&
                            'bg-green-100 text-green-800 border-green-300',
                        )}
                      >
                        <HandThumbUpIcon className="w-5 h-5 mr-2" />
                        {faq.isApproved ? 'Approved' : 'Approve'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onReject(faq.id);
                          triggerHaptic('error');
                        }}
                        disabled={faq.isRejected}
                        className={cn(
                          'flex-1 min-h-[44px]',
                          faq.isRejected &&
                            'bg-red-100 text-red-800 border-red-300',
                        )}
                      >
                        <HandThumbDownIcon className="w-5 h-5 mr-2" />
                        {faq.isRejected ? 'Rejected' : 'Reject'}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          </motion.div>
        </div>
      );
    },
    [
      filteredFAQs,
      editState,
      draggedIndex,
      dropTargetIndex,
      gestureState,
      allowReordering,
      showCategories,
      handleDragStart,
      handleDragEnd,
      handlePanStart,
      handlePanUpdate,
      handlePanEnd,
      handlePinchStart,
      handlePinchMove,
      startLongPress,
      cancelLongPress,
      handleDoubleTap,
      handleDragOver,
      handleSaveEdit,
      handleCancelEdit,
      onApprove,
      onReject,
      triggerHaptic,
    ],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen',
        'safe-area-inset-top safe-area-inset-bottom',
        className,
      )}
    >
      {/* Header with Search and Filters */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40 p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search FAQs..."
            className="pl-10 text-base min-h-[44px]"
          />
        </div>

        {/* Category Filter */}
        {showCategories && categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="whitespace-nowrap min-h-[36px]"
            >
              All ({faqs.length})
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap min-h-[36px]"
              >
                {category} ({faqs.filter((f) => f.category === category).length}
                )
              </Button>
            ))}
          </div>
        )}

        {/* Status Summary */}
        <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Total: {filteredFAQs.length}</span>
          <span className="text-green-600">
            Approved: {filteredFAQs.filter((f) => f.isApproved).length}
          </span>
          <span className="text-red-600">
            Rejected: {filteredFAQs.filter((f) => f.isRejected).length}
          </span>
          <span className="text-orange-600">
            Pending:{' '}
            {filteredFAQs.filter((f) => !f.isApproved && !f.isRejected).length}
          </span>
        </div>
      </div>

      {/* FAQ List with Virtual Scrolling */}
      <div
        className="flex-1"
        style={{ transform: `scale(${gestureState.scale})` }}
      >
        {filteredFAQs.length > 0 ? (
          <List
            ref={listRef}
            height={
              typeof window !== 'undefined' ? window.innerHeight - 200 : 600
            } // Adjust for header
            itemCount={filteredFAQs.length}
            itemSize={200} // Minimum item height
            className="scrollbar-hide"
          >
            {FAQItemComponent}
          </List>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center p-8">
            <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No FAQs found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || selectedCategory
                ? 'Try adjusting your search or filter'
                : 'No FAQs available to review'}
            </p>
          </div>
        )}
      </div>

      {/* Mobile Gesture Instructions (Initially visible, fades on use) */}
      <AnimatePresence>
        {filteredFAQs.length > 0 && !gestureState.isPanning && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 bg-black/80 text-white p-3 rounded-lg text-center text-sm z-50"
          >
            <div className="space-y-1">
              <p>👆 Double-tap to quick approve</p>
              <p>👈👉 Swipe left/right to reject/approve</p>
              <p>🔍 Pinch to zoom • ✋ Long-press to edit</p>
              <p>↕️ Drag to reorder</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
