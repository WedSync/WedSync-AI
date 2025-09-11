# WS-282 Dashboard Tour System - Team D Platform & WedMe Development

## Mission Statement
Design and implement the WedMe couple-facing dashboard tour system that seamlessly integrates with the WedSync supplier platform, providing newly engaged couples with an intuitive, mobile-first onboarding experience that drives viral adoption while maintaining perfect synchronization with their connected wedding vendors.

## Wedding Context: The Couple's First Digital Wedding Experience
"Emma and James just got engaged last weekend and are completely overwhelmed. They've heard horror stories about wedding planning being stressful and expensive. Their photographer Sarah (who uses WedSync) invited them to WedMe to see their engagement photos and start planning. This is their first interaction with any wedding planning software. They need to understand immediately how this makes their life easier, not more complicated. They're on their phones scrolling through engagement photo comments at 11 PM, and the tour needs to feel like their best friend guiding them through something exciting, not another complicated business tool."

## Core Responsibilities (Platform/WedMe Focus)
- WedMe couple onboarding experience design and development
- Mobile-first tour implementation with touch-optimized interactions
- Cross-platform synchronization between WedSync (supplier) and WedMe (couple)
- Viral growth mechanics integration within tour experience
- Progressive Web App (PWA) tour features for offline capability
- Couple-centric UI/UX that differs from supplier-focused WedSync interface
- Real-time collaboration features for engaged couples
- Social sharing integration within tour flow

## Sequential Thinking Integration
Before starting implementation, use the Sequential Thinking MCP to analyze:
1. Couple vs supplier user experience differentiation strategies
2. Mobile-first tour interaction patterns and gesture-based navigation
3. Cross-platform data synchronization between WedSync and WedMe
4. Viral growth mechanics integration without compromising user experience
5. PWA implementation for reliable offline tour experiences

Example Sequential Thinking prompt:
```
"I need to design a couple-facing tour for WedMe that differs from the supplier-focused WedSync tour. Key considerations: 1) Mobile-first design for couples scrolling on phones, 2) Emotional journey vs business efficiency focus, 3) Cross-platform sync with supplier data, 4) Viral invitation mechanics, 5) PWA offline capability for venues with poor signal. Let me analyze the optimal couple experience architecture..."
```

## Evidence of Reality Requirements
**CRITICAL**: Your implementation must include these NON-NEGOTIABLE file outputs:

### 1. WedMe Tour Components (Required)
- `wedme/src/components/tours/WedMeDashboardTour.tsx` - Main couple tour component
- `wedme/src/components/tours/MobileTourOverlay.tsx` - Mobile-optimized tour overlay
- `wedme/src/components/tours/CoupleProgress.tsx` - Joint progress tracking
- `wedme/src/components/tours/ShareTourProgress.tsx` - Social sharing integration

### 2. Mobile-First Implementation (Required)
- `wedme/src/lib/mobile/touch-gestures.ts` - Touch gesture handling
- `wedme/src/lib/mobile/mobile-tour-analytics.ts` - Mobile-specific analytics
- `wedme/src/components/tours/mobile/SwipeableTourSteps.tsx` - Swipe navigation
- `wedme/src/hooks/useMobileOrientation.ts` - Orientation handling

### 3. Cross-Platform Sync (Required)
- `shared/lib/sync/wedme-wedsync-bridge.ts` - Platform bridge service
- `wedme/src/lib/sync/supplier-data-sync.ts` - Real-time supplier data sync
- `shared/types/cross-platform-events.ts` - Shared event types
- `wedme/src/lib/realtime/couple-supplier-channel.ts` - Real-time communication

### 4. PWA Tour Features (Required)
- `wedme/public/sw-tour.js` - Service worker for tour caching
- `wedme/src/lib/pwa/offline-tour-manager.ts` - Offline tour management
- `wedme/src/components/tours/OfflineTourSync.tsx` - Offline sync component
- `wedme/manifest.json` - PWA manifest with tour icons

### 5. Integration Testing Suite (Required)
- `wedme/src/__tests__/tours/mobile-tour.test.tsx` - Mobile tour testing
- `wedme/src/__tests__/sync/cross-platform-sync.test.ts` - Sync testing
- `wedme/src/__tests__/pwa/offline-tour.test.ts` - PWA functionality testing
- Minimum 85% code coverage for all WedMe tour features

**Verification Command**: After implementation, run this exact command to verify your work:
```bash
find . -path "*/wedme/*" -name "*tour*" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.js" \) | grep -E "(components|lib|hooks|__tests__)" | sort
```

## Technical Requirements

### WedMe Platform Architecture

