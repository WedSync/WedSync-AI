// types/dietary-management.ts
// WS-254: Type definitions for dietary management system

export interface DietaryRequirement {
  id: string;
  guest_name: string;
  wedding_id: string;
  supplier_id: string;
  category: 'allergy' | 'diet' | 'medical' | 'preference';
  severity: 1 | 2 | 3 | 4 | 5;
  notes: string;
  verified: boolean;
  emergency_contact?: string;
  created_at: string;
  updated_at: string;
}

export interface MenuDish {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  dietary_tags: string[];
  cost: number;
  prep_time: number;
}

export interface MenuCourse {
  id: string;
  name: string;
  type: 'appetizer' | 'main' | 'dessert' | 'side';
  dishes: MenuDish[];
}

export interface MenuOption {
  id: string;
  name: string;
  description: string;
  courses: MenuCourse[];
  compliance_score: number;
  total_cost: number;
  cost_per_person: number;
  preparation_time: number;
  warnings: string[];
  ai_confidence: number;
  created_at: string;
}

export interface DietarySummary {
  wedding_id: string;
  wedding_name: string;
  total_guests: number;
  requirements: DietaryRequirement[];
  summary_stats: {
    total_requirements: number;
    by_category: {
      allergy: number;
      diet: number;
      medical: number;
      preference: number;
    };
    by_severity: {
      level_1: number;
      level_2: number;
      level_3: number;
      level_4: number;
      level_5: number;
    };
    high_severity_count: number;
    unverified_count: number;
    guests_with_requirements: number;
    most_common_requirements: Array<{
      requirement: string;
      count: number;
      category: string;
    }>;
  };
  compliance_insights: {
    risk_assessment: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    risk_factors: string[];
    recommendations: string[];
  };
}

export interface SecureValidationContext {
  user: {
    id: string;
    role: string;
    permissions: string[];
  };
  request: {
    ip: string;
    userAgent: string;
    timestamp: string;
  };
  rateLimit: {
    remaining: number;
    resetTime: string;
  };
}

export interface MenuGenerationRequest {
  wedding_id: string;
  guest_count: number;
  dietary_requirements: {
    allergies: string[];
    diets: string[];
    medical: string[];
    preferences: string[];
  };
  menu_style: 'formal' | 'buffet' | 'family-style' | 'cocktail' | 'casual';
  budget_per_person: number;
  meal_type: 'lunch' | 'dinner' | 'brunch' | 'cocktail';
  cultural_requirements: string[];
  seasonal_preferences: string[];
  venue_restrictions: string[];
  supplier_specialties: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  requestId?: string;
  meta?: {
    generated_at: string;
    data_freshness: string;
    compliance_version?: string;
  };
}
