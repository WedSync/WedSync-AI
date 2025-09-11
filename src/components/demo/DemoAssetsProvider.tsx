'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { preloadDemoAssets } from '@/lib/demo/brand-assets';
import { isDemoMode } from '@/lib/demo/config';

interface DemoAssetsContextType {
  assetsLoaded: boolean;
  loadingProgress: number;
}

const DemoAssetsContext = createContext<DemoAssetsContextType>({
  assetsLoaded: false,
  loadingProgress: 0
});

interface DemoAssetsProviderProps {
  children: ReactNode;
}

export function DemoAssetsProvider({ children }: DemoAssetsProviderProps) {
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!isDemoMode()) {
      setAssetsLoaded(true);
      setLoadingProgress(100);
      return;
    }

    let isMounted = true;

    const loadAssets = async () => {
      try {
        setLoadingProgress(10);

        // Preload main logo sprite
        const logoImg = new Image();
        logoImg.src = '/demo/logos/supplier-logos.png';
        
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
        });

        if (!isMounted) return;
        setLoadingProgress(30);

        // Preload couple avatars
        const coupleAvatars = [
          '/demo/avatars/couple-sarah-michael.png',
          '/demo/avatars/couple-emma-james.png',
          '/demo/avatars/couple-alex-jordan.png'
        ];

        const avatarPromises = coupleAvatars.map(src => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve; // Don't fail for missing avatars
            img.src = src;
          });
        });

        await Promise.all(avatarPromises);
        
        if (!isMounted) return;
        setLoadingProgress(60);

        // Small delay to ensure assets are ready
        await new Promise(resolve => setTimeout(resolve, 200));

        if (!isMounted) return;
        setLoadingProgress(100);
        setAssetsLoaded(true);

        console.log('🎨 Demo assets loaded successfully');
      } catch (error) {
        console.warn('⚠️ Some demo assets failed to load:', error);
        if (isMounted) {
          setAssetsLoaded(true); // Continue anyway
          setLoadingProgress(100);
        }
      }
    };

    loadAssets();

    return () => {
      isMounted = false;
    };
  }, []);

  const contextValue: DemoAssetsContextType = {
    assetsLoaded,
    loadingProgress
  };

  return (
    <DemoAssetsContext.Provider value={contextValue}>
      {children}
    </DemoAssetsContext.Provider>
  );
}

export function useDemoAssets() {
  return useContext(DemoAssetsContext);
}

/**
 * Loading component for demo assets
 */
export function DemoAssetsLoader() {
  const { assetsLoaded, loadingProgress } = useDemoAssets();

  if (assetsLoaded) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Loading Demo Assets
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Preparing professional logos and brand assets...
          </p>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {loadingProgress}% Complete
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * HOC to ensure demo assets are loaded before rendering
 */
export function withDemoAssets<P extends object>(
  Component: React.ComponentType<P>
) {
  return function DemoAssetsWrappedComponent(props: P) {
    const { assetsLoaded } = useDemoAssets();

    if (!isDemoMode()) {
      return <Component {...props} />;
    }

    if (!assetsLoaded) {
      return <DemoAssetsLoader />;
    }

    return <Component {...props} />;
  };
}

export default DemoAssetsProvider;