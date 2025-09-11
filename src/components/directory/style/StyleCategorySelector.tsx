'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StyleCategorySelectorProps {
  selectedCategories: string[];
  onSelectionChange: (categories: string[]) => void;
  onComplete: (isValid: boolean) => void;
}

const STYLE_CATEGORIES = [
  {
    id: 'romantic-classic',
    name: 'Romantic Classic',
    description: 'Timeless elegance with soft, dreamy elements',
    image: '/images/styles/romantic-classic.jpg',
    tags: ['elegant', 'timeless', 'soft', 'dreamy'],
  },
  {
    id: 'modern-minimalist',
    name: 'Modern Minimalist',
    description: 'Clean lines, sophisticated simplicity',
    image: '/images/styles/modern-minimalist.jpg',
    tags: ['clean', 'sophisticated', 'simple', 'contemporary'],
  },
  {
    id: 'boho-chic',
    name: 'Bohemian Chic',
    description: 'Free-spirited with natural, artistic touches',
    image: '/images/styles/boho-chic.jpg',
    tags: ['natural', 'artistic', 'free-spirited', 'textured'],
  },
  {
    id: 'garden-party',
    name: 'Garden Party',
    description: 'Fresh, natural beauty with floral abundance',
    image: '/images/styles/garden-party.jpg',
    tags: ['fresh', 'natural', 'floral', 'outdoor'],
  },
];

export function StyleCategorySelector({
  selectedCategories,
  onSelectionChange,
  onComplete,
}: StyleCategorySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = STYLE_CATEGORIES.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCategoryToggle = useCallback(
    (categoryId: string) => {
      const newSelection = selectedCategories.includes(categoryId)
        ? selectedCategories.filter((id) => id !== categoryId)
        : [...selectedCategories, categoryId];

      onSelectionChange(newSelection);
    },
    [selectedCategories, onSelectionChange],
  );

  useEffect(() => {
    onComplete(selectedCategories.length > 0);
  }, [selectedCategories, onComplete]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Search wedding styles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 text-lg"
        />
      </div>

      {/* Selection Summary */}
      {selectedCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200"
        >
          <span className="font-medium text-purple-700">
            {selectedCategories.length} style
            {selectedCategories.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex flex-wrap gap-1">
            {selectedCategories.slice(0, 3).map((categoryId) => {
              const category = STYLE_CATEGORIES.find(
                (c) => c.id === categoryId,
              );
              return (
                <Badge
                  key={categoryId}
                  variant="secondary"
                  className="text-purple-700 bg-purple-100"
                >
                  {category?.name}
                </Badge>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCategories.map((category, index) => {
          const isSelected = selectedCategories.includes(category.id);

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  'relative cursor-pointer transition-all duration-300 overflow-hidden group',
                  'hover:shadow-lg hover:-translate-y-1',
                  isSelected
                    ? 'ring-2 ring-purple-600 shadow-lg bg-purple-50 border-purple-200'
                    : 'hover:border-purple-300',
                )}
                onClick={() => handleCategoryToggle(category.id)}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${category.image})` }}
                />

                <div
                  className={cn(
                    'absolute inset-0 transition-all duration-300',
                    isSelected
                      ? 'bg-purple-600/20'
                      : 'bg-black/40 group-hover:bg-black/30',
                  )}
                />

                <CardContent className="relative p-6 text-white h-48 flex flex-col justify-end">
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute top-4 right-4 bg-purple-600 rounded-full p-2"
                    >
                      <Check className="h-4 w-4 text-white" />
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">{category.name}</h3>
                    <p className="text-white/90 text-sm leading-relaxed">
                      {category.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-3">
                      {category.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-white/20 text-white border-white/30 text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default StyleCategorySelector;
