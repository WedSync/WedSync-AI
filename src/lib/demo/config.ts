/**
 * WedSync Demo Mode Configuration
 *
 * This file contains all demo personas, branding, and configuration.
 * Only available when NEXT_PUBLIC_DEMO_MODE=true in development.
 */

// Environment guard - prevent demo mode in production
export const isDemoMode = () => {
  if (typeof window === 'undefined') {
    // Server-side check
    return process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  }
  // Client-side check
  return process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
};

// Production safety check
export const validateDemoMode = () => {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    throw new Error('Demo mode cannot be enabled in production environment');
  }
};

// Demo persona types
export type PersonaType = 'couple' | 'supplier' | 'admin';
export type SupplierRole = 'photographer' | 'videographer' | 'dj' | 'florist' | 'caterer' | 'musician' | 'venue' | 'hair' | 'makeup' | 'planner';

export interface DemoPersona {
  id: string;
  type: PersonaType;
  role?: SupplierRole;
  name: string;
  company?: string;
  email: string;
  appTarget: 'wedsync' | 'wedme';
  dashboardRoute: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  blurb: string;
  permissions: string[];
  metadata?: {
    vendorType?: string;
    yearsExperience?: number;
    specialties?: string[];
    location?: string;
  };
}

// Demo personas with proper branding
export const DEMO_PERSONAS: DemoPersona[] = [
  // Couples
  {
    id: 'couple-sarah-michael',
    type: 'couple',
    name: 'Sarah & Michael',
    email: 'sarah.michael@demo.wedme.app',
    appTarget: 'wedme',
    dashboardRoute: '/client/dashboard',
    colors: {
      primary: '#FF6B9A',
      secondary: '#FFC46B',
      accent: '#F8F8F8',
      background: '#FDFBF9'
    },
    blurb: 'Planning their dream wedding for June 2024 at The Old Barn',
    permissions: ['view_timeline', 'manage_guests', 'view_suppliers'],
    metadata: {
      location: 'London, UK'
    }
  },
  {
    id: 'couple-emma-james',
    type: 'couple',
    name: 'Emma & James',
    email: 'emma.james@demo.wedme.app',
    appTarget: 'wedme',
    dashboardRoute: '/client/dashboard',
    colors: {
      primary: '#2F6F73',
      secondary: '#D9B99B',
      accent: '#FDFDFD',
      background: '#F7F2E8'
    },
    blurb: 'Intimate autumn wedding with rustic elegance theme',
    permissions: ['view_timeline', 'manage_guests', 'view_suppliers'],
    metadata: {
      location: 'Edinburgh, UK'
    }
  },

  // Suppliers - Photographer
  {
    id: 'photographer-everlight',
    type: 'supplier',
    role: 'photographer',
    name: 'Emma Wilson',
    company: 'Everlight Photography',
    email: 'hello@everlightphoto.demo',
    appTarget: 'wedsync',
    dashboardRoute: '/dashboard',
    colors: {
      primary: '#FF6B9A',
      secondary: '#FFC46B',
      accent: '#2E2E2E',
      background: '#F8F8F8'
    },
    blurb: 'Storytelling wedding photography with a glowing, romantic touch.',
    permissions: ['view_clients', 'manage_bookings', 'upload_galleries'],
    metadata: {
      vendorType: 'photographer',
      yearsExperience: 8,
      specialties: ['Wedding Photography', 'Engagement Sessions', 'Bridal Portraits'],
      location: 'London, UK'
    }
  },
  // Videographer
  {
    id: 'videographer-silver-lining',
    type: 'supplier',
    role: 'videographer',
    name: 'Marcus Chen',
    company: 'Silver Lining Films',
    email: 'hello@silverlinings.demo',
    appTarget: 'wedsync',
    dashboardRoute: '/dashboard',
    colors: {
      primary: '#C0C0C0',
      secondary: '#1E2A38',
      accent: '#FAFAFA',
      background: '#F8F8F8'
    },
    blurb: 'Cinematic films that turn wedding memories into timeless silver reels.',
    permissions: ['view_clients', 'manage_bookings', 'upload_videos'],
    metadata: {
      vendorType: 'videographer',
      yearsExperience: 6,
      specialties: ['Cinematic Films', 'Highlight Reels', 'Same Day Edits'],
      location: 'Manchester, UK'
    }
  },
  // DJ
  {
    id: 'dj-sunset-sounds',
    type: 'supplier',
    role: 'dj',
    name: 'Alex Rodriguez',
    company: 'Sunset Sounds DJs',
    email: 'hello@sunsetsounds.demo',
    appTarget: 'wedsync',
    dashboardRoute: '/dashboard',
    colors: {
      primary: '#FF7A00',
      secondary: '#5A2D82',
      accent: '#101010',
      background: '#F8F8F8'
    },
    blurb: 'High-energy DJs blending music and lighting to keep the dance floor alive.',
    permissions: ['view_clients', 'manage_bookings', 'manage_playlists'],
    metadata: {
      vendorType: 'dj',
      yearsExperience: 10,
      specialties: ['Wedding Reception', 'Ceremony Music', 'Lighting'],
      location: 'Birmingham, UK'
    }
  },
  // Florist
  {
    id: 'florist-petal-stem',
    type: 'supplier',
    role: 'florist',
    name: 'Sophie Green',
    company: 'Petal & Stem',
    email: 'hello@petalstem.demo',
    appTarget: 'wedsync',
    dashboardRoute: '/dashboard',
    colors: {
      primary: '#ECA3A3',
      secondary: '#5C9E68',
      accent: '#FDFBF9',
      background: '#F8F8F8'
    },
    blurb: 'Bespoke blooms and installations that bring your love story to life.',
    permissions: ['view_clients', 'manage_bookings', 'manage_designs'],
    metadata: {
      vendorType: 'florist',
      yearsExperience: 12,
      specialties: ['Bridal Bouquets', 'Ceremony Arrangements', 'Reception Centerpieces'],
      location: 'Bath, UK'
    }
  },
  // Caterer
  {
    id: 'caterer-taste-thyme',
    type: 'supplier',
    role: 'caterer',
    name: 'James Mitchell',
    company: 'Taste & Thyme',
    email: 'hello@tastethyme.demo',
    appTarget: 'wedsync',
    dashboardRoute: '/dashboard',
    colors: {
      primary: '#6C8C5E',
      secondary: '#999999',
      accent: '#FFF8E7',
      background: '#F8F8F8'
    },
    blurb: 'Seasonal menus crafted with flair, flavour, and a sprinkle of thyme.',
    permissions: ['view_clients', 'manage_bookings', 'manage_menus'],
    metadata: {
      vendorType: 'caterer',
      yearsExperience: 15,
      specialties: ['Wedding Breakfast', 'Canapés', 'Dietary Requirements'],
      location: 'Oxford, UK'
    }
  },
  // Musician
  {
    id: 'musician-velvet-strings',
    type: 'supplier',
    role: 'musician',
    name: 'Isabella Thompson',
    company: 'Velvet Strings',
    email: 'hello@velvetstrings.demo',
    appTarget: 'wedsync',
    dashboardRoute: '/dashboard',
    colors: {
      primary: '#A12C3A',
      secondary: '#E7C675',
      accent: '#202020',
      background: '#F8F8F8'
    },
    blurb: 'Elegant live strings, weaving romance into every note.',
    permissions: ['view_clients', 'manage_bookings', 'manage_repertoire'],
    metadata: {
      vendorType: 'musician',
      yearsExperience: 20,
      specialties: ['String Quartet', 'Ceremony Music', 'Cocktail Hour'],
      location: 'Cambridge, UK'
    }
  },
  // Venue
  {
    id: 'venue-old-barn',
    type: 'supplier',
    role: 'venue',
    name: 'Robert Davies',
    company: 'The Old Barn',
    email: 'hello@theoldbarn.demo',
    appTarget: 'wedsync',
    dashboardRoute: '/dashboard',
    colors: {
      primary: '#6A4E42',
      secondary: '#FFD87A',
      accent: '#F7F2E8',
      background: '#F8F8F8'
    },
    blurb: 'Rustic charm meets modern elegance in our countryside setting.',
    permissions: ['view_clients', 'manage_bookings', 'manage_availability'],
    metadata: {
      vendorType: 'venue',
      yearsExperience: 25,
      specialties: ['Rustic Weddings', 'Outdoor Ceremonies', 'Reception Venue'],
      location: 'Cotswolds, UK'
    }
  },
  // Hair Stylist
  {
    id: 'hair-glow',
    type: 'supplier',
    role: 'hair',
    name: 'Chloe Parker',
    company: 'Glow Hair',
    email: 'hello@glowhair.demo',
    appTarget: 'wedsync',
    dashboardRoute: '/dashboard',
    colors: {
      primary: '#FFD580',
      secondary: '#E3A6A1',
      accent: '#3B2A2A',
      background: '#F8F8F8'
    },
    blurb: 'Bridal hair artistry with a radiant, flawless finish.',
    permissions: ['view_clients', 'manage_bookings', 'manage_appointments'],
    metadata: {
      vendorType: 'hair',
      yearsExperience: 7,
      specialties: ['Bridal Hair', 'Hair Trials', 'Bridal Party Styling'],
      location: 'Brighton, UK'
    }
  },
  // Makeup Artist
  {
    id: 'makeup-bloom',
    type: 'supplier',
    role: 'makeup',
    name: 'Zara Ahmed',
    company: 'Bloom Makeup',
    email: 'hello@bloommakeup.demo',
    appTarget: 'wedsync',
    dashboardRoute: '/dashboard',
    colors: {
      primary: '#F2A5C0',
      secondary: '#EED9C4',
      accent: '#6E6259',
      background: '#F8F8F8'
    },
    blurb: 'Natural, glowing beauty that blooms on your wedding day.',
    permissions: ['view_clients', 'manage_bookings', 'manage_appointments'],
    metadata: {
      vendorType: 'makeup',
      yearsExperience: 9,
      specialties: ['Bridal Makeup', 'Makeup Trials', 'Natural Glow'],
      location: 'Bristol, UK'
    }
  },
  // Wedding Planner
  {
    id: 'planner-plan-poise',
    type: 'supplier',
    role: 'planner',
    name: 'Victoria Sterling',
    company: 'Plan & Poise',
    email: 'hello@planpoise.demo',
    appTarget: 'wedsync',
    dashboardRoute: '/dashboard',
    colors: {
      primary: '#2F6F73',
      secondary: '#D9B99B',
      accent: '#FDFDFD',
      background: '#F8F8F8'
    },
    blurb: 'Seamless planning, poised execution — every detail handled with grace.',
    permissions: ['view_clients', 'manage_bookings', 'manage_timeline', 'coordinate_vendors'],
    metadata: {
      vendorType: 'planner',
      yearsExperience: 18,
      specialties: ['Full Planning', 'Day Coordination', 'Vendor Management'],
      location: 'London, UK'
    }
  },

  // Admin
  {
    id: 'admin-wedsync',
    type: 'admin',
    name: 'WedSync Admin',
    company: 'WedSync',
    email: 'admin@wedsync.demo',
    appTarget: 'wedsync',
    dashboardRoute: '/admin/dashboard',
    colors: {
      primary: '#1E2A38',
      secondary: '#C0C0C0',
      accent: '#FAFAFA',
      background: '#F8F8F8'
    },
    blurb: 'Master admin with full platform oversight and impersonation capabilities.',
    permissions: ['admin_all', 'impersonate_users', 'view_analytics', 'manage_platform'],
    metadata: {
      location: 'London, UK'
    }
  }
];

