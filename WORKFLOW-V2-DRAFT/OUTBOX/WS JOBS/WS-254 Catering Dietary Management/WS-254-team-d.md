# WS-254 Team D: Catering Dietary Management - Platform & Mobile Implementation

## EVIDENCE OF REALITY REQUIREMENTS

**CRITICAL**: Before marking this task complete, you MUST provide:

1. **Mobile Build Evidence**:
   ```bash
   npm run build 2>&1 | grep -E "(mobile|responsive|dietary)"
   ```

2. **PWA Functionality Proof**:
   - Screenshots of dietary management working offline
   - Service worker caching dietary data
   - Push notification for high-risk requirements

3. **Performance Metrics**:
   ```bash
   npm run lighthouse -- --preset=mobile 2>&1
   ```
   - First Contentful Paint < 1.2s
   - Time to Interactive < 2.5s
   - Lighthouse Score > 90

4. **Touch Optimization Evidence**:
   - Screenshots of touch-friendly dietary requirement forms
   - Video of gesture navigation working
   - Touch target size validation (minimum 48x48px)

5. **Cross-Platform Testing**:
   - iOS Safari screenshots
   - Android Chrome screenshots
   - Tablet layout evidence
   - Accessibility compliance proof

6. **Offline Functionality Demonstration**:
   - Dietary requirements accessible without internet
   - Offline form submission queuing
   - Data sync when connection restored

## SECURITY VALIDATION REQUIREMENTS

All mobile endpoints MUST implement secure validation:

```typescript
import { withSecureValidation } from '@/lib/security/withSecureValidation'
import { validateMobileRequest } from '@/lib/security/mobile-validation'

export async function POST(request: Request) {
  return withSecureValidation(request, async ({ body, user }) => {
    await validateMobileRequest(request, user)
    // Your secure mobile logic here
  })
}
```

## NAVIGATION INTEGRATION REQUIREMENTS

Mobile navigation must support dietary management workflows:

```typescript
// Mobile-optimized navigation context
interface MobileNavigationContext {
  screenSize: 'mobile' | 'tablet'
  orientation: 'portrait' | 'landscape'
  touchCapability: boolean
  offlineMode: boolean
  currentStep: string
  totalSteps: number
}
```

## MOBILE-FIRST IMPLEMENTATION

### 1. Mobile Dietary Requirements Interface

