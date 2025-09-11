'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TouchButton } from '@/components/touch/TouchButton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  Clock,
  MapPin,
  Heart,
  Car,
  Camera,
  Utensils,
  AlertTriangle,
  Info,
  Calendar,
  Gift,
} from 'lucide-react';

interface MessageTemplate {
  id: string;
  title: string;
  message: string;
  category: 'urgent' | 'logistics' | 'social' | 'reminder' | 'thank-you';
  icon: React.ReactNode;
  variables?: string[];
}

interface QuickMessageTemplatesProps {
  onSelectTemplate: (template: MessageTemplate) => void;
  onCustomize: (template: MessageTemplate, customMessage: string) => void;
  selectedTemplate?: MessageTemplate | null;
}

const messageTemplates: MessageTemplate[] = [
  // Urgent Messages
  {
    id: 'venue-change',
    title: 'Venue Change',
    message:
      'Important update: Our wedding venue has changed to {venue} at {address}. Please update your plans. Sorry for any inconvenience!',
    category: 'urgent',
    icon: <MapPin className="w-4 h-4" />,
    variables: ['venue', 'address'],
  },
  {
    id: 'time-change',
    title: 'Time Change',
    message:
      'Wedding time update: The ceremony will now start at {time} instead of the original time. Please arrive 15 minutes early!',
    category: 'urgent',
    icon: <Clock className="w-4 h-4" />,
    variables: ['time'],
  },
  {
    id: 'weather-alert',
    title: 'Weather Alert',
    message:
      'Weather update for our big day: {weather}. Please bring {items} and dress accordingly. See you soon!',
    category: 'urgent',
    icon: <AlertTriangle className="w-4 h-4" />,
    variables: ['weather', 'items'],
  },

  // Logistics
  {
    id: 'parking-info',
    title: 'Parking Info',
    message:
      "Parking for our wedding: {parking_details}. Please arrive early to find a spot. Can't wait to celebrate with you!",
    category: 'logistics',
    icon: <Car className="w-4 h-4" />,
    variables: ['parking_details'],
  },
  {
    id: 'transportation',
    title: 'Transportation',
    message:
      'Transportation provided! Shuttle pickup at {location} at {time}. Please be on time so we can all travel together.',
    category: 'logistics',
    icon: <Car className="w-4 h-4" />,
    variables: ['location', 'time'],
  },
  {
    id: 'dress-code',
    title: 'Dress Code Reminder',
    message:
      'Dress code reminder: {dress_code}. We want everyone to feel comfortable and look amazing for our photos!',
    category: 'logistics',
    icon: <Camera className="w-4 h-4" />,
    variables: ['dress_code'],
  },

  // Social
  {
    id: 'excitement',
    title: "Can't Wait!",
    message:
      "Only {days} days until our wedding! We're so excited to celebrate with you. Thank you for being such an important part of our journey!",
    category: 'social',
    icon: <Heart className="w-4 h-4" />,
    variables: ['days'],
  },
  {
    id: 'photo-request',
    title: 'Photo Request',
    message:
      'Please share your photos from our special day! Upload them to {photo_link} or tag us on social media. We love seeing your perspective!',
    category: 'social',
    icon: <Camera className="w-4 h-4" />,
    variables: ['photo_link'],
  },

  // Reminders
  {
    id: 'rsvp-reminder',
    title: 'RSVP Reminder',
    message:
      "Friendly reminder: Please RSVP by {deadline}. We need final numbers for catering. Can't wait to celebrate with you!",
    category: 'reminder',
    icon: <Calendar className="w-4 h-4" />,
    variables: ['deadline'],
  },
  {
    id: 'meal-selection',
    title: 'Meal Selection',
    message:
      "Don't forget to select your meal preference: {meal_options}. Please let us know by {deadline} for our caterer.",
    category: 'reminder',
    icon: <Utensils className="w-4 h-4" />,
    variables: ['meal_options', 'deadline'],
  },

  // Thank You
  {
    id: 'thank-you-attendance',
    title: 'Thank You for Coming',
    message:
      'Thank you so much for celebrating our special day with us! Your presence made it perfect. We love you!',
    category: 'thank-you',
    icon: <Heart className="w-4 h-4" />,
  },
  {
    id: 'thank-you-gift',
    title: 'Thank You for Gift',
    message:
      'We are so grateful for your generous gift! It means the world to us. Thank you for making our day even more special!',
    category: 'thank-you',
    icon: <Gift className="w-4 h-4" />,
  },
];

