'use client';

import React from 'react';
import { Heart, Sparkles, ArrowRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WeddingFieldType,
  TierLimitations,
  WEDDING_FIELD_TEMPLATES,
} from '@/types/form-builder';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface EmptyCanvasStateProps {
  onAddFirstField: (fieldType: WeddingFieldType) => void;
  tierLimitations: TierLimitations;
  className?: string;
}

/**
 * EmptyCanvasState - Welcoming state when no fields are added
 *
 * This component provides an encouraging and helpful starting point
 * for wedding suppliers beginning to build their first questionnaire.
 * It offers quick-start suggestions with wedding-specific context.
 */
export function EmptyCanvasState({
  onAddFirstField,
  tierLimitations,
  className,
}: EmptyCanvasStateProps) {
  // Suggested starter fields for wedding questionnaires
  const starterFields: Array<{
    type: WeddingFieldType;
    title: string;
    description: string;
    icon: string;
    category: string;
    isPopular: boolean;
  }> = [
    {
      type: 'wedding-date',
      title: 'Wedding Date',
      description: 'The most important detail - when love becomes official',
      icon: '💍',
      category: 'Essential',
      isPopular: true,
    },
    {
      type: 'venue',
      title: 'Venue Information',
      description: 'Where the magic happens - ceremony and reception details',
      icon: '🏛️',
      category: 'Essential',
      isPopular: true,
    },
    {
      type: 'guest-count',
      title: 'Guest Count',
      description: 'How many loved ones will celebrate together',
      icon: '👥',
      category: 'Essential',
      isPopular: true,
    },
    {
      type: 'text',
      title: 'Couple Names',
      description: "The happy couple's names and contact information",
      icon: '💕',
      category: 'Basic',
      isPopular: true,
    },
    {
      type: 'email',
      title: 'Contact Email',
      description: 'Primary email for communication',
      icon: '📧',
      category: 'Basic',
      isPopular: true,
    },
    {
      type: 'photo-preferences',
      title: 'Photography Style',
      description: 'Capture their vision and preferences',
      icon: '📸',
      category: 'Creative',
      isPopular: false,
    },
  ];

  // Filter available fields based on tier
  const availableStarterFields = starterFields.filter((field) =>
    tierLimitations.availableFieldTypes.includes(field.type),
  );

  return (
    <div className={cn('max-w-4xl mx-auto text-center py-12', className)}>
      {/* Hero Section */}
      <div className="mb-12">
        {/* Wedding-themed illustration */}
        <div className="relative mx-auto w-32 h-32 mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900 dark:to-pink-900 rounded-full opacity-50 animate-pulse" />
          <div className="absolute inset-2 bg-gradient-to-br from-rose-200 to-pink-200 dark:from-rose-800 dark:to-pink-800 rounded-full flex items-center justify-center">
            <div className="text-4xl animate-bounce">💍</div>
          </div>
          <div className="absolute -top-2 -right-2">
            <Sparkles className="w-6 h-6 text-rose-400 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -left-2">
            <Heart className="w-6 h-6 text-pink-400 animate-pulse" />
          </div>
        </div>

        {/* Welcome Message */}
        <h2 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Let's build your first questionnaire
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
          Create the perfect intake form to capture every detail of your
          couples' special day
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Choose from wedding-specific fields designed by photographers, for
          photographers
        </p>
      </div>

      {/* Quick Start Options */}
      <div className="mb-12">
        <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-6 flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-rose-500" />
          Quick start suggestions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {availableStarterFields.map((field) => (
            <Card
              key={field.type}
              className={cn(
                'relative p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105',
                'border-2 border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-600',
                field.isPopular &&
                  'ring-2 ring-rose-200 dark:ring-rose-800 bg-rose-50 dark:bg-rose-950/20',
              )}
              onClick={() => onAddFirstField(field.type)}
            >
              {/* Popular Badge */}
              {field.isPopular && (
                <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Popular
                </div>
              )}

              {/* Field Icon */}
              <div className="text-3xl mb-3">{field.icon}</div>

              {/* Field Info */}
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                {field.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {field.description}
              </p>

              {/* Category Badge */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-xs px-2 py-1 rounded-full font-medium',
                    field.category === 'Essential' &&
                      'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
                    field.category === 'Basic' &&
                      'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                    field.category === 'Creative' &&
                      'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
                  )}
                >
                  {field.category}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-rose-500 opacity-0 hover:opacity-5 rounded-lg transition-opacity" />
            </Card>
          ))}
        </div>
      </div>

      {/* Alternative Actions */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
          Or start with a template
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Choose from pre-built questionnaires designed for different wedding
          specialties
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => {
              // This would open a template selection modal
              // For now, we'll add the wedding-date field as a starter
              onAddFirstField('wedding-date');
            }}
          >
            <span className="text-lg">📸</span>
            Photography Intake
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => onAddFirstField('venue')}
          >
            <span className="text-lg">🏛️</span>
            Venue Inquiry
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => onAddFirstField('text')}
          >
            <span className="text-lg">📋</span>
            Custom Form
          </Button>
        </div>
      </div>

      {/* Drag from Palette Hint */}
      <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-center gap-3 text-blue-800 dark:text-blue-200">
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">
            Tip: You can also drag fields from the palette on the left to start
            building
          </span>
        </div>
      </div>

      {/* Wedding Context Message */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          💡 Every field is designed with wedding workflows in mind - from guest
          counts to dietary requirements, we've thought of the details that
          matter to your couples
        </p>
      </div>
    </div>
  );
}

export default EmptyCanvasState;
