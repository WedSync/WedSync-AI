'use client';

import React, { useEffect, useRef } from 'react';
import Shepherd from 'shepherd.js';
import { OnboardingStep } from '@/types/onboarding';

interface OnboardingTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onStepChange?: (stepIndex: number) => void;
}

export function OnboardingTour({
  isActive,
  onComplete,
  onSkip,
  onStepChange,
}: OnboardingTourProps) {
  const tourRef = useRef<Shepherd.Tour | null>(null);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to WedSync!',
      text: `
        <p>Welcome to WedSync! We'll show you around in just a few minutes.</p>
        <p>This tour will help you understand the key features and get you started quickly.</p>
      `,
      buttons: [
        {
          text: 'Skip Tour',
          action: 'skip',
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Start Tour',
          action: 'next',
          classes: 'shepherd-button-primary',
        },
      ],
    },
    {
      id: 'dashboard',
      title: 'Your Dashboard',
      text: `
        <p>This is your main dashboard where you can see:</p>
        <ul>
          <li>Recent form submissions</li>
          <li>Upcoming client deadlines</li>
          <li>Quick actions to create forms and add clients</li>
        </ul>
      `,
      attachTo: {
        element: '[data-tour="dashboard"]',
        on: 'bottom',
      },
      buttons: [
        {
          text: 'Back',
          action: 'back',
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Next',
          action: 'next',
          classes: 'shepherd-button-primary',
        },
      ],
    },
    {
      id: 'form-builder',
      title: 'Form Builder',
      text: `
        <p>The Form Builder is where the magic happens:</p>
        <ul>
          <li>Drag and drop form fields</li>
          <li>Customize validation rules</li>
          <li>Preview your forms in real-time</li>
          <li>Share forms with clients instantly</li>
        </ul>
      `,
      attachTo: {
        element: '[data-tour="form-builder"]',
        on: 'right',
      },
      buttons: [
        {
          text: 'Back',
          action: 'back',
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Next',
          action: 'next',
          classes: 'shepherd-button-primary',
        },
      ],
    },
    {
      id: 'payments',
      title: 'Payment Integration',
      text: `
        <p>Streamline your payment process:</p>
        <ul>
          <li>Secure Stripe integration</li>
          <li>Automated invoice generation</li>
          <li>Payment tracking and reminders</li>
          <li>Multiple payment plans support</li>
        </ul>
      `,
      attachTo: {
        element: '[data-tour="payments"]',
        on: 'right',
      },
      buttons: [
        {
          text: 'Back',
          action: 'back',
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Complete Tour',
          action: 'complete',
          classes: 'shepherd-button-primary',
        },
      ],
    },
  ];

  useEffect(() => {
    if (!isActive) {
      if (tourRef.current) {
        tourRef.current.complete();
        tourRef.current = null;
      }
      return;
    }

    // Initialize Shepherd tour
    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shepherd-theme-wedsync',
        scrollTo: { behavior: 'smooth', block: 'center' },
        modalOverlayOpeningPadding: 8,
        canClickTarget: false,
      },
    });

    // Add steps to tour
    steps.forEach((step, index) => {
      tour.addStep({
        title: step.title,
        text: step.text,
        attachTo: step.attachTo,
        buttons: step.buttons?.map((button) => ({
          text: button.text,
          classes: button.classes,
          action() {
            switch (button.action) {
              case 'next':
                tour.next();
                break;
              case 'back':
                tour.back();
                break;
              case 'skip':
                tour.cancel();
                onSkip();
                break;
              case 'complete':
                tour.complete();
                onComplete();
                break;
            }
          },
        })),
        id: step.id,
        when: {
          show: () => {
            onStepChange?.(index);
          },
        },
      });
    });

    // Handle tour events
    tour.on('complete', onComplete);
    tour.on('cancel', onSkip);

    tourRef.current = tour;
    tour.start();

    return () => {
      if (tour) {
        tour.complete();
      }
    };
  }, [isActive, onComplete, onSkip, onStepChange]);

  return null;
}