const categoryColors = {
  urgent: 'destructive',
  logistics: 'secondary',
  social: 'default',
  reminder: 'outline',
  'thank-you': 'default',
} as const;

const categoryLabels = {
  urgent: 'Urgent',
  logistics: 'Logistics',
  social: 'Social',
  reminder: 'Reminders',
  'thank-you': 'Thank You',
} as const;

export function QuickMessageTemplates({
  onSelectTemplate,
  onCustomize,
  selectedTemplate,
}: QuickMessageTemplatesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customizingTemplate, setCustomizingTemplate] =
    useState<MessageTemplate | null>(null);
  const [customMessage, setCustomMessage] = useState('');

  const filteredTemplates = messageTemplates.filter((template) => {
    const matchesSearch =
      template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(
    new Set(messageTemplates.map((t) => t.category)),
  );

  const handleTemplateSelect = (template: MessageTemplate) => {
    if (template.variables && template.variables.length > 0) {
      setCustomizingTemplate(template);
      setCustomMessage(template.message);
    } else {
      onSelectTemplate(template);
    }
  };

  const handleCustomizeSubmit = () => {
    if (customizingTemplate) {
      onCustomize(customizingTemplate, customMessage);
      setCustomizingTemplate(null);
      setCustomMessage('');
    }
  };

  if (customizingTemplate) {
    return (
      <Card className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Customize Message</h3>
          <TouchButton
            variant="ghost"
            size="sm"
            onClick={() => {
              setCustomizingTemplate(null);
              setCustomMessage('');
            }}
          >
            Cancel
          </TouchButton>
        </div>

        <div className="flex-1">
          <div className="mb-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              {customizingTemplate.icon}
              {customizingTemplate.title}
            </h4>
            <Badge
              variant={categoryColors[customizingTemplate.category]}
              className="mb-2"
            >
              {categoryLabels[customizingTemplate.category]}
            </Badge>
          </div>

          {customizingTemplate.variables &&
            customizingTemplate.variables.length > 0 && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Replace the following placeholders in your message:
                </p>
                <div className="flex flex-wrap gap-1">
                  {customizingTemplate.variables.map((variable) => (
                    <Badge key={variable} variant="outline" className="text-xs">
                      {`{${variable}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full h-32 p-3 border rounded-lg text-base resize-none"
            style={{ fontSize: '16px' }}
            placeholder="Customize your message..."
          />
        </div>

        <div className="flex gap-2 mt-4">
          <TouchButton
            variant="outline"
            onClick={() => {
              setCustomizingTemplate(null);
              setCustomMessage('');
            }}
            className="flex-1"
          >
            Cancel
          </TouchButton>
          <TouchButton
            onClick={handleCustomizeSubmit}
            className="flex-1"
            disabled={!customMessage.trim()}
          >
            Use This Message
          </TouchButton>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-3">Quick Templates</h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10"
            style={{ fontSize: '16px' }}
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <TouchButton
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="whitespace-nowrap"
          >
            All
          </TouchButton>
          {categories.map((category) => (
            <TouchButton
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {categoryLabels[category]}
            </TouchButton>
          ))}
        </div>
      </div>

      {/* Templates */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4">
        <div className="space-y-2">
          {filteredTemplates.map((template) => (
            <TouchButton
              key={template.id}
              variant="outline"
              className="w-full p-4 h-auto text-left justify-start"
              onClick={() => handleTemplateSelect(template)}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="mt-1">{template.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{template.title}</h4>
                    <Badge
                      variant={categoryColors[template.category]}
                      className="shrink-0"
                    >
                      {categoryLabels[template.category]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.message}
                  </p>
                  {template.variables && template.variables.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Info className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Customizable
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </TouchButton>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No templates found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or category filter
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
