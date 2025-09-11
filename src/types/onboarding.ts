export interface OnboardingStep {
  id: string;
  title: string;
  text: string;
  attachTo?: {
    element: string;
    on: 'top' | 'bottom' | 'left' | 'right';
  };
  buttons?: OnboardingButton[];
  canClickTarget?: boolean;
  scrollTo?: boolean;
  modalOverlayOpeningPadding?: number;
}

export interface OnboardingButton {
  text: string;
  action: 'next' | 'back' | 'skip' | 'complete';
  classes?: string;
}

export interface OnboardingState {
  isActive: boolean;
  currentStep: number;
  isCompleted: boolean;
  isSkipped: boolean;
  hasSeenTour: boolean;
}

export interface HelpItem {
  id: string;
  title: string;
  content: string;
  category: 'form-builder' | 'dashboard' | 'payments' | 'general';
  keywords: string[];
}

export interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  category: 'navigation' | 'forms' | 'general';
}

export interface OnboardingProgress {
  profileCompleted: boolean;
  firstFormCreated: boolean;
  paymentConfigured: boolean;
  firstClientAdded: boolean;
}
