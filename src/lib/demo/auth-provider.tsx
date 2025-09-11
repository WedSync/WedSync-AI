'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { isDemoMode, getPersonaById, getTargetAppUrl, DemoPersona, DEMO_FROZEN_TIME, SCREENSHOT_MODE } from './config';
import { 
  enableScreenshotMode, 
  disableScreenshotMode, 
  isScreenshotMode as checkScreenshotModeHelper,
  getDemoTime,
  initializeScreenshotMode
} from './screenshot-helpers';

// Demo session interface
interface DemoSession {
  persona: DemoPersona;
  isActive: boolean;
  loginTime: Date;
  screenshotMode: boolean;
  currentApp: 'wedsync' | 'wedme';
}

// Demo auth context interface
interface DemoAuthContextType {
  session: DemoSession | null;
  loginAsPersona: (personaId: string, redirectToApp?: boolean) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
  isScreenshotMode: boolean;
  toggleScreenshotMode: () => void;
  getCurrentTime: () => Date; // Returns frozen time in demo mode
  switchToApp: (appTarget: 'wedsync' | 'wedme') => void;
  isCurrentApp: (appTarget: 'wedsync' | 'wedme') => boolean;
}

// Local storage keys
const DEMO_SESSION_KEY = 'wedsync_demo_session';
const DEMO_SCREENSHOT_KEY = 'wedsync_demo_screenshot_mode';

// Create context
const DemoAuthContext = createContext<DemoAuthContextType | null>(null);

// Demo auth provider component
export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Determine current app based on URL
  const getCurrentApp = (): 'wedsync' | 'wedme' => {
    if (typeof window === 'undefined') return 'wedsync';
    
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // Check for WedMe.app indicators
    if (hostname.includes('wedme') || port === '3001') {
      return 'wedme';
    }
    
    // Default to WedSync
    return 'wedsync';
  };

  // Initialize demo mode on mount
  useEffect(() => {
    if (!isDemoMode()) {
      setMounted(true);
      return;
    }

    // Initialize screenshot helpers first
    initializeScreenshotMode();

    // Check for existing session
    const savedSession = localStorage.getItem(DEMO_SESSION_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        const persona = getPersonaById(parsed.personaId);
        if (persona) {
          setSession({
            persona,
            isActive: true,
            loginTime: new Date(parsed.loginTime),
            screenshotMode: checkScreenshotModeHelper(),
            currentApp: getCurrentApp()
          });
        }
      } catch (error) {
        console.warn('Failed to parse demo session:', error);
        localStorage.removeItem(DEMO_SESSION_KEY);
      }
    }

    // Sync screenshot mode state with helpers
    setIsScreenshotMode(checkScreenshotModeHelper());

    setMounted(true);
  }, []);

  // Login as specific persona
  const loginAsPersona = (personaId: string, redirectToApp: boolean = true): boolean => {
    if (!isDemoMode()) {
      console.warn('Cannot login to demo persona: Demo mode is not enabled');
      return false;
    }

    const persona = getPersonaById(personaId);
    if (!persona) {
      console.error('Demo persona not found:', personaId);
      return false;
    }

    const newSession: DemoSession = {
      persona,
      isActive: true,
      loginTime: new Date(),
      screenshotMode: isScreenshotMode,
      currentApp: getCurrentApp()
    };

    setSession(newSession);

    // Save to localStorage
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({
      personaId: persona.id,
      loginTime: newSession.loginTime.toISOString()
    }));

    // Cross-app navigation
    if (redirectToApp && typeof window !== 'undefined') {
      const currentApp = getCurrentApp();
      const targetApp = persona.appTarget;
      
      // If persona needs different app, redirect
      if (currentApp !== targetApp) {
        const targetUrl = getTargetAppUrl(persona);
        console.log(`Redirecting ${persona.name} to ${targetApp}: ${targetUrl}`);
        window.location.href = targetUrl;
        return true;
      }
    }

    return true;
  };

  // Logout current session
  const logout = () => {
    setSession(null);
    localStorage.removeItem(DEMO_SESSION_KEY);
    
    // Redirect to demo selector
    if (typeof window !== 'undefined') {
      window.location.href = '/demo';
    }
  };

  // Toggle screenshot mode
  const toggleScreenshotMode = () => {
    const currentMode = checkScreenshotModeHelper();
    
    if (currentMode) {
      disableScreenshotMode();
      setIsScreenshotMode(false);
    } else {
      enableScreenshotMode();
      setIsScreenshotMode(true);
    }
    
    if (session) {
      setSession({ ...session, screenshotMode: !currentMode });
    }
  };

  // Get current time (frozen in demo mode for screenshots)
  const getCurrentTime = (): Date => {
    return getDemoTime();
  };

  // Switch to different app
  const switchToApp = (appTarget: 'wedsync' | 'wedme') => {
    if (!session) return;
    
    const targetUrl = getTargetAppUrl(session.persona, 
      appTarget === 'wedme' ? '/dashboard/client' : session.persona.dashboardRoute);
    
    if (typeof window !== 'undefined') {
      window.location.href = targetUrl;
    }
  };

  // Check if current app matches target
  const isCurrentApp = (appTarget: 'wedsync' | 'wedme'): boolean => {
    return getCurrentApp() === appTarget;
  };

  // Context value
  const contextValue: DemoAuthContextType = {
    session,
    loginAsPersona,
    logout,
    isAuthenticated: !!session && session.isActive,
    isScreenshotMode,
    toggleScreenshotMode,
    getCurrentTime,
    switchToApp,
    isCurrentApp
  };

  // Don't render until mounted (prevents hydration issues)
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <DemoAuthContext.Provider value={contextValue}>
      {children}
      {isDemoMode() && session && <DemoModeBanner session={session} />}
    </DemoAuthContext.Provider>
  );
}