#### Main Couple Dashboard Tour Component
```tsx
// wedme/src/components/tours/WedMeDashboardTour.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTourProgress } from '@/hooks/useTourProgress';
import { useRealtimeSupplierSync } from '@/hooks/useRealtimeSupplierSync';
import { useMobileOrientation } from '@/hooks/useMobileOrientation';
import { MobileTourOverlay } from './MobileTourOverlay';
import { CoupleProgress } from './CoupleProgress';
import { ShareTourProgress } from './ShareTourProgress';
import { OfflineTourSync } from './OfflineTourSync';

interface WedMeTourStep {
  id: string;
  title: string;
  description: string;
  coupleMessage: string;
  icon: string;
  targetElement: string;
  position: TourPosition;
  weddingContext: {
    emotionalTone: 'excited' | 'reassuring' | 'empowering' | 'romantic';
    timeline: 'immediate' | 'planning' | 'near_wedding' | 'after_wedding';
    priority: 'essential' | 'helpful' | 'bonus';
  };
  interactions: {
    type: 'tap' | 'swipe' | 'scroll' | 'form_fill' | 'photo_upload';
    gesture?: 'swipe_left' | 'swipe_right' | 'pinch' | 'double_tap';
    validation?: (step: WedMeTourStep, progress: any) => boolean;
  };
  viralMechanics?: {
    sharePrompt?: string;
    invitePrompt?: string;
    socialProof?: string;
  };
}

interface WedMeDashboardTourProps {
  tourType: 'welcome' | 'photo_sharing' | 'planning_tools' | 'supplier_connection';
  couple: {
    partner1: { name: string; id: string };
    partner2: { name: string; id: string };
  };
  supplierContext?: {
    supplierName: string;
    supplierType: string;
    supplierPhoto?: string;
    connectionDate: string;
  };
  onComplete: (feedback: CoupleTourFeedback) => void;
  onInvitePartner: () => void;
  onShareProgress: (platform: string) => void;
}

export function WedMeDashboardTour({
  tourType,
  couple,
  supplierContext,
  onComplete,
  onInvitePartner,
  onShareProgress
}: WedMeDashboardTourProps) {
  const { isPortrait, isMobile } = useMobileOrientation();
  const [currentStep, setCurrentStep] = useState(0);
  const [coupleProgress, setCoupleProgress] = useState<CoupleProgressState>({
    partner1Completed: [],
    partner2Completed: [],
    sharedSteps: []
  });
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [tourSteps, setTourSteps] = useState<WedMeTourStep[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  // Custom hooks for WedMe functionality
  const { 
    progress, 
    updateProgress, 
    syncWithSupplier 
  } = useTourProgress(tourType, couple);

  const { 
    supplierUpdates, 
    isConnected 
  } = useRealtimeSupplierSync(supplierContext?.supplierName);

  // Initialize tour based on couple context and supplier relationship
  useEffect(() => {
    const initializeCoupletour = async () => {
      const steps = await generateCoupleSpecificSteps({
        tourType,
        couple,
        supplierContext,
        isFirstTime: !progress?.hasCompletedAnyTour,
        deviceType: isMobile ? 'mobile' : 'desktop'
      });
      
      setTourSteps(steps);
    };

    initializeCoupletour();
  }, [tourType, couple, supplierContext, isMobile]);

  // Handle offline/online state for PWA
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleStepComplete = useCallback(async (stepIndex: number) => {
    const step = tourSteps[stepIndex];
    const currentUser = getCurrentUser(); // Helper to determine which partner
    
    // Update couple progress
    const newProgress = {
      ...coupleProgress,
      [`${currentUser}Completed`]: [...coupleProgress[`${currentUser}Completed`], stepIndex]
    };
    
    // Check if step requires both partners
    if (step.interactions.type === 'form_fill' && step.weddingContext.priority === 'essential') {
      newProgress.sharedSteps.push(stepIndex);
    }
    
    setCoupleProgress(newProgress);
    
    // Sync with supplier platform if connected
    if (supplierContext && isConnected) {
      await syncWithSupplier({
        stepCompleted: stepIndex,
        stepName: step.title,
        coupleProgress: newProgress,
        supplierName: supplierContext.supplierName
      });
    }
    
    // Show viral sharing prompt at key moments
    if (step.viralMechanics?.sharePrompt && shouldShowSharePrompt(stepIndex)) {
      setShowSharePrompt(true);
    }
    
    // Move to next step or complete tour
    if (stepIndex < tourSteps.length - 1) {
      setCurrentStep(stepIndex + 1);
    } else {
      handleTourComplete();
    }

    // Track analytics with couple-specific context
    trackCoupleAnalytics({
      event: 'step_completed',
      stepIndex,
      stepName: step.title,
      tourType,
      coupleId: `${couple.partner1.id}-${couple.partner2.id}`,
      partnerCompleting: currentUser,
      supplierConnected: !!supplierContext,
      deviceType: isMobile ? 'mobile' : 'desktop',
      orientation: isPortrait ? 'portrait' : 'landscape'
    });

  }, [currentStep, tourSteps, coupleProgress, supplierContext, isConnected]);

  const handleTourComplete = useCallback(() => {
    const feedback: CoupleTourFeedback = {
      tourType,
      completedAt: new Date().toISOString(),
      coupleProgress,
      overallRating: 0, // Will be set by feedback form
      mostHelpfulStep: '',
      suggestions: '',
      likelyToRecommend: 0,
      partnerInviteSent: false,
      shareActions: []
    };

    // Show completion celebration
    showCompletionCelebration();
    
    // Trigger completion callback
    onComplete(feedback);

  }, [tourType, coupleProgress, onComplete]);

  const showCompletionCelebration = () => {
    // Wedding-themed celebration animation
    const celebrations = [
      '🎉 Amazing! You\'re ready to plan your dream wedding!',
      '💕 Your love story just got a perfect planning companion!',
      '✨ Welcome to stress-free wedding planning!',
      '🌟 Ready to make your wedding dreams come true?'
    ];
    
    const randomCelebration = celebrations[Math.floor(Math.random() * celebrations.length)];
    
    // Could trigger confetti, success animation, etc.
    console.log('Celebration:', randomCelebration);
  };

  // Mobile-specific render
  if (isMobile) {
    return (
      <MobileTourOverlay
        currentStep={tourSteps[currentStep]}
        stepIndex={currentStep}
        totalSteps={tourSteps.length}
        coupleProgress={coupleProgress}
        isOffline={isOffline}
        onStepComplete={handleStepComplete}
        onSkip={() => setCurrentStep(currentStep + 1)}
        onClose={() => onComplete({} as CoupleTourFeedback)}
        supplierContext={supplierContext}
      />
    );
  }

  // Desktop render
  return (
    <div className="fixed inset-0 z-50 wedding-tour-overlay">
      {/* Romantic background with subtle animation */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50"
        animate={{ 
          background: [
            'linear-gradient(45deg, rgba(251,207,232,0.3), rgba(253,186,246,0.3))',
            'linear-gradient(45deg, rgba(253,186,246,0.3), rgba(196,181,253,0.3))',
            'linear-gradient(45deg, rgba(196,181,253,0.3), rgba(251,207,232,0.3))'
          ]
        }}
        transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
      />
      
      {/* Main tour content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl max-w-2xl w-full p-8 border border-rose-200"
          >
            {/* Progress indicator for couples */}
            <CoupleProgress 
              current={currentStep}
              total={tourSteps.length}
              coupleProgress={coupleProgress}
              couple={couple}
            />

            {tourSteps[currentStep] && (
              <WedMeStepContent
                step={tourSteps[currentStep]}
                stepIndex={currentStep}
                coupleProgress={coupleProgress}
                supplierContext={supplierContext}
                onComplete={() => handleStepComplete(currentStep)}
                onSkip={() => setCurrentStep(currentStep + 1)}
              />
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Previous
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800"
                >
                  Skip
                </button>
                <button
                  onClick={() => handleStepComplete(currentStep)}
                  className="px-8 py-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors"
                >
                  {currentStep === tourSteps.length - 1 ? 'Complete' : 'Next'}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Offline indicator */}
      {isOffline && (
        <OfflineTourSync 
          onSyncReady={() => setIsOffline(false)}
        />
      )}

      {/* Share prompt modal */}
      <AnimatePresence>
        {showSharePrompt && (
          <ShareTourProgress
            step={tourSteps[currentStep]}
            coupleProgress={coupleProgress}
            onShare={onShareProgress}
            onClose={() => setShowSharePrompt(false)}
            onInvitePartner={onInvitePartner}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Individual step content component
function WedMeStepContent({ 
  step, 
  stepIndex, 
  coupleProgress, 
  supplierContext,
  onComplete,
  onSkip 
}: {
  step: WedMeTourStep;
  stepIndex: number;
  coupleProgress: CoupleProgressState;
  supplierContext?: any;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [userInteracted, setUserInteracted] = useState(false);

  const getEmotionalStyling = (tone: string) => {
    const styles = {
      excited: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      reassuring: 'text-blue-600 bg-blue-50 border-blue-200', 
      empowering: 'text-purple-600 bg-purple-50 border-purple-200',
      romantic: 'text-rose-600 bg-rose-50 border-rose-200'
    };
    return styles[tone as keyof typeof styles] || styles.romantic;
  };

  return (
    <div className="text-center space-y-6">
      {/* Step icon with wedding theme */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getEmotionalStyling(step.weddingContext.emotionalTone)}`}
      >
        <span className="text-2xl">{step.icon}</span>
      </motion.div>

      {/* Step title and description */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {step.title}
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed mb-4">
          {step.description}
        </p>
        
        {/* Couple-specific message */}
        <div className={`p-4 rounded-2xl border-2 ${getEmotionalStyling(step.weddingContext.emotionalTone)}`}>
          <p className="font-medium">
            💕 {step.coupleMessage}
          </p>
        </div>
      </div>

      {/* Supplier context if available */}
      {supplierContext && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-50 rounded-2xl p-4 border border-gray-200"
        >
          <div className="flex items-center gap-3">
            {supplierContext.supplierPhoto && (
              <img 
                src={supplierContext.supplierPhoto}
                alt={supplierContext.supplierName}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                Connected with {supplierContext.supplierName}
              </p>
              <p className="text-xs text-gray-600">
                Your {supplierContext.supplierType} • Connected {new Date(supplierContext.connectionDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Interactive element based on step type */}
      <StepInteractionComponent
        step={step}
        onInteraction={() => setUserInteracted(true)}
        onComplete={onComplete}
      />

      {/* Viral mechanics prompt */}
      {step.viralMechanics && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: userInteracted ? 1 : 0 }}
          className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 border border-pink-200"
        >
          {step.viralMechanics.sharePrompt && (
            <p className="text-sm text-purple-700 mb-2">
              ✨ {step.viralMechanics.sharePrompt}
            </p>
          )}
          {step.viralMechanics.socialProof && (
            <p className="text-xs text-gray-600">
              {step.viralMechanics.socialProof}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

// Component for handling different interaction types
function StepInteractionComponent({
  step,
  onInteraction,
  onComplete
}: {
  step: WedMeTourStep;
  onInteraction: () => void;
  onComplete: () => void;
}) {
  const handleInteraction = () => {
    onInteraction();
    
    // Validate interaction if required
    if (step.interactions.validation) {
      const isValid = step.interactions.validation(step, {});
      if (isValid) {
        setTimeout(onComplete, 500); // Small delay for UX
      }
    } else {
      setTimeout(onComplete, 500);
    }
  };

  switch (step.interactions.type) {
    case 'tap':
      return (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleInteraction}
          className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-medium text-lg hover:from-rose-600 hover:to-pink-600 transition-all duration-200"
        >
          Tap to Continue ✨
        </motion.button>
      );

    case 'form_fill':
      return (
        <WedMeFormInteraction
          step={step}
          onComplete={handleInteraction}
        />
      );

    case 'photo_upload':
      return (
        <WedMePhotoUpload
          step={step}
          onUpload={handleInteraction}
        />
      );

    default:
      return (
        <button
          onClick={handleInteraction}
          className="w-full py-4 bg-rose-500 text-white rounded-2xl font-medium hover:bg-rose-600 transition-colors"
        >
          Continue
        </button>
      );
  }
}

// Types
interface CoupleProgressState {
  partner1Completed: number[];
  partner2Completed: number[];
  sharedSteps: number[];
}

interface CoupleTourFeedback {
  tourType: string;
  completedAt: string;
  coupleProgress: CoupleProgressState;
  overallRating: number;
  mostHelpfulStep: string;
  suggestions: string;
  likelyToRecommend: number;
  partnerInviteSent: boolean;
  shareActions: string[];
}

type TourPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

// Helper functions
function generateCoupleSpecificSteps(params: any): Promise<WedMeTourStep[]> {
  // Implementation for generating context-aware tour steps
  return Promise.resolve([]);
}

function getCurrentUser(): 'partner1' | 'partner2' {
  // Implementation to determine current user
  return 'partner1';
}

function shouldShowSharePrompt(stepIndex: number): boolean {
  // Logic to determine when to show share prompts
  return stepIndex === 2 || stepIndex === 5; // Example logic
}

function trackCoupleAnalytics(data: any) {
  // Implementation for couple-specific analytics
  console.log('Analytics:', data);
}
```

### Mobile-First Tour Implementation

#### Mobile Touch Gesture System
```typescript
// wedme/src/lib/mobile/touch-gestures.ts
export class MobileTourGestureHandler {
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchEndX: number = 0;
  private touchEndY: number = 0;
  private element: HTMLElement;
  private callbacks: GestureCallbacks;

  constructor(element: HTMLElement, callbacks: GestureCallbacks) {
    this.element = element;
    this.callbacks = callbacks;
    this.attachEventListeners();
  }

  private attachEventListeners() {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
  }

  private handleTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  private handleTouchMove(event: TouchEvent) {
    // Prevent default scrolling during tour
    if (this.callbacks.preventScroll) {
      event.preventDefault();
    }
  }

  private handleTouchEnd(event: TouchEvent) {
    const touch = event.changedTouches[0];
    this.touchEndX = touch.clientX;
    this.touchEndY = touch.clientY;
    
    this.handleSwipeGesture();
  }

  private handleSwipeGesture() {
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    const minSwipeDistance = 50;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          this.callbacks.onSwipeRight?.();
        } else {
          this.callbacks.onSwipeLeft?.();
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          this.callbacks.onSwipeDown?.();
        } else {
          this.callbacks.onSwipeUp?.();
        }
      }
    }
  }

  destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
  }
}

export interface GestureCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onPinch?: (scale: number) => void;
  preventScroll?: boolean;
}

