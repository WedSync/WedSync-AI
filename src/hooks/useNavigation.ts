// hooks/useNavigation.ts
// WS-254: Navigation Hook for Dietary Management Components
// Compatible wrapper for navigation context

'use client';

import { useContext } from 'react';
import { NavigationContext } from '@/lib/navigation/navigationContext';

interface NavigationParams {
  weddingId?: string;
  supplierId?: string;
  [key: string]: any;
}

export function useNavigation() {
  const context = useContext(NavigationContext);

  if (!context) {
    // Fallback for when context is not available
    return {
      navigateTo: (path: string, params?: NavigationParams) => {
        console.warn('Navigation context not available, using window.location');
        if (typeof window !== 'undefined') {
          window.location.href = path;
        }
      },
      breadcrumbs: [],
    };
  }

  const { navigate, breadcrumbs } = context;

  // Enhanced navigation function with parameter support
  const navigateTo = (path: string, params?: NavigationParams) => {
    let finalPath = path;

    // Replace path parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          finalPath = finalPath.replace(`{${key}}`, String(value));
          finalPath = finalPath.replace(`:${key}`, String(value));
        }
      });

      // Add query parameters for remaining params
      const pathObj = new URL(finalPath, 'http://localhost');
      Object.entries(params).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          !finalPath.includes(`{${key}}`) &&
          !finalPath.includes(`:${key}`)
        ) {
          pathObj.searchParams.set(key, String(value));
        }
      });

      finalPath = pathObj.pathname + pathObj.search;
    }

    navigate(finalPath);
  };

  return {
    navigateTo,
    breadcrumbs: breadcrumbs.map((item) => ({
      label: item.label,
      href: item.href,
      isActive: item.isActive,
    })),
  };
}