// Helper functions
export const getPersonaById = (id: string): DemoPersona | undefined => {
  return DEMO_PERSONAS.find(persona => persona.id === id);
};

export const getPersonasByType = (type: PersonaType): DemoPersona[] => {
  return DEMO_PERSONAS.filter(persona => persona.type === type);
};

export const getSuppliersByRole = (role: SupplierRole): DemoPersona[] => {
  return DEMO_PERSONAS.filter(persona => persona.type === 'supplier' && persona.role === role);
};

// Demo couples data
export const DEMO_COUPLES = [
  {
    id: 'couple-sarah-michael',
    names: ['Sarah Johnson', 'Michael Thompson'],
    weddingDate: '2024-06-15',
    venue: 'The Old Barn',
    guestCount: 120,
    budget: 25000,
    theme: 'Rustic Romance'
  },
  {
    id: 'couple-emma-james',
    names: ['Emma Clarke', 'James Wilson'],
    weddingDate: '2024-09-22',
    venue: 'Edinburgh Castle',
    guestCount: 80,
    budget: 18000,
    theme: 'Autumn Elegance'
  }
];

// Frozen demo time for consistent screenshots
export const DEMO_FROZEN_TIME = new Date('2024-01-15T10:30:00Z');

// Demo mode banner component data
export const DEMO_BANNER = {
  message: '🎭 Demo Mode Active - Sample data only',
  bgColor: '#FEF3C7',
  textColor: '#92400E',
  borderColor: '#F59E0B'
};