// Custom hook for gesture handling
export function useWedMeGestures(
  elementRef: React.RefObject<HTMLElement>,
  callbacks: GestureCallbacks
) {
  useEffect(() => {
    if (!elementRef.current) return;

    const gestureHandler = new MobileTourGestureHandler(elementRef.current, callbacks);

    return () => {
      gestureHandler.destroy();
    };
  }, [elementRef, callbacks]);
}
```

#### Mobile Tour Overlay Component
```tsx
// wedme/src/components/tours/MobileTourOverlay.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { useWedMeGestures } from '@/lib/mobile/touch-gestures';
import { SwipeableTourSteps } from './mobile/SwipeableTourSteps';

interface MobileTourOverlayProps {
  currentStep: WedMeTourStep;
  stepIndex: number;
  totalSteps: number;
  coupleProgress: CoupleProgressState;
  isOffline: boolean;
  onStepComplete: (stepIndex: number) => void;
  onSkip: () => void;
  onClose: () => void;
  supplierContext?: any;
}

export function MobileTourOverlay({
  currentStep,
  stepIndex,
  totalSteps,
  coupleProgress,
  isOffline,
  onStepComplete,
  onSkip,
  onClose,
  supplierContext
}: MobileTourOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // Hide hint after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Gesture handling for mobile tour navigation
  useWedMeGestures(overlayRef, {
    onSwipeLeft: () => {
      if (stepIndex < totalSteps - 1) {
        onStepComplete(stepIndex);
      }
    },
    onSwipeRight: () => {
      if (stepIndex > 0) {
        // Go to previous step
        onStepComplete(stepIndex - 1);
      }
    },
    onSwipeUp: () => {
      // Show additional info or expand
      setShowHint(false);
    },
    onSwipeDown: () => {
      // Close tour or minimize
      onClose();
    },
    preventScroll: true
  });

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      // Swiped right - previous step
      if (stepIndex > 0) {
        onStepComplete(stepIndex - 1);
      }
    } else if (info.offset.x < -threshold) {
      // Swiped left - next step
      if (stepIndex < totalSteps - 1) {
        onStepComplete(stepIndex);
      }
    } else if (info.offset.y > threshold) {
      // Swiped down - close
      onClose();
    } else {
      // Snap back to center
      controls.start({ x: 0, y: 0 });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      {/* Mobile-optimized overlay */}
      <motion.div
        ref={overlayRef}
        className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: -200, bottom: 100 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ minHeight: '60vh', maxHeight: '90vh' }}
      >
        {/* Drag indicator */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Offline indicator */}
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-100 border-l-4 border-orange-400 p-3 mx-4 rounded-r-lg"
          >
            <div className="flex items-center">
              <span className="text-orange-600 text-sm font-medium">
                📵 Offline mode - Your progress is saved!
              </span>
            </div>
          </motion.div>
        )}

        {/* Mobile progress indicator */}
        <div className="px-6 py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Step {stepIndex + 1} of {totalSteps}
            </span>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          {/* Progress bar with couple indicators */}
          <div className="relative">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-rose-400 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            
            {/* Partner progress indicators */}
            <div className="flex justify-between mt-1">
              <span className="text-xs text-rose-500">
                💕 {coupleProgress.partner1Completed.length} completed
              </span>
              <span className="text-xs text-pink-500">
                💕 {coupleProgress.partner2Completed.length} completed
              </span>
            </div>
          </div>
        </div>

        {/* Swipeable step content */}
        <SwipeableTourSteps
          currentStep={currentStep}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          onStepComplete={() => onStepComplete(stepIndex)}
          onSkip={onSkip}
          supplierContext={supplierContext}
        />

        {/* Mobile gesture hints */}
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
            >
              <div className="bg-black/80 text-white px-4 py-2 rounded-full text-sm backdrop-blur">
                👆 Swipe left/right to navigate • Swipe down to close
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile action buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="flex-1 py-3 text-gray-600 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Skip
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => onStepComplete(stepIndex)}
              className="flex-2 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-200"
            >
              {stepIndex === totalSteps - 1 ? 'Complete Tour 🎉' : 'Continue ✨'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

### Cross-Platform Synchronization

#### WedMe-WedSync Bridge Service
```typescript
// shared/lib/sync/wedme-wedsync-bridge.ts
export class WedMeWedSyncBridge {
  private supabase: SupabaseClient;
  private realtimeChannel: RealtimeChannel | null = null;
  private syncQueue: CrossPlatformEvent[] = [];
  private isOnline: boolean = true;

  constructor() {
    this.supabase = createClientComponentClient();
    this.initializeRealtimeSync();
    this.monitorOnlineStatus();
  }

  /**
   * Initialize real-time synchronization between WedMe and WedSync
   */
  private initializeRealtimeSync(): void {
    this.realtimeChannel = this.supabase
      .channel('wedme-wedsync-sync')
      .on('postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'cross_platform_events' 
        },
        (payload) => this.handleIncomingSync(payload.new)
      )
      .on('postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'user_tour_progress' 
        },
        (payload) => this.handleTourProgressSync(payload.new)
      )
      .subscribe();
  }

  /**
   * Sync tour event from WedMe to WedSync supplier dashboard
   */
  async syncTourEventToSupplier(event: WedMeTourEvent): Promise<SyncResult> {
    try {
      // Find connected suppliers for this couple
      const suppliers = await this.getConnectedSuppliers(event.coupleId);
      
      const syncResults = await Promise.allSettled(
        suppliers.map(supplier => this.notifySupplier(supplier, event))
      );

      // Store sync event for reliability
      await this.storeCrossPlatformEvent({
        event_type: 'wedme_to_wedsync',
        source_platform: 'wedme',
        target_platform: 'wedsync',
        event_data: event,
        couple_id: event.coupleId,
        supplier_ids: suppliers.map(s => s.id),
        sync_status: 'completed',
        created_at: new Date().toISOString()
      });

      const successCount = syncResults.filter(r => r.status === 'fulfilled').length;
      
      return {
        success: successCount > 0,
        message: `Synced to ${successCount} of ${suppliers.length} suppliers`,
        details: { 
          suppliers: suppliers.length, 
          successful: successCount 
        }
      };

    } catch (error) {
      console.error('Tour event sync error:', error);
      
      // Queue for retry if offline
      if (!this.isOnline) {
        this.syncQueue.push({
          event_type: 'wedme_to_wedsync',
          source_platform: 'wedme',
          target_platform: 'wedsync',
          event_data: event,
          couple_id: event.coupleId,
          retry_count: 0,
          max_retries: 3,
          created_at: new Date().toISOString()
        });
      }

      return {
        success: false,
        message: 'Failed to sync tour event',
        error: error.message
      };
    }
  }

  /**
   * Sync supplier updates from WedSync to WedMe couple dashboard
   */
  async syncSupplierUpdatesToCouple(update: SupplierUpdate): Promise<SyncResult> {
    try {
      // Get couple dashboard instance
      const coupleConnection = await this.getCoupleConnection(update.coupleId);
      
      if (!coupleConnection) {
        return {
          success: false,
          message: 'Couple not connected or not active'
        };
      }

      // Send real-time update to couple's WedMe dashboard
      await this.supabase
        .channel(`couple-${update.coupleId}`)
        .send({
          type: 'broadcast',
          event: 'supplier_update',
          payload: {
            supplier_name: update.supplierName,
            supplier_type: update.supplierType,
            update_type: update.updateType,
            message: update.message,
            data: update.data,
            timestamp: new Date().toISOString()
          }
        });

      // Store update for offline access
      await this.storeCoupleUpdate({
        couple_id: update.coupleId,
        supplier_id: update.supplierId,
        update_type: update.updateType,
        title: update.title,
        message: update.message,
        data: update.data,
        read_status: false,
        created_at: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Update sent to couple successfully'
      };

    } catch (error) {
      console.error('Supplier update sync error:', error);
      return {
        success: false,
        message: 'Failed to sync supplier update',
        error: error.message
      };
    }
  }

  /**
   * Handle bidirectional data synchronization
   */
  async syncBidirectionalData(params: {
    coupleId: string;
    dataType: 'preferences' | 'timeline' | 'budget' | 'guest_list';
    data: any;
    source: 'wedme' | 'wedsync';
  }): Promise<SyncResult> {
    try {
      const { coupleId, dataType, data, source } = params;
      
      // Validate sync permissions
      const canSync = await this.validateSyncPermissions(coupleId, dataType, source);
      if (!canSync) {
        return {
          success: false,
          message: 'Sync permission denied'
        };
      }

      // Handle conflict resolution if data exists
      const existingData = await this.getExistingData(coupleId, dataType);
      let resolvedData = data;
      
      if (existingData) {
        resolvedData = await this.resolveDataConflict({
          existing: existingData,
          incoming: data,
          source,
          dataType
        });
      }

      // Update data in both platforms
      const updatePromises = [
        this.updateWedMeData(coupleId, dataType, resolvedData),
        this.updateWedSyncData(coupleId, dataType, resolvedData)
      ];

      const results = await Promise.allSettled(updatePromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      // Notify connected suppliers of couple data changes
      if (successful > 0) {
        await this.notifyConnectedSuppliersOfDataChange(coupleId, dataType, resolvedData);
      }

      return {
        success: successful === 2,
        message: successful === 2 ? 'Data synced successfully' : 'Partial sync completed',
        details: { successful, total: 2 }
      };

    } catch (error) {
      console.error('Bidirectional sync error:', error);
      return {
        success: false,
        message: 'Failed to sync data bidirectionally',
        error: error.message
      };
    }
  }

  /**
   * Get connected suppliers for a couple
   */
  private async getConnectedSuppliers(coupleId: string): Promise<ConnectedSupplier[]> {
    const { data, error } = await this.supabase
      .from('couple_supplier_connections')
      .select(`
        supplier_id,
        supplier_name,
        supplier_type,
        connection_status,
        organizations!inner (
          id,
          name,
          subscription_tier
        )
      `)
      .eq('couple_id', coupleId)
      .eq('connection_status', 'active');

    if (error) {
      console.error('Error fetching connected suppliers:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Notify supplier of couple tour progress
   */
  private async notifySupplier(
    supplier: ConnectedSupplier, 
    event: WedMeTourEvent
  ): Promise<void> {
    // Send real-time notification to supplier's WedSync dashboard
    await this.supabase
      .channel(`supplier-${supplier.supplier_id}`)
      .send({
        type: 'broadcast',
        event: 'couple_tour_progress',
        payload: {
          couple_id: event.coupleId,
          couple_names: event.coupleNames,
          tour_type: event.tourType,
          event_type: event.eventType,
          progress: event.progress,
          completion_percentage: event.completionPercentage,
          timestamp: event.timestamp,
          message: this.generateSupplierMessage(event)
        }
      });

    // Store notification for supplier dashboard
    await this.storeSupplierNotification({
      supplier_id: supplier.supplier_id,
      couple_id: event.coupleId,
      notification_type: 'couple_tour_progress',
      title: `${event.coupleNames} made progress on WedMe`,
      message: this.generateSupplierMessage(event),
      data: {
        tour_type: event.tourType,
        progress: event.progress,
        completion_percentage: event.completionPercentage
      },
      read_status: false,
      created_at: new Date().toISOString()
    });
  }

  /**
   * Generate contextual message for suppliers
   */
  private generateSupplierMessage(event: WedMeTourEvent): string {
    const messages = {
      tour_started: `${event.coupleNames} started exploring WedMe! They're getting familiar with their wedding planning dashboard.`,
      tour_completed: `🎉 ${event.coupleNames} completed their WedMe tour! They're now fully onboarded and ready to collaborate with you.`,
      step_completed: `${event.coupleNames} completed the "${event.stepName}" step. They're ${event.completionPercentage}% through their setup.`,
      preferences_updated: `${event.coupleNames} updated their wedding preferences on WedMe. Check their profile for the latest details.`,
      timeline_created: `${event.coupleNames} created their wedding timeline on WedMe. You can now see key dates and milestones.`,
      photos_uploaded: `${event.coupleNames} uploaded new photos to WedMe. Check out their latest additions!`
    };

    return messages[event.eventType] || `${event.coupleNames} made an update on WedMe.`;
  }

  /**
   * Handle incoming sync events
   */
  private async handleIncomingSync(syncEvent: any): Promise<void> {
    try {
      switch (syncEvent.event_type) {
        case 'wedsync_to_wedme':
          await this.processWedSyncToWedMeSync(syncEvent);
          break;
        case 'wedme_to_wedsync':
          await this.processWedMeToWedSyncSync(syncEvent);
          break;
        case 'bidirectional_update':
          await this.processBidirectionalUpdate(syncEvent);
          break;
        default:
          console.warn('Unknown sync event type:', syncEvent.event_type);
      }
    } catch (error) {
      console.error('Error handling incoming sync:', error);
    }
  }

  /**
   * Monitor online status for queue processing
   */
  private monitorOnlineStatus(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    this.isOnline = navigator.onLine;
  }

  /**
   * Process queued sync events when back online
   */
  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const event of queue) {
      try {
        if (event.retry_count < event.max_retries) {
          await this.reprocessSyncEvent(event);
        }
      } catch (error) {
        // Re-queue with incremented retry count
        if (event.retry_count < event.max_retries) {
          this.syncQueue.push({
            ...event,
            retry_count: event.retry_count + 1
          });
        }
      }
    }
  }

  /**
   * Data conflict resolution
   */
  private async resolveDataConflict(params: {
    existing: any;
    incoming: any;
    source: 'wedme' | 'wedsync';
    dataType: string;
  }): Promise<any> {
    const { existing, incoming, source, dataType } = params;

    // Implement conflict resolution strategy based on data type
    switch (dataType) {
      case 'preferences':
        // Merge preferences, giving priority to most recent updates
        return this.mergePreferences(existing, incoming);
      
      case 'timeline':
        // Timeline conflicts require careful merging
        return this.mergeTimeline(existing, incoming);
      
      case 'budget':
        // Budget changes need validation
        return this.validateAndMergeBudget(existing, incoming);
      
      default:
        // Default: incoming data takes priority
        return incoming;
    }
  }

  private mergePreferences(existing: any, incoming: any): any {
    return {
      ...existing,
      ...incoming,
      updated_at: new Date().toISOString(),
      merge_source: 'auto_merge'
    };
  }

  private mergeTimeline(existing: any, incoming: any): any {
    // Implement timeline-specific merge logic
    return {
      ...existing,
      events: this.mergeTimelineEvents(existing.events, incoming.events),
      updated_at: new Date().toISOString()
    };
  }

  private mergeTimelineEvents(existingEvents: any[], incomingEvents: any[]): any[] {
    // Smart merge of timeline events avoiding duplicates
    const merged = [...existingEvents];
    
    incomingEvents.forEach(incomingEvent => {
      const existingIndex = merged.findIndex(e => e.id === incomingEvent.id);
      if (existingIndex >= 0) {
        // Update existing event
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...incomingEvent,
          updated_at: new Date().toISOString()
        };
      } else {
        // Add new event
        merged.push(incomingEvent);
      }
    });

    return merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private validateAndMergeBudget(existing: any, incoming: any): any {
    // Implement budget validation and merge logic
    return {
      ...existing,
      ...incoming,
      total_budget: Math.max(existing.total_budget || 0, incoming.total_budget || 0),
      updated_at: new Date().toISOString(),
      needs_review: existing.total_budget !== incoming.total_budget
    };
  }

  // Helper methods for data operations
  private async storeCrossPlatformEvent(event: any): Promise<void> {
    const { error } = await this.supabase
      .from('cross_platform_events')
      .insert(event);

    if (error) {
      console.error('Error storing cross-platform event:', error);
    }
  }

  private async storeSupplierNotification(notification: any): Promise<void> {
    const { error } = await this.supabase
      .from('supplier_notifications')
      .insert(notification);

    if (error) {
      console.error('Error storing supplier notification:', error);
    }
  }

  private async storeCoupleUpdate(update: any): Promise<void> {
    const { error } = await this.supabase
      .from('couple_updates')
      .insert(update);

    if (error) {
      console.error('Error storing couple update:', error);
    }
  }

  async destroy(): Promise<void> {
    if (this.realtimeChannel) {
      await this.supabase.removeChannel(this.realtimeChannel);
    }
  }
}

