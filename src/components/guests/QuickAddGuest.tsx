'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  UserPlusIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  HomeIcon,
  HeartIcon,
  BriefcaseIcon,
  UserIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { toast } from '@/lib/utils/toast';
import { useDebounce } from '@/hooks/useDebounce';

interface ParsedGuestData {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  category: 'family' | 'friends' | 'work' | 'other';
  side: 'partner1' | 'partner2' | 'mutual';
  plus_one: boolean;
  plus_one_name?: string;
  age_group: 'adult' | 'child' | 'infant';
  dietary_restrictions?: string;
  notes?: string;
  confidence: number;
}

interface Household {
  id: string;
  name: string;
  address?: string;
  guest_count: number;
}

interface QuickAddGuestProps {
  coupleId: string;
  onGuestAdded?: () => void;
  className?: string;
}

const CATEGORY_ICONS = {
  family: { icon: HomeIcon, color: 'bg-blue-100 text-blue-800' },
  friends: { icon: HeartIcon, color: 'bg-green-100 text-green-800' },
  work: { icon: BriefcaseIcon, color: 'bg-purple-100 text-purple-800' },
  other: { icon: UserIcon, color: 'bg-gray-100 text-gray-800' },
};

const NATURAL_LANGUAGE_EXAMPLES = [
  'John Smith from work, john@company.com, vegetarian, plus Mary Smith',
  'Sarah Johnson, my college friend, 555-1234, no dietary restrictions',
  'Uncle Bob Wilson and Aunt Carol, family side bride, gluten free',
  'Mike the photographer, mike@photo.com, bringing assistant Jane',
];

