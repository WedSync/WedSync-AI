'use client';

/**
 * WS-254: AI-Powered Menu Generator Component
 * Generates optimized wedding menus based on dietary requirements
 * Features: AI integration, compliance scoring, cost analysis
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChefHat,
  Wand2,
  DollarSign,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  RefreshCw,
  Download,
  Share,
  TrendingUp,
  Settings,
  Utensils,
  Globe,
  Leaf,
} from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';

// TypeScript interfaces
interface DietaryRequirement {
  id: string;
  guest_name: string;
  category: 'allergy' | 'diet' | 'medical' | 'preference';
  severity: number;
  notes: string;
  verified: boolean;
  emergency_contact?: string;
}

interface MenuDish {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  dietary_tags: string[];
  cost: number;
  prep_time: number;
}

interface MenuCourse {
  id: string;
  name: string;
  type: 'appetizer' | 'main' | 'dessert' | 'side';
  dishes: MenuDish[];
}

interface MenuOption {
  id: string;
  name: string;
  description: string;
  courses: MenuCourse[];
  compliance_score: number;
  total_cost: number;
  cost_per_person: number;
  preparation_time: number;
  warnings: string[];
  ai_confidence: number;
  created_at: string;
}

interface MenuGeneratorProps {
  weddingId: string;
  requirements: DietaryRequirement[];
  guestCount: number;
  onMenuSelect?: (menu: MenuOption) => void;
  className?: string;
}

export function MenuGenerator({
  weddingId,
  requirements,
  guestCount,
  onMenuSelect,
  className = '',
}: MenuGeneratorProps) {
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Generation settings
  const [selectedStyle, setSelectedStyle] = useState('formal');
  const [budgetPerPerson, setBudgetPerPerson] = useState(75);
  const [mealType, setMealType] = useState('dinner');
  const [culturalPreferences, setCulturalPreferences] = useState('');
  const [seasonalPreferences, setSeasonalPreferences] = useState('');
  const [venueRestrictions, setVenueRestrictions] = useState('');
  const [supplierSpecialties, setSupplierSpecialties] = useState('');

  const { navigateTo } = useNavigation();

  const menuStyles = [
    {
      value: 'formal',
      label: 'Formal Plated',
      description: 'Elegant multi-course dining experience',
      icon: '🍽️',
    },
    {
      value: 'buffet',
      label: 'Buffet Style',
      description: 'Self-service variety and flexibility',
      icon: '🍽️',
    },
    {
      value: 'family-style',
      label: 'Family Style',
      description: 'Shared plates and bowls for intimate feel',
      icon: '👨‍👩‍👧‍👦',
    },
    {
      value: 'cocktail',
      label: 'Cocktail Reception',
      description: 'Elegant appetizers and finger foods',
      icon: '🥂',
    },
    {
      value: 'casual',
      label: 'Casual Dining',
      description: 'Relaxed atmosphere and comfort foods',
      icon: '🍔',
    },
  ];

  const mealTypes = [
    { value: 'lunch', label: 'Lunch Reception', time: '12:00-15:00' },
    { value: 'dinner', label: 'Dinner Reception', time: '18:00-22:00' },
    { value: 'brunch', label: 'Brunch Reception', time: '10:00-14:00' },
    { value: 'cocktail', label: 'Cocktail Hour Only', time: '17:00-19:00' },
  ];

  // Progress animation effect
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 800);

      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  // Group dietary requirements by category
  const groupedRequirements = requirements.reduce(
    (acc, req) => {
      if (!acc[req.category]) acc[req.category] = [];
      acc[req.category].push(req.notes);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  // Generate menu using AI
  const generateMenu = async () => {
    setIsGenerating(true);
    setGenerationProgress(10);
    setMenuOptions([]);
    setError(null);

    try {
      const dietaryRequirements = {
        allergies: groupedRequirements.allergy || [],
        diets: groupedRequirements.diet || [],
        medical: groupedRequirements.medical || [],
        preferences: groupedRequirements.preference || [],
      };

      setGenerationProgress(30);

      const requestBody = {
        wedding_id: weddingId,
        guest_count: guestCount,
        dietary_requirements: dietaryRequirements,
        menu_style: selectedStyle,
        budget_per_person: budgetPerPerson,
        meal_type: mealType,
        cultural_requirements: culturalPreferences
          .split(',')
          .filter(Boolean)
          .map((s) => s.trim()),
        seasonal_preferences: seasonalPreferences
          .split(',')
          .filter(Boolean)
          .map((s) => s.trim()),
        venue_restrictions: venueRestrictions
          .split(',')
          .filter(Boolean)
          .map((s) => s.trim()),
        supplier_specialties: supplierSpecialties
          .split(',')
          .filter(Boolean)
          .map((s) => s.trim()),
      };

      setGenerationProgress(50);

      const response = await fetch('/api/catering/menu/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: JSON.stringify(requestBody),
      });

      setGenerationProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Menu generation failed');
      }

      setGenerationProgress(100);

      setTimeout(() => {
        setMenuOptions(data.data.menu_options || []);
        setIsGenerating(false);
        setGenerationProgress(0);
      }, 500);
    } catch (err) {
      console.error('Menu generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate menu');
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // Get compliance styling
  const getComplianceStyle = (score: number) => {
    if (score >= 0.9)
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        text: 'Excellent',
      };
    if (score >= 0.7)
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        text: 'Good',
      };
    return {
      color: 'bg-red-100 text-red-800 border-red-200',
      text: 'Needs Review',
    };
  };

  // Export menu functionality
  const exportMenu = (menu: MenuOption) => {
    const menuText = `
WEDDING MENU - ${menu.name}
${menu.description}

Cost: $${menu.cost_per_person} per person
Total: $${menu.total_cost}
Prep Time: ${menu.preparation_time} hours
AI Confidence: ${Math.round(menu.ai_confidence * 100)}%
Compliance Score: ${Math.round(menu.compliance_score * 100)}%

COURSES:
${menu.courses
  .map(
    (course) => `
${course.name.toUpperCase()}
${course.dishes.map((dish) => `- ${dish.name}: ${dish.description}`).join('\n')}
`,
  )
  .join('\n')}

${menu.warnings.length > 0 ? `WARNINGS:\n${menu.warnings.map((w) => `- ${w}`).join('\n')}` : ''}
    `.trim();

    const blob = new Blob([menuText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${menu.name.replace(/\s+/g, '_')}_menu.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center">
          <Wand2 className="h-8 w-8 mr-3 text-purple-600" />
          AI-Powered Menu Generation
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Let our AI chef create the perfect menu based on your guests' dietary
          requirements, budget, and style preferences. Every suggestion is
          optimized for safety and satisfaction.
        </p>
      </div>

      {/* Generation Settings */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Menu Generation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Settings Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Menu Style
              </label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
              >
                {menuStyles.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.icon} {style.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {menuStyles.find((s) => s.value === selectedStyle)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Meal Type
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
              >
                {mealTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {mealTypes.find((t) => t.value === mealType)?.time}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Budget Per Person
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  min="20"
                  max="300"
                  step="5"
                  value={budgetPerPerson}
                  onChange={(e) => setBudgetPerPerson(Number(e.target.value))}
                  className="pl-10 p-3"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total budget: ${(budgetPerPerson * guestCount).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="border-t pt-6">
            <h4 className="font-medium text-gray-900 mb-4">
              Advanced Preferences
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium mb-2">
                  <Globe className="h-4 w-4 mr-1" />
                  Cultural Preferences
                </label>
                <Input
                  placeholder="e.g., Italian, Asian, Mediterranean, Indian"
                  value={culturalPreferences}
                  onChange={(e) => setCulturalPreferences(e.target.value)}
                  className="p-3"
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium mb-2">
                  <Leaf className="h-4 w-4 mr-1" />
                  Seasonal Preferences
                </label>
                <Input
                  placeholder="e.g., spring, summer, local, organic, farm-to-table"
                  value={seasonalPreferences}
                  onChange={(e) => setSeasonalPreferences(e.target.value)}
                  className="p-3"
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium mb-2">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Venue Restrictions
                </label>
                <Input
                  placeholder="e.g., no open flames, limited kitchen space"
                  value={venueRestrictions}
                  onChange={(e) => setVenueRestrictions(e.target.value)}
                  className="p-3"
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium mb-2">
                  <ChefHat className="h-4 w-4 mr-1" />
                  Supplier Specialties
                </label>
                <Input
                  placeholder="e.g., seafood, BBQ, vegan cuisine, pastries"
                  value={supplierSpecialties}
                  onChange={(e) => setSupplierSpecialties(e.target.value)}
                  className="p-3"
                />
              </div>
            </div>
          </div>

          {/* Requirements Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">
              Dietary Requirements Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['allergies', 'diets', 'medical', 'preferences'].map(
                (category) => {
                  const count =
                    groupedRequirements[category.slice(0, -1)]?.length || 0;
                  return (
                    <div key={category} className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {count}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">
                        {category}
                      </div>
                    </div>
                  );
                },
              )}
            </div>

            {requirements.filter((r) => r.severity >= 4).length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center text-red-600">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">
                    {requirements.filter((r) => r.severity >= 4).length}{' '}
                    high-severity requirements
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="text-center pt-4">
            <Button
              onClick={generateMenu}
              disabled={isGenerating || requirements.length === 0}
              size="lg"
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="h-5 w-5 mr-2 animate-spin" />
                  Generating Menu... {Math.round(generationProgress)}%
                </>
              ) : (
                <>
                  <ChefHat className="h-5 w-5 mr-2" />
                  Generate AI Menu
                </>
              )}
            </Button>

            {requirements.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Add guest dietary requirements first to generate a menu
              </p>
            )}

            {requirements.length > 0 && !isGenerating && (
              <p className="text-sm text-gray-600 mt-2">
                Ready to generate {menuOptions.length > 0 ? 'new' : ''} menu
                options for {guestCount} guests
              </p>
            )}
          </div>

          {/* Progress Bar */}
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full"
            >
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div
                  className="bg-purple-500 h-3 rounded-full relative overflow-hidden"
                  initial={{ width: 0 }}
                  animate={{ width: `${generationProgress}%` }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </motion.div>
              </div>
              <p className="text-center text-sm text-gray-600 mt-2">
                {generationProgress < 30
                  ? 'Analyzing dietary requirements...'
                  : generationProgress < 60
                    ? 'Generating menu options...'
                    : generationProgress < 90
                      ? 'Validating compliance...'
                      : 'Finalizing menus...'}
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Menu Generation Failed:</strong> {error}
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={generateMenu}
          >
            Try Again
          </Button>
        </Alert>
      )}

      {/* Generated Menu Options */}
      <AnimatePresence>
        {menuOptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Generated Menu Options ({menuOptions.length})
              </h3>
              <Button
                variant="outline"
                onClick={generateMenu}
                disabled={isGenerating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate More
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {menuOptions.map((menu, index) => {
                const complianceStyle = getComplianceStyle(
                  menu.compliance_score,
                );

                return (
                  <motion.div
                    key={menu.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-shadow border-2">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center">
                              <Utensils className="h-5 w-5 mr-2" />
                              <span>Menu Option {index + 1}</span>
                              <Badge
                                className={`ml-2 ${complianceStyle.color}`}
                              >
                                {Math.round(menu.compliance_score * 100)}% Safe
                              </Badge>
                            </CardTitle>
                            <p className="text-gray-600 mt-1">
                              {menu.description}
                            </p>
                          </div>
                        </div>

                        {/* Menu Stats */}
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <DollarSign className="h-4 w-4 text-gray-500 mr-1" />
                            </div>
                            <div className="text-lg font-semibold">
                              ${menu.cost_per_person}
                            </div>
                            <div className="text-xs text-gray-500">
                              per person
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <Clock className="h-4 w-4 text-gray-500 mr-1" />
                            </div>
                            <div className="text-lg font-semibold">
                              {menu.preparation_time}h
                            </div>
                            <div className="text-xs text-gray-500">
                              prep time
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <TrendingUp className="h-4 w-4 text-gray-500 mr-1" />
                            </div>
                            <div className="text-lg font-semibold">
                              {Math.round(menu.ai_confidence * 100)}%
                            </div>
                            <div className="text-xs text-gray-500">
                              AI confidence
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Courses */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            Menu Courses
                          </h4>
                          <div className="space-y-2">
                            {menu.courses.map((course) => (
                              <div
                                key={course.id}
                                className="border rounded-lg p-3"
                              >
                                <div className="font-medium capitalize text-gray-900 flex items-center">
                                  <Utensils className="h-4 w-4 mr-1" />
                                  {course.name}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {course.dishes
                                    .map((dish) => dish.name)
                                    .join(', ')}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {course.dishes.length} dish
                                  {course.dishes.length !== 1 ? 'es' : ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Warnings */}
                        {menu.warnings.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-start">
                              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2" />
                              <div>
                                <div className="font-medium text-yellow-800">
                                  Safety Warnings
                                </div>
                                <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                                  {menu.warnings.map((warning, idx) => (
                                    <li key={idx}>• {warning}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => onMenuSelect?.(menu)}
                            className="w-full"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Select This Menu
                          </Button>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => exportMenu(menu)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                if (navigator.share) {
                                  navigator.share({
                                    title: menu.name,
                                    text: menu.description,
                                    url: window.location.href,
                                  });
                                }
                              }}
                            >
                              <Share className="h-4 w-4 mr-2" />
                              Share
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