// Type definitions
export interface WedMeTourEvent {
  coupleId: string;
  coupleNames: string;
  tourType: string;
  eventType: 'tour_started' | 'tour_completed' | 'step_completed' | 'preferences_updated' | 'timeline_created' | 'photos_uploaded';
  stepName?: string;
  progress: number;
  completionPercentage: number;
  timestamp: string;
  data?: any;
}

export interface SupplierUpdate {
  supplierId: string;
  supplierName: string;
  supplierType: string;
  coupleId: string;
  updateType: 'message' | 'photo' | 'document' | 'timeline_update' | 'invoice';
  title: string;
  message: string;
  data?: any;
}

export interface ConnectedSupplier {
  supplier_id: string;
  supplier_name: string;
  supplier_type: string;
  connection_status: string;
  organizations: {
    id: string;
    name: string;
    subscription_tier: string;
  };
}

export interface CrossPlatformEvent {
  event_type: string;
  source_platform: 'wedme' | 'wedsync';
  target_platform: 'wedme' | 'wedsync';
  event_data: any;
  couple_id?: string;
  supplier_ids?: string[];
  sync_status?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  error?: string;
  details?: any;
}
```

### PWA Tour Features

#### Service Worker for Tour Caching
```javascript
// wedme/public/sw-tour.js
const TOUR_CACHE_NAME = 'wedme-tour-cache-v1';
const TOUR_ASSETS = [
  '/tours/welcome',
  '/tours/photo-sharing',
  '/tours/planning-tools',
  '/tours/assets/icons/',
  '/tours/assets/animations/',
  '/api/tours/offline-data'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(TOUR_CACHE_NAME)
      .then((cache) => cache.addAll(TOUR_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== TOUR_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Handle tour-related requests
  if (event.request.url.includes('/tours/') || event.request.url.includes('/api/tours/')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(event.request).then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(TOUR_CACHE_NAME)
                .then((cache) => cache.put(event.request, responseClone));
            }
            return response;
          });
        })
        .catch(() => {
          // Return offline fallback for tour requests
          if (event.request.url.includes('/api/tours/')) {
            return new Response(JSON.stringify({
              offline: true,
              message: 'Tour data cached for offline use'
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          return caches.match('/tours/offline.html');
        })
    );
  }
});

