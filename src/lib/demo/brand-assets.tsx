'use client';

import React from 'react';
import { DEMO_PERSONAS, DEMO_COUPLES } from './config';

/**
 * Brand Assets Manager for WedSync Demo Mode
 * Manages logos, avatars, and portfolio images for all demo personas
 */

// Logo mapping based on the professional logo sheet provided
export const DEMO_LOGOS: Record<string, {
  primary: string;
  icon?: string;
  position: { row: number; col: number }; // Position in the logo grid
  colors: {
    primary: string;
    secondary?: string;
    background: string;
  };
}> = {
  'photographer-everlight': {
    primary: '/demo/logos/supplier-logos.png',
    position: { row: 0, col: 0 },
    colors: {
      primary: '#FF6B9A',
      secondary: '#FFC46B',
      background: '#FFF8F8'
    }
  },
  'videographer-silver-lining': {
    primary: '/demo/logos/supplier-logos.png',
    position: { row: 0, col: 1 },
    colors: {
      primary: '#2D2D2D',
      secondary: '#6B7280',
      background: '#F9FAFB'
    }
  },
  'dj-sunset-sounds': {
    primary: '/demo/logos/supplier-logos.png',
    position: { row: 0, col: 2 },
    colors: {
      primary: '#F59E0B',
      secondary: '#EF4444',
      background: '#FEF3E2'
    }
  },
  'florist-petal-stem': {
    primary: '/demo/logos/supplier-logos.png',
    position: { row: 1, col: 0 },
    colors: {
      primary: '#EC4899',
      secondary: '#22C55E',
      background: '#FDF2F8'
    }
  },
  'caterer-taste-thyme': {
    primary: '/demo/logos/supplier-logos.png',
    position: { row: 1, col: 1 },
    colors: {
      primary: '#059669',
      secondary: '#0D9488',
      background: '#F0FDF4'
    }
  },
  'musicians-velvet-strings': {
    primary: '/demo/logos/supplier-logos.png',
    position: { row: 1, col: 2 },
    colors: {
      primary: '#7C3AED',
      secondary: '#DB2777',
      background: '#FAF5FF'
    }
  },
  'venue-old-barn': {
    primary: '/demo/logos/supplier-logos.png',
    position: { row: 2, col: 0 },
    colors: {
      primary: '#8B4513',
      secondary: '#D2691E',
      background: '#FEFAF5'
    }
  },
  'hair-glow-hair': {
    primary: '/demo/logos/supplier-logos.png',
    position: { row: 2, col: 1 },
    colors: {
      primary: '#F59E0B',
      secondary: '#FCD34D',
      background: '#FFFBEB'
    }
  },
  'planner-plan-poise': {
    primary: '/demo/logos/supplier-logos.png',
    position: { row: 2, col: 2 },
    colors: {
      primary: '#0F766E',
      secondary: '#14B8A6',
      background: '#F0FDFA'
    }
  }
};

// Avatar mapping for couples
export const DEMO_AVATARS: Record<string, string> = {
  'couple-sarah-michael': '/demo/avatars/couple-sarah-michael.png',
  'couple-emma-james': '/demo/avatars/couple-sarah-michael.png', // Using same photo for demo
  'couple-alex-jordan': '/demo/avatars/couple-sarah-michael.png', // Using same photo for demo
};

// Portfolio images (placeholder structure - can be expanded)
export const DEMO_PORTFOLIO: Record<string, string[]> = {
  'photographer-everlight': [
    '/demo/portfolio/everlight-1.jpg',
    '/demo/portfolio/everlight-2.jpg',
    '/demo/portfolio/everlight-3.jpg',
  ],
  'videographer-silver-lining': [
    '/demo/portfolio/silver-lining-1.jpg',
    '/demo/portfolio/silver-lining-2.jpg',
  ],
  'florist-petal-stem': [
    '/demo/portfolio/petal-stem-1.jpg',
    '/demo/portfolio/petal-stem-2.jpg',
    '/demo/portfolio/petal-stem-3.jpg',
  ]
};

/**
 * Get logo URL for a specific supplier
 */
export function getSupplierLogo(supplierId: string): string {
  const logoInfo = DEMO_LOGOS[supplierId];
  return logoInfo?.primary || '/demo/logos/supplier-logos.png';
}

/**
 * Get logo position for CSS sprite positioning
 */