// Demo mode banner component
function DemoModeBanner({ session }: { session: DemoSession }) {
  const { logout, isScreenshotMode, toggleScreenshotMode, switchToApp, isCurrentApp } = useDemoAuth();

  // Hide banner in screenshot mode
  if (isScreenshotMode && SCREENSHOT_MODE.modifications.hideDebugBanners) {
    return null;
  }

  const currentApp = session.currentApp;
  const isCorrectApp = isCurrentApp(session.persona.appTarget);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 text-yellow-900 px-4 py-2 text-sm font-medium shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="font-semibold">🎭 DEMO MODE</span>
          <span>Logged in as: {session.persona.name}</span>
          <span className="text-yellow-700">({session.persona.type})</span>
          <span className="text-xs bg-yellow-300 px-2 py-1 rounded">
            {currentApp === 'wedme' ? 'WedMe.app' : 'WedSync'}
          </span>
          {!isCorrectApp && (
            <span className="text-red-700 text-xs">
              ⚠️ Wrong app for this persona
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* App switcher */}
          {!isCorrectApp && (
            <button
              onClick={() => switchToApp(session.persona.appTarget)}
              className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
            >
              Switch to {session.persona.appTarget === 'wedme' ? 'WedMe.app' : 'WedSync'}
            </button>
          )}
          
          {/* Screenshot mode */}
          <button
            onClick={toggleScreenshotMode}
            className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 rounded text-xs"
          >
            📸 {isScreenshotMode ? 'Exit' : 'Enter'} Screenshot Mode
          </button>
          
          {/* Demo selector */}
          <a
            href="/demo"
            className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs"
          >
            Switch Persona
          </a>
          
          {/* Logout */}
          <button
            onClick={logout}
            className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
          >
            Exit Demo
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook to use demo auth context
export function useDemoAuth(): DemoAuthContextType {
  const context = useContext(DemoAuthContext);
  
  if (!context) {
    // Return null context for non-demo mode
    if (!isDemoMode()) {
      return {
        session: null,
        loginAsPersona: () => false,
        logout: () => {},
        isAuthenticated: false,
        isScreenshotMode: false,
        toggleScreenshotMode: () => {},
        getCurrentTime: () => new Date(),
        switchToApp: () => {},
        isCurrentApp: () => false
      };
    }
    
    throw new Error('useDemoAuth must be used within a DemoAuthProvider');
  }
  
  return context;
}

// Higher-order component to protect demo-only routes
export function withDemoAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: { 
    redirectTo?: string;
    requiredApp?: 'wedsync' | 'wedme';
  }
) {
  return function DemoProtectedComponent(props: P) {
    const { isAuthenticated, session, isCurrentApp } = useDemoAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    // Don't render until mounted
    if (!mounted) {
      return null;
    }

    // If not in demo mode, show error
    if (!isDemoMode()) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Demo Mode Not Available</h1>
            <p className="text-gray-600">This feature is only available in demo mode.</p>
          </div>
        </div>
      );
    }

    // If not authenticated, redirect to demo selector
    if (!isAuthenticated) {
      if (typeof window !== 'undefined' && options?.redirectTo) {
        window.location.href = options.redirectTo;
        return null;
      }

      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Demo Authentication Required</h1>
            <p className="text-gray-600 mb-4">Please select a demo persona to continue.</p>
            <a 
              href="/demo" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Go to Demo Selector
            </a>
          </div>
        </div>
      );
    }

    // If wrong app, show warning but still render
    if (options?.requiredApp && session && !isCurrentApp(options.requiredApp)) {
      console.warn(`Component requires ${options.requiredApp} but user is on different app`);
    }

    return <Component {...props} />;
  };
}

// Utility function to check if current user has permission
export function hasPermission(permission: string): boolean {
  const { session } = useDemoAuth();
  
  if (!session || !isDemoMode()) {
    return false;
  }
  
  return session.persona.permissions.includes(permission);
}

// Utility function to get current persona
export function getCurrentPersona(): DemoPersona | null {
  const { session } = useDemoAuth();
  return session ? session.persona : null;
}

// Utility function to get demo user context for APIs
export function getDemoUserContext() {
  const { session } = useDemoAuth();
  
  if (!session || !isDemoMode()) {
    return null;
  }
  
  return {
    userId: `demo-${session.persona.id}`,
    personaId: session.persona.id,
    role: session.persona.role,
    type: session.persona.type,
    permissions: session.persona.permissions,
    metadata: session.persona.metadata,
    isDemo: true
  };
}