# WS-254: Catering Dietary Management System - Technical Specification

## Feature Summary
Comprehensive dietary requirement management and AI-powered menu suggestion system for wedding caterers, including allergen detection, ingredient analysis, portion calculation, and intelligent menu validation.

## User Stories

### Primary User Story
**As a wedding caterer**, I want an intelligent dietary management system that automatically analyzes guest requirements, generates compliant menu options, and calculates precise portions and costs, so I can confidently serve all wedding guests while maintaining food safety and dietary compliance.

### Detailed User Stories

1. **As a caterer receiving dietary requirements**
   - I want to input guest dietary restrictions (allergies, diets, medical conditions) into a centralized system
   - So that I can track all requirements and ensure no guest is overlooked

2. **As a caterer planning menus**
   - I want AI-powered menu generation that considers all dietary restrictions simultaneously
   - So that I can create inclusive menus without manual cross-checking

3. **As a caterer checking menu safety**
   - I want automatic allergen detection and cross-contamination warnings
   - So that I can prevent dangerous food reactions

4. **As a caterer managing costs**
   - I want precise portion calculations with ingredient costs and waste buffers
   - So that I can price menus accurately and minimize food waste

5. **As a wedding planner coordinating catering**
   - I want real-time access to dietary compliance reports and menu options
   - So that I can communicate confidently with couples about catering options

## Database Schema

```sql
-- Core dietary management tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Dietary restriction categories and definitions
CREATE TABLE dietary_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_type TEXT NOT NULL, -- 'allergy', 'diet', 'medical', 'preference'
  name TEXT NOT NULL,
  severity_level INTEGER CHECK (severity_level >= 1 AND severity_level <= 5), -- 1=preference, 5=life-threatening
  description TEXT,
  common_triggers TEXT[], -- Common ingredient triggers
  cross_contamination_risk BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guest dietary requirements
CREATE TABLE guest_dietary_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES weddings(id),
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  dietary_category_id UUID REFERENCES dietary_categories(id),
  severity_level INTEGER DEFAULT 3,
  specific_notes TEXT,
  emergency_contact TEXT,
  verified_by_guest BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingredient database with allergen information
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'protein', 'vegetable', 'grain', 'dairy', 'spice'
  allergen_categories TEXT[], -- Array of allergen types
  dietary_restrictions TEXT[], -- Which diets this violates
  substitutes JSONB, -- Alternative ingredients by restriction type
  cost_per_unit DECIMAL(10,4),
  unit_type TEXT, -- 'kg', 'liter', 'piece'
  shelf_life_days INTEGER,
  storage_requirements TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items and recipes
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'appetizer', 'main', 'dessert', 'side'
  description TEXT,
  ingredients JSONB NOT NULL, -- Array of {ingredient_id, quantity, unit}
  allergen_warnings TEXT[],
  dietary_tags TEXT[], -- 'vegan', 'gluten-free', etc.
  preparation_time_minutes INTEGER,
  cooking_method TEXT,
  serving_size TEXT,
  base_cost_per_serving DECIMAL(10,2),
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  seasonal_availability TEXT[], -- Months when optimal
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated wedding menus
CREATE TABLE wedding_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES weddings(id),
  supplier_id UUID REFERENCES suppliers(id),
  menu_name TEXT NOT NULL,
  guest_count INTEGER NOT NULL,
  dietary_requirements_summary JSONB,
  menu_structure JSONB NOT NULL, -- Course structure with menu_item_ids
  total_cost DECIMAL(12,2),
  cost_per_person DECIMAL(10,2),
  dietary_compliance_score DECIMAL(3,2), -- 0-1 score
  allergen_warnings JSONB,
  preparation_timeline JSONB,
  shopping_list JSONB,
  status TEXT DEFAULT 'draft',
  generated_by_ai BOOLEAN DEFAULT false,
  ai_confidence_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES user_profiles(id)
);

-- Dietary conflict analysis results
CREATE TABLE dietary_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID REFERENCES wedding_menus(id),
  guest_requirement_id UUID REFERENCES guest_dietary_requirements(id),
  menu_item_id UUID REFERENCES menu_items(id),
  conflict_type TEXT NOT NULL, -- 'allergen', 'dietary', 'preference'
  severity_level INTEGER,
  ingredient_trigger TEXT,
  suggested_alternatives JSONB,
  resolution_status TEXT DEFAULT 'unresolved',
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portion calculations and cost breakdowns
CREATE TABLE portion_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID REFERENCES wedding_menus(id),
  menu_item_id UUID REFERENCES menu_items(id),
  base_servings INTEGER NOT NULL,
  waste_buffer_percent DECIMAL(5,2) DEFAULT 10.00,
  total_portions_needed INTEGER,
  ingredient_breakdown JSONB, -- Detailed ingredient quantities
  total_ingredient_cost DECIMAL(12,2),
  labor_cost_estimate DECIMAL(12,2),
  equipment_requirements TEXT[],
  prep_time_hours DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI analysis cache
CREATE TABLE dietary_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_type TEXT NOT NULL, -- 'menu_generation', 'conflict_detection', 'substitution'
  input_hash TEXT NOT NULL, -- Hash of input parameters
  ai_response JSONB NOT NULL,
  confidence_score DECIMAL(3,2),
  processing_time_ms INTEGER,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(analysis_type, input_hash)
);

-- Indexes for performance
CREATE INDEX idx_guest_dietary_wedding ON guest_dietary_requirements(wedding_id);
CREATE INDEX idx_guest_dietary_category ON guest_dietary_requirements(dietary_category_id);
CREATE INDEX idx_menu_items_supplier ON menu_items(supplier_id);
CREATE INDEX idx_menu_items_allergens ON menu_items USING GIN (allergen_warnings);
CREATE INDEX idx_menu_items_dietary_tags ON menu_items USING GIN (dietary_tags);
CREATE INDEX idx_wedding_menus_wedding ON wedding_menus(wedding_id);
CREATE INDEX idx_dietary_conflicts_menu ON dietary_conflicts(menu_id);
CREATE INDEX idx_dietary_conflicts_severity ON dietary_conflicts(severity_level);
CREATE INDEX idx_portion_calculations_menu ON portion_calculations(menu_id);
CREATE INDEX idx_ai_analysis_type_hash ON dietary_ai_analysis(analysis_type, input_hash);
```

## API Endpoints

### Menu Generation Endpoints
```typescript
// Generate AI-powered menu based on dietary requirements
POST /api/catering/menu/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  weddingId: string,
  guestCount: number,
  dietaryRequirements: {
    allergies: string[],
    diets: string[],
    medical: string[],
    preferences: string[]
  },
  menuStyle: 'formal' | 'casual' | 'buffet' | 'plated' | 'family-style',
  budgetPerPerson: number,
  mealType: 'lunch' | 'dinner' | 'brunch' | 'cocktail',
  seasonalPreferences?: string[],
  culturalRequirements?: string[]
}

Response: {
  menuId: string,
  menuOptions: MenuOption[],
  complianceScore: number,
  warnings: Warning[],
  costBreakdown: CostBreakdown,
  aiConfidence: number
}

// Validate menu against dietary requirements
POST /api/catering/menu/validate
Authorization: Bearer {token}
Content-Type: application/json

{
  menuId: string,
  menuItems: MenuItemSelection[],
  guestRequirements: GuestRequirement[]
}

Response: {
  isCompliant: boolean,
  conflicts: DietaryConflict[],
  suggestions: AlternativeSuggestion[],
  complianceScore: number
}

// Calculate portions and costs
POST /api/catering/portions/calculate
Authorization: Bearer {token}
Content-Type: application/json

{
  menuId: string,
  finalGuestCount: number,
  wasteBuffer?: number,
  servingStyle: 'buffet' | 'plated' | 'family-style'
}

Response: {
  portionPlan: PortionCalculation,
  shoppingList: ShoppingList,
  totalCost: CostBreakdown,
  prepTimeline: PrepTimeline
}
```