// Handle background sync for tour progress
self.addEventListener('sync', (event) => {
  if (event.tag === 'tour-progress-sync') {
    event.waitUntil(syncTourProgress());
  }
});

async function syncTourProgress() {
  try {
    // Get offline tour progress from IndexedDB
    const offlineProgress = await getOfflineTourProgress();
    
    if (offlineProgress.length > 0) {
      // Send to server when back online
      const response = await fetch('/api/tours/sync-offline-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offlineProgress)
      });
      
      if (response.ok) {
        // Clear offline storage after successful sync
        await clearOfflineTourProgress();
        
        // Notify client of successful sync
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'TOUR_SYNC_SUCCESS',
              progress: offlineProgress
            });
          });
        });
      }
    }
  } catch (error) {
    console.error('Tour progress sync failed:', error);
  }
}

// IndexedDB operations for offline storage
function getOfflineTourProgress() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WedMeTours', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['progress'], 'readonly');
      const store = transaction.objectStore('progress');
      const getAll = store.getAll();
      
      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => reject(getAll.error);
    };
  });
}

function clearOfflineTourProgress() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WedMeTours', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['progress'], 'readwrite');
      const store = transaction.objectStore('progress');
      const clear = store.clear();
      
      clear.onsuccess = () => resolve();
      clear.onerror = () => reject(clear.error);
    };
  });
}
```

#### Offline Tour Manager
```typescript
// wedme/src/lib/pwa/offline-tour-manager.ts
export class OfflineTourManager {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = navigator.onLine;
  private syncQueue: TourProgressUpdate[] = [];

