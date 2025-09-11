# WS-282 Dashboard Tour System - Team A Comprehensive Prompt
**Team A: Frontend/UI Development Specialists**

## 🎯 Your Mission: Interactive Wedding Dashboard Onboarding Experience
You are the **Frontend/UI specialists** responsible for creating an engaging, interactive tour system that guides newly engaged couples through their wedding dashboard for the first time. Your focus: **WhatsApp-quality guided tour experience that makes wedding planning feel approachable and exciting rather than overwhelming, with beautiful animations and contextual guidance that builds confidence**.

## 💝 The Wedding Dashboard Onboarding Challenge
**Context**: Emma just got engaged yesterday and is logging into WedSync for the first time. She's excited but overwhelmed by all the wedding planning ahead of her. She sees a dashboard with vendors, timelines, guest lists, and budgets - but doesn't know where to start. Your interactive tour must guide her step-by-step through adding her wedding date, venue, and first vendor while making her feel confident and excited about planning her dream wedding. **One confusing step could lead to abandonment and lost revenue**.

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/components/tours/DashboardTour.tsx`** - Main interactive tour component with step navigation
2. **`/src/components/tours/TourProvider.tsx`** - Global tour state management and context provider
3. **`/src/components/tours/TourStep.tsx`** - Individual tour step renderer with positioning system
4. **`/src/components/tours/TourTrigger.tsx`** - Tour launch mechanisms and help integration
5. **`/src/hooks/useTour.ts`** - Tour control hook with analytics integration

### 🎨 Frontend Requirements:
- **Interactive Step Navigation**: Smooth progression with contextual tooltips and highlights
- **Responsive Positioning**: Tour steps position perfectly on all screen sizes (mobile, tablet, desktop)
- **Beautiful Animations**: Fade-in/out transitions, element highlighting, and progress indicators
- **Action Validation**: Smart detection when users complete required actions
- **Mobile-First Design**: Touch-friendly tour controls optimized for wedding planning on-the-go
- **Accessibility Compliance**: Screen reader support, keyboard navigation, and ARIA labels
- **Wedding Industry Context**: Warm, encouraging tone with wedding-specific terminology and examples

Your tour system transforms first-time user confusion into confident wedding planning action.

## 🎨 Core Tour Components Implementation

### Main Dashboard Tour Component (`/src/components/tours/DashboardTour.tsx`)
```tsx
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, ChevronLeft, ChevronRight, X, HelpCircle, Sparkles, 
  Heart, Calendar, Users, Camera, MapPin 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TourStep {
  id: string
  title: string
  description: string
  targetElement: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  content: string
  icon?: React.ReactNode
  actionRequired?: {
    type: 'click' | 'input' | 'navigate' | 'select'
    target: string
    expectedValue?: string
    validationText?: string
  }
  nextTrigger: 'auto' | 'manual' | 'action_completion'
  celebrateCompletion?: boolean
  helpText?: string
  tips?: string[]
}

interface DashboardTourProps {
  tourType: string
  isActive: boolean
  onComplete: () => void
  onSkip: () => void
  onStepChange: (stepIndex: number) => void
  className?: string
}