### Dietary Management Endpoints
```typescript
// Add guest dietary requirements
POST /api/catering/dietary/guests
Authorization: Bearer {token}
Content-Type: application/json

{
  weddingId: string,
  guests: Array<{
    name: string,
    email?: string,
    requirements: Array<{
      category: string,
      severity: number,
      notes?: string
    }>
  }>
}

// Get dietary requirements summary
GET /api/catering/dietary/summary/{weddingId}
Authorization: Bearer {token}

Response: {
  totalGuests: number,
  requirementsByCategory: Record<string, number>,
  severityDistribution: Record<number, number>,
  highRiskGuests: GuestRequirement[],
  complianceChecklist: ComplianceItem[]
}

// Search ingredients with allergen information
GET /api/catering/ingredients/search?q={query}&category={category}&allergens={allergens}
Authorization: Bearer {token}

Response: {
  ingredients: Ingredient[],
  alternatives: IngredientAlternative[]
}

// Get suggested menu alternatives
POST /api/catering/menu/alternatives
Authorization: Bearer {token}
Content-Type: application/json

{
  menuItemId: string,
  conflictingRequirements: string[],
  maxPriceIncrease?: number
}

Response: {
  alternatives: MenuAlternative[],
  substitutions: IngredientSubstitution[]
}
```

## Frontend Components