  constructor() {
    this.initializeDB();
    this.setupOnlineListener();
    this.registerServiceWorker();
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WedMeTours', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores for offline tour data
        if (!db.objectStoreNames.contains('tours')) {
          const tourStore = db.createObjectStore('tours', { keyPath: 'id' });
          tourStore.createIndex('tourType', 'tourType', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('progress')) {
          const progressStore = db.createObjectStore('progress', { keyPath: 'id' });
          progressStore.createIndex('coupleId', 'coupleId', { unique: false });
          progressStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('assets')) {
          const assetStore = db.createObjectStore('assets', { keyPath: 'url' });
        }
      };
    });
  }

  /**
   * Cache tour data for offline access
   */
  async cacheTourData(tourData: WedMeTourData): Promise<void> {
    if (!this.db) await this.initializeDB();
    
    const transaction = this.db!.transaction(['tours'], 'readwrite');
    const store = transaction.objectStore('tours');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        id: tourData.id,
        tourType: tourData.tourType,
        steps: tourData.steps,
        coupleContext: tourData.coupleContext,
        supplierContext: tourData.supplierContext,
        cachedAt: new Date().toISOString()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Cache related assets
    await this.cacheAsets(tourData.assets || []);
  }

  /**
   * Save tour progress offline
   */
  async saveTourProgressOffline(progress: TourProgressUpdate): Promise<void> {
    if (!this.db) await this.initializeDB();
    
    const transaction = this.db!.transaction(['progress'], 'readwrite');
    const store = transaction.objectStore('progress');
    
    const progressData = {
      id: `${progress.coupleId}-${progress.tourId}-${Date.now()}`,
      coupleId: progress.coupleId,
      tourId: progress.tourId,
      stepIndex: progress.stepIndex,
      stepData: progress.stepData,
      timestamp: new Date().toISOString(),
      synced: false
    };
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(progressData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Add to sync queue if online
    if (this.isOnline) {
      this.syncQueue.push(progress);
      this.processSyncQueue();
    }
  }

  /**
   * Get cached tour data
   */
  async getCachedTourData(tourId: string): Promise<WedMeTourData | null> {
    if (!this.db) await this.initializeDB();
    
    const transaction = this.db!.transaction(['tours'], 'readonly');
    const store = transaction.objectStore('tours');
    
    return new Promise((resolve, reject) => {
      const request = store.get(tourId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get offline tour progress
   */
  async getOfflineProgress(coupleId: string): Promise<TourProgressUpdate[]> {
    if (!this.db) await this.initializeDB();
    
    const transaction = this.db!.transaction(['progress'], 'readonly');
    const store = transaction.objectStore('progress');
    const index = store.index('coupleId');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(coupleId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sync offline data when back online
   */
  async syncOfflineData(): Promise<SyncResult> {
    if (!this.isOnline) {
      return { success: false, message: 'Device is offline' };
    }

    try {
      // Get all unsynced progress
      const unsyncedProgress = await this.getUnsyncedProgress();
      
      if (unsyncedProgress.length === 0) {
        return { success: true, message: 'No data to sync' };
      }

      // Send to server
      const response = await fetch('/api/tours/sync-offline-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unsyncedProgress)
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      // Mark as synced
      await this.markProgressAsSynced(unsyncedProgress);

      return { 
        success: true, 
        message: `Synced ${unsyncedProgress.length} progress updates` 
      };

    } catch (error) {
      console.error('Offline sync error:', error);
      return { 
        success: false, 
        message: 'Sync failed', 
        error: error.message 
      };
    }
  }

  /**
   * Check if tour is available offline
   */
  async isTourAvailableOffline(tourId: string): Promise<boolean> {
    const cachedData = await this.getCachedTourData(tourId);
    return cachedData !== null;
  }

  /**
   * Estimate offline storage usage
   */
  async getStorageUsage(): Promise<StorageUsage> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0,
        percentage: estimate.usage && estimate.quota ? 
          Math.round((estimate.usage / estimate.quota) * 100) : 0
      };
    }
    
    return { used: 0, available: 0, percentage: 0 };
  }

  /**
   * Clear cached data
   */
  async clearOfflineData(): Promise<void> {
    if (!this.db) return;

    const stores = ['tours', 'progress', 'assets'];
    const transaction = this.db.transaction(stores, 'readwrite');
    
    await Promise.all(
      stores.map(storeName => {
        const store = transaction.objectStore(storeName);
        return new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      })
    );
  }

  // Private helper methods
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw-tour.js');
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'TOUR_SYNC_SUCCESS') {
            this.handleSyncSuccess(event.data.progress);
          }
        });

      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  }

  private async cacheAsets(assets: string[]): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['assets'], 'readwrite');
    const store = transaction.objectStore('assets');

    for (const assetUrl of assets) {
      try {
        const response = await fetch(assetUrl);
        if (response.ok) {
          const blob = await response.blob();
          await new Promise<void>((resolve, reject) => {
            const request = store.put({
              url: assetUrl,
              data: blob,
              cachedAt: new Date().toISOString()
            });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      } catch (error) {
        console.warn('Failed to cache asset:', assetUrl, error);
      }
    }
  }

  private async getUnsyncedProgress(): Promise<TourProgressUpdate[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['progress'], 'readonly');
    const store = transaction.objectStore('progress');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const allProgress = request.result || [];
        const unsynced = allProgress.filter(p => !p.synced);
        resolve(unsynced);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async markProgressAsSynced(progress: TourProgressUpdate[]): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['progress'], 'readwrite');
    const store = transaction.objectStore('progress');

    for (const item of progress) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put({ ...item, synced: true });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0 || !this.isOnline) return;

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    try {
      const response = await fetch('/api/tours/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queue)
      });

      if (!response.ok) {
        // Re-queue items on failure
        this.syncQueue.push(...queue);
      }
    } catch (error) {
      // Re-queue items on error
      this.syncQueue.push(...queue);
      console.error('Sync queue processing failed:', error);
    }
  }

  private handleSyncSuccess(progress: TourProgressUpdate[]): void {
    // Notify components of successful sync
    window.dispatchEvent(new CustomEvent('wedme-tour-synced', {
      detail: { progress }
    }));
  }
}

