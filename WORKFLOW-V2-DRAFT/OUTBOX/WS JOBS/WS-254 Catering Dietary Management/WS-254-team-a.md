# WS-254 Team A: Catering Dietary Management - Frontend Implementation

## EVIDENCE OF REALITY REQUIREMENTS

**CRITICAL**: Before marking this task complete, you MUST provide:

1. **File Existence Proof**:
   - Screenshot of file explorer showing all created files
   - `ls -la` output showing new component files with timestamps
   - `find . -name "*dietary*" -type f` output showing all dietary management files

2. **Type Check Results**:
   ```bash
   npm run type-check 2>&1 | grep -E "(error|success|dietary)"
   ```

3. **Component Compilation Proof**:
   ```bash
   npm run build 2>&1 | grep -E "(dietary|error|success)"
   ```

4. **Browser Screenshots**:
   - Dietary requirements dashboard (desktop and mobile views)
   - Menu generation interface with AI suggestions
   - Allergen analysis results display
   - Guest requirement input forms

5. **Code Integration Evidence**:
   - Show import statements in other files
   - Demonstrate component props and TypeScript interfaces
   - Navigation integration screenshots

## SECURITY VALIDATION REQUIREMENTS

All API routes MUST implement the withSecureValidation middleware:

```typescript
import { withSecureValidation } from '@/lib/security/withSecureValidation'

export async function POST(request: Request) {
  return withSecureValidation(request, async ({ body, user }) => {
    // Your secure endpoint logic here
    // user object is guaranteed to be authenticated
    // body is validated and sanitized
  })
}
```

## NAVIGATION INTEGRATION REQUIREMENTS

MANDATORY: Every component must integrate with our navigation system:

```typescript
// Import the navigation hook
import { useNavigation } from '@/hooks/useNavigation'

// In your component:
const { navigateTo, breadcrumbs } = useNavigation()

// Use navigateTo for all navigation
<Button onClick={() => navigateTo('/catering/dietary/menu', { weddingId })}>
  Generate Menu
</Button>

// Implement breadcrumbs
<Breadcrumbs items={breadcrumbs} />
```

## UI TECHNOLOGY STACK REQUIREMENTS

**ONLY USE THESE UI LIBRARIES** (NO EXCEPTIONS):
- **Untitled UI Components**: For all basic components
- **Magic UI Components**: For advanced/animated components  
- **Tailwind CSS**: For styling
- **Recharts**: For charts/graphs only
- **React Hook Form + Zod**: For form handling only

**FORBIDDEN LIBRARIES**:
- Any other component library (MUI, Ant Design, etc.)
- Any other animation library (Framer Motion, etc.)
- Any other styling solution (Styled Components, etc.)

## CORE FUNCTIONALITY REQUIREMENTS

### 1. Dietary Requirements Dashboard Component

Create a comprehensive dashboard for managing guest dietary requirements:

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@untitled-ui/react'
import { Button, Badge } from '@untitled-ui/react'
import { Alert, AlertDescription } from '@untitled-ui/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@untitled-ui/react'
import { motion } from '@magic-ui/react'
import { 
  AllergyIcon, 
  VegetarianIcon, 
  KosherIcon, 
  GlutenFreeIcon,
  DollarSignIcon,
  UsersIcon,
  ChefHatIcon,
  AlertTriangleIcon,
  PlusIcon,
  FilterIcon,
  SearchIcon
} from 'lucide-react'
import { useNavigation } from '@/hooks/useNavigation'

interface DietaryRequirement {
  id: string
  guestName: string
  category: 'allergy' | 'diet' | 'medical' | 'preference'
  severity: 1 | 2 | 3 | 4 | 5
  notes: string
  verified: boolean
  emergencyContact?: string
  createdAt: string
  updatedAt: string
}

interface DietaryDashboardProps {
  weddingId: string
  supplierId: string
  onRequirementAdd?: (requirement: DietaryRequirement) => void
  onMenuGenerate?: () => void
  className?: string
}

