/**
 * Demo Mode Banner Component
 * 
 * Displays a persistent banner when demo mode is active.
 * Only shows in development with NEXT_PUBLIC_DEMO_MODE=true.
 */

'use client';

import { useState, useEffect } from 'react';
import { isDemoMode, DEMO_BANNER } from '@/lib/demo/config';
import { demoAuth } from '@/lib/demo/auth';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface DemoBannerProps {
  className?: string;
  showPersonaInfo?: boolean;
}

export default function DemoBanner({ className = '', showPersonaInfo = true }: DemoBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentPersona, setCurrentPersona] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Only show in demo mode
    if (!isDemoMode()) {
      setIsVisible(false);
      return;
    }

    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem('demo-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    // Subscribe to auth state changes to show current persona
    if (showPersonaInfo) {
      const { data } = demoAuth.onAuthStateChange((session) => {
        if (session?.user?.user_metadata?.name) {
          setCurrentPersona(session.user.user_metadata.name);
        } else {
          setCurrentPersona(null);
        }
      });

      return () => {
        data.subscription.unsubscribe();
      };
    }
  }, [showPersonaInfo]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    sessionStorage.setItem('demo-banner-dismissed', 'true');
  };

  const handleSignOut = async () => {
    await demoAuth.signOut();
    window.location.href = '/demo';
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <div 
      className={`relative px-4 py-2 text-sm font-medium border-b ${className}`}
      style={{
        backgroundColor: DEMO_BANNER.bgColor,
        color: DEMO_BANNER.textColor,
        borderColor: DEMO_BANNER.borderColor
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-2">
            <span>🎭</span>
            <span>{DEMO_BANNER.message}</span>
          </span>
          
          {showPersonaInfo && currentPersona && (
            <span className="flex items-center space-x-2 px-2 py-1 bg-white/20 rounded-full text-xs">
              <span>👤</span>
              <span>Signed in as: <strong>{currentPersona}</strong></span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {currentPersona && (
            <button
              onClick={handleSignOut}
              className="text-xs px-2 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
            >
              Switch Persona
            </button>
          )}
          
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Dismiss demo banner"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Simplified version for minimal display
export function DemoBannerMinimal() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(isDemoMode());
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="px-2 py-1 text-xs text-center"
      style={{
        backgroundColor: DEMO_BANNER.bgColor,
        color: DEMO_BANNER.textColor
      }}
    >
      🎭 Demo Mode
    </div>
  );
}

// Hook for checking demo mode in components
export function useDemoMode() {
  const [isDemo, setIsDemo] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);

  useEffect(() => {
    setIsDemo(isDemoMode());
    
    if (isDemoMode()) {
      const { data } = demoAuth.onAuthStateChange((session) => {
        setCurrentSession(session);
      });

      return () => {
        data.subscription.unsubscribe();
      };
    }
  }, []);

  return {
    isDemoMode: isDemo,
    currentSession,
    signOut: () => demoAuth.signOut(),
    hasPermission: (permission: string) => demoAuth.hasPermission(permission),
    getUserRole: () => demoAuth.getUserRole(),
    getUserType: () => demoAuth.getUserType(),
    isAdmin: () => demoAuth.isAdmin(),
    isSupplier: () => demoAuth.isSupplier(),
    isCouple: () => demoAuth.isCouple()
  };
}