```typescript
// File: src/components/mobile/MobileDietaryManager.tsx

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader } from '@untitled-ui/react'
import { Button, Badge, Input } from '@untitled-ui/react'
import { motion, AnimatePresence } from '@magic-ui/react'
import { 
  PlusIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon,
  PhoneIcon,
  UserIcon,
  ClipboardListIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  MenuIcon,
  SearchIcon,
  FilterIcon,
  BellIcon,
  StarIcon
} from 'lucide-react'
import { useSwipeable } from 'react-swipeable'
import { useTouch } from '@/hooks/useTouch'
import { useOffline } from '@/hooks/useOffline'
import { useVibration } from '@/hooks/useVibration'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface MobileDietaryManagerProps {
  weddingId: string
  requirements: DietaryRequirement[]
  onRequirementUpdate?: (requirement: DietaryRequirement) => void
  className?: string
}

export function MobileDietaryManager({
  weddingId,
  requirements,
  onRequirementUpdate,
  className = ''
}: MobileDietaryManagerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'menu' | 'alerts'>('overview')
  const [selectedRequirement, setSelectedRequirement] = useState<DietaryRequirement | null>(null)
  const [isAddingRequirement, setIsAddingRequirement] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSeverity, setFilterSeverity] = useState<number | null>(null)
  const [showQuickActions, setShowQuickActions] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const { isOffline, queueAction } = useOffline()
  const { vibrate } = useVibration()
  const { requestPermission, sendNotification } = usePushNotifications()
  const { touchEvents, gestureState } = useTouch({
    onSwipeLeft: () => navigateTab('next'),
    onSwipeRight: () => navigateTab('prev'),
    onLongPress: (element) => handleLongPress(element),
    enableHapticFeedback: true
  })

  const highRiskRequirements = requirements.filter(r => r.severity >= 4)
  const unverifiedRequirements = requirements.filter(r => !r.verified)

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => navigateTab('next'),
    onSwipedRight: () => navigateTab('prev'),
    onSwipedUp: () => setShowQuickActions(true),
    onSwipedDown: () => setShowQuickActions(false),
    trackMouse: false,
    trackTouch: true
  })

  useEffect(() => {
    // Request notification permissions on mobile
    requestPermission()
  }, [])

  useEffect(() => {
    // Auto-refresh when coming back online
    if (!isOffline && requirements.length === 0) {
      fetchRequirements()
    }
  }, [isOffline])

  const navigateTab = (direction: 'next' | 'prev') => {
    const tabs = ['overview', 'requirements', 'menu', 'alerts'] as const
    const currentIndex = tabs.indexOf(activeTab)
    
    if (direction === 'next' && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1])
      vibrate(50) // Light haptic feedback
    } else if (direction === 'prev' && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1])
      vibrate(50)
    }
  }

  const handleLongPress = (element: HTMLElement) => {
    if (element.dataset.requirementId) {
      setSelectedRequirement(
        requirements.find(r => r.id === element.dataset.requirementId) || null
      )
      vibrate(100) // Medium haptic feedback
    }
  }

  const handleQuickAction = async (action: string, requirement?: DietaryRequirement) => {
    vibrate(75)

    switch (action) {
      case 'add_requirement':
        setIsAddingRequirement(true)
        break
      case 'verify_requirement':
        if (requirement) {
          await updateRequirement({ ...requirement, verified: true })
        }
        break
      case 'flag_urgent':
        if (requirement) {
          await updateRequirement({ ...requirement, severity: Math.min(requirement.severity + 1, 5) })
          sendNotification({
            title: 'High Priority Dietary Requirement',
            body: `${requirement.guestName}'s requirement marked as urgent`,
            tag: 'dietary-urgent'
          })
        }
        break
      case 'call_emergency':
        if (requirement?.emergencyContact) {
          window.location.href = `tel:${requirement.emergencyContact}`
        }
        break
    }
  }

  const updateRequirement = async (requirement: DietaryRequirement) => {
    if (isOffline) {
      queueAction('update_requirement', requirement)
      vibrate(200) // Strong feedback for offline action
      return
    }

    try {
      const response = await fetch(`/api/catering/dietary/requirements/${requirement.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requirement)
      })

      if (response.ok) {
        onRequirementUpdate?.(requirement)
        vibrate(100) // Success feedback
      } else {
        throw new Error('Update failed')
      }
    } catch (error) {
      console.error('Failed to update requirement:', error)
      vibrate([100, 100, 100]) // Error pattern
    }
  }

  const filteredRequirements = requirements.filter(req => {
    const matchesSearch = searchQuery === '' || 
      req.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.notes.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesSeverity = filterSeverity === null || req.severity === filterSeverity
    
    return matchesSearch && matchesSeverity
  })

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen bg-gray-50 ${className}`}
      {...swipeHandlers}
      {...touchEvents}
    >
      {/* Mobile Status Bar */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold text-lg">Dietary Management</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {isOffline && (
              <Badge className="bg-orange-100 text-orange-800">Offline</Badge>
            )}
            {highRiskRequirements.length > 0 && (
              <Badge className="bg-red-100 text-red-800">
                {highRiskRequirements.length} High Risk
              </Badge>
            )}
            <Button variant="ghost" size="sm">
              <BellIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-t">
          {[
            { key: 'overview', icon: ClipboardListIcon, label: 'Overview' },
            { key: 'requirements', icon: UserIcon, label: 'Requirements' },
            { key: 'menu', icon: StarIcon, label: 'Menu' },
            { key: 'alerts', icon: AlertTriangleIcon, label: 'Alerts' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex flex-col items-center py-3 px-2 text-xs transition-colors ${
                activeTab === tab.key 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600'
              }`}
            >
              <tab.icon className="h-5 w-5 mb-1" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-20"> {/* Extra padding for FAB */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="touch-friendly">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {requirements.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Requirements</div>
                  </CardContent>
                </Card>

                <Card className="touch-friendly">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600 mb-1">
                      {highRiskRequirements.length}
                    </div>
                    <div className="text-sm text-gray-600">High Risk</div>
                  </CardContent>
                </Card>
              </div>

              {/* High Priority Alerts */}
              {highRiskRequirements.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <AlertTriangleIcon className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-800">High Priority Guests</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {highRiskRequirements.slice(0, 3).map((req) => (
                      <div
                        key={req.id}
                        data-requirement-id={req.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200 touch-target"
                        onClick={() => setSelectedRequirement(req)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{req.guestName}</div>
                          <div className="text-sm text-red-600">{req.notes}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-red-100 text-red-800">
                            Level {req.severity}
                          </Badge>
                          {req.emergencyContact && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleQuickAction('call_emergency', req)
                              }}
                            >
                              <PhoneIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  className="h-20 flex flex-col items-center justify-center space-y-2 touch-target"
                  onClick={() => handleQuickAction('add_requirement')}
                >
                  <PlusIcon className="h-6 w-6" />
                  <span>Add Requirement</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 touch-target"
                  onClick={() => setActiveTab('menu')}
                >
                  <StarIcon className="h-6 w-6" />
                  <span>Generate Menu</span>
                </Button>
              </div>
            </motion.div>
          )}

          {activeTab === 'requirements' && (
            <motion.div
              key="requirements"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Search and Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search guests or requirements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 touch-target"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <FilterIcon className="h-4 w-4 text-gray-500" />
                  <div className="flex space-x-2 overflow-x-auto">
                    <Button
                      size="sm"
                      variant={filterSeverity === null ? 'default' : 'outline'}
                      onClick={() => setFilterSeverity(null)}
                      className="whitespace-nowrap"
                    >
                      All
                    </Button>
                    {[5, 4, 3, 2, 1].map((level) => (
                      <Button
                        key={level}
                        size="sm"
                        variant={filterSeverity === level ? 'default' : 'outline'}
                        onClick={() => setFilterSeverity(level)}
                        className="whitespace-nowrap"
                      >
                        Level {level}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Requirements List */}
              <div className="space-y-3">
                {filteredRequirements.map((requirement) => (
                  <motion.div
                    key={requirement.id}
                    layout
                    data-requirement-id={requirement.id}
                    className="bg-white rounded-lg border shadow-sm touch-target"
                    onClick={() => setSelectedRequirement(requirement)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-gray-900">
                              {requirement.guestName}
                            </span>
                            <Badge 
                              className={`
                                ${requirement.severity >= 4 ? 'bg-red-100 text-red-800' :
                                  requirement.severity >= 3 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'}
                              `}
                            >
                              Level {requirement.severity}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="capitalize font-medium">{requirement.category}</span>
                            {requirement.notes && (
                              <span> - {requirement.notes}</span>
                            )}
                          </div>

                          {requirement.emergencyContact && (
                            <div className="flex items-center text-sm text-red-600">
                              <PhoneIcon className="h-4 w-4 mr-1" />
                              Emergency: {requirement.emergencyContact}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end space-y-2">
                          {requirement.verified ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleQuickAction('verify_requirement', requirement)
                              }}
                            >
                              Verify
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions for High Risk */}
                      {requirement.severity >= 4 && (
                        <div className="flex space-x-2 mt-3 pt-3 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleQuickAction('flag_urgent', requirement)
                            }}
                          >
                            Flag Urgent
                          </Button>
                          {requirement.emergencyContact && (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleQuickAction('call_emergency', requirement)
                              }}
                            >
                              <PhoneIcon className="h-4 w-4 mr-1" />
                              Call
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {filteredRequirements.length === 0 && (
                  <div className="text-center py-8">
                    <UserIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {searchQuery || filterSeverity 
                        ? "No requirements match your filters." 
                        : "No dietary requirements added yet."
                      }
                    </p>
                    {!searchQuery && !filterSeverity && (
                      <Button 
                        className="mt-4"
                        onClick={() => handleQuickAction('add_requirement')}
                      >
                        Add First Requirement
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <MobileMenuGenerator 
                weddingId={weddingId}
                requirements={requirements}
              />
            </motion.div>
          )}

          {activeTab === 'alerts' && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <MobileAlertsPanel
                requirements={requirements}
                onActionRequired={(action, requirement) => 
                  handleQuickAction(action, requirement)
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 touch-target"
          onClick={() => handleQuickAction('add_requirement')}
        >
          <PlusIcon className="h-6 w-6" />
        </Button>
      </div>

      {/* Requirement Detail Modal */}
      <AnimatePresence>
        {selectedRequirement && (
          <MobileRequirementModal
            requirement={selectedRequirement}
            onClose={() => setSelectedRequirement(null)}
            onUpdate={updateRequirement}
            onQuickAction={handleQuickAction}
          />
        )}
      </AnimatePresence>

      {/* Add Requirement Modal */}
      <AnimatePresence>
        {isAddingRequirement && (
          <MobileAddRequirementForm
            weddingId={weddingId}
            onClose={() => setIsAddingRequirement(false)}
            onAdd={(requirement) => {
              onRequirementUpdate?.(requirement)
              setIsAddingRequirement(false)
            }}
          />
        )}
      </AnimatePresence>

      {/* Quick Actions Panel */}
      <AnimatePresence>
        {showQuickActions && (
          <MobileQuickActionsPanel
            onAction={handleQuickAction}
            onClose={() => setShowQuickActions(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
```

### 2. Mobile Menu Generator Component

```typescript
// File: src/components/mobile/MobileMenuGenerator.tsx

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@untitled-ui/react'
import { Button, Badge, Input, Select } from '@untitled-ui/react'
import { motion } from '@magic-ui/react'
import { 
  ChefHatIcon,
  WandIcon,
  DollarSignIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ShareIcon,
  DownloadIcon
} from 'lucide-react'
import { useTouch } from '@/hooks/useTouch'
import { useVibration } from '@/hooks/useVibration'

interface MobileMenuGeneratorProps {
  weddingId: string
  requirements: DietaryRequirement[]
  onMenuGenerated?: (menu: GeneratedMenu) => void
}

export function MobileMenuGenerator({ 
  weddingId, 
  requirements,
  onMenuGenerated 
}: MobileMenuGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [menuOptions, setMenuOptions] = useState<GeneratedMenu[]>([])
  const [selectedOptions, setSelectedOptions] = useState({
    style: 'formal',
    budget: 75,
    mealType: 'dinner',
    guestCount: 100
  })

  const { vibrate } = useVibration()
  const { touchEvents } = useTouch()

  const generateMenu = async () => {
    if (requirements.length === 0) {
      vibrate([100, 100, 100]) // Error pattern
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    vibrate(100) // Start feedback

    try {
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      const dietaryRequirements = {
        allergies: requirements.filter(r => r.category === 'allergy').map(r => r.notes),
        diets: requirements.filter(r => r.category === 'diet').map(r => r.notes),
        medical: requirements.filter(r => r.category === 'medical').map(r => r.notes),
        preferences: requirements.filter(r => r.category === 'preference').map(r => r.notes)
      }

      const response = await fetch('/api/catering/menu/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          weddingId,
          guestCount: selectedOptions.guestCount,
          dietaryRequirements,
          menuStyle: selectedOptions.style,
          budgetPerPerson: selectedOptions.budget,
          mealType: selectedOptions.mealType
        })
      })

      clearInterval(progressInterval)

      if (response.ok) {
        const data = await response.json()
        setGenerationProgress(100)
        
        setTimeout(() => {
          setMenuOptions(data.menuOptions || [])
          setIsGenerating(false)
          setGenerationProgress(0)
          vibrate([100, 50, 100]) // Success pattern
        }, 500)
      } else {
        throw new Error('Menu generation failed')
      }
    } catch (error) {
      setIsGenerating(false)
      setGenerationProgress(0)
      vibrate([100, 100, 100, 100]) // Long error pattern
      console.error('Menu generation error:', error)
    }
  }

  const shareMenu = async (menu: GeneratedMenu) => {
    if (navigator.share) {
      await navigator.share({
        title: `Wedding Menu - ${menu.name}`,
        text: `Check out this AI-generated wedding menu with ${Math.round(menu.complianceScore * 100)}% dietary compliance!`,
        url: window.location.href
      })
    }
  }

  return (
    <div className="space-y-4" {...touchEvents}>
      {/* Generation Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <WandIcon className="h-5 w-5 text-blue-600" />
            <span className="font-medium">AI Menu Generation</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mobile-optimized form controls */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Menu Style</label>
              <select
                value={selectedOptions.style}
                onChange={(e) => setSelectedOptions(prev => ({ ...prev, style: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg text-base touch-target"
              >
                <option value="formal">Formal Plated Dinner</option>
                <option value="buffet">Buffet Style</option>
                <option value="family-style">Family Style</option>
                <option value="cocktail">Cocktail Reception</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Guest Count</label>
              <Input
                type="number"
                min="10"
                max="500"
                value={selectedOptions.guestCount}
                onChange={(e) => setSelectedOptions(prev => ({ ...prev, guestCount: Number(e.target.value) }))}
                className="text-base touch-target"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Budget per Person</label>
              <div className="flex items-center space-x-2">
                <DollarSignIcon className="h-5 w-5 text-gray-500" />
                <Input
                  type="range"
                  min="30"
                  max="200"
                  step="5"
                  value={selectedOptions.budget}
                  onChange={(e) => setSelectedOptions(prev => ({ ...prev, budget: Number(e.target.value) }))}
                  className="flex-1"
                />
                <span className="font-medium min-w-[4rem] text-center">
                  ${selectedOptions.budget}
                </span>
              </div>
            </div>
          </div>

          {/* Requirements Summary */}
          {requirements.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-900 mb-2">
                Dietary Requirements ({requirements.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {requirements.slice(0, 5).map((req) => (
                  <Badge
                    key={req.id}
                    className={`text-xs ${
                      req.severity >= 4 ? 'bg-red-100 text-red-800' :
                      req.severity >= 3 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}
                  >
                    {req.guestName}: {req.category}
                  </Badge>
                ))}
                {requirements.length > 5 && (
                  <Badge className="bg-gray-100 text-gray-600">
                    +{requirements.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={generateMenu}
            disabled={isGenerating || requirements.length === 0}
            className="w-full h-12 text-base touch-target"
          >
            {isGenerating ? (
              <div className="flex items-center space-x-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <WandIcon className="h-5 w-5" />
                </motion.div>
                <span>Generating... {generationProgress}%</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <ChefHatIcon className="h-5 w-5" />
                <span>Generate AI Menu</span>
              </div>
            )}
          </Button>

          {isGenerating && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${generationProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}

          {requirements.length === 0 && (
            <p className="text-sm text-gray-500 text-center">
              Add guest dietary requirements first to generate a compliant menu
            </p>
          )}
        </CardContent>
      </Card>

      {/* Generated Menu Options */}
      {menuOptions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            Generated Menu Options ({menuOptions.length})
          </h3>

          {menuOptions.map((menu, index) => (
            <Card key={menu.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Menu Header */}
                <div className="p-4 border-b">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-lg">{menu.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{menu.description}</p>
                    </div>
                    <Badge
                      className={`ml-2 ${
                        menu.complianceScore >= 0.9 ? 'bg-green-100 text-green-800' :
                        menu.complianceScore >= 0.7 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      {Math.round(menu.complianceScore * 100)}% Safe
                    </Badge>
                  </div>

                  {/* Menu Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-green-600">
                        ${menu.costPerPerson}
                      </div>
                      <div className="text-xs text-gray-500">per person</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-blue-600">
                        {menu.preparationTime}h
                      </div>
                      <div className="text-xs text-gray-500">prep time</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-purple-600">
                        {menu.courses.length}
                      </div>
                      <div className="text-xs text-gray-500">courses</div>
                    </div>
                  </div>
                </div>

                {/* Menu Courses - Swipeable */}
                <div className="overflow-x-auto">
                  <div className="flex space-x-4 p-4">
                    {menu.courses.map((course) => (
                      <div key={course.id} className="flex-shrink-0 w-64 bg-gray-50 rounded-lg p-3">
                        <h5 className="font-medium capitalize mb-2">{course.name}</h5>
                        <div className="space-y-2">
                          {course.dishes.slice(0, 2).map((dish) => (
                            <div key={dish.id} className="text-sm">
                              <div className="font-medium">{dish.name}</div>
                              <div className="text-gray-600 text-xs">{dish.description}</div>
                              {dish.allergens.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {dish.allergens.map((allergen) => (
                                    <span
                                      key={allergen}
                                      className="px-1 py-0.5 bg-red-100 text-red-600 text-xs rounded"
                                    >
                                      {allergen}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                          {course.dishes.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{course.dishes.length - 2} more dishes
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warnings */}
                {menu.warnings.length > 0 && (
                  <div className="p-4 bg-yellow-50 border-t">
                    <div className="flex items-start">
                      <AlertTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5 mr-2" />
                      <div>
                        <div className="font-medium text-yellow-800 text-sm">Warnings</div>
                        <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                          {menu.warnings.slice(0, 2).map((warning, idx) => (
                            <li key={idx}>• {warning}</li>
                          ))}
                          {menu.warnings.length > 2 && (
                            <li>• +{menu.warnings.length - 2} more warnings</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => onMenuGenerated?.(menu)}
                      className="touch-target"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Select Menu
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => shareMenu(menu)}
                        className="touch-target"
                      >
                        <ShareIcon className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="touch-target"
                      >
                        <DownloadIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Generate More Options */}
          <Button
            variant="outline"
            onClick={generateMenu}
            disabled={isGenerating}
            className="w-full touch-target"
          >
            Generate Different Options
          </Button>
        </div>
      )}
    </div>
  )
}
```

### 3. PWA Service Worker for Offline Functionality

```typescript
// File: public/sw.js

const CACHE_NAME = 'wedsync-dietary-v1'
const STATIC_CACHE = 'wedsync-static-v1'
const DYNAMIC_CACHE = 'wedsync-dynamic-v1'

// Cache static assets
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html',
  // Add critical CSS and JS files
]

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/catering/dietary/summary/',
  '/api/catering/dietary/requirements/',
  '/api/catering/menu/validate'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('Service Worker: Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    }).then(() => {
      return self.skipWaiting()
    })
  )
})

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})

// Fetch event - serve from cache or fetch from network
self.addEventListener('fetch', (event) => {
  const { request } = event
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle API requests
  if (request.url.includes('/api/')) {
    event.respondWith(handleAPIRequest(request))
    return
  }

  // Handle static assets
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request))
    return
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request))
    return
  }

  // Default: network first, then cache
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((cachedResponse) => {
        return cachedResponse || caches.match('/offline.html')
      })
    })
  )
})

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    // Cache successful dietary management API responses
    if (networkResponse.ok && shouldCacheAPI(request.url)) {
      const cache = await caches.open(DYNAMIC_CACHE)
      
      // Clone response for caching
      const responseClone = networkResponse.clone()
      
      // Add timestamp to cached data
      const responseData = await responseClone.json()
      const timestampedData = {
        data: responseData,
        timestamp: Date.now(),
        url: request.url
      }
      
      // Create new response with timestamped data
      const timestampedResponse = new Response(
        JSON.stringify(timestampedData),
        {
          status: networkResponse.status,
          statusText: networkResponse.statusText,
          headers: networkResponse.headers
        }
      )
      
      cache.put(request, timestampedResponse)
    }
    
    return networkResponse
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for:', request.url)
    
    // Try cache if network fails
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      const cachedData = await cachedResponse.json()
      
      // Check if cached data is still fresh (< 1 hour for dietary data)
      const isStale = Date.now() - cachedData.timestamp > 3600000 // 1 hour
      
      if (!isStale) {
        // Return fresh cached data
        return new Response(JSON.stringify(cachedData.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
    
    // Return offline response for critical dietary APIs
    if (request.url.includes('/dietary/')) {
      return new Response(JSON.stringify({
        error: 'Offline mode',
        message: 'Dietary data unavailable offline',
        timestamp: Date.now()
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    throw error
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Service Worker: Failed to fetch static asset:', request.url)
    throw error
  }
}

// Handle navigation requests
async function handleNavigation(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Return cached page or offline fallback
    const cachedResponse = await caches.match(request)
    return cachedResponse || caches.match('/offline.html')
  }
}

// Utility functions
function isStaticAsset(request) {
  return request.url.includes('/icons/') || 
         request.url.includes('/manifest.json') ||
         request.url.includes('/_next/static/')
}

function shouldCacheAPI(url) {
  return CACHEABLE_APIS.some(api => url.includes(api))
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag)
  
  if (event.tag === 'sync-dietary-requirements') {
    event.waitUntil(syncDietaryRequirements())
  }
  
  if (event.tag === 'sync-menu-generation') {
    event.waitUntil(syncMenuGeneration())
  }
})

// Sync dietary requirements when back online
async function syncDietaryRequirements() {
  try {
    // Get pending requirements from IndexedDB
    const pendingRequirements = await getStoredPendingRequirements()
    
    for (const requirement of pendingRequirements) {
      try {
        const response = await fetch('/api/catering/dietary/requirements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${requirement.token}`
          },
          body: JSON.stringify(requirement.data)
        })
        
        if (response.ok) {
          await removePendingRequirement(requirement.id)
          
          // Notify all clients of successful sync
          const clients = await self.clients.matchAll()
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              data: { type: 'dietary_requirement', id: requirement.id }
            })
          })
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync requirement:', error)
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error)
  }
}

// Push notifications for high-risk dietary alerts
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received')
  
  if (!event.data) return
  
  const data = event.data.json()
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    actions: [
      {
        action: 'view',
        title: 'View Details'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    data: data.data || {}
  }
  
  // Special handling for high-risk dietary alerts
  if (data.tag === 'dietary-high-risk') {
    options.requireInteraction = true
    options.actions = [
      {
        action: 'emergency_call',
        title: 'Emergency Call'
      },
      {
        action: 'view_details',
        title: 'View Details'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked:', event.action)
  
  event.notification.close()
  
  const { action, data } = event.notification
  
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window' })
      
      if (action === 'emergency_call' && data.emergencyContact) {
        // Open phone dialer
        await self.clients.openWindow(`tel:${data.emergencyContact}`)
        return
      }
      
      if (action === 'view' || action === 'view_details') {
        const targetUrl = data.url || `/weddings/${data.weddingId}/dietary`
        
        // Try to focus existing window
        for (const client of clients) {
          if (client.url.includes(targetUrl)) {
            await client.focus()
            return
          }
        }
        
        // Open new window
        await self.clients.openWindow(targetUrl)
        return
      }
      
      // Default: open main app
      if (clients.length > 0) {
        await clients[0].focus()
      } else {
        await self.clients.openWindow('/')
      }
    })()
  )
})

// IndexedDB helpers for offline storage
async function getStoredPendingRequirements() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WedSyncOfflineDB', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['pendingRequirements'], 'readonly')
      const store = transaction.objectStore('pendingRequirements')
      const getAllRequest = store.getAll()
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result)
      getAllRequest.onerror = () => reject(getAllRequest.error)
    }
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('pendingRequirements')) {
        db.createObjectStore('pendingRequirements', { keyPath: 'id' })
      }
    }
  })
}

