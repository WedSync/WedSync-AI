/**
 * WS-152: Dietary Requirements Management Types
 * CRITICAL: This module handles life-threatening medical information
 * All data must be validated, preserved, and clearly communicated
 */

export enum DietarySeverity {
  LIFE_THREATENING = 'LIFE_THREATENING', // Anaphylaxis risk
  SEVERE = 'SEVERE', // Serious medical condition
  MODERATE = 'MODERATE', // Significant discomfort
  MILD = 'MILD', // Minor preference
  PREFERENCE = 'PREFERENCE', // Non-medical preference
}

export enum DietaryType {
  ALLERGY = 'ALLERGY',
  INTOLERANCE = 'INTOLERANCE',
  MEDICAL = 'MEDICAL',
  RELIGIOUS = 'RELIGIOUS',
  ETHICAL = 'ETHICAL',
  PREFERENCE = 'PREFERENCE',
}

export enum AllergenType {
  // Top 14 allergens (EU/UK regulation)
  PEANUTS = 'PEANUTS',
  TREE_NUTS = 'TREE_NUTS',
  MILK = 'MILK',
  EGGS = 'EGGS',
  WHEAT = 'WHEAT',
  SOY = 'SOY',
  FISH = 'FISH',
  SHELLFISH = 'SHELLFISH',
  SESAME = 'SESAME',
  CELERY = 'CELERY',
  MUSTARD = 'MUSTARD',
  LUPIN = 'LUPIN',
  MOLLUSCS = 'MOLLUSCS',
  SULPHITES = 'SULPHITES',
  // Additional common allergens
  GLUTEN = 'GLUTEN',
  LACTOSE = 'LACTOSE',
  // Other
  OTHER = 'OTHER',
}

export interface DietaryRequirement {
  id: string;
  guest_id: string;
  type: DietaryType;
  severity: DietarySeverity;
  allergen?: AllergenType;
  description: string;
  medical_notes?: string;
  emergency_medication?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  cross_contamination_risk: boolean;
  kitchen_alert_required: boolean;
  created_at: Date;
  updated_at: Date;
  verified_by?: string;
  verified_at?: Date;
}

export interface DietaryMatrix {
  couple_id: string;
  event_date: Date;
  guest_count: number;
  critical_alerts: CriticalAlert[];
  dietary_summary: DietarySummary;
  allergen_matrix: AllergenMatrix;
  table_assignments?: TableDietaryInfo[];
  kitchen_instructions: KitchenInstructions;
  emergency_contacts: EmergencyContact[];
  generated_at: Date;
}

export interface CriticalAlert {
  guest_id: string;
  guest_name: string;
  table_number?: number;
  allergen: AllergenType;
  severity: DietarySeverity;
  description: string;
  medical_notes?: string;
  emergency_medication?: string;
  cross_contamination_risk: boolean;
  emergency_contact?: EmergencyContact;
}

export interface DietarySummary {
  total_dietary_requirements: number;
  life_threatening_count: number;
  severe_count: number;
  moderate_count: number;
  by_type: Record<DietaryType, number>;
  by_allergen: Record<AllergenType, number>;
  cross_contamination_risks: number;
}

export interface AllergenMatrix {
  allergens: AllergenType[];
  affected_guests: Record<AllergenType, GuestAllergenInfo[]>;
  cross_contamination_map: CrossContaminationMap;
}

export interface GuestAllergenInfo {
  guest_id: string;
  guest_name: string;
  table_number?: number;
  severity: DietarySeverity;
  requires_epipen?: boolean;
  notes?: string;
}

export interface CrossContaminationMap {
  high_risk_combinations: AllergenCombination[];
  shared_equipment_concerns: string[];
  preparation_warnings: string[];
}

export interface AllergenCombination {
  allergen1: AllergenType;
  allergen2: AllergenType;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  affected_guests: string[];
  mitigation_steps: string[];
}

export interface TableDietaryInfo {
  table_number: number;
  table_name?: string;
  guest_count: number;
  dietary_requirements: DietaryRequirement[];
  critical_alerts: boolean;
  allergen_summary: AllergenType[];
}

export interface KitchenInstructions {
  preparation_zones: PreparationZone[];
  equipment_requirements: string[];
  cross_contamination_protocols: string[];
  service_sequence: ServiceInstruction[];
  emergency_procedures: string[];
}

export interface PreparationZone {
  zone_name: string;
  allergen_free: AllergenType[];
  dedicated_equipment: string[];
  staff_requirements: string[];
}

export interface ServiceInstruction {
  sequence: number;
  table_number: number;
  special_instructions: string[];
  critical_guests: string[];
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
  guest_name?: string;
  guest_id?: string;
}

export interface CatererExport {
  event_info: {
    couple_names: string;
    event_date: string;
    venue: string;
    guest_count: number;
  };
  critical_medical_alerts: CriticalAlert[];
  dietary_matrix: DietaryMatrix;
  kitchen_cards: KitchenCard[];
  allergen_guide: AllergenGuide;
  emergency_procedures: EmergencyProcedures;
  contact_sheet: EmergencyContact[];
  generated_at: Date;
  version: string;
}

export interface KitchenCard {
  card_number: number;
  table_number: number;
  guest_name: string;
  dietary_requirements: string[];
  allergens: AllergenType[];
  severity_indicator: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  special_instructions: string[];
  plate_marking?: string;
}

export interface AllergenGuide {
  legend: Record<AllergenType, AllergenInfo>;
  visual_indicators: Record<DietarySeverity, VisualIndicator>;
  cross_reference_table: CrossReferenceTable;
}

export interface AllergenInfo {
  code: string;
  name: string;
  common_sources: string[];
  hidden_sources: string[];
  cross_contamination_risks: string[];
}

export interface VisualIndicator {
  color_code: string;
  symbol: string;
  priority: number;
  description: string;
}

export interface CrossReferenceTable {
  by_table: Record<number, AllergenType[]>;
  by_allergen: Record<AllergenType, number[]>;
  high_risk_tables: number[];
}

export interface EmergencyProcedures {
  anaphylaxis_protocol: string[];
  emergency_services: {
    number: string;
    venue_address: string;
    access_instructions: string;
  };
  medical_kit_locations: string[];
  trained_staff: string[];
  evacuation_plan: string;
}

// Request/Response types for API
export interface CreateDietaryRequirementRequest {
  guest_id: string;
  type: DietaryType;
  severity: DietarySeverity;
  allergen?: AllergenType;
  description: string;
  medical_notes?: string;
  emergency_medication?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  cross_contamination_risk: boolean;
}

export interface UpdateDietaryRequirementRequest {
  type?: DietaryType;
  severity?: DietarySeverity;
  allergen?: AllergenType;
  description?: string;
  medical_notes?: string;
  emergency_medication?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  cross_contamination_risk?: boolean;
  verified_by?: string;
}

export interface DietaryMatrixRequest {
  include_table_assignments?: boolean;
  severity_filter?: DietarySeverity[];
  allergen_filter?: AllergenType[];
}

export interface CatererExportRequest {
  format: 'PDF' | 'EXCEL' | 'JSON';
  include_photos?: boolean;
  language?: string;
  kitchen_card_format?: 'STANDARD' | 'DETAILED' | 'COMPACT';
}

export interface DietaryAlertResponse {
  couple_id: string;
  alerts: CriticalAlert[];
  total_count: number;
  critical_count: number;
  last_updated: Date;
}
