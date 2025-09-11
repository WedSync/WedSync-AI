'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { TouchButton } from '@/components/touch/TouchButton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  User,
  Users,
  Heart,
  Calendar,
  MapPin,
  Clock,
  X,
  Plus,
  Edit3,
  Sparkles,
  Check,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface PersonalizationVariable {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'guest' | 'wedding' | 'event' | 'custom';
  defaultValue?: string;
  options?: string[];
  type: 'text' | 'select' | 'date' | 'time' | 'custom';
}

interface GuestPersonalization {
  guestId: string;
  guestName: string;
  variables: Record<string, string>;
}

interface MobilePersonalizationProps {
  message: string;
  selectedGuestIds: string[];
  guests: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    group: string;
    relation?: string;
  }>;
  onPersonalize: (
    personalizedMessages: Array<{
      guestId: string;
      message: string;
    }>,
  ) => void;
  onCancel: () => void;
  className?: string;
}

const personalizationVariables: PersonalizationVariable[] = [
  // Guest variables
  {
    key: 'guest_name',
    label: 'Guest Name',
    description: "The guest's first name",
    icon: <User className="w-4 h-4" />,
    category: 'guest',
    type: 'text',
  },
  {
    key: 'guest_full_name',
    label: 'Full Name',
    description: "The guest's full name",
    icon: <Users className="w-4 h-4" />,
    category: 'guest',
    type: 'text',
  },
  {
    key: 'guest_relation',
    label: 'Relationship',
    description: "How they're related to you",
    icon: <Heart className="w-4 h-4" />,
    category: 'guest',
    type: 'text',
  },

  // Wedding variables
  {
    key: 'wedding_date',
    label: 'Wedding Date',
    description: 'Your wedding date',
    icon: <Calendar className="w-4 h-4" />,
    category: 'wedding',
    type: 'date',
    defaultValue: 'June 15th, 2024',
  },
  {
    key: 'wedding_venue',
    label: 'Wedding Venue',
    description: 'Your ceremony venue',
    icon: <MapPin className="w-4 h-4" />,
    category: 'wedding',
    type: 'text',
    defaultValue: 'Sunset Gardens',
  },
  {
    key: 'wedding_time',
    label: 'Wedding Time',
    description: 'Ceremony start time',
    icon: <Clock className="w-4 h-4" />,
    category: 'wedding',
    type: 'time',
    defaultValue: '4:00 PM',
  },

  // Event variables
  {
    key: 'reception_venue',
    label: 'Reception Venue',
    description: 'Reception location',
    icon: <MapPin className="w-4 h-4" />,
    category: 'event',
    type: 'text',
    defaultValue: 'Grand Ballroom',
  },
  {
    key: 'reception_time',
    label: 'Reception Time',
    description: 'Reception start time',
    icon: <Clock className="w-4 h-4" />,
    category: 'event',
    type: 'time',
    defaultValue: '6:00 PM',
  },
  {
    key: 'dress_code',
    label: 'Dress Code',
    description: 'Wedding attire expectation',
    icon: <Sparkles className="w-4 h-4" />,
    category: 'event',
    type: 'select',
    options: [
      'Formal',
      'Semi-formal',
      'Cocktail',
      'Garden Party',
      'Beach Casual',
    ],
    defaultValue: 'Semi-formal',
  },
];

const categoryLabels = {
  guest: 'Guest Info',
  wedding: 'Wedding Details',
  event: 'Event Details',
  custom: 'Custom',
};

const categoryColors = {
  guest: 'text-blue-600 bg-blue-50',
  wedding: 'text-pink-600 bg-pink-50',
  event: 'text-purple-600 bg-purple-50',
  custom: 'text-green-600 bg-green-50',
};

