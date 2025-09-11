'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  SwatchIcon,
  MicrophoneIcon,
  CheckIcon,
  ArrowsUpDownIcon,
  EyeDropperIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface FAQCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  count: number;
  isDefault?: boolean;
  priority: number;
  lastModified: number;
}

interface MobileFAQCategoryManagerProps {
  categories: FAQCategory[];
  onCreateCategory: (
    category: Omit<FAQCategory, 'id' | 'lastModified'>,
  ) => void;
  onUpdateCategory: (id: string, updates: Partial<FAQCategory>) => void;
  onDeleteCategory: (id: string) => void;
  onReorderCategories: (categories: FAQCategory[]) => void;
  className?: string;
  allowReordering?: boolean;
  maxCategories?: number;
}

interface CreateCategoryForm {
  name: string;
  color: string;
  description: string;
  priority: number;
}

interface VoiceState {
  isListening: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
}

const PREDEFINED_COLORS = [
  { name: 'Blue', value: '#3B82F6', light: '#EFF6FF' },
  { name: 'Green', value: '#10B981', light: '#ECFDF5' },
  { name: 'Purple', value: '#8B5CF6', light: '#F3E8FF' },
  { name: 'Red', value: '#EF4444', light: '#FEF2F2' },
  { name: 'Orange', value: '#F59E0B', light: '#FFFBEB' },
  { name: 'Pink', value: '#EC4899', light: '#FDF2F8' },
  { name: 'Indigo', value: '#6366F1', light: '#EEF2FF' },
  { name: 'Teal', value: '#14B8A6', light: '#F0FDFA' },
  { name: 'Yellow', value: '#EAB308', light: '#FEFCE8' },
  { name: 'Gray', value: '#6B7280', light: '#F9FAFB' },
];

