'use client';

import React from 'react';
import { DEMO_PERSONAS } from './config';

/**
 * SVG Logo Generator for Demo Suppliers
 * Creates consistent, professional logos for all demo personas
 */

interface LogoProps {
  personaId: string;
  size?: number;
  variant?: 'full' | 'icon' | 'wordmark';
  className?: string;
}

const LogoComponents = {
  // Photography - Everlight Photography
  'photographer-everlight': ({ size = 120, variant = 'full' }: { size?: number; variant?: string }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="everlight-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B9A" />
          <stop offset="100%" stopColor="#FFC46B" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="55" fill="url(#everlight-gradient)" />
      <circle cx="60" cy="60" r="35" fill="white" />
      <circle cx="60" cy="60" r="25" fill="#2E2E2E" />
      <circle cx="60" cy="60" r="15" fill="white" />
      <rect x="45" y="35" width="30" height="8" rx="2" fill="#2E2E2E" />
      <circle cx="75" cy="45" r="3" fill="#FF6B9A" />
      {variant === 'full' && (
        <text x="60" y="105" textAnchor="middle" fontSize="12" fontFamily="serif" fontWeight="600" fill="#2E2E2E">
          Everlight
        </text>
      )}
    </svg>
  ),

  // Videography - Silver Lining Films
  'videographer-silver-lining': ({ size = 120, variant = 'full' }: { size?: number; variant?: string }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="silver-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="100" height="100" rx="15" fill="url(#silver-gradient)" />
      <rect x="30" y="40" width="60" height="40" rx="5" fill="white" />
      <polygon points="45,50 45,70 65,60" fill="#6366F1" />
      <circle cx="80" cy="35" r="8" fill="white" />
      <rect x="20" y="85" width="80" height="4" rx="2" fill="white" opacity="0.8" />
      {variant === 'full' && (
        <text x="60" y="105" textAnchor="middle" fontSize="10" fontFamily="sans-serif" fontWeight="500" fill="#6366F1">
          Silver Lining
        </text>
      )}
    </svg>
  ),

  // DJ - Sunset Sounds
  'dj-sunset-sounds': ({ size = 120, variant = 'full' }: { size?: number; variant?: string }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sunset-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="55" fill="url(#sunset-gradient)" />
      <path d="M20 60 Q60 20 100 60 Q60 100 20 60 Z" fill="white" opacity="0.9" />
      <circle cx="60" cy="60" r="8" fill="#EF4444" />
      <rect x="40" y="55" width="40" height="10" rx="5" fill="#EF4444" />
      <circle cx="30" cy="45" r="4" fill="white" opacity="0.8" />
      <circle cx="90" cy="75" r="4" fill="white" opacity="0.8" />
      {variant === 'full' && (
        <text x="60" y="105" textAnchor="middle" fontSize="11" fontFamily="sans-serif" fontWeight="600" fill="#EF4444">
          Sunset Sounds
        </text>
      )}
    </svg>
  ),

  // Florist - Petal & Stem
  'florist-petal-stem': ({ size = 120, variant = 'full' }: { size?: number; variant?: string }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="petal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="55" fill="#F8FAF7" stroke="url(#petal-gradient)" strokeWidth="3" />
      <path d="M60 40 Q70 50 60 60 Q50 50 60 40 Z" fill="#EC4899" />
      <path d="M70 50 Q80 60 70 70 Q60 60 70 50 Z" fill="#F97316" />
      <path d="M60 70 Q70 80 60 90 Q50 80 60 70 Z" fill="#EC4899" />
      <path d="M50 50 Q40 60 50 70 Q60 60 50 50 Z" fill="#F97316" />
      <rect x="59" y="55" width="2" height="25" fill="#22C55E" />
      <path d="M45 45 Q55 40 60 55" fill="none" stroke="#22C55E" strokeWidth="1.5" />
      {variant === 'full' && (
        <text x="60" y="105" textAnchor="middle" fontSize="11" fontFamily="serif" fontWeight="500" fill="#059669">
          Petal & Stem
        </text>
      )}
    </svg>
  ),

  // Catering - Taste & Thyme
  'caterer-taste-thyme': ({ size = 120, variant = 'full' }: { size?: number; variant?: string }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="taste-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="55" fill="url(#taste-gradient)" />
      <ellipse cx="60" cy="45" rx="25" ry="15" fill="white" />
      <ellipse cx="60" cy="65" rx="30" ry="20" fill="white" opacity="0.9" />
      <path d="M50 55 Q60 50 70 55 Q60 60 50 55 Z" fill="#059669" />
      <circle cx="50" cy="70" r="3" fill="#F59E0B" />
      <circle cx="70" cy="70" r="3" fill="#EF4444" />
      <rect x="55" y="30" width="10" height="8" rx="2" fill="white" opacity="0.8" />
      {variant === 'full' && (
        <text x="60" y="105" textAnchor="middle" fontSize="10" fontFamily="serif" fontWeight="500" fill="#059669">
          Taste & Thyme
        </text>
      )}
    </svg>
  ),

  // Musicians - Velvet Strings
  'musicians-velvet-strings': ({ size = 120, variant = 'full' }: { size?: number; variant?: string }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="velvet-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#DB2777" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="55" fill="url(#velvet-gradient)" />
      <path d="M40 35 Q60 30 80 35 Q75 50 60 55 Q45 50 40 35 Z" fill="white" />
      <rect x="58" y="55" width="4" height="40" rx="2" fill="white" />
      <ellipse cx="60" cy="95" rx="8" ry="4" fill="white" />
      <line x1="45" y1="45" x2="75" y2="45" stroke="#7C3AED" strokeWidth="1" />
      <line x1="45" y1="50" x2="75" y2="50" stroke="#7C3AED" strokeWidth="1" />
      <line x1="45" y1="55" x2="75" y2="55" stroke="#7C3AED" strokeWidth="1" />
      {variant === 'full' && (
        <text x="60" y="115" textAnchor="middle" fontSize="10" fontFamily="serif" fontStyle="italic" fill="#7C3AED">
          Velvet Strings
        </text>
      )}
    </svg>
  ),

  // Default fallback logo
  'default': ({ size = 120, variant = 'full' }: { size?: number; variant?: string }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="55" fill="#E5E7EB" />
      <text x="60" y="70" textAnchor="middle" fontSize="48" fill="#6B7280">W</text>
    </svg>
  )
};

/**
 * Dynamic logo component that generates appropriate logo for persona
 */
export function DemoLogo({ personaId, size = 120, variant = 'full', className = '' }: LogoProps) {
  const persona = DEMO_PERSONAS.find(p => p.id === personaId);
  
  if (!persona) {
    const DefaultLogo = LogoComponents.default;
    return <DefaultLogo size={size} variant={variant} />;
  }

  const LogoComponent = LogoComponents[personaId as keyof typeof LogoComponents] || LogoComponents.default;
  
  return (
    <div className={`inline-block ${className}`}>
      <LogoComponent size={size} variant={variant} />
    </div>
  );
}

/**
 * Generate and save all logos as SVG files
 */
export function generateAllLogos() {
  const logos: Record<string, string> = {};
  
  DEMO_PERSONAS.forEach(persona => {
    if (persona.type === 'supplier') {
      const LogoComponent = LogoComponents[persona.id as keyof typeof LogoComponents] || LogoComponents.default;
      
      // Create SVG string (this would typically be done server-side)
      const svgString = `<?xml version="1.0" encoding="UTF-8"?>
        <!-- ${persona.name} Logo -->
        ${React.renderToStaticMarkup(<LogoComponent size={120} variant="full" />)}`;
      
      logos[persona.id] = svgString;
    }
  });
  
  return logos;
}

/**
 * Get logo URL for a persona (assumes logos are saved in public/demo/logos/)
 */
export function getLogoUrl(personaId: string, variant: 'full' | 'icon' | 'wordmark' = 'full'): string {
  return `/demo/logos/${personaId}-${variant}.svg`;
}

/**
 * Logo display component with fallback
 */
export function SupplierLogo({ 
  supplierId, 
  size = 60, 
  className = '',
  showFallback = true 
}: { 
  supplierId: string; 
  size?: number; 
  className?: string; 
  showFallback?: boolean;
}) {
  const persona = DEMO_PERSONAS.find(p => p.id === supplierId);
  
  if (!persona) {
    return showFallback ? (
      <div className={`w-${size} h-${size} bg-gray-200 rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-lg font-bold">
          {supplierId.charAt(0).toUpperCase()}
        </span>
      </div>
    ) : null;
  }

  return (
    <div 
      className={`w-${size} h-${size} flex items-center justify-center bg-white rounded-lg shadow-sm ${className}`}
      style={{ backgroundColor: persona.colors.background }}
    >
      <DemoLogo personaId={supplierId} size={size * 0.8} variant="icon" />
    </div>
  );
}

export default DemoLogo;