export function DashboardTour({
  tourType,
  isActive,
  onComplete,
  onSkip,
  onStepChange,
  className
}: DashboardTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [steps, setSteps] = useState<TourStep[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null)
  const [stepPosition, setStepPosition] = useState({ x: 0, y: 0 })
  const [isStepVisible, setIsStepVisible] = useState(false)
  const [actionCompleted, setActionCompleted] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [tourData, setTourData] = useState<any>({})

  const overlayRef = useRef<HTMLDivElement>(null)
  const stepCardRef = useRef<HTMLDivElement>(null)
  const highlightTimeoutRef = useRef<NodeJS.Timeout>()
  const animationFrameRef = useRef<number>()

  // Wedding-themed tour steps for dashboard onboarding
  const weddingTourSteps: TourStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Your Wedding Journey! 💕',
      description: 'Let\'s set up your wedding dashboard in just a few magical minutes.',
      targetElement: '[data-tour="dashboard-header"]',
      position: 'center',
      content: 'This is your wedding command center - where all the beautiful chaos of wedding planning gets organized into pure magic. Ready to turn your dreams into plans?',
      icon: <Heart className="w-5 h-5 text-pink-500" />,
      nextTrigger: 'manual',
      tips: [
        '💡 You can restart this tour anytime from the help menu',
        '✨ Each step builds on the previous one',
        '💖 Take your time - this is your special moment'
      ]
    },
    {
      id: 'wedding-details',
      title: 'Set Your Special Date ✨',
      description: 'Every fairy tale needs a date - let\'s add yours!',
      targetElement: '[data-tour="wedding-details-card"]',
      position: 'right',
      content: 'Click here to add your wedding date, venue, and celebration style. This becomes the foundation that all your vendors and timeline will build upon.',
      icon: <Calendar className="w-5 h-5 text-purple-500" />,
      actionRequired: {
        type: 'click',
        target: '[data-tour="wedding-details-card"]',
        validationText: 'Click on the wedding details card to continue'
      },
      nextTrigger: 'action_completion',
      celebrateCompletion: true,
      helpText: 'Look for the "Wedding Details" card - it\'s usually at the top of your dashboard',
      tips: [
        '📅 Your wedding date helps vendors understand timeline urgency',
        '🏰 Venue details help with logistics and planning',
        '🎨 Style preferences guide vendor recommendations'
      ]
    },
    {
      id: 'add-venue',
      title: 'Add Your Dream Venue 🏰',
      description: 'Where the magic happens - let\'s add your venue!',
      targetElement: '[data-tour="venue-section"]',
      position: 'bottom',
      content: 'Your venue is the centerpiece of your celebration. Add it here so all your other vendors can coordinate around this beautiful location.',
      icon: <MapPin className="w-5 h-5 text-emerald-500" />,
      actionRequired: {
        type: 'click',
        target: '[data-tour="add-venue-button"]',
        validationText: 'Click "Add Venue" to continue'
      },
      nextTrigger: 'action_completion',
      helpText: 'Look for the "Add Venue" button in the venue section',
      tips: [
        '🏛️ Include ceremony and reception venues if different',
        '📍 Address details help with vendor travel planning',
        '⏰ Venue restrictions affect timeline planning'
      ]
    },
    {
      id: 'connect-vendors',
      title: 'Connect Your Wedding Team 👥',
      description: 'Bring your wedding dream team together in one place.',
      targetElement: '[data-tour="vendors-section"]',
      position: 'top',
      content: 'Add your photographer, caterer, florist, and other vendors here. They\'ll get access to relevant information and can coordinate seamlessly with each other.',
      icon: <Users className="w-5 h-5 text-blue-500" />,
      actionRequired: {
        type: 'click',
        target: '[data-tour="add-vendor-button"]'
      },
      nextTrigger: 'action_completion',
      helpText: 'Find the "Add Vendor" button - start with your photographer or venue coordinator',
      tips: [
        '📸 Start with your photographer - they need the most coordination',
        '🍰 Each vendor type gets customized access to relevant info',
        '💬 Vendors can communicate directly through WedSync'
      ]
    },
    {
      id: 'guest-management',
      title: 'Organize Your Guest List 💌',
      description: 'Keep track of everyone who\'ll celebrate with you.',
      targetElement: '[data-tour="guest-list-card"]',
      position: 'left',
      content: 'Import from a spreadsheet or add guests manually. Track RSVPs, dietary requirements, and seating preferences all in one organized place.',
      icon: <Users className="w-5 h-5 text-amber-500" />,
      nextTrigger: 'manual',
      tips: [
        '📊 Import from Excel or Google Sheets for faster setup',
        '🥗 Track dietary restrictions for catering planning',
        '💌 Send save-the-dates and invitations directly from here'
      ]
    },
    {
      id: 'timeline-creation',
      title: 'Build Your Perfect Day Timeline ⏰',
      description: 'Create the schedule that makes your day flow beautifully.',
      targetElement: '[data-tour="timeline-card"]',
      position: 'bottom',
      content: 'Design your wedding day minute-by-minute. Your vendors see relevant parts and can add their own timeline items - no more coordination chaos!',
      icon: <Calendar className="w-5 h-5 text-rose-500" />,
      nextTrigger: 'manual',
      tips: [
        '⚡ Template timelines available for common wedding styles',
        '🔄 Vendors automatically see their relevant time slots',
        '📱 Real-time updates keep everyone synchronized'
      ]
    },
    {
      id: 'photo-sharing',
      title: 'Create Photo Magic 📸',
      description: 'Set up photo sharing for your wedding memories.',
      targetElement: '[data-tour="photo-gallery-card"]',
      position: 'right',
      content: 'Your guests can share photos in real-time during your celebration, creating a collaborative album of memories from every angle.',
      icon: <Camera className="w-5 h-5 text-indigo-500" />,
      nextTrigger: 'manual',
      tips: [
        '📲 Guests share photos via QR code or text link',
        '⚡ Photos appear instantly during your reception',
        '💾 Download all photos after your wedding'
      ]
    },
    {
      id: 'mobile-companion',
      title: 'Your Wedding in Your Pocket 📱',
      description: 'Take your wedding planning everywhere you go.',
      targetElement: '[data-tour="mobile-app-banner"]',
      position: 'center',
      content: 'Download the WedSync mobile app for venue visits, vendor meetings, and last-minute coordination. Your wedding dashboard, wherever life takes you!',
      icon: <Sparkles className="w-5 h-5 text-purple-500" />,
      nextTrigger: 'manual',
      tips: [
        '📱 Perfect for venue visits and vendor meetings',
        '🔔 Get real-time notifications for important updates',
        '✅ Check off tasks and update details on the go'
      ]
    },
    {
      id: 'celebration',
      title: 'You\'re Ready to Plan Magic! 🎉',
      description: 'Your wedding dashboard is set up and ready to make dreams come true.',
      targetElement: '[data-tour="dashboard-header"]',
      position: 'center',
      content: 'Congratulations! You\'ve set up your wedding command center. Every tool you need to plan the perfect celebration is now at your fingertips. Let the magic begin! ✨',
      icon: <Heart className="w-5 h-5 text-pink-500" />,
      nextTrigger: 'manual',
      celebrateCompletion: true,
      tips: [
        '💖 You can access this tour anytime from the help menu',
        '🎯 Focus on one vendor category at a time',
        '📞 Our support team is here if you need any help'
      ]
    }
  ]

  // Initialize tour
  useEffect(() => {
    if (isActive) {
      loadTourSteps()
      // Add tour-active class to body for styling
      document.body.classList.add('tour-active')
    } else {
      document.body.classList.remove('tour-active')
    }

    return () => {
      document.body.classList.remove('tour-active')
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isActive, tourType])

  // Show current step
  useEffect(() => {
    if (isActive && steps.length > 0 && currentStepIndex < steps.length) {
      showStep(currentStepIndex)
    }
  }, [currentStepIndex, steps, isActive])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (isActive && highlightedElement) {
        const step = steps[currentStepIndex]
        if (step) {
          updateStepPosition(highlightedElement, step.position)
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isActive, highlightedElement, currentStepIndex, steps])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isActive) return

      switch (event.key) {
        case 'Escape':
          if (confirm('Are you sure you want to exit the tour?')) {
            onSkip()
          }
          break
        case 'ArrowLeft':
          event.preventDefault()
          previousStep()
          break
        case 'ArrowRight':
        case 'Enter':
          event.preventDefault()
          if (!steps[currentStepIndex]?.actionRequired || actionCompleted) {
            nextStep()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, actionCompleted, currentStepIndex, steps])

  const loadTourSteps = async () => {
    setIsLoading(true)
    try {
      // In production, load from API
      const response = await fetch(`/api/tours/${tourType}/steps`)
      if (response.ok) {
        const data = await response.json()
        setSteps(data.steps)
        setTourData(data.tourSettings || {})
      } else {
        // Fallback to default steps
        setSteps(weddingTourSteps)
      }
      
      setCurrentStepIndex(0)
      setActionCompleted(false)
    } catch (error) {
      console.error('Error loading tour steps:', error)
      setSteps(weddingTourSteps)
    } finally {
      setIsLoading(false)
    }
  }

  const showStep = async (stepIndex: number) => {
    if (stepIndex >= steps.length) {
      completeTour()
      return
    }

    const step = steps[stepIndex]
    setActionCompleted(false)

    // Hide current step temporarily
    setIsStepVisible(false)

    // Find target element
    const targetElement = document.querySelector(step.targetElement) as HTMLElement

    // Track step view
    await trackStepInteraction(step.id, 'step_viewed', {
      stepIndex,
      targetFound: !!targetElement,
      timestamp: new Date().toISOString()
    })

    // Handle missing target element
    if (!targetElement && step.targetElement !== '[data-tour="center"]') {
      console.warn(`Tour target not found: ${step.targetElement}`)
      // Show in center and auto-advance after delay
      setHighlightedElement(null)
      setStepPosition({
        x: (window.innerWidth / 2) - 200,
        y: (window.innerHeight / 2) - 150
      })
      setIsStepVisible(true)
      
      if (step.nextTrigger === 'auto') {
        setTimeout(() => nextStep(), 3000)
      }
      return
    }

    // Position and highlight element
    if (targetElement) {
      setHighlightedElement(targetElement)
      
      // Scroll element into view smoothly
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      })

      // Wait for scroll to complete, then position step
      setTimeout(() => {
        updateStepPosition(targetElement, step.position)
        setIsStepVisible(true)
        
        // Set up action monitoring if required
        if (step.actionRequired) {
          setupActionMonitoring(step)
        } else if (step.nextTrigger === 'auto') {
          setTimeout(() => nextStep(), 5000)
        }
      }, 500)
    } else {
      // Center position for welcome/completion steps
      setStepPosition({
        x: (window.innerWidth / 2) - 200,
        y: (window.innerHeight / 2) - 150
      })
      setIsStepVisible(true)
    }

    onStepChange(stepIndex)
  }

  const updateStepPosition = (element: HTMLElement, position: string) => {
    const rect = element.getBoundingClientRect()
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft
    const scrollY = window.pageYOffset || document.documentElement.scrollTop
    
    const stepCardWidth = 400
    const stepCardHeight = 280
    const padding = 20

    let x = 0
    let y = 0

    switch (position) {
      case 'top':
        x = rect.left + scrollX + (rect.width / 2) - (stepCardWidth / 2)
        y = rect.top + scrollY - stepCardHeight - padding
        break
      case 'bottom':
        x = rect.left + scrollX + (rect.width / 2) - (stepCardWidth / 2)
        y = rect.bottom + scrollY + padding
        break
      case 'left':
        x = rect.left + scrollX - stepCardWidth - padding
        y = rect.top + scrollY + (rect.height / 2) - (stepCardHeight / 2)
        break
      case 'right':
        x = rect.right + scrollX + padding
        y = rect.top + scrollY + (rect.height / 2) - (stepCardHeight / 2)
        break
      case 'center':
      default:
        x = (window.innerWidth / 2) - (stepCardWidth / 2)
        y = (window.innerHeight / 2) - (stepCardHeight / 2)
        break
    }

    // Keep within viewport bounds with mobile considerations
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const minMargin = 10

    x = Math.max(minMargin, Math.min(x, viewportWidth - stepCardWidth - minMargin))
    y = Math.max(minMargin, Math.min(y, viewportHeight - stepCardHeight - minMargin))

    setStepPosition({ x, y })
  }

  const setupActionMonitoring = (step: TourStep) => {
    if (!step.actionRequired) return

    const targetElement = document.querySelector(step.actionRequired.target) as HTMLElement
    if (!targetElement) return

    const handleAction = async (event: Event) => {
      // Validate action completion
      let isValid = false

      switch (step.actionRequired!.type) {
        case 'click':
          isValid = true
          break
        case 'input':
          const input = event.target as HTMLInputElement
          isValid = step.actionRequired!.expectedValue 
            ? input.value === step.actionRequired!.expectedValue
            : input.value.length > 0
          break
        case 'select':
          const select = event.target as HTMLSelectElement
          isValid = select.value !== ''
          break
      }

      if (isValid) {
        setActionCompleted(true)
        
        // Track action completion
        await trackStepInteraction(step.id, 'step_completed', {
          actionType: step.actionRequired!.type,
          timestamp: new Date().toISOString()
        })

        // Show celebration if configured
        if (step.celebrateCompletion) {
          showStepCelebration()
        }

        // Auto-advance if configured
        if (step.nextTrigger === 'action_completion') {
          setTimeout(() => nextStep(), step.celebrateCompletion ? 2000 : 500)
        }

        // Remove event listener
        targetElement.removeEventListener('click', handleAction)
        targetElement.removeEventListener('input', handleAction)
        targetElement.removeEventListener('change', handleAction)
      }
    }

    // Add appropriate event listeners
    switch (step.actionRequired.type) {
      case 'click':
        targetElement.addEventListener('click', handleAction)
        break
      case 'input':
        targetElement.addEventListener('input', handleAction)
        break
      case 'select':
        targetElement.addEventListener('change', handleAction)
        break
    }

    // Add pulse animation to highlight required action
    targetElement.classList.add('tour-action-required')
  }

  const showStepCelebration = () => {
    setShowCelebration(true)
    setTimeout(() => setShowCelebration(false), 2000)
  }

  const nextStep = async () => {
    const currentStep = steps[currentStepIndex]
    
    // Track step progression
    await trackStepInteraction(currentStep.id, 'step_completed', {
      stepIndex: currentStepIndex,
      timestamp: new Date().toISOString()
    })

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    } else {
      completeTour()
    }
  }

  const previousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }

  const skipTour = async () => {
    if (confirm('Are you sure you want to skip this tour? You can restart it anytime from the help menu.')) {
      await trackStepInteraction('tour_skipped', 'tour_abandoned', {
        stepsCompleted: currentStepIndex,
        totalSteps: steps.length,
        timestamp: new Date().toISOString()
      })
      onSkip()
    }
  }

  const completeTour = async () => {
    try {
      await trackStepInteraction('tour_completed', 'tour_completed', {
        totalSteps: steps.length,
        completedSteps: steps.length,
        timestamp: new Date().toISOString()
      })

      await fetch('/api/tours/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourType,
          feedback: {
            rating: 5,
            wasHelpful: true,
            completionTime: Date.now() - (tourData.startTime || Date.now())
          }
        })
      })

      // Show completion celebration
      setShowCelebration(true)
      setTimeout(() => {
        setShowCelebration(false)
        onComplete()
      }, 3000)
    } catch (error) {
      console.error('Error completing tour:', error)
      onComplete()
    }
  }

  const trackStepInteraction = async (stepId: string, action: string, data: any) => {
    try {
      await fetch('/api/tours/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourType,
          stepId,
          action,
          stepDuration: data.stepDuration,
          interactionData: {
            ...data,
            userAgent: navigator.userAgent,
            viewportSize: {
              width: window.innerWidth,
              height: window.innerHeight
            }
          }
        })
      })
    } catch (error) {
      console.error('Error tracking tour interaction:', error)
    }
  }

  const restartTour = () => {
    setCurrentStepIndex(0)
    setActionCompleted(false)
    setIsStepVisible(false)
    setTimeout(() => showStep(0), 300)
  }

  if (!isActive || isLoading || steps.length === 0) {
    return null
  }

  const currentStep = steps[currentStepIndex]
  const progress = ((currentStepIndex + 1) / steps.length) * 100
  const isLastStep = currentStepIndex === steps.length - 1

  return createPortal(
    <>
      {/* Global Tour Styles */}
      <style jsx global>{`
        .tour-active {
          overflow: hidden;
        }
        
        .tour-action-required {
          animation: tour-pulse 2s ease-in-out infinite;
          position: relative;
          z-index: 45;
        }
        
        @keyframes tour-pulse {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
            transform: scale(1.02);
          }
        }
        
        @keyframes tour-fadeIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        @keyframes tour-celebration {
          0% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.1) rotate(-5deg); }
          50% { transform: scale(1.2) rotate(5deg); }
          75% { transform: scale(1.1) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        
        .tour-step-card {
          animation: tour-fadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      {/* Backdrop Overlay */}
      <motion.div
        ref={overlayRef}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => {
          // Only close if clicking the overlay itself, not child elements
          if (e.target === e.currentTarget) {
            const currentStep = steps[currentStepIndex]
            if (currentStep?.helpText) {
              alert(currentStep.helpText)
            }
          }
        }}
      />

      {/* Element Spotlight */}
      <AnimatePresence>
        {highlightedElement && (
          <motion.div
            className="fixed pointer-events-none z-50"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            style={{
              left: highlightedElement.getBoundingClientRect().left - 12,
              top: highlightedElement.getBoundingClientRect().top - 12,
              width: highlightedElement.getBoundingClientRect().width + 24,
              height: highlightedElement.getBoundingClientRect().height + 24,
              borderRadius: '12px',
              boxShadow: `
                0 0 0 4px rgba(59, 130, 246, 0.3),
                0 0 0 8px rgba(59, 130, 246, 0.2),
                0 0 30px rgba(59, 130, 246, 0.4)
              `,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(1px)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Tour Step Card */}
      <AnimatePresence>
        {isStepVisible && (
          <motion.div
            ref={stepCardRef}
            className="fixed z-[60] tour-step-card"
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ 
              duration: 0.4,
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            style={{
              left: stepPosition.x,
              top: stepPosition.y,
              maxWidth: '400px',
              minWidth: '320px'
            }}
          >
            <Card className="shadow-2xl border-2 border-blue-200 bg-white/95 backdrop-blur-md">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {currentStep.icon}
                    <div>
                      <Badge variant="secondary" className="text-xs">
                        Step {currentStepIndex + 1} of {steps.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={restartTour}
                      className="text-gray-500 hover:text-gray-700"
                      title="Restart tour"
                    >
                      <Target className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={skipTour}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress Indicator */}
                <div className="mb-6">
                  <Progress 
                    value={progress} 
                    className="h-3 bg-gradient-to-r from-pink-100 to-purple-100" 
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600">
                      {Math.round(progress)}% Complete
                    </span>
                    <span className="text-xs text-gray-500">
                      {steps.length - currentStepIndex - 1} steps remaining
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-3 text-gray-900 leading-tight">
                    {currentStep.title}
                  </h3>
                  <p className="text-gray-700 mb-4 text-base leading-relaxed">
                    {currentStep.description}
                  </p>
                  <div className="text-sm text-gray-600 leading-relaxed bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg">
                    {currentStep.content}
                  </div>
                </div>

                {/* Action Required Indicator */}
                {currentStep.actionRequired && !actionCompleted && (
                  <motion.div
                    className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center space-x-2">
                      <HelpCircle className="w-4 h-4 text-yellow-600 animate-pulse" />
                      <span className="text-sm font-medium text-yellow-800">
                        {currentStep.actionRequired.validationText || 
                         `Please ${currentStep.actionRequired.type} to continue`}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Action Completed Indicator */}
                {actionCompleted && (
                  <motion.div
                    className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="flex items-center space-x-2">
                      <motion.div
                        className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </motion.div>
                      <span className="text-sm font-medium text-green-800">
                        Perfect! Moving to the next step...
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Tips Section */}
                {currentStep.tips && currentStep.tips.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      💡 Pro Tips:
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {currentStep.tips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Navigation Controls */}
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={previousStep}
                    disabled={currentStepIndex === 0}
                    className="flex items-center space-x-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      onClick={skipTour}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Skip Tour
                    </Button>
                    
                    {isLastStep ? (
                      <Button 
                        onClick={completeTour}
                        className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold px-6"
                      >
                        <span className="mr-2">Complete Tour</span>
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={nextStep}
                        disabled={currentStep.actionRequired && !actionCompleted}
                        className={cn(
                          "flex items-center space-x-2 px-6 font-semibold",
                          currentStep.actionRequired && !actionCompleted
                            ? "opacity-50 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                        )}
                      >
                        <span>Next Step</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-8xl"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: [0, 1.2, 1],
                rotate: [0, 360, 0]
              }}
              transition={{
                duration: 1.5,
                type: "spring",
                stiffness: 200
              }}
            >
              🎉
            </motion.div>
            <motion.div
              className="absolute text-2xl font-bold text-pink-600"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Amazing! ✨
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Navigation Hint */}
      <motion.div
        className="fixed bottom-4 right-4 z-[60] bg-black/70 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 }}
      >
        Use ← → keys or ESC to navigate
      </motion.div>
    </>,
    document.body
  )
}

// Export types for use in other components
export type { TourStep }
```

## ✅ Acceptance Criteria Checklist

- [ ] **Interactive Step Navigation** provides smooth progression with contextual tooltips and beautiful animations
- [ ] **Responsive Positioning** ensures tour steps position perfectly on all screen sizes with mobile-first design
- [ ] **Action Validation** smartly detects when users complete required actions with visual feedback
- [ ] **Wedding Industry Context** uses warm, encouraging tone with wedding-specific terminology and examples
- [ ] **Beautiful Animations** includes fade-in/out transitions, element highlighting, progress indicators, and celebration effects
- [ ] **Accessibility Compliance** supports screen readers, keyboard navigation, ARIA labels, and focus management
- [ ] **Mobile-First Design** provides touch-friendly tour controls optimized for wedding planning on-the-go
- [ ] **Element Highlighting** creates spotlight effects with pulsing animations for required actions
- [ ] **Progress Visualization** shows completion percentage with wedding-themed styling and motivational messaging
- [ ] **Error Handling** gracefully manages missing target elements and provides helpful fallbacks
- [ ] **Analytics Integration** tracks user interactions, completion rates, and step duration for optimization
- [ ] **Navigation Integration** includes help menu access, restart functionality, and skip options with confirmation

Your frontend creates an engaging, confidence-building tour experience that transforms wedding planning anxiety into excitement and action.

**Remember**: Every interaction should feel like a supportive wedding planner guiding couples toward their dream celebration! ✨💍