export default function MobileFAQCategoryManager({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
  className,
  allowReordering = true,
  maxCategories = 20,
}: MobileFAQCategoryManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#3B82F6');
  const [hapticSupported, setHapticSupported] = useState(false);

  const [createForm, setCreateForm] = useState<CreateCategoryForm>({
    name: '',
    color: PREDEFINED_COLORS[0].value,
    description: '',
    priority: 1,
  });

  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    transcript: '',
    confidence: 0,
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize device capabilities and voice recognition
  useEffect(() => {
    setHapticSupported('vibrate' in navigator);

    // Setup Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join('');

          const confidence =
            event.results[event.results.length - 1][0].confidence;

          setVoiceState((prev) => ({
            ...prev,
            transcript,
            confidence,
          }));

          if (event.results[event.results.length - 1].isFinal) {
            setCreateForm((prev) => ({ ...prev, name: transcript }));
            setVoiceState((prev) => ({ ...prev, isListening: false }));
          }
        };

        recognitionRef.current.onerror = (
          event: SpeechRecognitionErrorEvent,
        ) => {
          setVoiceState((prev) => ({
            ...prev,
            isListening: false,
            error: `Voice recognition error: ${event.error}`,
          }));
          triggerHaptic('error');
        };

        recognitionRef.current.onend = () => {
          setVoiceState((prev) => ({ ...prev, isListening: false }));
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

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

  // Voice input handlers
  const startVoiceInput = useCallback(() => {
    if (!recognitionRef.current) {
      setVoiceState((prev) => ({
        ...prev,
        error: 'Voice input not supported on this device',
      }));
      return;
    }

    triggerHaptic('light');
    setVoiceState({
      isListening: true,
      transcript: '',
      confidence: 0,
      error: null,
    });

    try {
      recognitionRef.current.start();
    } catch (error) {
      setVoiceState((prev) => ({
        ...prev,
        isListening: false,
        error: 'Failed to start voice recognition',
      }));
    }
  }, [triggerHaptic]);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    triggerHaptic('light');
  }, [triggerHaptic]);

  // Form handlers
  const handleCreateCategory = useCallback(() => {
    if (!createForm.name.trim()) {
      triggerHaptic('error');
      return;
    }

    const newCategory: Omit<FAQCategory, 'id' | 'lastModified'> = {
      name: createForm.name.trim(),
      color: createForm.color,
      description: createForm.description.trim(),
      count: 0,
      priority: createForm.priority,
    };

    onCreateCategory(newCategory);

    // Reset form
    setCreateForm({
      name: '',
      color: PREDEFINED_COLORS[0].value,
      description: '',
      priority: 1,
    });
    setIsCreating(false);

    triggerHaptic('success');
  }, [createForm, onCreateCategory, triggerHaptic]);

  const handleDeleteCategory = useCallback(
    (categoryId: string) => {
      const category = categories.find((c) => c.id === categoryId);
      if (category?.isDefault) {
        triggerHaptic('error');
        return; // Can't delete default categories
      }

      onDeleteCategory(categoryId);
      triggerHaptic('success');
    },
    [categories, onDeleteCategory, triggerHaptic],
  );

  const handleReorder = useCallback(
    (reorderedCategories: FAQCategory[]) => {
      if (!allowReordering) return;

      // Update priorities based on new order
      const categoriesWithNewPriorities = reorderedCategories.map(
        (cat, index) => ({
          ...cat,
          priority: reorderedCategories.length - index,
        }),
      );

      onReorderCategories(categoriesWithNewPriorities);
      triggerHaptic('light');
    },
    [allowReordering, onReorderCategories, triggerHaptic],
  );

  const handleColorSelect = useCallback(
    (color: string) => {
      setCreateForm((prev) => ({ ...prev, color }));
      setShowColorPicker(false);
      triggerHaptic('light');
    },
    [triggerHaptic],
  );

  const handleCustomColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const color = e.target.value;
      setCustomColor(color);
      setCreateForm((prev) => ({ ...prev, color }));
    },
    [],
  );

  // Category Card Component
  const CategoryCard = useCallback(
    ({ category }: { category: FAQCategory }) => {
      const isEditing = editingId === category.id;

      return (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          whileTap={{ scale: 0.98 }}
          className="w-full"
        >
          <Card
            className={cn(
              'p-4 border-2 transition-all duration-200',
              'min-h-[120px]', // Touch-friendly height
            )}
            style={{ borderColor: category.color }}
          >
            <div className="flex items-start justify-between gap-3">
              {/* Category Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate">
                    {category.name}
                  </h3>
                  {category.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>

                {category.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
                    {category.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{category.count} FAQs</span>
                  <span>Priority: {category.priority}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {allowReordering && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-w-[44px] min-h-[44px] p-2 touch-manipulation"
                    style={{ cursor: 'grab' }}
                  >
                    <ArrowsUpDownIcon className="w-5 h-5 text-gray-400" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="min-w-[44px] min-h-[44px] p-2"
                  onClick={() => setEditingId(isEditing ? null : category.id)}
                >
                  <PencilIcon className="w-5 h-5 text-gray-400" />
                </Button>

                {!category.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-w-[44px] min-h-[44px] p-2"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <XMarkIcon className="w-5 h-5 text-red-400" />
                  </Button>
                )}
              </div>
            </div>

            {/* Edit Form */}
            <AnimatePresence>
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3"
                >
                  <div>
                    <Input
                      value={category.name}
                      onChange={(e) =>
                        onUpdateCategory(category.id, { name: e.target.value })
                      }
                      className="text-base min-h-[44px]"
                      placeholder="Category name..."
                    />
                  </div>

                  <div>
                    <Input
                      value={category.description || ''}
                      onChange={(e) =>
                        onUpdateCategory(category.id, {
                          description: e.target.value,
                        })
                      }
                      className="text-base min-h-[44px]"
                      placeholder="Description (optional)..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setEditingId(null)}
                      className="flex-1 min-h-[44px] bg-green-600 hover:bg-green-700"
                    >
                      <CheckIcon className="w-5 h-5 mr-2" />
                      Save
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      );
    },
    [editingId, allowReordering, onUpdateCategory, handleDeleteCategory],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full max-w-2xl mx-auto p-4 space-y-6',
        'safe-area-inset-top safe-area-inset-bottom',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Squares2X2Icon className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            FAQ Categories
          </h2>
        </div>

        <Badge variant="secondary">
          {categories.length}/{maxCategories}
        </Badge>
      </div>

      {/* Create Category Section */}
      <AnimatePresence>
        {isCreating ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4 border-2 border-dashed border-blue-300 bg-blue-50 dark:bg-blue-900/20">
              <div className="space-y-4">
                {/* Voice Recognition Status */}
                <AnimatePresence>
                  {voiceState.isListening && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-blue-100 dark:bg-blue-800 p-3 rounded-lg border border-blue-200 dark:border-blue-700"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Listening for category name...
                        </span>
                      </div>
                      {voiceState.transcript && (
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          "{voiceState.transcript}"
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Name Input */}
                <div className="relative">
                  <Input
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Category name..."
                    className="pr-12 text-base min-h-[44px]"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={
                      voiceState.isListening ? stopVoiceInput : startVoiceInput
                    }
                    className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] p-2"
                    aria-label="Voice input for category name"
                  >
                    <MicrophoneIcon
                      className={cn(
                        'w-5 h-5',
                        voiceState.isListening
                          ? 'text-red-500 animate-pulse'
                          : 'text-gray-400',
                      )}
                    />
                  </Button>
                </div>

                {/* Description Input */}
                <Input
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Description (optional)..."
                  className="text-base min-h-[44px]"
                />

                {/* Color Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Color
                  </label>

                  <div className="flex flex-wrap gap-2 mb-2">
                    {PREDEFINED_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => handleColorSelect(color.value)}
                        className={cn(
                          'w-10 h-10 rounded-full border-2 transition-all duration-200',
                          'min-w-[44px] min-h-[44px] touch-manipulation', // Touch target
                          createForm.color === color.value
                            ? 'border-gray-900 dark:border-white scale-110'
                            : 'border-gray-300 dark:border-gray-600',
                        )}
                        style={{ backgroundColor: color.value }}
                        aria-label={`Select ${color.name} color`}
                      />
                    ))}

                    {/* Custom Color Picker */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => colorPickerRef.current?.click()}
                        className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full border-2 border-dashed border-gray-400 
                                 flex items-center justify-center transition-all duration-200 hover:scale-105"
                        aria-label="Custom color picker"
                      >
                        <EyeDropperIcon className="w-5 h-5 text-gray-600" />
                      </button>

                      <input
                        ref={colorPickerRef}
                        type="color"
                        value={customColor}
                        onChange={handleCustomColorChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: createForm.color }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Selected color: {createForm.color}
                    </span>
                  </div>
                </div>

                {/* Priority Selector */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Priority (1-10)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={createForm.priority}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        priority: parseInt(e.target.value),
                      }))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{ minHeight: '44px' }} // Touch-friendly
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span className="font-medium">{createForm.priority}</span>
                    <span>High</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleCreateCategory}
                    disabled={!createForm.name.trim()}
                    className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckIcon className="w-5 h-5 mr-2" />
                    Create Category
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setCreateForm({
                        name: '',
                        color: PREDEFINED_COLORS[0].value,
                        description: '',
                        priority: 1,
                      });
                    }}
                    className="flex-1 min-h-[48px]"
                  >
                    <XMarkIcon className="w-5 h-5 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <Button
            onClick={() => setIsCreating(true)}
            disabled={categories.length >= maxCategories}
            className="w-full min-h-[48px] border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 
                     text-blue-700 hover:text-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 
                     dark:text-blue-300 dark:hover:text-blue-200"
            variant="outline"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add New Category
          </Button>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {voiceState.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800"
          >
            <p className="text-sm text-red-700 dark:text-red-300">
              {voiceState.error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories List */}
      <div className="space-y-4">
        {categories.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <SwatchIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No categories yet. Create your first category to get started!</p>
          </div>
        ) : allowReordering ? (
          <Reorder.Group
            axis="y"
            values={categories}
            onReorder={handleReorder}
            className="space-y-4"
          >
            {categories
              .sort((a, b) => b.priority - a.priority)
              .map((category) => (
                <Reorder.Item
                  key={category.id}
                  value={category}
                  className="cursor-grab active:cursor-grabbing"
                  whileDrag={{ scale: 1.02 }}
                >
                  <CategoryCard category={category} />
                </Reorder.Item>
              ))}
          </Reorder.Group>
        ) : (
          <div className="space-y-4">
            {categories
              .sort((a, b) => b.priority - a.priority)
              .map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
          </div>
        )}
      </div>

      {/* Mobile Usage Tips */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p>💡 Tips:</p>
        <p>• Use voice input to quickly add category names</p>
        <p>• Drag categories to reorder them by priority</p>
        <p>• Higher priority categories appear first in lists</p>
        <p>• Choose distinct colors to easily identify categories</p>
      </div>
    </div>
  );
}