export function DietaryManagementDashboard({ 
  weddingId, 
  supplierId,
  onRequirementAdd,
  onMenuGenerate,
  className = ''
}: DietaryDashboardProps) {
  const [requirements, setRequirements] = useState<DietaryRequirement[]>([])
  const [guestCount, setGuestCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const { navigateTo, breadcrumbs } = useNavigation()

  const severityColors = {
    1: 'bg-green-100 text-green-800 border-green-200',
    2: 'bg-blue-100 text-blue-800 border-blue-200', 
    3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    4: 'bg-orange-100 text-orange-800 border-orange-200',
    5: 'bg-red-100 text-red-800 border-red-200'
  }

  const categoryIcons = {
    allergy: AllergyIcon,
    diet: VegetarianIcon,
    medical: GlutenFreeIcon,
    preference: KosherIcon
  }

  useEffect(() => {
    fetchDietaryRequirements()
  }, [weddingId])

  const fetchDietaryRequirements = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/catering/dietary/summary/${weddingId}`, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRequirements(data.requirements || [])
        setGuestCount(data.totalGuests || 0)
      } else {
        throw new Error('Failed to fetch dietary requirements')
      }
    } catch (error) {
      console.error('Error fetching dietary requirements:', error)
      // Show error notification
    } finally {
      setLoading(false)
    }
  }

  const filteredRequirements = requirements.filter(req => {
    const matchesCategory = filterCategory === 'all' || req.category === filterCategory
    const matchesSearch = searchQuery === '' || 
      req.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.notes.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const requirementsByCategory = requirements.reduce((acc, req) => {
    acc[req.category] = (acc[req.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const highRiskRequirements = requirements.filter(req => req.severity >= 4)
  const unverifiedRequirements = requirements.filter(req => !req.verified)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-blue-100 rounded-full mr-4">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{guestCount}</p>
              <p className="text-sm text-gray-600">Total Guests</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-yellow-100 rounded-full mr-4">
              <AllergyIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{requirements.length}</p>
              <p className="text-sm text-gray-600">Dietary Requirements</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-red-100 rounded-full mr-4">
              <AlertTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{highRiskRequirements.length}</p>
              <p className="text-sm text-gray-600">High Risk</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-green-100 rounded-full mr-4">
              <ChefHatIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {requirements.filter(r => r.verified).length}
              </p>
              <p className="text-sm text-gray-600">Verified</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* High Risk Alert */}
      {highRiskRequirements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-start">
            <AlertTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
            <div>
              <h3 className="font-medium text-red-800">
                {highRiskRequirements.length} High-Risk Requirements Detected
              </h3>
              <p className="text-red-700 text-sm mt-1">
                These guests have severe allergies or medical conditions requiring special attention. 
                Review emergency contacts and ensure proper kitchen protocols.
              </p>
              <div className="mt-3 space-x-2">
                {highRiskRequirements.slice(0, 3).map((req) => (
                  <Badge key={req.id} className="bg-red-100 text-red-800 border-red-200">
                    {req.guestName} - {req.notes}
                  </Badge>
                ))}
                {highRiskRequirements.length > 3 && (
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    +{highRiskRequirements.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Unverified Requirements Alert */}
      {unverifiedRequirements.length > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangleIcon className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            {unverifiedRequirements.length} dietary requirements need guest verification. 
            Consider sending confirmation requests to ensure accuracy.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={() => navigateTo('/catering/dietary/requirements/add', { weddingId })}
          className="flex-1 sm:flex-none"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Guest Requirements
        </Button>
        
        <Button 
          onClick={() => navigateTo('/catering/dietary/menu/generate', { weddingId })}
          disabled={requirements.length === 0}
          className="flex-1 sm:flex-none"
        >
          <ChefHatIcon className="h-4 w-4 mr-2" />
          Generate AI Menu
        </Button>
        
        <Button 
          variant="outline"
          onClick={() => navigateTo('/catering/dietary/analysis', { weddingId })}
          disabled={requirements.length === 0}
        >
          View Analysis Report
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="requirements" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4">
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="severity">By Severity</TabsTrigger>
          <TabsTrigger value="verification" className="hidden lg:block">
            Verification
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requirements" className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search guests or requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4 text-gray-500" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="allergy">Allergies</option>
                <option value="diet">Dietary</option>
                <option value="medical">Medical</option>
                <option value="preference">Preferences</option>
              </select>
            </div>
          </div>

          {/* Requirements List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Guest Dietary Requirements
                <Badge variant="outline">{filteredRequirements.length} of {requirements.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-4 p-3 border rounded-lg">
                        <div className="h-8 w-16 bg-gray-200 rounded"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredRequirements.length === 0 ? (
                <div className="text-center py-8">
                  <AllergyIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {requirements.length === 0 
                      ? "No dietary requirements added yet."
                      : "No requirements match your current filters."
                    }
                  </p>
                  {requirements.length === 0 && (
                    <Button 
                      className="mt-4"
                      onClick={() => navigateTo('/catering/dietary/requirements/add', { weddingId })}
                    >
                      Add First Requirement
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequirements.map((req) => {
                    const IconComponent = categoryIcons[req.category]
                    return (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <IconComponent className="h-5 w-5 text-gray-500" />
                            <Badge className={severityColors[req.severity]}>
                              Level {req.severity}
                            </Badge>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-medium text-gray-900">{req.guestName}</span>
                              <span className="text-sm text-gray-500 capitalize">
                                {req.category}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{req.notes}</p>
                            {req.emergencyContact && (
                              <p className="text-xs text-red-600 mt-1">
                                Emergency: {req.emergencyContact}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {req.verified ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 border-gray-200">
                              Unverified
                            </Badge>
                          )}
                          
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(requirementsByCategory).map(([category, count]) => {
              const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || AllergyIcon
              const categoryRequirements = requirements.filter(r => r.category === category)
              
              return (
                <Card key={category} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-5 w-5" />
                        <span className="capitalize">{category}</span>
                      </div>
                      <Badge>{count}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {categoryRequirements.slice(0, 3).map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{req.guestName}</span>
                          <Badge className={severityColors[req.severity]} size="sm">
                            {req.severity}
                          </Badge>
                        </div>
                      ))}
                      {categoryRequirements.length > 3 && (
                        <p className="text-sm text-gray-500 text-center py-1">
                          +{categoryRequirements.length - 3} more
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="severity" className="space-y-4">
          <div className="space-y-4">
            {[5, 4, 3, 2, 1].map((level) => {
              const levelRequirements = requirements.filter(r => r.severity === level)
              if (levelRequirements.length === 0) return null

              return (
                <Card key={level}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className={severityColors[level as keyof typeof severityColors]}>
                          Severity Level {level}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {level === 5 ? 'Life-threatening' :
                           level === 4 ? 'Severe' :
                           level === 3 ? 'Moderate' :
                           level === 2 ? 'Mild' : 'Preference'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {levelRequirements.length} guest{levelRequirements.length !== 1 ? 's' : ''}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {levelRequirements.map((req) => (
                        <div key={req.id} className="p-3 border rounded-lg">
                          <div className="font-medium text-gray-900">{req.guestName}</div>
                          <div className="text-sm text-gray-600 capitalize">{req.category}</div>
                          <div className="text-sm text-gray-600 mt-1">{req.notes}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800 flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  Verified Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-700 mb-2">
                  {requirements.filter(r => r.verified).length}
                </p>
                <p className="text-sm text-green-600">
                  Confirmed by guests directly
                </p>
              </CardContent>
            </Card>

            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="text-yellow-800 flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  Pending Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-yellow-700 mb-2">
                  {unverifiedRequirements.length}
                </p>
                <p className="text-sm text-yellow-600">
                  Awaiting guest confirmation
                </p>
                {unverifiedRequirements.length > 0 && (
                  <Button size="sm" className="mt-3">
                    Send Verification Requests
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### 2. Menu Generation Interface Component

Create an AI-powered menu generation interface:

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@untitled-ui/react'
import { Button, Badge } from '@untitled-ui/react'
import { Input, Textarea } from '@untitled-ui/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@untitled-ui/react'
import { motion, AnimatePresence } from '@magic-ui/react'
import { 
  ChefHatIcon, 
  WandIcon, 
  DollarSignIcon,
  ClockIcon,
  UsersIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  SparklesIcon,
  RefreshCwIcon,
  DownloadIcon,
  ShareIcon
} from 'lucide-react'
import { useNavigation } from '@/hooks/useNavigation'

interface MenuOption {
  id: string
  name: string
  description: string
  courses: MenuCourse[]
  complianceScore: number
  totalCost: number
  costPerPerson: number
  preparationTime: number
  warnings: string[]
  aiConfidence: number
  createdAt: string
}

interface MenuCourse {
  id: string
  name: string
  type: 'appetizer' | 'main' | 'dessert' | 'side'
  dishes: MenuDish[]
}

interface MenuDish {
  id: string
  name: string
  description: string
  ingredients: string[]
  allergens: string[]
  dietaryTags: string[]
  cost: number
  prepTime: number
}

interface MenuGeneratorProps {
  weddingId: string
  requirements: DietaryRequirement[]
  guestCount: number
  onMenuSelect?: (menu: MenuOption) => void
  className?: string
}

export function MenuGenerator({ 
  weddingId, 
  requirements, 
  guestCount,
  onMenuSelect,
  className = ''
}: MenuGeneratorProps) {
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [selectedStyle, setSelectedStyle] = useState('formal')
  const [budgetPerPerson, setBudgetPerPerson] = useState(75)
  const [mealType, setMealType] = useState('dinner')
  const [culturalPreferences, setCulturalPreferences] = useState('')
  const [seasonalPreferences, setSeasonalPreferences] = useState('')
  const { navigateTo } = useNavigation()

  const menuStyles = [
    { value: 'formal', label: 'Formal Plated', description: 'Elegant multi-course dining' },
    { value: 'buffet', label: 'Buffet Style', description: 'Self-service variety' },
    { value: 'family-style', label: 'Family Style', description: 'Shared plates and bowls' },
    { value: 'cocktail', label: 'Cocktail Reception', description: 'Appetizers and finger foods' },
    { value: 'casual', label: 'Casual Dining', description: 'Relaxed atmosphere' }
  ]

  const mealTypes = [
    { value: 'lunch', label: 'Lunch Reception' },
    { value: 'dinner', label: 'Dinner Reception' },
    { value: 'brunch', label: 'Brunch Reception' },
    { value: 'cocktail', label: 'Cocktail Hour Only' }
  ]

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) return prev
          return prev + Math.random() * 15
        })
      }, 500)

      return () => clearInterval(interval)
    }
  }, [isGenerating])

  const generateMenu = async () => {
    setIsGenerating(true)
    setGenerationProgress(10)
    setMenuOptions([])

    try {
      const dietaryRequirements = {
        allergies: requirements.filter(r => r.category === 'allergy').map(r => r.notes),
        diets: requirements.filter(r => r.category === 'diet').map(r => r.notes),
        medical: requirements.filter(r => r.category === 'medical').map(r => r.notes),
        preferences: requirements.filter(r => r.category === 'preference').map(r => r.notes)
      }

      setGenerationProgress(30)

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
          menuStyle: selectedStyle,
          budgetPerPerson,
          mealType,
          culturalRequirements: culturalPreferences.split(',').filter(Boolean),
          seasonalPreferences: seasonalPreferences.split(',').filter(Boolean)
        })
      })

      setGenerationProgress(70)

      if (response.ok) {
        const data = await response.json()
        setGenerationProgress(100)
        
        setTimeout(() => {
          setMenuOptions(data.menuOptions || [])
          setIsGenerating(false)
          setGenerationProgress(0)
        }, 500)
      } else {
        throw new Error('Failed to generate menu')
      }
    } catch (error) {
      console.error('Menu generation failed:', error)
      setIsGenerating(false)
      setGenerationProgress(0)
      // Show error notification
    }
  }

  const getComplianceColor = (score: number) => {
    if (score >= 0.9) return 'bg-green-100 text-green-800 border-green-200'
    if (score >= 0.7) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const getComplianceText = (score: number) => {
    if (score >= 0.9) return 'Excellent'
    if (score >= 0.7) return 'Good'
    return 'Needs Review'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          AI-Powered Menu Generation
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Let our AI chef create the perfect menu based on your guests' dietary requirements, 
          budget, and style preferences.
        </p>
      </div>

      {/* Generation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <WandIcon className="h-5 w-5 mr-2" />
            Menu Generation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Settings Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Menu Style</label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {menuStyles.map(style => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {menuStyles.find(s => s.value === selectedStyle)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Meal Type</label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {mealTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Budget Per Person</label>
              <div className="relative">
                <DollarSignIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  min="20"
                  max="300"
                  value={budgetPerPerson}
                  onChange={(e) => setBudgetPerPerson(Number(e.target.value))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Cultural Preferences</label>
              <Input
                placeholder="e.g., Italian, Asian, Mediterranean (comma-separated)"
                value={culturalPreferences}
                onChange={(e) => setCulturalPreferences(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Seasonal Preferences</label>
              <Input
                placeholder="e.g., spring, summer, local, organic (comma-separated)"
                value={seasonalPreferences}
                onChange={(e) => setSeasonalPreferences(e.target.value)}
              />
            </div>
          </div>

          {/* Requirements Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Dietary Requirements Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['allergies', 'diets', 'medical', 'preferences'].map((category) => {
                const count = requirements.filter(r => r.category === category.slice(0, -1)).length
                return (
                  <div key={category} className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-600 capitalize">{category}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Generate Button */}
          <div className="text-center">
            <Button
              onClick={generateMenu}
              disabled={isGenerating || requirements.length === 0}
              size="lg"
              className="px-8"
            >
              {isGenerating ? (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2 animate-spin" />
                  Generating Menu... {Math.round(generationProgress)}%
                </>
              ) : (
                <>
                  <ChefHatIcon className="h-5 w-5 mr-2" />
                  Generate AI Menu
                </>
              )}
            </Button>
            
            {requirements.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Add guest dietary requirements first to generate a menu
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
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-blue-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${generationProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-center text-sm text-gray-600 mt-2">
                {generationProgress < 30 ? 'Analyzing dietary requirements...' :
                 generationProgress < 70 ? 'Generating menu options...' :
                 generationProgress < 100 ? 'Validating compliance...' :
                 'Finalizing menus...'}
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Generated Menu Options */}
      <AnimatePresence>
        {menuOptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-semibold text-gray-900">
              Generated Menu Options ({menuOptions.length})
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {menuOptions.map((menu, index) => (
                <motion.div
                  key={menu.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center">
                            <span className="mr-2">Menu Option {index + 1}</span>
                            <Badge className={getComplianceColor(menu.complianceScore)}>
                              {Math.round(menu.complianceScore * 100)}% Compliant
                            </Badge>
                          </CardTitle>
                          <p className="text-gray-600 mt-1">{menu.description}</p>
                        </div>
                      </div>
                      
                      {/* Menu Stats */}
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <DollarSignIcon className="h-4 w-4 text-gray-500 mr-1" />
                          </div>
                          <div className="text-lg font-semibold">${menu.costPerPerson}</div>
                          <div className="text-xs text-gray-500">per person</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <ClockIcon className="h-4 w-4 text-gray-500 mr-1" />
                          </div>
                          <div className="text-lg font-semibold">{menu.preparationTime}h</div>
                          <div className="text-xs text-gray-500">prep time</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <SparklesIcon className="h-4 w-4 text-gray-500 mr-1" />
                          </div>
                          <div className="text-lg font-semibold">{Math.round(menu.aiConfidence * 100)}%</div>
                          <div className="text-xs text-gray-500">AI confidence</div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Courses */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Menu Courses</h4>
                        <div className="space-y-2">
                          {menu.courses.map((course) => (
                            <div key={course.id} className="border rounded-lg p-3">
                              <div className="font-medium capitalize text-gray-900">
                                {course.name}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {course.dishes.map(dish => dish.name).join(', ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Warnings */}
                      {menu.warnings.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-start">
                            <AlertTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5 mr-2" />
                            <div>
                              <div className="font-medium text-yellow-800">Warnings</div>
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
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          onClick={() => onMenuSelect?.(menu)}
                          className="flex-1"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Select Menu
                        </Button>
                        
                        <Button variant="outline" size="sm">
                          <DownloadIcon className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                        
                        <Button variant="outline" size="sm">
                          <ShareIcon className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Generate More Options */}
            <div className="text-center">
              <Button 
                variant="outline"
                onClick={generateMenu}
                disabled={isGenerating}
              >
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Generate More Options
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

### 3. Mobile-Responsive Design

Ensure all components work perfectly on mobile devices:

```typescript
// Add to your CSS/Tailwind configuration
const mobileStyles = {
  // Touch-friendly button sizes
  touchButton: "min-h-[48px] min-w-[48px]",
  
  // Mobile-first grid layouts
  responsiveGrid: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  
  // Mobile navigation
  mobileNav: "fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 sm:static sm:border-0 sm:shadow-none sm:p-0",
  
  // Mobile-optimized forms
  mobileForm: "space-y-4 px-4 pb-20 sm:pb-0", // Account for mobile nav
  
  // Responsive text sizes
  responsiveHeading: "text-xl sm:text-2xl lg:text-3xl",
  responsiveBody: "text-sm sm:text-base"
}

// Mobile-specific component wrapper
export function MobileDietaryInterface({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) {
    return (
      <div className="min-h-screen pb-20">
        {children}
        {/* Mobile bottom navigation */}
        <div className={mobileStyles.mobileNav}>
          <div className="flex justify-around">
            <Button size="sm" variant="ghost">
              Requirements
            </Button>
            <Button size="sm" variant="ghost">
              Menu
            </Button>
            <Button size="sm" variant="ghost">
              Analysis
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <div>{children}</div>
}
```

## TESTING REQUIREMENTS

### Component Testing with React Testing Library

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DietaryManagementDashboard } from './DietaryManagementDashboard'

describe('DietaryManagementDashboard', () => {
  const mockProps = {
    weddingId: 'test-wedding-123',
    supplierId: 'test-supplier-123'
  }

  beforeEach(() => {
    global.fetch = jest.fn()
  })

  test('renders dashboard with guest count and requirements summary', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        requirements: [
          { id: '1', guestName: 'John', category: 'allergy', severity: 5, notes: 'nuts', verified: true },
          { id: '2', guestName: 'Jane', category: 'diet', severity: 3, notes: 'vegan', verified: false }
        ],
        totalGuests: 100
      })
    })

    render(<DietaryManagementDashboard {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('Total Guests')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('Dietary Requirements')).toBeInTheDocument()
    })
  })

  test('shows high risk alert when severity 4+ requirements exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        requirements: [
          { id: '1', guestName: 'John', category: 'allergy', severity: 5, notes: 'severe nut allergy', verified: true }
        ],
        totalGuests: 50
      })
    })

    render(<DietaryManagementDashboard {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText(/High-Risk Requirements Detected/)).toBeInTheDocument()
      expect(screen.getByText('John - severe nut allergy')).toBeInTheDocument()
    })
  })

  test('filters requirements by category', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        requirements: [
          { id: '1', guestName: 'John', category: 'allergy', severity: 5, notes: 'nuts', verified: true },
          { id: '2', guestName: 'Jane', category: 'diet', severity: 3, notes: 'vegan', verified: false }
        ],
        totalGuests: 100
      })
    })

    render(<DietaryManagementDashboard {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument()
      expect(screen.getByText('Jane')).toBeInTheDocument()
    })

    const categoryFilter = screen.getByDisplayValue('All Categories')
    fireEvent.change(categoryFilter, { target: { value: 'allergy' } })

    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.queryByText('Jane')).not.toBeInTheDocument()
  })

  test('navigates to add requirements page when button clicked', async () => {
    const mockNavigate = jest.fn()
    jest.mock('@/hooks/useNavigation', () => ({
      useNavigation: () => ({ navigateTo: mockNavigate, breadcrumbs: [] })
    }))

    render(<DietaryManagementDashboard {...mockProps} />)

    const addButton = screen.getByText('Add Guest Requirements')
    fireEvent.click(addButton)

    expect(mockNavigate).toHaveBeenCalledWith('/catering/dietary/requirements/add', { weddingId: mockProps.weddingId })
  })
})
```

### Integration Testing with Playwright

```typescript
import { test, expect } from '@playwright/test'

test.describe('Dietary Management Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/catering/dietary/test-wedding-123')
  })

  test('displays dietary requirements dashboard', async ({ page }) => {
    await expect(page.getByText('Dietary Management Dashboard')).toBeVisible()
    await expect(page.getByText('Total Guests')).toBeVisible()
    await expect(page.getByText('Dietary Requirements')).toBeVisible()
  })

  test('generates AI menu with requirements', async ({ page }) => {
    // Add a dietary requirement first
    await page.click('text=Add Guest Requirements')
    await page.fill('[name="guestName"]', 'John Smith')
    await page.selectOption('[name="category"]', 'allergy')
    await page.fill('[name="notes"]', 'severe nut allergy')
    await page.click('button[type="submit"]')

    // Navigate back to menu generation
    await page.click('text=Generate AI Menu')
    
    // Set menu parameters
    await page.selectOption('[name="menuStyle"]', 'formal')
    await page.fill('[name="budgetPerPerson"]', '100')
    
    // Generate menu
    await page.click('text=Generate AI Menu')
    
    // Wait for generation to complete
    await expect(page.getByText('Generated Menu Options')).toBeVisible({ timeout: 30000 })
    
    // Verify menu shows compliance information
    await expect(page.getByText(/% Compliant/)).toBeVisible()
    await expect(page.getByText('per person')).toBeVisible()
  })

  test('mobile responsive design', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE

    await expect(page.getByText('Dietary Management Dashboard')).toBeVisible()
    
    // Check mobile navigation
    await expect(page.locator('.sm\\:hidden')).toBeVisible()
    
    // Check touch-friendly buttons
    const addButton = page.getByText('Add Guest Requirements')
    const buttonSize = await addButton.boundingBox()
    expect(buttonSize?.height).toBeGreaterThanOrEqual(48) // Minimum touch target
  })

  test('filters and search functionality', async ({ page }) => {
    // Add test data
    await page.evaluate(() => {
      // Mock API response with test data
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          requirements: [
            { id: '1', guestName: 'John Allergic', category: 'allergy', severity: 5, notes: 'nuts', verified: true },
            { id: '2', guestName: 'Jane Vegan', category: 'diet', severity: 3, notes: 'vegan', verified: false },
            { id: '3', guestName: 'Bob Celiac', category: 'medical', severity: 4, notes: 'celiac disease', verified: true }
          ],
          totalGuests: 100
        })
      })
    })

    await page.reload()

    // Test search functionality
    await page.fill('input[placeholder*="Search guests"]', 'John')
    await expect(page.getByText('John Allergic')).toBeVisible()
    await expect(page.getByText('Jane Vegan')).not.toBeVisible()

    // Test category filter
    await page.selectOption('select', 'allergy')
    await expect(page.getByText('John Allergic')).toBeVisible()
    await expect(page.getByText('Jane Vegan')).not.toBeVisible()
    await expect(page.getByText('Bob Celiac')).not.toBeVisible()
  })
})
```

## ACCESSIBILITY REQUIREMENTS

Implement full accessibility compliance:

```typescript
// ARIA labels and roles
<div role="main" aria-label="Dietary Management Dashboard">
  <div role="tablist" aria-label="Dietary requirement categories">
    <button role="tab" aria-selected="true" aria-controls="requirements-panel">
      Requirements
    </button>
  </div>
</div>

// Keyboard navigation
const handleKeyDown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault()
      handleMenuSelect()
      break
    case 'Escape':
      setShowModal(false)
      break
  }
}

// Screen reader announcements
const [announceMessage, setAnnounceMessage] = useState('')

useEffect(() => {
  if (menuGenerated) {
    setAnnounceMessage(`Menu generated with ${menuOptions.length} options. Use arrow keys to navigate.`)
  }
}, [menuGenerated])

// Live region for dynamic updates
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {announceMessage}
</div>
```

## COMPLETION CHECKLIST

### Frontend Components ✅
- [ ] DietaryManagementDashboard component with all features
- [ ] MenuGenerator component with AI integration
- [ ] Mobile-responsive design implementation
- [ ] Navigation integration with useNavigation hook
- [ ] Form components with validation
- [ ] Loading states and error handling
- [ ] Accessibility compliance (ARIA, keyboard navigation)

### Security Integration ✅ 
- [ ] withSecureValidation middleware implemented
- [ ] API endpoints secured with authentication
- [ ] Input validation and sanitization
- [ ] XSS protection on all user inputs
- [ ] CSRF protection on forms

### Testing Coverage ✅
- [ ] Unit tests for all components (>80% coverage)
- [ ] Integration tests with Playwright
- [ ] Mobile responsiveness testing
- [ ] Accessibility testing with axe-core
- [ ] Cross-browser compatibility testing

### Performance Optimization ✅
- [ ] Code splitting for large components
- [ ] Lazy loading for menu generation
- [ ] Image optimization for food photos
- [ ] API call debouncing and caching
- [ ] Bundle size optimization

### Documentation ✅
- [ ] Component API documentation
- [ ] Usage examples and patterns
- [ ] Troubleshooting guide
- [ ] Performance benchmarks
- [ ] Screenshot evidence of all features

**CRITICAL**: This implementation must handle 1000+ concurrent users during peak wedding planning season. All components must be production-ready with comprehensive error handling, loading states, and failover mechanisms.