// Type definitions
interface WedMeTourData {
  id: string;
  tourType: string;
  steps: any[];
  coupleContext: any;
  supplierContext?: any;
  assets?: string[];
}

interface TourProgressUpdate {
  coupleId: string;
  tourId: string;
  stepIndex: number;
  stepData: any;
}

interface SyncResult {
  success: boolean;
  message: string;
  error?: string;
}

interface StorageUsage {
  used: number;
  available: number;
  percentage: number;
}
```

### Viral Growth Integration

#### Social Sharing Component
```tsx
// wedme/src/components/tours/ShareTourProgress.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareTourProgressProps {
  step: WedMeTourStep;
  coupleProgress: CoupleProgressState;
  onShare: (platform: string) => void;
  onClose: () => void;
  onInvitePartner: () => void;
}

export function ShareTourProgress({
  step,
  coupleProgress,
  onShare,
  onClose,
  onInvitePartner
}: ShareTourProgressProps) {
  const [shareType, setShareType] = useState<'progress' | 'invite' | 'celebration'>('progress');
  const [customMessage, setCustomMessage] = useState('');

  const generateShareContent = () => {
    const progressPercentage = Math.round(
      ((coupleProgress.partner1Completed.length + coupleProgress.partner2Completed.length) / 2) * 10
    );

    const shareContent = {
      progress: {
        message: `We're ${progressPercentage}% through setting up our wedding planning on WedMe! 💕✨ #WeddingPlanning #WedMe`,
        image: '/share/progress-celebration.jpg'
      },
      invite: {
        message: `Join us on WedMe for our wedding planning journey! It's making everything so much easier 💕 #WeddingPlanning`,
        image: '/share/couple-invitation.jpg'
      },
      celebration: {
        message: `Just completed our WedMe setup! Ready to plan the wedding of our dreams 🎉💍 #WeddingGoals #WedMe`,
        image: '/share/celebration.jpg'
      }
    };

    return shareContent[shareType];
  };

  const sharePlatforms = [
    {
      name: 'Instagram',
      icon: '📸',
      color: 'from-pink-500 to-purple-600',
      action: () => shareToInstagram()
    },
    {
      name: 'Facebook',
      icon: '👥',
      color: 'from-blue-600 to-blue-700',
      action: () => shareToFacebook()
    },
    {
      name: 'Twitter',
      icon: '🐦',
      color: 'from-blue-400 to-blue-500',
      action: () => shareToTwitter()
    },
    {
      name: 'TikTok',
      icon: '🎵',
      color: 'from-gray-800 to-black',
      action: () => shareToTikTok()
    },
    {
      name: 'WhatsApp',
      icon: '💬',
      color: 'from-green-500 to-green-600',
      action: () => shareToWhatsApp()
    }
  ];

  const shareToInstagram = async () => {
    const content = generateShareContent();
    
    if (navigator.share && navigator.canShare({ text: content.message })) {
      try {
        await navigator.share({
          title: 'WedMe Wedding Planning Progress',
          text: content.message,
          url: `${window.location.origin}/share/wedding-progress`
        });
        onShare('instagram');
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(content.message);
      showCopySuccessMessage('Instagram story content copied!');
    }
  };

  const shareToFacebook = () => {
    const content = generateShareContent();
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(content.message)}`;
    window.open(url, '_blank', 'width=600,height=400');
    onShare('facebook');
  };

  const shareToTwitter = () => {
    const content = generateShareContent();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(content.message)}&url=${encodeURIComponent(window.location.origin)}`;
    window.open(url, '_blank', 'width=600,height=400');
    onShare('twitter');
  };

  const shareToTikTok = async () => {
    const content = generateShareContent();
    await navigator.clipboard.writeText(content.message);
    showCopySuccessMessage('TikTok caption copied! Create your video and paste 📱');
  };

  const shareToWhatsApp = () => {
    const content = generateShareContent();
    const url = `https://wa.me/?text=${encodeURIComponent(content.message)}`;
    window.open(url, '_blank');
    onShare('whatsapp');
  };

  const showCopySuccessMessage = (message: string) => {
    // Implementation for showing success message
    console.log(message);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">
              Share Your Progress! ✨
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mt-2">
            Let your friends and family follow your wedding planning journey
          </p>
        </div>

        {/* Share type selector */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex gap-2">
            {[
              { key: 'progress', label: 'Progress Update', icon: '📊' },
              { key: 'invite', label: 'Invite Friends', icon: '💌' },
              { key: 'celebration', label: 'Celebrate', icon: '🎉' }
            ].map((type) => (
              <button
                key={type.key}
                onClick={() => setShareType(type.key as any)}
                className={`flex-1 p-3 rounded-xl text-sm font-medium transition-all ${
                  shareType === type.key
                    ? 'bg-rose-100 text-rose-700 border-2 border-rose-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="p-6">
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-4 border border-rose-100 mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Preview:</h4>
            <p className="text-sm text-gray-700">
              {generateShareContent().message}
            </p>
          </div>

          {/* Custom message option */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add your personal touch:
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add your own message..."
              className="w-full p-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* Social platforms */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Choose where to share:</h4>
            
            {sharePlatforms.map((platform) => (
              <motion.button
                key={platform.name}
                whileTap={{ scale: 0.98 }}
                onClick={platform.action}
                className={`w-full flex items-center justify-between p-4 rounded-2xl text-white font-medium bg-gradient-to-r ${platform.color} hover:shadow-lg transition-all duration-200`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{platform.icon}</span>
                  <span>Share to {platform.name}</span>
                </div>
                <span className="text-sm opacity-80">→</span>
              </motion.button>
            ))}
          </div>

          {/* Partner invite */}
          {shareType === 'invite' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-purple-50 rounded-2xl border border-purple-200"
            >
              <h5 className="font-medium text-purple-900 mb-2">
                💕 Invite Your Partner
              </h5>
              <p className="text-sm text-purple-700 mb-3">
                Make sure your partner has access to plan together!
              </p>
              <button
                onClick={onInvitePartner}
                className="w-full py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
              >
                Send Partner Invite
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
```

### Testing Implementation

#### Mobile Tour Testing
```typescript
// wedme/src/__tests__/tours/mobile-tour.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { MobileTourOverlay } from '@/components/tours/MobileTourOverlay';
import { WedMeDashboardTour } from '@/components/tours/WedMeDashboardTour';

// Mock gesture handlers
jest.mock('@/lib/mobile/touch-gestures', () => ({
  useWedMeGestures: jest.fn((elementRef, callbacks) => {
    // Store callbacks for manual triggering in tests
    elementRef.current = { 
      ...elementRef.current,
      mockCallbacks: callbacks 
    };
  })
}));

describe('WedMe Mobile Tour', () => {
  const mockCouple = {
    partner1: { name: 'Emma', id: 'partner-1' },
    partner2: { name: 'James', id: 'partner-2' }
  };

  const mockSupplierContext = {
    supplierName: 'Sarah Photography',
    supplierType: 'photographer',
    supplierPhoto: '/supplier.jpg',
    connectionDate: new Date().toISOString()
  };

  const mockStep = {
    id: 'step-1',
    title: 'Welcome to WedMe',
    description: 'Your wedding planning companion',
    coupleMessage: 'Let\'s start planning your dream wedding together!',
    icon: '💕',
    targetElement: '.welcome-section',
    position: 'center' as const,
    weddingContext: {
      emotionalTone: 'excited' as const,
      timeline: 'immediate' as const,
      priority: 'essential' as const
    },
    interactions: {
      type: 'tap' as const
    }
  };

  beforeEach(() => {
    // Mock mobile environment
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
    });

    // Mock online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  describe('Mobile Tour Overlay', () => {
    it('renders mobile tour interface correctly', () => {
      render(
        <MobileTourOverlay
          currentStep={mockStep}
          stepIndex={0}
          totalSteps={5}
          coupleProgress={{
            partner1Completed: [],
            partner2Completed: [],
            sharedSteps: []
          }}
          isOffline={false}
          onStepComplete={jest.fn()}
          onSkip={jest.fn()}
          onClose={jest.fn()}
          supplierContext={mockSupplierContext}
        />
      );

      expect(screen.getByText('Welcome to WedMe')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
      expect(screen.getByText('💕')).toBeInTheDocument();
    });

    it('handles swipe gestures for navigation', async () => {
      const mockOnStepComplete = jest.fn();
      const mockOnClose = jest.fn();

      const { container } = render(
        <MobileTourOverlay
          currentStep={mockStep}
          stepIndex={1}
          totalSteps={5}
          coupleProgress={{
            partner1Completed: [0],
            partner2Completed: [],
            sharedSteps: []
          }}
          isOffline={false}
          onStepComplete={mockOnStepComplete}
          onSkip={jest.fn()}
          onClose={mockOnClose}
        />
      );

      const overlay = container.querySelector('[ref]');
      
      // Simulate swipe left (next step)
      act(() => {
        overlay.mockCallbacks.onSwipeLeft();
      });

      expect(mockOnStepComplete).toHaveBeenCalledWith(1);

      // Simulate swipe down (close)
      act(() => {
        overlay.mockCallbacks.onSwipeDown();
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('displays offline indicator when offline', () => {
      render(
        <MobileTourOverlay
          currentStep={mockStep}
          stepIndex={0}
          totalSteps={5}
          coupleProgress={{
            partner1Completed: [],
            partner2Completed: [],
            sharedSteps: []
          }}
          isOffline={true}
          onStepComplete={jest.fn()}
          onSkip={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
      expect(screen.getByText(/your progress is saved/i)).toBeInTheDocument();
    });

    it('shows couple progress indicators correctly', () => {
      render(
        <MobileTourOverlay
          currentStep={mockStep}
          stepIndex={2}
          totalSteps={5}
          coupleProgress={{
            partner1Completed: [0, 1],
            partner2Completed: [0],
            sharedSteps: [0]
          }}
          isOffline={false}
          onStepComplete={jest.fn()}
          onSkip={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(screen.getByText('💕 2 completed')).toBeInTheDocument();
      expect(screen.getByText('💕 1 completed')).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('adapts to portrait orientation', async () => {
      // Mock portrait orientation
      Object.defineProperty(screen, 'orientation', {
        value: { type: 'portrait-primary' }
      });

      render(
        <WedMeDashboardTour
          tourType="welcome"
          couple={mockCouple}
          supplierContext={mockSupplierContext}
          onComplete={jest.fn()}
          onInvitePartner={jest.fn()}
          onShareProgress={jest.fn()}
        />
      );

      await waitFor(() => {
        // Should render mobile overlay for mobile devices
        expect(document.querySelector('.fixed.inset-0')).toBeInTheDocument();
      });
    });

    it('handles touch interactions properly', async () => {
      const mockOnComplete = jest.fn();

      render(
        <MobileTourOverlay
          currentStep={mockStep}
          stepIndex={0}
          totalSteps={5}
          coupleProgress={{
            partner1Completed: [],
            partner2Completed: [],
            sharedSteps: []
          }}
          isOffline={false}
          onStepComplete={mockOnComplete}
          onSkip={jest.fn()}
          onClose={jest.fn()}
        />
      );

      const continueButton = screen.getByText(/continue/i);
      
      // Simulate touch interaction
      fireEvent.touchStart(continueButton);
      fireEvent.touchEnd(continueButton);
      fireEvent.click(continueButton);

      expect(mockOnComplete).toHaveBeenCalledWith(0);
    });
  });

  describe('Offline Functionality', () => {
    it('saves progress when offline', async () => {
      // Mock IndexedDB
      const mockDB = {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            put: jest.fn(() => ({ onsuccess: jest.fn(), onerror: jest.fn() }))
          }))
        }))
      };

      Object.defineProperty(window, 'indexedDB', {
        value: {
          open: jest.fn(() => ({
            onsuccess: jest.fn((event) => {
              event.target = { result: mockDB };
            }),
            onerror: jest.fn(),
            onupgradeneeded: jest.fn()
          }))
        }
      });

      const mockOnStepComplete = jest.fn();

      render(
        <MobileTourOverlay
          currentStep={mockStep}
          stepIndex={0}
          totalSteps={5}
          coupleProgress={{
            partner1Completed: [],
            partner2Completed: [],
            sharedSteps: []
          }}
          isOffline={true}
          onStepComplete={mockOnStepComplete}
          onSkip={jest.fn()}
          onClose={jest.fn()}
        />
      );

      const continueButton = screen.getByText(/continue/i);
      fireEvent.click(continueButton);

      // Should save progress offline
      expect(mockOnStepComplete).toHaveBeenCalled();
    });

    it('syncs progress when back online', async () => {
      const { rerender } = render(
        <MobileTourOverlay
          currentStep={mockStep}
          stepIndex={0}
          totalSteps={5}
          coupleProgress={{
            partner1Completed: [],
            partner2Completed: [],
            sharedSteps: []
          }}
          isOffline={true}
          onStepComplete={jest.fn()}
          onSkip={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // Simulate going back online
      rerender(
        <MobileTourOverlay
          currentStep={mockStep}
          stepIndex={0}
          totalSteps={5}
          coupleProgress={{
            partner1Completed: [],
            partner2Completed: [],
            sharedSteps: []
          }}
          isOffline={false}
          onStepComplete={jest.fn()}
          onSkip={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // Should no longer show offline indicator
      expect(screen.queryByText(/offline mode/i)).not.toBeInTheDocument();
    });
  });

  describe('Cross-Platform Integration', () => {
    it('syncs progress with supplier dashboard', async () => {
      const mockSyncWithSupplier = jest.fn();
      
      // Mock the sync hook
      jest.mock('@/hooks/useTourProgress', () => ({
        useTourProgress: () => ({
          progress: { hasCompletedAnyTour: false },
          updateProgress: jest.fn(),
          syncWithSupplier: mockSyncWithSupplier
        })
      }));

      render(
        <WedMeDashboardTour
          tourType="welcome"
          couple={mockCouple}
          supplierContext={mockSupplierContext}
          onComplete={jest.fn()}
          onInvitePartner={jest.fn()}
          onShareProgress={jest.fn()}
        />
      );

      // Should attempt sync when supplier is connected
      await waitFor(() => {
        expect(mockSyncWithSupplier).toHaveBeenCalledWith(
          expect.objectContaining({
            supplierName: 'Sarah Photography'
          })
        );
      });
    });
  });
});
```

This comprehensive WedMe platform implementation provides a mobile-first, couple-centric tour experience that seamlessly integrates with the WedSync supplier platform while maintaining offline capabilities and viral growth mechanics. The system prioritizes the emotional journey of newly engaged couples while ensuring perfect synchronization with their connected wedding vendors.

---

**Estimated Implementation Time**: 25-30 development days
**Team Dependencies**: Critical coordination with Team A for UI consistency, Team B for API integration, and Team C for cross-platform sync
**Critical Success Metrics**:
- Mobile completion rate >70% (higher than desktop due to emotional design)
- Cross-platform sync success rate >98%
- PWA offline functionality success rate >95%
- Viral sharing rate >25% of tour completions
- Partner invitation success rate >60%