async function removePendingRequirement(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WedSyncOfflineDB', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['pendingRequirements'], 'readwrite')
      const store = transaction.objectStore('pendingRequirements')
      const deleteRequest = store.delete(id)
      
      deleteRequest.onsuccess = () => resolve()
      deleteRequest.onerror = () => reject(deleteRequest.error)
    }
  })
}

// Message handling from clients
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data)
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data.type === 'CACHE_DIETARY_DATA') {
    event.waitUntil(cacheDietaryData(event.data.payload))
  }
})

async function cacheDietaryData(data) {
  const cache = await caches.open(DYNAMIC_CACHE)
  
  const response = new Response(JSON.stringify({
    data,
    timestamp: Date.now(),
    offline: true
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
  
  await cache.put('/api/catering/dietary/offline-data', response)
}
```

### 4. Mobile-Optimized Touch Hooks

```typescript
// File: src/hooks/useTouch.ts

import { useEffect, useRef, useCallback, useState } from 'react'

interface TouchPosition {
  x: number
  y: number
  timestamp: number
}

interface GestureState {
  isScrolling: boolean
  isPinching: boolean
  isSwipelocked: boolean
  swipeDirection: 'left' | 'right' | 'up' | 'down' | null
  scale: number
}

interface UseTouchOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onTap?: (element: HTMLElement) => void
  onDoubleTap?: (element: HTMLElement) => void
  onLongPress?: (element: HTMLElement) => void
  onPinchStart?: () => void
  onPinchMove?: (scale: number) => void
  onPinchEnd?: () => void
  swipeThreshold?: number
  longPressDelay?: number
  enableHapticFeedback?: boolean
}

export function useTouch(options: UseTouchOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    onLongPress,
    onPinchStart,
    onPinchMove,
    onPinchEnd,
    swipeThreshold = 50,
    longPressDelay = 500,
    enableHapticFeedback = true
  } = options

  const touchStartRef = useRef<TouchPosition | null>(null)
  const touchEndRef = useRef<TouchPosition | null>(null)
  const lastTapRef = useRef<number>(0)
  const longPressTimerRef = useRef<NodeJS.Timeout>()
  const initialDistanceRef = useRef<number>(0)

  const [gestureState, setGestureState] = useState<GestureState>({
    isScrolling: false,
    isPinching: false,
    isSwipelocked: false,
    swipeDirection: null,
    scale: 1
  })

  const hapticFeedback = useCallback((pattern: number | number[]) => {
    if (enableHapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }, [enableHapticFeedback])

  const getTouchPosition = useCallback((touch: Touch): TouchPosition => ({
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now()
  }), [])

  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touches = event.touches

    if (touches.length === 1) {
      // Single touch - potential tap/swipe/long press
      touchStartRef.current = getTouchPosition(touches[0])
      
      // Start long press timer
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          const target = event.target as HTMLElement
          onLongPress(target)
          hapticFeedback(100)
        }, longPressDelay)
      }

      setGestureState(prev => ({
        ...prev,
        isScrolling: false,
        isPinching: false,
        swipeDirection: null
      }))
    } else if (touches.length === 2) {
      // Two touches - pinch gesture
      const distance = getDistance(touches[0], touches[1])
      initialDistanceRef.current = distance

      setGestureState(prev => ({
        ...prev,
        isPinching: true,
        scale: 1
      }))

      onPinchStart?.()
    }
  }, [getTouchPosition, getDistance, onLongPress, onPinchStart, hapticFeedback, longPressDelay])

  const handleTouchMove = useCallback((event: TouchEvent) => {
    const touches = event.touches

    // Clear long press timer on move
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = undefined
    }

    if (touches.length === 1 && touchStartRef.current) {
      // Single touch movement - potential scroll or swipe
      const currentPosition = getTouchPosition(touches[0])
      const deltaX = Math.abs(currentPosition.x - touchStartRef.current.x)
      const deltaY = Math.abs(currentPosition.y - touchStartRef.current.y)

      // Determine if scrolling or swiping
      if (deltaY > deltaX && deltaY > 10) {
        setGestureState(prev => ({ ...prev, isScrolling: true }))
      } else if (deltaX > 30) {
        const direction = currentPosition.x > touchStartRef.current.x ? 'right' : 'left'
        setGestureState(prev => ({ 
          ...prev, 
          swipeDirection: direction,
          isSwipelocked: true 
        }))
        
        // Prevent scrolling during horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          event.preventDefault()
        }
      }
    } else if (touches.length === 2 && initialDistanceRef.current > 0) {
      // Two touches - pinch zoom
      const currentDistance = getDistance(touches[0], touches[1])
      const scale = currentDistance / initialDistanceRef.current

      setGestureState(prev => ({ ...prev, scale }))
      onPinchMove?.(scale)

      // Prevent default zooming
      event.preventDefault()
    }
  }, [getTouchPosition, getDistance, onPinchMove])

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    const touches = event.changedTouches

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = undefined
    }

    if (touches.length === 1) {
      touchEndRef.current = getTouchPosition(touches[0])

      if (touchStartRef.current && touchEndRef.current) {
        const deltaX = touchEndRef.current.x - touchStartRef.current.x
        const deltaY = touchEndRef.current.y - touchStartRef.current.y
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        const timeDelta = touchEndRef.current.timestamp - touchStartRef.current.timestamp

        // Check for tap (short distance and time)
        if (distance < 10 && timeDelta < 300) {
          const now = Date.now()
          const target = event.target as HTMLElement

          // Double tap detection
          if (onDoubleTap && now - lastTapRef.current < 300) {
            onDoubleTap(target)
            hapticFeedback([50, 50, 50])
            lastTapRef.current = 0 // Reset to prevent triple tap
          } else {
            onTap?.(target)
            hapticFeedback(50)
            lastTapRef.current = now
          }
        }
        // Check for swipe
        else if (!gestureState.isScrolling && distance > swipeThreshold) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (deltaX > 0) {
              onSwipeRight?.()
            } else {
              onSwipeLeft?.()
            }
            hapticFeedback(75)
          } else {
            // Vertical swipe
            if (deltaY > 0) {
              onSwipeDown?.()
            } else {
              onSwipeUp?.()
            }
            hapticFeedback(75)
          }
        }
      }
    }

    // Handle pinch end
    if (gestureState.isPinching && event.touches.length < 2) {
      onPinchEnd?.()
      setGestureState(prev => ({ 
        ...prev, 
        isPinching: false, 
        scale: 1 
      }))
    }

    // Reset gesture state
    if (event.touches.length === 0) {
      setGestureState({
        isScrolling: false,
        isPinching: false,
        isSwipelocked: false,
        swipeDirection: null,
        scale: 1
      })
      
      touchStartRef.current = null
      touchEndRef.current = null
    }
  }, [
    getTouchPosition,
    gestureState,
    swipeThreshold,
    onTap,
    onDoubleTap,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinchEnd,
    hapticFeedback
  ])

  useEffect(() => {
    const element = document.body

    // Passive listeners for better performance
    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  // Touch event handlers for components
  const touchEvents = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  }

  return {
    touchEvents,
    gestureState,
    hapticFeedback
  }
}