export function getLogoPosition(supplierId: string): { backgroundPosition: string } {
  const logoInfo = DEMO_LOGOS[supplierId];
  if (!logoInfo) {
    return { backgroundPosition: '0 0' };
  }

  const { row, col } = logoInfo.position;
  const spriteSize = 33.33; // 3x3 grid = 33.33% per section
  
  return {
    backgroundPosition: `${col * spriteSize}% ${row * spriteSize}%`
  };
}

/**
 * Get brand colors for a supplier
 */
export function getSupplierColors(supplierId: string) {
  const logoInfo = DEMO_LOGOS[supplierId];
  const persona = DEMO_PERSONAS.find(p => p.id === supplierId);
  
  return {
    primary: logoInfo?.colors.primary || persona?.colors.primary || '#6B7280',
    secondary: logoInfo?.colors.secondary || persona?.colors.secondary || '#9CA3AF',
    background: logoInfo?.colors.background || persona?.colors.background || '#F9FAFB'
  };
}

/**
 * Get avatar URL for a couple
 */
export function getCoupleAvatar(coupleId: string): string {
  return DEMO_AVATARS[coupleId] || DEMO_AVATARS['couple-sarah-michael'];
}

/**
 * Get portfolio images for a supplier
 */
export function getSupplierPortfolio(supplierId: string): string[] {
  return DEMO_PORTFOLIO[supplierId] || [];
}

/**
 * Generate CSS for logo sprites
 */
export function generateLogoCSS(): string {
  return `
    .demo-logo-sprite {
      background-image: url('/demo/logos/supplier-logos.png');
      background-size: 300% 300%; /* 3x3 grid */
      background-repeat: no-repeat;
      width: 120px;
      height: 120px;
    }

    ${Object.entries(DEMO_LOGOS).map(([supplierId, logoInfo]) => {
      const { row, col } = logoInfo.position;
      const xPos = col * 33.33;
      const yPos = row * 33.33;
      
      return `.demo-logo-${supplierId} {
        background-position: ${xPos}% ${yPos}%;
      }`;
    }).join('\n')}
  `;
}

/**
 * Preload all demo assets
 */
export function preloadDemoAssets(): void {
  if (typeof window === 'undefined') return;

  // Preload main logo sprite
  const logoImg = new Image();
  logoImg.src = '/demo/logos/supplier-logos.png';

  // Preload couple avatars
  Object.values(DEMO_AVATARS).forEach(avatarUrl => {
    const avatarImg = new Image();
    avatarImg.src = avatarUrl;
  });

  // Preload portfolio images
  Object.values(DEMO_PORTFOLIO).flat().forEach(portfolioUrl => {
    const portfolioImg = new Image();
    portfolioImg.src = portfolioUrl;
  });
}

/**
 * React component for displaying supplier logos with proper sprites
 */
interface SupplierLogoProps {
  supplierId: string;
  size?: number;
  className?: string;
  variant?: 'full' | 'icon';
}

export function SupplierLogoBg({ 
  supplierId, 
  size = 60, 
  className = '',
  variant = 'icon'
}: SupplierLogoProps) {
  const position = getLogoPosition(supplierId);
  const colors = getSupplierColors(supplierId);
  
  return (
    <div
      className={`demo-logo-sprite rounded-lg shadow-sm ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: colors.background,
        ...position,
        backgroundSize: '300% 300%'
      }}
      title={DEMO_PERSONAS.find(p => p.id === supplierId)?.name || 'Supplier'}
    />
  );
}

/**
 * React component for displaying couple avatars
 */
interface CoupleAvatarProps {
  coupleId: string;
  size?: number;
  className?: string;
}

export function CoupleAvatarBg({ 
  coupleId, 
  size = 60, 
  className = '' 
}: CoupleAvatarProps) {
  const avatarUrl = getCoupleAvatar(coupleId);
  const couple = DEMO_COUPLES.find(c => c.id === coupleId);
  
  return (
    <div
      className={`rounded-full bg-cover bg-center shadow-sm ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url('${avatarUrl}')`
      }}
      title={couple?.names || 'Couple'}
    />
  );
}

export default {
  getSupplierLogo,
  getLogoPosition,
  getSupplierColors,
  getCoupleAvatar,
  getSupplierPortfolio,
  SupplierLogoBg,
  CoupleAvatarBg,
  preloadDemoAssets
};