### DietaryManagementDashboard Component
```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AllergyIcon, 
  VegetarianIcon, 
  KosherIcon, 
  GlutenFreeIcon,
  DollarSignIcon,
  UsersIcon,
  ChefHatIcon,
  AlertTriangleIcon
} from 'lucide-react'

interface DietaryManagementDashboardProps {
  weddingId: string
  supplierId: string
}

interface DietaryRequirement {
  id: string
  guestName: string
  category: string
  severity: number
  notes?: string
  verified: boolean
}

interface MenuSuggestion {
  id: string
  name: string
  complianceScore: number
  cost: number
  warnings: string[]
}

export default function DietaryManagementDashboard({ 
  weddingId, 
  supplierId 
}: DietaryManagementDashboardProps) {
  const [requirements, setRequirements] = useState<DietaryRequirement[]>([])
  const [menuSuggestions, setMenuSuggestions] = useState<MenuSuggestion[]>([])
  const [guestCount, setGuestCount] = useState(0)
  const [isGeneratingMenu, setIsGeneratingMenu] = useState(false)
  const [selectedMenuStyle, setSelectedMenuStyle] = useState<string>('formal')
  const [budgetPerPerson, setBudgetPerPerson] = useState<number>(75)

  const severityColors = {
    1: 'bg-green-100 text-green-800',
    2: 'bg-blue-100 text-blue-800',
    3: 'bg-yellow-100 text-yellow-800',
    4: 'bg-orange-100 text-orange-800',
    5: 'bg-red-100 text-red-800'
  }

  const categoryIcons = {
    allergy: AllergyIcon,
    diet: VegetarianIcon,
    religious: KosherIcon,
    medical: GlutenFreeIcon
  }

  useEffect(() => {
    fetchDietaryRequirements()
  }, [weddingId])

  const fetchDietaryRequirements = async () => {
    try {
      const response = await fetch(`/api/catering/dietary/summary/${weddingId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRequirements(data.requirements || [])
        setGuestCount(data.totalGuests || 0)
      }
    } catch (error) {
      console.error('Failed to fetch dietary requirements:', error)
    }
  }

  const generateMenu = async () => {
    setIsGeneratingMenu(true)
    
    try {
      const dietaryRequirements = {
        allergies: requirements.filter(r => r.category === 'allergy').map(r => r.notes || ''),
        diets: requirements.filter(r => r.category === 'diet').map(r => r.notes || ''),
        medical: requirements.filter(r => r.category === 'medical').map(r => r.notes || ''),
        preferences: requirements.filter(r => r.category === 'preference').map(r => r.notes || '')
      }

      const response = await fetch('/api/catering/menu/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          weddingId,
          guestCount,
          dietaryRequirements,
          menuStyle: selectedMenuStyle,
          budgetPerPerson,
          mealType: 'dinner'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMenuSuggestions(data.menuOptions || [])
      }
    } catch (error) {
      console.error('Failed to generate menu:', error)
    } finally {
      setIsGeneratingMenu(false)
    }
  }

  const requirementsByCategory = requirements.reduce((acc, req) => {
    acc[req.category] = (acc[req.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const highRiskRequirements = requirements.filter(req => req.severity >= 4)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <UsersIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{guestCount}</p>
              <p className="text-sm text-gray-600">Total Guests</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <AllergyIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{requirements.length}</p>
              <p className="text-sm text-gray-600">Dietary Requirements</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <AlertTriangleIcon className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{highRiskRequirements.length}</p>
              <p className="text-sm text-gray-600">High Risk</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSignIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">${budgetPerPerson}</p>
              <p className="text-sm text-gray-600">Per Person Budget</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* High Risk Alerts */}
      {highRiskRequirements.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangleIcon className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <strong>{highRiskRequirements.length} high-risk dietary requirements</strong> require special attention. 
            These include severe allergies and medical conditions that could be life-threatening.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="requirements" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="menu">Menu Generation</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>

        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dietary Requirements Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {Object.entries(requirementsByCategory).map(([category, count]) => {
                  const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || AllergyIcon
                  return (
                    <div key={category} className="flex items-center space-x-2">
                      <IconComponent className="h-5 w-5 text-gray-600" />
                      <span className="capitalize font-medium">{category}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-2">
                {requirements.map((req) => (
                  <div 
                    key={req.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge className={severityColors[req.severity as keyof typeof severityColors]}>
                        Level {req.severity}
                      </Badge>
                      <span className="font-medium">{req.guestName}</span>
                      <span className="text-gray-600 capitalize">{req.category}</span>
                      {req.notes && <span className="text-sm text-gray-500">- {req.notes}</span>}
                    </div>
                    {req.verified && (
                      <Badge variant="outline" className="text-green-600">
                        Verified
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Menu Generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Menu Style</label>
                  <select 
                    value={selectedMenuStyle}
                    onChange={(e) => setSelectedMenuStyle(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="formal">Formal Plated</option>
                    <option value="buffet">Buffet Style</option>
                    <option value="family-style">Family Style</option>
                    <option value="cocktail">Cocktail Reception</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Budget Per Person</label>
                  <input
                    type="number"
                    value={budgetPerPerson}
                    onChange={(e) => setBudgetPerPerson(Number(e.target.value))}
                    className="w-full p-2 border rounded-md"
                    min="20"
                    max="200"
                  />
                </div>
              </div>

              <Button 
                onClick={generateMenu}
                disabled={isGeneratingMenu || requirements.length === 0}
                className="w-full"
              >
                <ChefHatIcon className="h-4 w-4 mr-2" />
                {isGeneratingMenu ? 'Generating Menu...' : 'Generate AI Menu'}
              </Button>

              {menuSuggestions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Generated Menu Options</h3>
                  {menuSuggestions.map((menu) => (
                    <div key={menu.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{menu.name}</h4>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge 
                              className={menu.complianceScore >= 0.9 ? 'bg-green-100 text-green-800' : 
                                        menu.complianceScore >= 0.7 ? 'bg-yellow-100 text-yellow-800' : 
                                        'bg-red-100 text-red-800'}
                            >
                              {Math.round(menu.complianceScore * 100)}% Compliant
                            </Badge>
                            <span className="text-sm text-gray-600">${menu.cost} per person</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Select Menu
                        </Button>
                      </div>
                      
                      {menu.warnings.length > 0 && (
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-sm text-yellow-800 font-medium">Warnings:</p>
                          <ul className="text-sm text-yellow-700 mt-1">
                            {menu.warnings.map((warning, index) => (
                              <li key={index}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Menu Validation & Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <ChefHatIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Generate a menu first to see validation results</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### MenuItemEditor Component
```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  PlusIcon, 
  MinusIcon, 
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon 
} from 'lucide-react'

interface MenuItemEditorProps {
  menuItem?: MenuItem
  onSave: (menuItem: MenuItem) => void
  onCancel: () => void
}

interface MenuItem {
  id?: string
  name: string
  category: string
  description: string
  ingredients: IngredientUsage[]
  allergenWarnings: string[]
  dietaryTags: string[]
  preparationTime: number
  baseCost: number
}

interface IngredientUsage {
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: string
  allergens: string[]
}

interface IngredientSuggestion {
  id: string
  name: string
  allergens: string[]
  alternatives: string[]
}

export default function MenuItemEditor({ 
  menuItem, 
  onSave, 
  onCancel 
}: MenuItemEditorProps) {
  const [formData, setFormData] = useState<MenuItem>(
    menuItem || {
      name: '',
      category: 'main',
      description: '',
      ingredients: [],
      allergenWarnings: [],
      dietaryTags: [],
      preparationTime: 30,
      baseCost: 0
    }
  )
  const [ingredientSuggestions, setIngredientSuggestions] = useState<IngredientSuggestion[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [allergenAnalysis, setAllergenAnalysis] = useState<any>(null)

  useEffect(() => {
    if (searchQuery.length > 2) {
      searchIngredients(searchQuery)
    }
  }, [searchQuery])

  useEffect(() => {
    analyzeAllergens()
  }, [formData.ingredients])

  const searchIngredients = async (query: string) => {
    try {
      const response = await fetch(`/api/catering/ingredients/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setIngredientSuggestions(data.ingredients || [])
      }
    } catch (error) {
      console.error('Failed to search ingredients:', error)
    }
  }

  const analyzeAllergens = async () => {
    if (formData.ingredients.length === 0) return

    try {
      const response = await fetch('/api/catering/menu/analyze-allergens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ingredients: formData.ingredients })
      })

      if (response.ok) {
        const analysis = await response.json()
        setAllergenAnalysis(analysis)
        
        // Update form data with detected allergens
        setFormData(prev => ({
          ...prev,
          allergenWarnings: analysis.allergens || []
        }))
      }
    } catch (error) {
      console.error('Failed to analyze allergens:', error)
    }
  }

  const addIngredient = (suggestion: IngredientSuggestion) => {
    const newIngredient: IngredientUsage = {
      ingredientId: suggestion.id,
      ingredientName: suggestion.name,
      quantity: 1,
      unit: 'cup',
      allergens: suggestion.allergens
    }

    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, newIngredient]
    }))
    
    setSearchQuery('')
    setIngredientSuggestions([])
  }

  const updateIngredient = (index: number, field: keyof IngredientUsage, value: any) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }))
  }

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }))
  }

  const validateMenuItem = (): boolean => {
    const errors: string[] = []

    if (!formData.name.trim()) {
      errors.push('Menu item name is required')
    }

    if (!formData.description.trim()) {
      errors.push('Description is required')
    }

    if (formData.ingredients.length === 0) {
      errors.push('At least one ingredient is required')
    }

    if (formData.baseCost <= 0) {
      errors.push('Base cost must be greater than 0')
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleSave = () => {
    if (validateMenuItem()) {
      onSave(formData)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{menuItem ? 'Edit Menu Item' : 'Create Menu Item'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Item Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Herb-Crusted Salmon"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="appetizer">Appetizer</option>
                <option value="main">Main Course</option>
                <option value="side">Side Dish</option>
                <option value="dessert">Dessert</option>
                <option value="beverage">Beverage</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description *</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the dish, preparation method, and presentation"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Preparation Time (minutes)</label>
              <Input
                type="number"
                value={formData.preparationTime}
                onChange={(e) => setFormData(prev => ({ ...prev, preparationTime: Number(e.target.value) }))}
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Base Cost per Serving ($)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.baseCost}
                onChange={(e) => setFormData(prev => ({ ...prev, baseCost: Number(e.target.value) }))}
                min="0.01"
              />
            </div>
          </div>

          {/* Ingredients Section */}
          <div>
            <label className="block text-sm font-medium mb-2">Ingredients *</label>
            
            {/* Add Ingredient Search */}
            <div className="relative mb-4">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for ingredients to add..."
              />
              
              {ingredientSuggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                  {ingredientSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => addIngredient(suggestion)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium">{suggestion.name}</div>
                      {suggestion.allergens.length > 0 && (
                        <div className="text-sm text-red-600">
                          Allergens: {suggestion.allergens.join(', ')}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Current Ingredients */}
            <div className="space-y-2">
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                  <div className="flex-1">
                    <span className="font-medium">{ingredient.ingredientName}</span>
                    {ingredient.allergens.length > 0 && (
                      <div className="text-sm text-red-600">
                        {ingredient.allergens.map(allergen => (
                          <Badge key={allergen} variant="destructive" className="mr-1 text-xs">
                            {allergen}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <Input
                    type="number"
                    step="0.1"
                    value={ingredient.quantity}
                    onChange={(e) => updateIngredient(index, 'quantity', Number(e.target.value))}
                    className="w-20"
                    min="0.1"
                  />
                  
                  <select
                    value={ingredient.unit}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                    className="w-24 p-1 border rounded text-sm"
                  >
                    <option value="cup">cup</option>
                    <option value="tbsp">tbsp</option>
                    <option value="tsp">tsp</option>
                    <option value="oz">oz</option>
                    <option value="lb">lb</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="piece">piece</option>
                  </select>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => removeIngredient(index)}
                  >
                    <MinusIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Allergen Analysis */}
          {allergenAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <AlertTriangleIcon className="h-5 w-5 mr-2 text-orange-500" />
                  Allergen Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allergenAnalysis.allergens.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-medium text-red-600">Detected Allergens:</p>
                    <div className="flex flex-wrap gap-2">
                      {allergenAnalysis.allergens.map((allergen: string) => (
                        <Badge key={allergen} variant="destructive">
                          {allergen}
                        </Badge>
                      ))}
                    </div>
                    
                    {allergenAnalysis.crossContaminationRisk && (
                      <Alert className="bg-red-50 border-red-200">
                        <AlertTriangleIcon className="h-4 w-4" />
                        <AlertDescription className="text-red-800">
                          This dish has ingredients with high cross-contamination risk. 
                          Special preparation protocols required.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center text-green-600">
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    No major allergens detected
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert className="bg-red-50 border-red-200">
              <XCircleIcon className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium text-red-800">Please fix the following errors:</div>
                <ul className="mt-1 text-red-700">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {menuItem ? 'Update Item' : 'Create Item'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

## Backend Implementation

### Core Service Classes

#### DietaryAnalysisService
```typescript
import { OpenAI } from 'openai'
import { supabase } from '@/lib/supabase'

export class DietaryAnalysisService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async generateCompliantMenu(
    weddingId: string,
    requirements: DietaryRequirement[]
  ): Promise<MenuGenerationResult> {
    const guestRequirements = this.categorizeDietaryRequirements(requirements)
    
    const prompt = `Generate a wedding menu for ${requirements.length} guests with these requirements:

Allergies: ${guestRequirements.allergies.join(', ')}
Dietary Restrictions: ${guestRequirements.diets.join(', ')}
Medical Conditions: ${guestRequirements.medical.join(', ')}

Create a 3-course menu (appetizer, main, dessert) with:
- Complete ingredient lists for each dish
- Allergen warnings and cross-contamination notes
- Alternative options for restricted diets
- Preparation complexity ratings (1-5)
- Estimated costs per serving

Ensure 100% compliance with all restrictions. Provide elegant, restaurant-quality options.
Return as structured JSON with detailed nutritional information.`

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a master chef specializing in dietary-compliant wedding catering with 20+ years experience in allergen-safe cooking.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000
    })

    const generatedMenu = JSON.parse(completion.choices[0].message.content || '{}')
    
    // Validate the generated menu
    const validation = await this.validateMenuCompliance(generatedMenu, requirements)
    
    // Store in database
    const menuId = await this.saveGeneratedMenu(weddingId, generatedMenu, validation)
    
    return {
      menuId,
      menu: generatedMenu,
      complianceScore: validation.complianceScore,
      warnings: validation.warnings,
      alternatives: validation.alternatives
    }
  }

  async validateMenuCompliance(
    menu: any,
    requirements: DietaryRequirement[]
  ): Promise<MenuValidation> {
    const conflicts: DietaryConflict[] = []
    const warnings: string[] = []
    let totalItems = 0
    let compliantItems = 0

    for (const course of menu.courses) {
      for (const dish of course.dishes) {
        totalItems++
        
        const dishConflicts = await this.analyzeDishConflicts(dish, requirements)
        
        if (dishConflicts.length === 0) {
          compliantItems++
        } else {
          conflicts.push(...dishConflicts)
        }

        // Check for cross-contamination risks
        const crossContaminationRisk = this.assessCrossContaminationRisk(dish)
        if (crossContaminationRisk.level > 0.7) {
          warnings.push(`${dish.name}: High cross-contamination risk - ${crossContaminationRisk.reason}`)
        }
      }
    }

    const complianceScore = totalItems > 0 ? compliantItems / totalItems : 0

    return {
      complianceScore,
      conflicts,
      warnings,
      isCompliant: conflicts.length === 0,
      alternatives: await this.suggestAlternatives(conflicts)
    }
  }

  private async analyzeDishConflicts(
    dish: any,
    requirements: DietaryRequirement[]
  ): Promise<DietaryConflict[]> {
    const conflicts: DietaryConflict[] = []

    for (const requirement of requirements) {
      const hasConflict = await this.checkIngredientConflicts(
        dish.ingredients,
        requirement
      )

      if (hasConflict) {
        conflicts.push({
          guestName: requirement.guestName,
          dishName: dish.name,
          conflictType: requirement.category,
          severity: requirement.severity,
          ingredient: hasConflict.ingredient,
          reason: hasConflict.reason
        })
      }
    }

    return conflicts
  }

  private async checkIngredientConflicts(
    ingredients: string[],
    requirement: DietaryRequirement
  ): Promise<{ ingredient: string; reason: string } | null> {
    // Get allergen database
    const { data: allergenData } = await supabase
      .from('dietary_categories')
      .select('common_triggers')
      .eq('name', requirement.category)
      .single()

    const triggers = allergenData?.common_triggers || []

    for (const ingredient of ingredients) {
      for (const trigger of triggers) {
        if (ingredient.toLowerCase().includes(trigger.toLowerCase())) {
          return {
            ingredient,
            reason: `Contains ${trigger} which conflicts with ${requirement.category}`
          }
        }
      }
    }

    // Use AI for complex dietary analysis
    const aiAnalysis = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a dietary restriction expert. Analyze ingredients for conflicts with specific dietary requirements.'
        },
        {
          role: 'user',
          content: `Does this ingredient list conflict with "${requirement.category}" restriction?
          Ingredients: ${ingredients.join(', ')}
          
          Return only "YES: [ingredient] - [reason]" or "NO" based on dietary compliance.`
        }
      ],
      temperature: 0.1,
      max_tokens: 150
    })

    const response = aiAnalysis.choices[0].message.content?.trim() || 'NO'
    
    if (response.startsWith('YES:')) {
      const [ingredient, reason] = response.slice(4).split(' - ')
      return { ingredient: ingredient.trim(), reason: reason.trim() }
    }

    return null
  }

  async calculatePortionsAndCosts(
    menuId: string,
    finalGuestCount: number,
    wasteBuffer: number = 0.1
  ): Promise<PortionCalculation> {
    const { data: menu } = await supabase
      .from('wedding_menus')
      .select(`
        *,
        menu_structure
      `)
      .eq('id', menuId)
      .single()

    if (!menu) throw new Error('Menu not found')

    const adjustedCount = Math.ceil(finalGuestCount * (1 + wasteBuffer))
    const calculations: any[] = []
    let totalCost = 0

    for (const courseId of Object.keys(menu.menu_structure)) {
      const course = menu.menu_structure[courseId]
      
      for (const dishId of course.dishes) {
        const { data: menuItem } = await supabase
          .from('menu_items')
          .select('*')
          .eq('id', dishId)
          .single()

        if (menuItem) {
          const dishCalculation = await this.calculateDishPortions(
            menuItem,
            adjustedCount
          )
          
          calculations.push(dishCalculation)
          totalCost += dishCalculation.totalCost
        }
      }
    }

    // Store calculations
    await supabase.from('portion_calculations').insert({
      menu_id: menuId,
      base_servings: finalGuestCount,
      waste_buffer_percent: wasteBuffer * 100,
      total_portions_needed: adjustedCount,
      ingredient_breakdown: calculations,
      total_ingredient_cost: totalCost
    })

    return {
      menuId,
      baseGuests: finalGuestCount,
      adjustedPortions: adjustedCount,
      wasteBuffer,
      calculations,
      totalCost,
      costPerPerson: totalCost / finalGuestCount
    }
  }

  private async calculateDishPortions(
    menuItem: any,
    servings: number
  ): Promise<any> {
    const ingredients = menuItem.ingredients
    const ingredientCosts: any[] = []
    let totalDishCost = 0

    for (const ingredientUsage of ingredients) {
      const { data: ingredient } = await supabase
        .from('ingredients')
        .select('*')
        .eq('id', ingredientUsage.ingredient_id)
        .single()

      if (ingredient) {
        const totalQuantity = ingredientUsage.quantity * servings
        const cost = totalQuantity * (ingredient.cost_per_unit || 0)
        
        ingredientCosts.push({
          name: ingredient.name,
          quantity: totalQuantity,
          unit: ingredientUsage.unit,
          costPerUnit: ingredient.cost_per_unit,
          totalCost: cost
        })
        
        totalDishCost += cost
      }
    }

    return {
      dishName: menuItem.name,
      servings,
      ingredients: ingredientCosts,
      totalCost: totalDishCost,
      costPerServing: totalDishCost / servings
    }
  }

  private categorizeDietaryRequirements(
    requirements: DietaryRequirement[]
  ): CategorizedRequirements {
    return requirements.reduce(
      (acc, req) => {
        switch (req.category) {
          case 'allergy':
            acc.allergies.push(req.notes || '')
            break
          case 'diet':
            acc.diets.push(req.notes || '')
            break
          case 'medical':
            acc.medical.push(req.notes || '')
            break
          default:
            acc.preferences.push(req.notes || '')
        }
        return acc
      },
      { allergies: [], diets: [], medical: [], preferences: [] } as CategorizedRequirements
    )
  }

  private assessCrossContaminationRisk(dish: any): { level: number; reason: string } {
    const highRiskIngredients = ['nuts', 'shellfish', 'eggs', 'dairy']
    const ingredients = dish.ingredients || []
    
    const riskIngredients = ingredients.filter((ing: string) =>
      highRiskIngredients.some(risk => ing.toLowerCase().includes(risk))
    )

    if (riskIngredients.length > 0) {
      return {
        level: 0.8,
        reason: `Contains high-risk ingredients: ${riskIngredients.join(', ')}`
      }
    }

    return { level: 0.2, reason: 'Low cross-contamination risk' }
  }

  private async suggestAlternatives(conflicts: DietaryConflict[]): Promise<any[]> {
    // Implementation for suggesting alternative dishes/ingredients
    return []
  }

  private async saveGeneratedMenu(
    weddingId: string,
    menu: any,
    validation: MenuValidation
  ): Promise<string> {
    const { data, error } = await supabase
      .from('wedding_menus')
      .insert({
        wedding_id: weddingId,
        menu_name: menu.name || 'AI Generated Menu',
        menu_structure: menu,
        dietary_compliance_score: validation.complianceScore,
        allergen_warnings: validation.warnings,
        generated_by_ai: true,
        ai_confidence_score: validation.complianceScore
      })
      .select()
      .single()

    if (error) throw error
    return data.id
  }
}

// Type definitions
interface DietaryRequirement {
  guestName: string
  category: string
  severity: number
  notes?: string
}

interface CategorizedRequirements {
  allergies: string[]
  diets: string[]
  medical: string[]
  preferences: string[]
}

interface MenuGenerationResult {
  menuId: string
  menu: any
  complianceScore: number
  warnings: string[]
  alternatives: any[]
}

interface MenuValidation {
  complianceScore: number
  conflicts: DietaryConflict[]
  warnings: string[]
  isCompliant: boolean
  alternatives: any[]
}

interface DietaryConflict {
  guestName: string
  dishName: string
  conflictType: string
  severity: number
  ingredient: string
  reason: string
}

interface PortionCalculation {
  menuId: string
  baseGuests: number
  adjustedPortions: number
  wasteBuffer: number
  calculations: any[]
  totalCost: number
  costPerPerson: number
}
```

#### IngredientIntelligenceService
```typescript
export class IngredientIntelligenceService {
  private allergenDatabase = {
    nuts: ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'macadamia', 'pine nut', 'brazil nut'],
    shellfish: ['shrimp', 'lobster', 'crab', 'scallop', 'mussel', 'clam', 'oyster', 'crawfish', 'langostino'],
    fish: ['salmon', 'tuna', 'cod', 'halibut', 'sea bass', 'anchovies', 'sardines', 'mackerel'],
    dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein', 'lactose'],
    eggs: ['egg', 'mayonnaise', 'meringue', 'custard', 'hollandaise', 'aioli'],
    soy: ['soy', 'tofu', 'tempeh', 'miso', 'soy sauce', 'edamame', 'lecithin'],
    gluten: ['wheat', 'barley', 'rye', 'oats', 'malt', 'bread', 'pasta', 'flour', 'seitan'],
    sesame: ['sesame', 'tahini', 'hummus', 'baba ganoush']
  }

  private dietaryRestrictions = {
    vegan: {
      forbidden: ['meat', 'poultry', 'fish', 'dairy', 'eggs', 'honey', 'gelatin'],
      alternatives: {
        'butter': ['vegan butter', 'coconut oil', 'olive oil'],
        'milk': ['almond milk', 'oat milk', 'soy milk', 'coconut milk'],
        'cheese': ['nutritional yeast', 'cashew cheese', 'vegan cheese'],
        'eggs': ['flax eggs', 'aquafaba', 'applesauce', 'banana'],
        'honey': ['maple syrup', 'agave nectar', 'date syrup']
      }
    },
    vegetarian: {
      forbidden: ['meat', 'poultry', 'fish', 'gelatin', 'rennet'],
      alternatives: {
        'meat': ['tofu', 'tempeh', 'seitan', 'mushrooms', 'legumes'],
        'chicken stock': ['vegetable stock', 'mushroom stock']
      }
    },
    kosher: {
      forbidden: ['pork', 'shellfish', 'mixing meat and dairy'],
      requirements: ['kosher certification', 'proper slaughter', 'no cross-contamination']
    },
    halal: {
      forbidden: ['pork', 'alcohol', 'non-halal meat'],
      requirements: ['halal certification', 'proper slaughter', 'no alcohol in preparation']
    },
    keto: {
      restricted: ['high carb ingredients', 'sugar', 'grains', 'starchy vegetables'],
      preferred: ['high fat', 'moderate protein', 'very low carb']
    }
  }

  async analyzeIngredientAllergens(ingredients: string[]): Promise<AllergenAnalysis> {
    const detectedAllergens = new Set<string>()
    const allergenDetails: AllergenDetail[] = []

    for (const ingredient of ingredients) {
      const ingredientLower = ingredient.toLowerCase()
      
      // Check against known allergen database
      for (const [allergenType, allergenList] of Object.entries(this.allergenDatabase)) {
        for (const allergen of allergenList) {
          if (ingredientLower.includes(allergen)) {
            detectedAllergens.add(allergenType)
            allergenDetails.push({
              ingredient,
              allergenType,
              trigger: allergen,
              severity: this.getAllergenSeverity(allergenType),
              crossContaminationRisk: this.getCrossContaminationRisk(allergenType)
            })
          }
        }
      }
    }

    // Use AI for complex ingredient analysis
    const aiAnalysis = await this.performAIAllergenAnalysis(ingredients)

    return {
      allergens: Array.from(detectedAllergens),
      details: allergenDetails,
      crossContaminationRisk: allergenDetails.some(d => d.crossContaminationRisk),
      aiInsights: aiAnalysis.insights,
      confidence: aiAnalysis.confidence
    }
  }

  async suggestIngredientSubstitutions(
    ingredient: string,
    restrictions: string[]
  ): Promise<IngredientSubstitution[]> {
    const substitutions: IngredientSubstitution[] = []

    for (const restriction of restrictions) {
      const restrictionData = this.dietaryRestrictions[restriction as keyof typeof this.dietaryRestrictions]
      
      if (restrictionData && 'alternatives' in restrictionData) {
        const alternatives = restrictionData.alternatives as Record<string, string[]>
        const ingredientKey = this.findIngredientKey(ingredient, alternatives)
        
        if (ingredientKey && alternatives[ingredientKey]) {
          substitutions.push({
            originalIngredient: ingredient,
            restriction,
            alternatives: alternatives[ingredientKey],
            reason: `${restriction} restriction`,
            difficultyLevel: this.getSubstitutionDifficulty(ingredient, alternatives[ingredientKey]),
            tasteDifference: this.getTasteDifferenceScore(ingredient, alternatives[ingredientKey])
          })
        }
      }
    }

    // Use AI for creative substitutions
    const aiSubstitutions = await this.getAISubstitutions(ingredient, restrictions)
    substitutions.push(...aiSubstitutions)

    return substitutions
  }

  async validateDietCompliance(
    ingredients: string[],
    dietaryRestrictions: string[]
  ): Promise<DietComplianceResult> {
    const violations: DietViolation[] = []
    const warnings: string[] = []

    for (const restriction of dietaryRestrictions) {
      const restrictionData = this.dietaryRestrictions[restriction as keyof typeof this.dietaryRestrictions]
      
      if (restrictionData && 'forbidden' in restrictionData) {
        const forbidden = restrictionData.forbidden as string[]
        
        for (const ingredient of ingredients) {
          const ingredientLower = ingredient.toLowerCase()
          
          for (const forbiddenItem of forbidden) {
            if (ingredientLower.includes(forbiddenItem)) {
              violations.push({
                ingredient,
                restriction,
                forbiddenItem,
                severity: this.getViolationSeverity(restriction, forbiddenItem),
                suggestion: await this.suggestAlternative(ingredient, restriction)
              })
            }
          }
        }
      }
    }

    const complianceScore = violations.length === 0 ? 1.0 : 
      Math.max(0, 1 - (violations.length / ingredients.length))

    return {
      isCompliant: violations.length === 0,
      complianceScore,
      violations,
      warnings,
      recommendations: await this.getComplianceRecommendations(violations)
    }
  }

  private async performAIAllergenAnalysis(ingredients: string[]): Promise<{
    insights: string[]
    confidence: number
  }> {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a food safety expert specializing in allergen detection and cross-contamination prevention.'
          },
          {
            role: 'user',
            content: `Analyze these ingredients for potential allergens and cross-contamination risks:
            ${ingredients.join(', ')}
            
            Consider:
            - Hidden allergens in processed ingredients
            - Cross-contamination during processing
            - Regional variations in ingredient composition
            - Uncommon or ethnic ingredients
            
            Return insights as JSON with allergen warnings and confidence score.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })

      const result = JSON.parse(completion.choices[0].message.content || '{}')
      return {
        insights: result.insights || [],
        confidence: result.confidence || 0.8
      }
    } catch (error) {
      console.error('AI allergen analysis failed:', error)
      return { insights: [], confidence: 0.5 }
    }
  }

  private async getAISubstitutions(
    ingredient: string,
    restrictions: string[]
  ): Promise<IngredientSubstitution[]> {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional chef expert in dietary substitutions and allergen-free cooking.'
          },
          {
            role: 'user',
            content: `Suggest creative substitutions for "${ingredient}" considering these restrictions: ${restrictions.join(', ')}
            
            Provide substitutions that:
            - Maintain similar flavor profile
            - Have comparable cooking properties  
            - Are readily available
            - Consider texture and appearance
            
            Return as JSON array with alternatives, difficulty, and taste impact scores.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      })

      const result = JSON.parse(completion.choices[0].message.content || '{}')
      return result.substitutions || []
    } catch (error) {
      console.error('AI substitution analysis failed:', error)
      return []
    }
  }

  private getAllergenSeverity(allergenType: string): number {
    const severityMap: Record<string, number> = {
      'nuts': 5,        // Life-threatening
      'shellfish': 5,   // Life-threatening
      'fish': 4,        // Severe
      'eggs': 3,        // Moderate
      'dairy': 3,       // Moderate
      'soy': 2,         // Mild
      'gluten': 4,      // Can be severe (celiac)
      'sesame': 3       // Moderate
    }
    return severityMap[allergenType] || 2
  }

  private getCrossContaminationRisk(allergenType: string): boolean {
    const highRiskAllergens = ['nuts', 'shellfish', 'gluten']
    return highRiskAllergens.includes(allergenType)
  }

  private findIngredientKey(ingredient: string, alternatives: Record<string, string[]>): string | null {
    const ingredientLower = ingredient.toLowerCase()
    return Object.keys(alternatives).find(key => 
      ingredientLower.includes(key.toLowerCase())
    ) || null
  }

  private getSubstitutionDifficulty(original: string, alternatives: string[]): number {
    // Return difficulty score 1-5 based on cooking complexity
    const complexSubstitutions = ['eggs', 'butter', 'flour']
    return complexSubstitutions.some(complex => 
      original.toLowerCase().includes(complex)
    ) ? 4 : 2
  }

  private getTasteDifferenceScore(original: string, alternatives: string[]): number {
    // Return taste difference score 1-5 (1 = very similar, 5 = very different)
    return 2 // Default moderate difference
  }

  private getViolationSeverity(restriction: string, forbiddenItem: string): number {
    const restrictionSeverity: Record<string, number> = {
      'vegan': 3,
      'vegetarian': 3,
      'kosher': 5,
      'halal': 5,
      'keto': 2
    }
    return restrictionSeverity[restriction] || 3
  }

  private async suggestAlternative(ingredient: string, restriction: string): Promise<string> {
    const substitutions = await this.suggestIngredientSubstitutions(ingredient, [restriction])
    return substitutions[0]?.alternatives[0] || 'No alternative available'
  }

  private async getComplianceRecommendations(violations: DietViolation[]): Promise<string[]> {
    const recommendations = new Set<string>()
    
    for (const violation of violations) {
      recommendations.add(`Replace ${violation.ingredient} to comply with ${violation.restriction} requirements`)
      
      if (violation.severity >= 4) {
        recommendations.add(`High priority: ${violation.ingredient} violation is severe for ${violation.restriction}`)
      }
    }
    
    if (violations.some(v => v.restriction === 'kosher' || v.restriction === 'halal')) {
      recommendations.add('Ensure all ingredients have proper religious certification')
    }
    
    return Array.from(recommendations)
  }
}

// Type definitions
interface AllergenAnalysis {
  allergens: string[]
  details: AllergenDetail[]
  crossContaminationRisk: boolean
  aiInsights: string[]
  confidence: number
}

interface AllergenDetail {
  ingredient: string
  allergenType: string
  trigger: string
  severity: number
  crossContaminationRisk: boolean
}

interface IngredientSubstitution {
  originalIngredient: string
  restriction: string
  alternatives: string[]
  reason: string
  difficultyLevel: number
  tasteDifference: number
}

interface DietComplianceResult {
  isCompliant: boolean
  complianceScore: number
  violations: DietViolation[]
  warnings: string[]
  recommendations: string[]
}

interface DietViolation {
  ingredient: string
  restriction: string
  forbiddenItem: string
  severity: number
  suggestion: string
}
```

## MCP Server Usage

### Supabase MCP for Database Operations
```typescript
// Apply dietary management migrations
await mcp.supabase.apply_migration('create_dietary_management_system', `
  -- Migration SQL from database schema section above
`)

// Execute complex dietary queries
const guestRequirements = await mcp.supabase.execute_sql(`
  SELECT 
    gdr.*,
    dc.name as category_name,
    dc.severity_level as default_severity,
    dc.common_triggers
  FROM guest_dietary_requirements gdr
  JOIN dietary_categories dc ON dc.id = gdr.dietary_category_id
  WHERE gdr.wedding_id = $1
  ORDER BY gdr.severity_level DESC, dc.severity_level DESC
`, [weddingId])

// Generate database types
await mcp.supabase.generate_typescript_types()
```

### OpenAI MCP for AI Operations
```typescript
// Generate menu with AI
const menuGeneration = await mcp.openai.chat_completion({
  model: 'gpt-4',
  messages: [
    {
      role: 'system',
      content: 'You are a master wedding chef specializing in dietary-compliant menus.'
    },
    {
      role: 'user', 
      content: `Create a wedding menu for ${guestCount} guests with these requirements: ${dietaryRequirements.join(', ')}`
    }
  ],
  response_format: { type: 'json_object' },
  temperature: 0.7
})

// Analyze ingredient allergens
const allergenAnalysis = await mcp.openai.chat_completion({
  model: 'gpt-3.5-turbo',
  messages: [
    {
      role: 'system',
      content: 'You are a food safety expert specializing in allergen detection.'
    },
    {
      role: 'user',
      content: `Analyze these ingredients for allergens: ${ingredients.join(', ')}`
    }
  ],
  response_format: { type: 'json_object' }
})

// Generate ingredient substitutions
const substitutions = await mcp.openai.chat_completion({
  model: 'gpt-4',
  messages: [
    {
      role: 'system',
      content: 'You are a professional chef expert in dietary substitutions.'
    },
    {
      role: 'user',
      content: `Suggest substitutions for "${ingredient}" considering restrictions: ${restrictions.join(', ')}`
    }
  ],
  response_format: { type: 'json_object' }
})
```

### Ref MCP for Documentation
```typescript
// Get OpenAI API documentation
const openaiDocs = await mcp.ref.search_documentation('OpenAI API chat completions JSON mode')
const openaiContent = await mcp.ref.read_url(openaiDocs[0].url)

// Get Supabase documentation
const supabaseDocs = await mcp.ref.search_documentation('Supabase PostgreSQL JSONB queries')
const supabaseContent = await mcp.ref.read_url(supabaseDocs[0].url)

// Get dietary restriction guidelines
const dietaryDocs = await mcp.ref.search_documentation('food allergen regulations FDA')
const dietaryContent = await mcp.ref.read_url(dietaryDocs[0].url)
```

## Testing Requirements

### Unit Tests
```typescript
describe('DietaryAnalysisService', () => {
  let service: DietaryAnalysisService

  beforeEach(() => {
    service = new DietaryAnalysisService()
  })

  test('should detect common allergens in ingredients', async () => {
    const ingredients = ['milk', 'eggs', 'wheat flour', 'peanuts']
    const analysis = await service.analyzeIngredientAllergens(ingredients)
    
    expect(analysis.allergens).toContain('dairy')
    expect(analysis.allergens).toContain('eggs')  
    expect(analysis.allergens).toContain('gluten')
    expect(analysis.allergens).toContain('nuts')
    expect(analysis.crossContaminationRisk).toBe(true)
  })

  test('should generate compliant menu for multiple restrictions', async () => {
    const requirements = [
      { guestName: 'John', category: 'allergy', notes: 'nuts', severity: 5 },
      { guestName: 'Jane', category: 'diet', notes: 'vegan', severity: 3 }
    ]

    const result = await service.generateCompliantMenu('wedding-123', requirements)
    
    expect(result.complianceScore).toBeGreaterThan(0.9)
    expect(result.menu.courses).toBeDefined()
    expect(result.warnings).toBeDefined()
  })

  test('should calculate accurate portions with waste buffer', async () => {
    const calculation = await service.calculatePortionsAndCosts(
      'menu-123',
      100, // guest count
      0.1  // 10% waste buffer
    )

    expect(calculation.adjustedPortions).toBe(110)
    expect(calculation.costPerPerson).toBeGreaterThan(0)
    expect(calculation.calculations).toHaveLength(3) // 3 courses
  })

  test('should suggest appropriate ingredient substitutions', async () => {
    const substitutions = await service.suggestIngredientSubstitutions(
      'butter',
      ['vegan', 'dairy-free']
    )

    expect(substitutions).toHaveLength(2)
    expect(substitutions[0].alternatives).toContain('vegan butter')
    expect(substitutions[1].alternatives).toContain('coconut oil')
  })
})

describe('IngredientIntelligenceService', () => {
  let service: IngredientIntelligenceService

  beforeEach(() => {
    service = new IngredientIntelligenceService()
  })

  test('should validate diet compliance correctly', async () => {
    const ingredients = ['chicken', 'vegetables', 'olive oil']
    const result = await service.validateDietCompliance(ingredients, ['vegan'])

    expect(result.isCompliant).toBe(false)
    expect(result.violations).toHaveLength(1)
    expect(result.violations[0].ingredient).toBe('chicken')
    expect(result.complianceScore).toBeLessThan(1.0)
  })

  test('should detect cross-contamination risks', async () => {
    const analysis = await service.analyzeIngredientAllergens(['peanut oil', 'sesame seeds'])
    
    expect(analysis.crossContaminationRisk).toBe(true)
    expect(analysis.details.some(d => d.crossContaminationRisk)).toBe(true)
  })

  test('should provide AI-enhanced substitution suggestions', async () => {
    const substitutions = await service.suggestIngredientSubstitutions('eggs', ['vegan'])
    
    expect(substitutions.length).toBeGreaterThan(0)
    expect(substitutions.some(s => s.alternatives.includes('flax eggs'))).toBe(true)
  })
})
```

### Integration Tests
```typescript
describe('Dietary Management API', () => {
  test('POST /api/catering/menu/generate', async () => {
    const response = await request(app)
      .post('/api/catering/menu/generate')
      .send({
        weddingId: 'test-wedding',
        guestCount: 50,
        dietaryRequirements: {
          allergies: ['nuts', 'shellfish'],
          diets: ['vegetarian'],
          medical: ['celiac']
        },
        menuStyle: 'formal',
        budgetPerPerson: 75
      })

    expect(response.status).toBe(200)
    expect(response.body.menuId).toBeDefined()
    expect(response.body.complianceScore).toBeGreaterThan(0.8)
    expect(response.body.menuOptions).toBeDefined()
  })

  test('POST /api/catering/menu/validate', async () => {
    const response = await request(app)
      .post('/api/catering/menu/validate')
      .send({
        menuId: 'test-menu',
        menuItems: [
          { id: 'item-1', ingredients: ['salmon', 'rice', 'vegetables'] }
        ],
        guestRequirements: [
          { guestName: 'John', category: 'allergy', notes: 'fish', severity: 5 }
        ]
      })

    expect(response.status).toBe(200)
    expect(response.body.isCompliant).toBe(false)
    expect(response.body.conflicts).toHaveLength(1)
    expect(response.body.suggestions).toBeDefined()
  })
})
```

### Browser Testing with Playwright MCP
```typescript
// Test dietary dashboard functionality
await mcp.playwright.browser_navigate('http://localhost:3000/catering/dietary')

// Test guest requirement input
await mcp.playwright.browser_fill_form([
  {
    name: 'Guest Name',
    type: 'textbox',
    ref: 'input[name="guestName"]',
    value: 'John Smith'
  },
  {
    name: 'Dietary Category',
    type: 'combobox', 
    ref: 'select[name="category"]',
    value: 'allergy'
  },
  {
    name: 'Specific Notes',
    type: 'textbox',
    ref: 'textarea[name="notes"]', 
    value: 'severe nut allergy'
  }
])

await mcp.playwright.browser_click('Submit', 'button[type="submit"]')

// Verify requirement was added
const snapshot = await mcp.playwright.browser_snapshot()
expect(snapshot).toContain('John Smith')
expect(snapshot).toContain('severe nut allergy')

// Test menu generation
await mcp.playwright.browser_click('Generate AI Menu', 'button:has-text("Generate AI Menu")')
await mcp.playwright.browser_wait_for({ text: 'Generated Menu Options' })

// Take screenshot of results
await mcp.playwright.browser_take_screenshot('menu-generation-results.png')

// Test menu validation
await mcp.playwright.browser_click('Validate Menu', 'button:has-text("Validate")')
const validationSnapshot = await mcp.playwright.browser_snapshot()
expect(validationSnapshot).toContain('Compliance Score')
```

## Navigation Integration

### Navigation Links
- **Suppliers Dashboard** → **Dietary Management** (`/suppliers/dashboard` → `/catering/dietary`)
- **Wedding Details** → **Menu Planning** (`/weddings/[id]` → `/weddings/[id]/menu`)
- **Guest Management** → **Dietary Requirements** (`/weddings/[id]/guests` → `/weddings/[id]/dietary`)

### Breadcrumb Structure
```typescript
const breadcrumbs = [
  { label: 'Dashboard', href: '/suppliers/dashboard' },
  { label: 'Catering', href: '/suppliers/catering' },
  { label: 'Dietary Management', href: '/suppliers/catering/dietary' },
  { label: weddingName, href: `/suppliers/catering/dietary/${weddingId}` }
]
```

### Menu Integration
```typescript
// Add to supplier navigation menu
{
  label: 'Dietary Management',
  href: '/suppliers/catering/dietary',
  icon: 'AllergyIcon',
  badge: highRiskCount > 0 ? highRiskCount : undefined,
  children: [
    { label: 'Guest Requirements', href: '/suppliers/catering/dietary/requirements' },
    { label: 'Menu Generation', href: '/suppliers/catering/dietary/menu' },
    { label: 'Allergen Analysis', href: '/suppliers/catering/dietary/allergens' },
    { label: 'Portion Calculator', href: '/suppliers/catering/dietary/portions' }
  ]
}
```

## Error Handling & Edge Cases

### API Rate Limiting
```typescript
// OpenAI API rate limiting for menu generation
const rateLimiter = {
  requests: 50,
  per: 'hour',
  queue: true
}

// Fallback to template-based generation if AI fails
if (aiGenerationFailed) {
  return await generateTemplateBasedMenu(requirements)
}
```

### Data Validation
```typescript
// Validate dietary requirements input
const dietaryRequirementSchema = {
  guestName: { required: true, minLength: 2 },
  category: { required: true, enum: ['allergy', 'diet', 'medical'] },
  severity: { required: true, min: 1, max: 5 },
  notes: { maxLength: 500 }
}
```

### Allergen Detection Edge Cases
```typescript
// Handle complex ingredient names
const complexIngredients = [
  'modified corn starch',
  'natural flavoring',
  'spice blend',
  'seasoning mix'
]

// AI analysis for ambiguous ingredients
if (isAmbiguousIngredient(ingredient)) {
  const aiAnalysis = await analyzeComplexIngredient(ingredient)
  allergenWarnings.push(...aiAnalysis.warnings)
}
```

## Acceptance Criteria

### Must Have
- [x] Guest dietary requirement input and storage
- [x] AI-powered menu generation with compliance checking
- [x] Allergen detection and cross-contamination warnings
- [x] Portion calculation with cost estimation
- [x] Ingredient substitution suggestions
- [x] Menu validation against all guest requirements
- [x] Real-time compliance scoring
- [x] Integration with wedding guest management

### Should Have
- [x] Dietary analytics dashboard
- [x] Menu template system for common restrictions
- [x] Shopping list generation
- [x] Preparation timeline planning
- [x] Cross-contamination prevention protocols
- [x] Emergency contact integration for severe allergies

### Could Have
- [ ] Integration with grocery delivery services
- [ ] Nutritional information calculation
- [ ] Recipe scaling for different guest counts
- [ ] Photo-based ingredient recognition
- [ ] Integration with kitchen equipment management

### Won't Have (This Phase)
- Nutritionist consultation booking
- Custom diet plan creation
- Calorie counting features
- Integration with fitness tracking apps

## Dependencies

### Internal Dependencies
- **WS-047**: Analytics Dashboard (for dietary analytics)
- **WS-043**: User Profile Management (for guest requirements)
- **WS-041**: Wedding Management System (for guest data)
- **WS-028**: Supplier Management (for caterer profiles)

### External Dependencies
- OpenAI API (GPT-4 for menu generation, GPT-3.5 for analysis)
- Supabase (database and real-time updates)
- FDA allergen database (compliance validation)
- Nutritional data APIs (future enhancement)

### Technical Dependencies
- React 19 with Server Components
- Next.js 15 App Router
- TypeScript 5.0+
- Tailwind CSS for styling
- Recharts for analytics visualization

## Effort Estimation

### Development Phases

**Phase 1: Core Dietary Management (2 weeks)**
- Database schema and migrations
- Basic dietary requirement input
- Simple allergen detection
- Menu item management

**Phase 2: AI Integration (2 weeks)**
- OpenAI API integration
- Menu generation system
- Intelligent allergen analysis
- Ingredient substitution engine

**Phase 3: Advanced Features (1.5 weeks)**
- Portion calculation system
- Cost estimation
- Shopping list generation
- Compliance reporting

**Phase 4: UI/UX & Testing (1.5 weeks)**
- React component development
- Browser testing with Playwright
- Integration testing
- Performance optimization

### Total Estimated Effort
**7 weeks** (1 senior full-stack developer)

### Risk Factors
- OpenAI API reliability and cost management
- Complexity of dietary restriction combinations
- Accuracy of allergen detection
- Integration complexity with existing wedding management system

---

*This technical specification provides a comprehensive foundation for implementing a professional-grade dietary management system that ensures wedding guest safety while enabling efficient catering operations.*