export function MobilePersonalization({
  message,
  selectedGuestIds,
  guests,
  onPersonalize,
  onCancel,
  className = '',
}: MobilePersonalizationProps) {
  const [personalizedMessages, setPersonalizedMessages] = useState<
    Record<string, string>
  >({});
  const [globalVariables, setGlobalVariables] = useState<
    Record<string, string>
  >({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['guest']),
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedPreviewGuest, setSelectedPreviewGuest] = useState<string>(
    selectedGuestIds[0] || '',
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize global variables with defaults
  useEffect(() => {
    const defaults: Record<string, string> = {};
    personalizationVariables.forEach((variable) => {
      if (variable.defaultValue) {
        defaults[variable.key] = variable.defaultValue;
      }
    });
    setGlobalVariables(defaults);
  }, []);

  // Extract variables from message
  const extractedVariables = useMemo(() => {
    const regex = /\{([^}]+)\}/g;
    const variables = new Set<string>();
    let match;
    while ((match = regex.exec(message)) !== null) {
      variables.add(match[1]);
    }
    return Array.from(variables);
  }, [message]);

  // Get available personalization options
  const availableVariables = useMemo(() => {
    return personalizationVariables.filter(
      (variable) =>
        extractedVariables.includes(variable.key) ||
        variable.category === 'wedding' ||
        variable.category === 'event',
    );
  }, [extractedVariables]);

  // Group variables by category
  const groupedVariables = useMemo(() => {
    const grouped = availableVariables.reduce(
      (acc, variable) => {
        if (!acc[variable.category]) acc[variable.category] = [];
        acc[variable.category].push(variable);
        return acc;
      },
      {} as Record<string, PersonalizationVariable[]>,
    );

    return grouped;
  }, [availableVariables]);

  // Generate personalized message for a guest
  const generatePersonalizedMessage = (guestId: string) => {
    const guest = guests.find((g) => g.id === guestId);
    if (!guest) return message;

    let personalizedMessage = message;

    // Replace guest-specific variables
    const guestVariables = {
      guest_name: guest.name.split(' ')[0],
      guest_full_name: guest.name,
      guest_relation: guest.relation || 'friend',
    };

    // Combine with global variables
    const allVariables = { ...globalVariables, ...guestVariables };

    // Replace all variables in the message
    Object.entries(allVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      personalizedMessage = personalizedMessage.replace(regex, value);
    });

    return personalizedMessage;
  };

  const handleVariableChange = (key: string, value: string) => {
    setGlobalVariables((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handlePersonalize = () => {
    const personalizedMessages = selectedGuestIds.map((guestId) => ({
      guestId,
      message: generatePersonalizedMessage(guestId),
    }));

    onPersonalize(personalizedMessages);
  };

  const insertVariable = (variableKey: string) => {
    const variable = `{${variableKey}}`;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentMessage = textarea.value;
    const newMessage =
      currentMessage.slice(0, start) + variable + currentMessage.slice(end);

    // Update the message (this would need to be passed up to parent component)
    // For now, just focus back on textarea
    textarea.focus();
    setTimeout(() => {
      textarea.setSelectionRange(
        start + variable.length,
        start + variable.length,
      );
    }, 0);
  };

  if (previewMode) {
    const previewGuest = guests.find((g) => g.id === selectedPreviewGuest);
    const previewMessage = generatePersonalizedMessage(selectedPreviewGuest);

    return (
      <Card className={`p-4 h-full flex flex-col ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Message Preview</h3>
            <p className="text-sm text-muted-foreground">
              How it looks for {previewGuest?.name}
            </p>
          </div>
          <TouchButton
            variant="outline"
            onClick={() => setPreviewMode(false)}
            size="sm"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit
          </TouchButton>
        </div>

        {/* Guest Selector for Preview */}
        {selectedGuestIds.length > 1 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Preview for:</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {selectedGuestIds.map((guestId) => {
                const guest = guests.find((g) => g.id === guestId);
                if (!guest) return null;

                return (
                  <TouchButton
                    key={guestId}
                    size="sm"
                    variant={
                      selectedPreviewGuest === guestId ? 'default' : 'outline'
                    }
                    onClick={() => setSelectedPreviewGuest(guestId)}
                    className="whitespace-nowrap"
                  >
                    {guest.name}
                  </TouchButton>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Preview */}
        <div className="flex-1 mb-4">
          <Card className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-pink-100">
                <MessageSquare className="w-4 h-4 text-pink-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-pink-800 mb-1">
                  From: Sarah & Michael
                </p>
                <p className="text-gray-800 leading-relaxed">
                  {previewMessage}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <TouchButton variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </TouchButton>
          <TouchButton
            onClick={handlePersonalize}
            className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500"
          >
            <Check className="w-4 h-4 mr-2" />
            Send Messages
          </TouchButton>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 h-full flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Personalize Messages</h3>
          <p className="text-sm text-muted-foreground">
            Customize for {selectedGuestIds.length} recipient
            {selectedGuestIds.length === 1 ? '' : 's'}
          </p>
        </div>
        <TouchButton
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </TouchButton>
      </div>

      {/* Variables Section */}
      <ScrollArea className="flex-1 mb-4">
        <div className="space-y-4">
          {Object.entries(groupedVariables).map(([category, variables]) => (
            <div key={category}>
              <TouchButton
                variant="ghost"
                onClick={() => toggleCategory(category)}
                className="w-full justify-between p-2 h-auto"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1 rounded ${categoryColors[category as keyof typeof categoryColors]}`}
                  >
                    {variables[0].icon}
                  </div>
                  <span className="font-medium">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {variables.length}
                  </Badge>
                </div>
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </TouchButton>

              {expandedCategories.has(category) && (
                <div className="space-y-3 mt-2 pl-4">
                  {variables.map((variable) => (
                    <div key={variable.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">
                          {variable.label}
                        </label>
                        <TouchButton
                          size="sm"
                          variant="ghost"
                          onClick={() => insertVariable(variable.key)}
                          className="h-6 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Insert
                        </TouchButton>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {variable.description}
                      </p>

                      {variable.type === 'select' && variable.options ? (
                        <select
                          value={
                            globalVariables[variable.key] ||
                            variable.defaultValue ||
                            ''
                          }
                          onChange={(e) =>
                            handleVariableChange(variable.key, e.target.value)
                          }
                          className="w-full p-2 border rounded-lg text-sm"
                        >
                          {variable.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type={
                            variable.type === 'date'
                              ? 'date'
                              : variable.type === 'time'
                                ? 'time'
                                : 'text'
                          }
                          value={
                            globalVariables[variable.key] ||
                            variable.defaultValue ||
                            ''
                          }
                          onChange={(e) =>
                            handleVariableChange(variable.key, e.target.value)
                          }
                          placeholder={`Enter ${variable.label.toLowerCase()}`}
                          className="text-sm"
                          style={{ fontSize: '16px' }}
                        />
                      )}

                      {category === 'guest' && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                          This will be automatically filled for each guest
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {Object.keys(groupedVariables).length === 0 && (
            <div className="text-center py-6">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                No personalization variables found in your message
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Add variables like {'{guest_name}'} to personalize
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex gap-2">
        <TouchButton variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </TouchButton>
        <TouchButton
          variant="outline"
          onClick={() => setPreviewMode(true)}
          className="flex-1"
        >
          Preview
        </TouchButton>
        <TouchButton
          onClick={handlePersonalize}
          className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500"
        >
          <Check className="w-4 h-4 mr-2" />
          Personalize
        </TouchButton>
      </div>
    </Card>
  );
}