export function QuickAddGuest({
  coupleId,
  onGuestAdded,
  className,
}: QuickAddGuestProps) {
  const [input, setInput] = useState('');
  const [parsedData, setParsedData] = useState<ParsedGuestData | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedInput = useDebounce(input, 500);
  const supabase = createClient();

  // Load existing households for autocomplete
  useEffect(() => {
    loadHouseholds();
  }, []);

  const loadHouseholds = async () => {
    try {
      const { data, error } = await supabase
        .from('households')
        .select(
          `
          id,
          name,
          address,
          guests!inner(id)
        `,
        )
        .eq('guests.couple_id', coupleId);

      if (error) throw error;

      const householdsWithCounts =
        data?.map((household) => ({
          id: household.id,
          name: household.name,
          address: household.address,
          guest_count: household.guests.length,
        })) || [];

      setHouseholds(householdsWithCounts);
    } catch (error) {
      console.error('Error loading households:', error);
    }
  };

  // Parse natural language input
  useEffect(() => {
    if (debouncedInput.length > 10) {
      parseNaturalLanguageInput(debouncedInput);
    } else {
      setParsedData(null);
      setValidationErrors([]);
    }
  }, [debouncedInput]);

  const parseNaturalLanguageInput = useCallback(async (text: string) => {
    try {
      // Enhanced natural language parsing with multiple patterns
      const result = await parseGuestText(text);
      setParsedData(result);

      // Validate parsed data
      const errors: string[] = [];
      if (!result.first_name.trim()) errors.push('First name is required');
      if (!result.last_name.trim()) errors.push('Last name is required');
      if (result.email && !isValidEmail(result.email))
        errors.push('Invalid email format');
      if (result.phone && !isValidPhone(result.phone))
        errors.push('Invalid phone format');

      setValidationErrors(errors);
    } catch (error) {
      console.error('Parsing error:', error);
      setParsedData(null);
      setValidationErrors([
        'Could not parse input. Please check format and try again.',
      ]);
    }
  }, []);

  const parseGuestText = async (text: string): Promise<ParsedGuestData> => {
    // This is a comprehensive natural language parser for guest information
    const lowerText = text.toLowerCase();

    // Initialize result
    const result: ParsedGuestData = {
      first_name: '',
      last_name: '',
      category: 'other',
      side: 'mutual',
      plus_one: false,
      age_group: 'adult',
      confidence: 0,
    };

    // Extract names (first pattern: "FirstName LastName")
    const namePatterns = [
      /^([a-z]+(?:\s[a-z]+)*)\s+([a-z]+(?:\s[a-z]+)*)/i,
      /([a-z]+)\s+([a-z]+)/i,
    ];

    for (const pattern of namePatterns) {
      const nameMatch = text.match(pattern);
      if (nameMatch) {
        result.first_name = nameMatch[1].trim();
        result.last_name = nameMatch[2].trim();
        result.confidence += 30;
        break;
      }
    }

    // Extract email
    const emailMatch = text.match(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    );
    if (emailMatch) {
      result.email = emailMatch[1];
      result.confidence += 20;
    }

    // Extract phone
    const phonePatterns = [
      /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/,
      /(\(\d{3}\)\s?\d{3}[-.\s]?\d{4})/,
      /(\d{10})/,
    ];

    for (const pattern of phonePatterns) {
      const phoneMatch = text.match(pattern);
      if (phoneMatch) {
        result.phone = phoneMatch[1].replace(/\D/g, '');
        result.confidence += 15;
        break;
      }
    }

    // Determine category from context clues
    const categoryKeywords = {
      family: [
        'family',
        'uncle',
        'aunt',
        'cousin',
        'brother',
        'sister',
        'parent',
        'mother',
        'father',
        'mom',
        'dad',
        'grandpa',
        'grandma',
        'grandfather',
        'grandmother',
      ],
      friends: ['friend', 'college', 'school', 'buddy', 'roommate', 'neighbor'],
      work: [
        'work',
        'colleague',
        'boss',
        'coworker',
        'office',
        'company',
        'business',
      ],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        result.category = category as any;
        result.confidence += 15;
        break;
      }
    }

    // Determine side
    const sideKeywords = {
      partner1: [
        'bride',
        'groom',
        'partner1',
        'my side',
        "bride's side",
        "groom's side",
      ],
      partner2: ['partner2', 'their side', "partner's side"],
    };

    for (const [side, keywords] of Object.entries(sideKeywords)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        result.side = side as any;
        result.confidence += 10;
        break;
      }
    }

    // Check for plus one
    const plusOneIndicators = [
      'plus one',
      '+1',
      'bringing',
      'with',
      'and',
      'plus',
      'bringing guest',
      'bringing date',
      'bringing partner',
      'bringing wife',
      'bringing husband',
    ];

    const hasPlusOne = plusOneIndicators.some((indicator) =>
      lowerText.includes(indicator),
    );
    if (hasPlusOne) {
      result.plus_one = true;
      result.confidence += 10;

      // Try to extract plus one name
      const plusOnePatterns = [
        /(?:plus|bringing|with|and)\s+([a-z]+(?:\s[a-z]+)*)/i,
        /(?:wife|husband|partner|date)\s+([a-z]+(?:\s[a-z]+)*)/i,
      ];

      for (const pattern of plusOnePatterns) {
        const plusOneMatch = text.match(pattern);
        if (plusOneMatch && plusOneMatch[1] !== result.first_name) {
          result.plus_one_name = plusOneMatch[1].trim();
          result.confidence += 5;
          break;
        }
      }
    }

    // Check for age indicators
    const ageIndicators = {
      child: ['child', 'kid', 'son', 'daughter', 'boy', 'girl'],
      infant: ['baby', 'infant', 'toddler'],
    };

    for (const [ageGroup, keywords] of Object.entries(ageIndicators)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        result.age_group = ageGroup as any;
        result.confidence += 10;
        break;
      }
    }

    // Extract dietary restrictions
    const dietaryKeywords = [
      'vegetarian',
      'vegan',
      'gluten free',
      'gluten-free',
      'dairy free',
      'dairy-free',
      'nut allergy',
      'peanut allergy',
      'kosher',
      'halal',
      'keto',
      'paleo',
      'no dietary restrictions',
      'no allergies',
    ];

    for (const dietary of dietaryKeywords) {
      if (lowerText.includes(dietary)) {
        result.dietary_restrictions = dietary;
        result.confidence += 5;
        break;
      }
    }

    // Extract notes from remaining text
    const notesIndicators = ['note:', 'notes:', 'comment:', 'special:'];
    for (const indicator of notesIndicators) {
      const index = lowerText.indexOf(indicator);
      if (index !== -1) {
        result.notes = text.substring(index + indicator.length).trim();
        result.confidence += 5;
        break;
      }
    }

    // Minimum confidence check
    if (result.confidence < 20) {
      throw new Error('Insufficient information to parse guest data');
    }

    return result;
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone: string): boolean => {
    return /^\d{10}$/.test(phone.replace(/\D/g, ''));
  };

  const handleCreateGuest = async () => {
    if (!parsedData || validationErrors.length > 0) return;

    setCreating(true);
    try {
      // Prepare guest data
      const guestData = {
        couple_id: coupleId,
        first_name: parsedData.first_name.trim(),
        last_name: parsedData.last_name.trim(),
        email: parsedData.email?.trim() || null,
        phone: parsedData.phone || null,
        category: parsedData.category,
        side: parsedData.side,
        plus_one: parsedData.plus_one,
        plus_one_name: parsedData.plus_one_name?.trim() || null,
        age_group: parsedData.age_group,
        dietary_restrictions: parsedData.dietary_restrictions?.trim() || null,
        notes: parsedData.notes?.trim() || null,
        household_id: selectedHousehold || null,
      };

      // Create the guest
      const { data: newGuest, error } = await supabase
        .from('guests')
        .insert([guestData])
        .select()
        .single();

      if (error) throw error;

      // If no household selected but we have a last name, create/find household
      if (!selectedHousehold && parsedData.last_name) {
        const householdName = `${parsedData.last_name} Family`;

        const { data: household } = await supabase
          .from('households')
          .insert([
            {
              name: householdName,
              couple_id: coupleId,
            },
          ])
          .select()
          .single();

        if (household) {
          await supabase
            .from('guests')
            .update({ household_id: household.id })
            .eq('id', newGuest.id);
        }
      }

      toast.success(
        `${parsedData.first_name} ${parsedData.last_name} added successfully!`,
      );

      // Reset form
      setInput('');
      setParsedData(null);
      setSelectedHousehold('');
      setValidationErrors([]);

      // Reload households and notify parent
      loadHouseholds();
      onGuestAdded?.();
    } catch (error) {
      console.error('Error creating guest:', error);
      toast.error('Failed to add guest');
    } finally {
      setCreating(false);
    }
  };

  const fillExample = (example: string) => {
    setInput(example);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
          <UserPlusIcon className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Quick Add Guest</h3>
          <p className="text-sm text-gray-500">
            Describe your guest in natural language and we'll parse the details
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="ml-auto"
        >
          <LightBulbIcon className="h-4 w-4 mr-2" />
          Examples
        </Button>
      </div>

      {/* Examples dropdown */}
      {showSuggestions && (
        <Alert className="mb-4 bg-yellow-50 border-yellow-200">
          <SparklesIcon className="h-4 w-4" />
          <div>
            <p className="font-medium mb-2">Try these examples:</p>
            <div className="space-y-2">
              {NATURAL_LANGUAGE_EXAMPLES.map((example, index) => (
                <button
                  key={index}
                  onClick={() => fillExample(example)}
                  className="block w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>
        </Alert>
      )}

      {/* Input field */}
      <div className="space-y-4">
        <div>
          <Input
            ref={inputRef}
            placeholder="Describe your guest... (e.g., 'John Smith from work, john@company.com, vegetarian, bringing wife Sarah')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="text-base"
          />
          <p className="text-xs text-gray-500 mt-1">
            Include name, relationship, contact info, dietary needs, plus-one
            details
          </p>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <XCircleIcon className="h-4 w-4 text-red-600" />
            <div>
              <p className="font-medium text-red-900 mb-1">
                Please fix these issues:
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </Alert>
        )}

        {/* Parsed data preview */}
        {parsedData && validationErrors.length === 0 && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">
                  Parsed Information
                </span>
                <Badge variant="secondary" className="text-xs">
                  {parsedData.confidence}% confidence
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-900 mb-2">Basic Info</div>
                <div className="space-y-1 text-gray-700">
                  <div>
                    <span className="font-medium">Name:</span>{' '}
                    {parsedData.first_name} {parsedData.last_name}
                  </div>
                  {parsedData.email && (
                    <div>
                      <span className="font-medium">Email:</span>{' '}
                      {parsedData.email}
                    </div>
                  )}
                  {parsedData.phone && (
                    <div>
                      <span className="font-medium">Phone:</span>{' '}
                      {parsedData.phone}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Age Group:</span>{' '}
                    {parsedData.age_group}
                  </div>
                </div>
              </div>

              <div>
                <div className="font-medium text-gray-900 mb-2">
                  Wedding Details
                </div>
                <div className="space-y-1 text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Category:</span>
                    <Badge
                      className={CATEGORY_ICONS[parsedData.category].color}
                    >
                      {parsedData.category}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Side:</span> {parsedData.side}
                  </div>
                  {parsedData.plus_one && (
                    <div>
                      <span className="font-medium">Plus One:</span>{' '}
                      {parsedData.plus_one_name || 'Yes'}
                    </div>
                  )}
                  {parsedData.dietary_restrictions && (
                    <div>
                      <span className="font-medium">Dietary:</span>{' '}
                      {parsedData.dietary_restrictions}
                    </div>
                  )}
                  {parsedData.notes && (
                    <div>
                      <span className="font-medium">Notes:</span>{' '}
                      {parsedData.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Household selection */}
            {households.length > 0 && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Add to Household (optional)
                </label>
                <select
                  value={selectedHousehold}
                  onChange={(e) => setSelectedHousehold(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Create new household</option>
                  {households.map((household) => (
                    <option key={household.id} value={household.id}>
                      {household.name} ({household.guest_count} guests)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-green-200">
              <Button
                variant="outline"
                onClick={() => {
                  setInput('');
                  setParsedData(null);
                  setValidationErrors([]);
                }}
              >
                Clear
              </Button>
              <Button
                onClick={handleCreateGuest}
                disabled={creating}
                className="flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="h-4 w-4" />
                    Add Guest
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Card>
  );
}