// Utility hook for vibration feedback
export function useVibration() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }, [])

  return { vibrate }
}
```

### 5. Mobile CSS Optimizations

```css
/* File: src/styles/mobile-dietary.css */

/* Touch-friendly sizing */
.touch-target {
  min-height: 48px;
  min-width: 48px;
  padding: 12px;
}

.touch-friendly {
  touch-action: manipulation;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Mobile-optimized forms */
.mobile-form-input {
  font-size: 16px; /* Prevents zoom on iOS */
  line-height: 1.5;
  padding: 12px 16px;
  border-radius: 8px;
}

/* Swipe indicators */
.swipe-indicator {
  position: relative;
  overflow: hidden;
}

.swipe-indicator::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  background: #cbd5e1;
  border-radius: 50%;
  box-shadow: 
    12px 0 0 #cbd5e1,
    24px 0 0 #cbd5e1;
}

/* Mobile card styles */
.mobile-card {
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.mobile-card:active {
  transform: scale(0.98);
  transition: transform 0.1s ease-out;
}

/* FAB (Floating Action Button) */
.fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  transition: all 0.3s ease;
}

.fab:active {
  transform: scale(0.95);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Mobile navigation */
.mobile-nav {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  z-index: 100;
}

/* Dietary severity indicators */
.severity-indicator {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-weight: 600;
  font-size: 14px;
}

.severity-1 { background: #dcfce7; color: #166534; }
.severity-2 { background: #dbeafe; color: #1e40af; }
.severity-3 { background: #fef3c7; color: #d97706; }
.severity-4 { background: #fed7aa; color: #ea580c; }
.severity-5 { 
  background: #fee2e2; 
  color: #dc2626;
  animation: pulse-urgent 2s infinite;
}

@keyframes pulse-urgent {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Mobile modal styles */
.mobile-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.mobile-modal-content {
  background: white;
  border-radius: 16px 16px 0 0;
  padding: 24px;
  max-height: 90vh;
  overflow-y: auto;
  width: 100%;
  transform: translateY(100%);
  transition: transform 0.3s ease-out;
}

.mobile-modal-content.open {
  transform: translateY(0);
}

/* Pull-to-refresh indicator */
.pull-refresh {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.pull-refresh.visible {
  top: 20px;
}

/* Offline indicator */
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #f59e0b;
  color: white;
  text-align: center;
  padding: 8px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1001;
  transform: translateY(-100%);
  transition: transform 0.3s ease-out;
}

.offline-banner.visible {
  transform: translateY(0);
}

/* High-contrast mode support */
@media (prefers-contrast: high) {
  .mobile-card {
    border: 2px solid #000;
  }
  
  .severity-indicator {
    border: 2px solid currentColor;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .mobile-card,
  .fab,
  .mobile-modal-content,
  .pull-refresh,
  .offline-banner {
    transition: none;
  }
  
  .severity-5 {
    animation: none;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .mobile-nav {
    background: rgba(17, 24, 39, 0.95);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
  
  .mobile-card {
    background: #1f2937;
    border-color: #374151;
    color: #f9fafb;
  }
  
  .mobile-modal-content {
    background: #1f2937;
    color: #f9fafb;
  }
}

/* iOS safe area support */
@supports (padding: max(0px)) {
  .mobile-nav {
    padding-top: max(16px, env(safe-area-inset-top));
  }
  
  .fab {
    bottom: max(24px, env(safe-area-inset-bottom));
    right: max(24px, env(safe-area-inset-right));
  }
  
  .mobile-modal-content {
    padding-bottom: max(24px, env(safe-area-inset-bottom));
  }
}
```

## COMPLETION CHECKLIST

### Mobile Interface ✅
- [ ] Touch-optimized dietary requirements management
- [ ] Swipe navigation between tabs and screens
- [ ] Mobile-responsive menu generation interface
- [ ] Touch-friendly form controls (minimum 48x48px)
- [ ] Haptic feedback for all interactions
- [ ] Mobile-specific navigation patterns

### PWA Implementation ✅
- [ ] Service worker with offline caching
- [ ] Background sync for dietary requirements
- [ ] Push notifications for high-risk alerts
- [ ] Offline form submission queuing
- [ ] Manifest.json with proper icons
- [ ] Install prompts and app-like experience

### Performance Optimization ✅
- [ ] First Contentful Paint < 1.2s on mobile
- [ ] Time to Interactive < 2.5s on mobile
- [ ] Lighthouse mobile score > 90
- [ ] Touch event optimization
- [ ] Lazy loading for large lists
- [ ] Image optimization and compression

### Cross-Platform Testing ✅
- [ ] iOS Safari compatibility
- [ ] Android Chrome compatibility
- [ ] Tablet layout responsiveness
- [ ] Various screen sizes (320px to 768px)
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Dark mode support

### Offline Functionality ✅
- [ ] Dietary requirements viewable offline
- [ ] Form submissions queued when offline
- [ ] Automatic sync when connection restored
- [ ] Offline status indicators
- [ ] Cached critical dietary data

### Touch & Gesture Support ✅
- [ ] Swipe gestures for navigation
- [ ] Long press for context menus
- [ ] Pinch-to-zoom for detailed views
- [ ] Pull-to-refresh functionality
- [ ] Vibration feedback patterns
- [ ] Multi-touch gesture support

**CRITICAL**: This mobile implementation must provide a native app experience with 99.9% touch responsiveness and work flawlessly on slow 3G connections during outdoor wedding venues with poor internet connectivity.