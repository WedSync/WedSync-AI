// Enhanced Form Builder Types for Wedding Suppliers
import {
  FormField,
  FormFieldType,
  FormFieldValidation,
  FormFieldOption,
} from './forms';

// Wedding-specific field types (extending base types)
export type WeddingFieldType =
  | FormFieldType
  | 'wedding-date'
  | 'venue'
  | 'guest-count'
  | 'budget-range'
  | 'dietary-restrictions'
  | 'timeline-event'
  | 'photo-preferences'
  | 'vendor-selection'
  | 'package-selection';

// Wedding field categories for the palette
export enum WeddingFieldCategory {
  BASIC = 'basic',
  WEDDING_DETAILS = 'wedding',
  CONTACT_INFO = 'contact',
  PREFERENCES = 'preferences',
  LOGISTICS = 'logistics',
  BUSINESS = 'business',
}

export interface WeddingFieldCategoryInfo {
  id: WeddingFieldCategory;
  name: string;
  icon: string;
  description: string;
  color: string;
}

// Enhanced form field for wedding context
export interface WeddingFormField extends FormField {
  type: WeddingFieldType;
  category: WeddingFieldCategory;
  isWeddingSpecific: boolean;
  tierRestriction?:
    | 'free'
    | 'starter'
    | 'professional'
    | 'scale'
    | 'enterprise';
  weddingContext?: {
    helpText: string;
    exampleValue: string;
    photographerTip?: string;
  };
}

// Wedding-specific field configurations
export interface WeddingDateConfig extends FormFieldValidation {
  minDate?: Date;
  maxDate?: Date;
  includeTime: boolean;
  allowCeremonyReceptionSeparate: boolean;
  venueTimezone?: string;
}

export interface VenueConfig extends FormFieldValidation {
  allowMultipleVenues: boolean;
  requireAddress: boolean;
  venueTypes: string[];
  requireCapacity: boolean;
  googlePlacesEnabled: boolean;
}

export interface GuestCountConfig extends FormFieldValidation {
  maxGuests?: number;
  includeChildren: boolean;
  includePlusOnes: boolean;
  showCategoryBreakdown: boolean;
}

export interface BudgetRangeConfig extends FormFieldValidation {
  minBudget: number;
  maxBudget: number;
  currency: 'GBP' | 'USD' | 'EUR';
  showCategoryBreakdown: boolean;
  categories?: string[];
}

// Conditional logic for wedding forms
export interface ConditionalRule {
  id: string;
  fieldId: string;
  condition: {
    operator:
      | 'equals'
      | 'not_equals'
      | 'contains'
      | 'greater_than'
      | 'less_than';
    value: any;
  };
  actions: ConditionalAction[];
  priority: number;
}

export interface ConditionalAction {
  type: 'show' | 'hide' | 'require' | 'set_value';
  targetFieldIds: string[];
  value?: any;
}

// Form Builder Canvas State
export interface FormBuilderCanvasState {
  fields: WeddingFormField[];
  selectedFieldId: string | null;
  draggedFieldId: string | null;
  isDragging: boolean;
  canvasMode: 'edit' | 'preview';
  undoStack: WeddingFormField[][];
  redoStack: WeddingFormField[][];
  autoSaveEnabled: boolean;
  lastSavedAt?: Date;
}

// Drag and drop context for @dnd-kit
export interface FormBuilderDragData {
  type: 'field' | 'palette-field';
  field?: WeddingFormField;
  fieldType?: WeddingFieldType;
  sourceIndex?: number;
}

// Form Builder Configuration
export interface FormBuilderConfig {
  organizationId: string;
  formId?: string; // undefined for new forms
  initialFields?: WeddingFormField[];
  tierLimitations: TierLimitations;
  weddingTemplates: WeddingFormTemplate[];
  onFormSaved?: (form: WeddingForm) => void;
  onFormPublished?: (form: WeddingForm) => void;
}

export interface TierLimitations {
  maxFields: number;
  maxFileUploads: number;
  allowConditionalLogic: boolean;
  allowCustomBranding: boolean;
  availableFieldTypes: WeddingFieldType[];
  advancedFields: WeddingFieldType[];
}

// Wedding form templates
export interface WeddingFormTemplate {
  id: string;
  name: string;
  description: string;
  category:
    | 'photography'
    | 'venue'
    | 'catering'
    | 'florals'
    | 'planning'
    | 'general';
  fields: WeddingFormField[];
  previewImage?: string;
  usageCount: number;
  rating: number;
  isPremium: boolean;
}

// Complete wedding form (extends base Form)
export interface WeddingForm {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  slug: string;
  fields: WeddingFormField[];
  conditionalRules: ConditionalRule[];
  settings: WeddingFormSettings;
  theme: WeddingFormTheme;
  isPublished: boolean;
  isArchived: boolean;
  isTemplate: boolean;
  weddingContext: {
    targetAudience: 'couples' | 'vendors' | 'both';
    weddingTypes: string[];
    averageCompletionTime: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WeddingFormSettings {
  submitButtonText: string;
  successMessage: string;
  redirectUrl?: string;
  notificationEmails: string[];
  autoSave: boolean;
  requireLogin: boolean;
  onePerCouple: boolean;
  captchaEnabled: boolean;
  allowPartialSubmission: boolean;
  showProgressIndicator: boolean;
  weddingSpecific: {
    requireWeddingDate: boolean;
    validateFutureDates: boolean;
    sendCoupleReminders: boolean;
    integratewithCalendar: boolean;
  };
}

export interface WeddingFormTheme {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: 'Inter' | 'Playfair Display' | 'Lora' | 'Montserrat';
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  backgroundImage?: string;
  logoUrl?: string;
  customCSS?: string;
  weddingAesthetic: 'classic' | 'modern' | 'rustic' | 'elegant' | 'boho';
}

// Form Builder Component Props
export interface FormBuilderCanvasProps {
  formId?: string;
  initialData?: Partial<WeddingForm>;
  tierLimitations: TierLimitations;
  onFormSaved?: (form: WeddingForm) => void;
  onFieldsChange?: (fields: WeddingFormField[]) => void;
  className?: string;
}

export interface FieldPaletteProps {
  availableFields: WeddingFieldType[];
  tierLimitations: TierLimitations;
  searchQuery: string;
  selectedCategory: WeddingFieldCategory | null;
  onFieldDragStart?: (fieldType: WeddingFieldType) => void;
  onFieldDragEnd?: () => void;
  className?: string;
}

export interface FieldConfigPanelProps {
  selectedField: WeddingFormField | null;
  onFieldUpdate: (field: WeddingFormField) => void;
  onFieldDelete: () => void;
  onFieldDuplicate: () => void;
  tierLimitations: TierLimitations;
  className?: string;
}

export interface FormPreviewProps {
  fields: WeddingFormField[];
  theme: WeddingFormTheme;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  showValidation?: boolean;
  interactive?: boolean;
  onPreviewInteraction?: (fieldId: string, value: any) => void;
  className?: string;
}

// Wedding-specific field templates
export const WEDDING_FIELD_TEMPLATES: Record<
  WeddingFieldType,
  Partial<WeddingFormField>
> = {
  // Basic fields (inherited)
  text: {
    type: 'text',
    category: WeddingFieldCategory.BASIC,
    isWeddingSpecific: false,
    label: 'Text Field',
    placeholder: 'Enter text...',
  },
  email: {
    type: 'email',
    category: WeddingFieldCategory.CONTACT_INFO,
    isWeddingSpecific: false,
    label: 'Email Address',
    placeholder: 'couple@example.com',
  },
  tel: {
    type: 'tel',
    category: WeddingFieldCategory.CONTACT_INFO,
    isWeddingSpecific: false,
    label: 'Phone Number',
    placeholder: '(555) 123-4567',
  },

  // Wedding-specific fields
  'wedding-date': {
    type: 'wedding-date',
    category: WeddingFieldCategory.WEDDING_DETAILS,
    isWeddingSpecific: true,
    label: 'Wedding Date',
    weddingContext: {
      helpText: 'The most important detail - when love becomes official!',
      exampleValue: 'Saturday, June 15, 2024',
      photographerTip: 'This helps you check availability and plan timeline',
    },
    validation: { required: true },
  },
  venue: {
    type: 'venue',
    category: WeddingFieldCategory.WEDDING_DETAILS,
    isWeddingSpecific: true,
    label: 'Venue Information',
    weddingContext: {
      helpText: 'Where the magic happens - ceremony and reception details',
      exampleValue: 'The Grand Estate, 123 Wedding Lane',
      photographerTip:
        'Venue info helps you scout locations and plan shot lists',
    },
  },
  'guest-count': {
    type: 'guest-count',
    category: WeddingFieldCategory.WEDDING_DETAILS,
    isWeddingSpecific: true,
    label: 'Guest Count',
    weddingContext: {
      helpText: 'How many loved ones will celebrate with you?',
      exampleValue: '150 guests (120 adults, 30 children)',
      photographerTip:
        'Guest count affects coverage needs and group photo planning',
    },
  },
  'budget-range': {
    type: 'budget-range',
    category: WeddingFieldCategory.BUSINESS,
    isWeddingSpecific: true,
    label: 'Photography Budget',
    tierRestriction: 'professional',
    weddingContext: {
      helpText: 'Your investment in capturing these precious memories',
      exampleValue: '£2,500 - £4,000',
      photographerTip: 'Helps you recommend appropriate packages and services',
    },
  },
  'dietary-restrictions': {
    type: 'dietary-restrictions',
    category: WeddingFieldCategory.PREFERENCES,
    isWeddingSpecific: true,
    label: 'Dietary Requirements',
    weddingContext: {
      helpText: 'Any dietary needs for the happy couple or VIP guests?',
      exampleValue: 'Vegetarian, Gluten-free, No shellfish',
      photographerTip:
        'Important for vendor coordination and special detail shots',
    },
  },
  'photo-preferences': {
    type: 'photo-preferences',
    category: WeddingFieldCategory.PREFERENCES,
    isWeddingSpecific: true,
    label: 'Photography Style Preferences',
    weddingContext: {
      helpText: 'What style captures your love story best?',
      exampleValue: 'Natural, candid moments with some traditional poses',
      photographerTip:
        'Essential for understanding client expectations and style match',
    },
  },
  'package-selection': {
    type: 'package-selection',
    category: WeddingFieldCategory.BUSINESS,
    isWeddingSpecific: true,
    tierRestriction: 'starter',
    label: 'Photography Package',
    weddingContext: {
      helpText: 'Choose the coverage that fits your celebration',
      exampleValue: 'Full Day Coverage (10 hours)',
      photographerTip: 'Drives pricing and timeline discussions',
    },
  },

  // Standard form fields
  textarea: {
    type: 'textarea',
    category: WeddingFieldCategory.BASIC,
    isWeddingSpecific: false,
    label: 'Long Text',
    placeholder: 'Tell us more...',
  },
  select: {
    type: 'select',
    category: WeddingFieldCategory.BASIC,
    isWeddingSpecific: false,
    label: 'Dropdown',
    options: [],
  },
  radio: {
    type: 'radio',
    category: WeddingFieldCategory.BASIC,
    isWeddingSpecific: false,
    label: 'Radio Buttons',
    options: [],
  },
  checkbox: {
    type: 'checkbox',
    category: WeddingFieldCategory.BASIC,
    isWeddingSpecific: false,
    label: 'Checkboxes',
    options: [],
  },
  date: {
    type: 'date',
    category: WeddingFieldCategory.BASIC,
    isWeddingSpecific: false,
    label: 'Date',
    placeholder: 'Select date',
  },
  time: {
    type: 'time',
    category: WeddingFieldCategory.BASIC,
    isWeddingSpecific: false,
    label: 'Time',
    placeholder: 'Select time',
  },
  file: {
    type: 'file',
    category: WeddingFieldCategory.BASIC,
    isWeddingSpecific: false,
    label: 'File Upload',
    tierRestriction: 'starter',
  },
  number: {
    type: 'number',
    category: WeddingFieldCategory.BASIC,
    isWeddingSpecific: false,
    label: 'Number',
    placeholder: '0',
  },
  heading: {
    type: 'heading',
    category: WeddingFieldCategory.BASIC,
    isWeddingSpecific: false,
    label: 'Section Heading',
  },
  paragraph: {
    type: 'paragraph',
    category: WeddingFieldCategory.BASIC,
    isWeddingSpecific: false,
    label: 'Descriptive Text',
  },
  divider: {
    type: 'divider',
    category: WeddingFieldCategory.BASIC,
    isWeddingSpecific: false,
    label: 'Section Divider',
  },
  image: {
    type: 'image',
    category: WeddingFieldCategory.BASIC,
    isWeddingSpecific: false,
    label: 'Image',
    tierRestriction: 'professional',
  },
  signature: {
    type: 'signature',
    category: WeddingFieldCategory.BUSINESS,
    isWeddingSpecific: false,
    label: 'Digital Signature',
    tierRestriction: 'professional',
  },
  'timeline-event': {
    type: 'timeline-event',
    category: WeddingFieldCategory.LOGISTICS,
    isWeddingSpecific: true,
    label: 'Timeline Event',
    tierRestriction: 'professional',
    weddingContext: {
      helpText: 'Key moments in your wedding day schedule',
      exampleValue: 'Ceremony starts at 2:00 PM',
      photographerTip: 'Critical for planning coverage and positioning',
    },
  },
  'vendor-selection': {
    type: 'vendor-selection',
    category: WeddingFieldCategory.LOGISTICS,
    isWeddingSpecific: true,
    label: 'Vendor Selection',
    tierRestriction: 'scale',
    weddingContext: {
      helpText: 'Other wedding professionals involved in your celebration',
      exampleValue: 'Florist: Bloom & Co, DJ: Wedding Beats',
      photographerTip:
        'Helps coordinate with other vendors for seamless coverage',
    },
  },
};

// Field categories configuration
export const WEDDING_FIELD_CATEGORIES: WeddingFieldCategoryInfo[] = [
  {
    id: WeddingFieldCategory.BASIC,
    name: 'Basic Fields',
    icon: '📝',
    description: 'Essential form elements for any questionnaire',
    color: 'gray',
  },
  {
    id: WeddingFieldCategory.WEDDING_DETAILS,
    name: 'Wedding Details',
    icon: '💍',
    description: 'Key information about the celebration',
    color: 'rose',
  },
  {
    id: WeddingFieldCategory.CONTACT_INFO,
    name: 'Contact Information',
    icon: '📞',
    description: 'How to reach the couple',
    color: 'blue',
  },
  {
    id: WeddingFieldCategory.PREFERENCES,
    name: 'Preferences',
    icon: '💝',
    description: 'Personal touches and special requests',
    color: 'purple',
  },
  {
    id: WeddingFieldCategory.LOGISTICS,
    name: 'Logistics',
    icon: '📅',
    description: 'Timeline and coordination details',
    color: 'green',
  },
  {
    id: WeddingFieldCategory.BUSINESS,
    name: 'Business',
    icon: '💼',
    description: 'Packages, pricing, and contracts',
    color: 'amber',
  },
];

// Default tier limitations
export const DEFAULT_TIER_LIMITATIONS: Record<string, TierLimitations> = {
  free: {
    maxFields: 10,
    maxFileUploads: 1,
    allowConditionalLogic: false,
    allowCustomBranding: false,
    availableFieldTypes: [
      'text',
      'email',
      'tel',
      'textarea',
      'date',
      'wedding-date',
    ],
    advancedFields: [],
  },
  starter: {
    maxFields: 25,
    maxFileUploads: 3,
    allowConditionalLogic: false,
    allowCustomBranding: false,
    availableFieldTypes: [
      'text',
      'email',
      'tel',
      'textarea',
      'select',
      'radio',
      'checkbox',
      'date',
      'file',
      'wedding-date',
      'venue',
      'guest-count',
    ],
    advancedFields: ['package-selection'],
  },
  professional: {
    maxFields: 50,
    maxFileUploads: 10,
    allowConditionalLogic: true,
    allowCustomBranding: true,
    availableFieldTypes: Object.keys(
      WEDDING_FIELD_TEMPLATES,
    ) as WeddingFieldType[],
    advancedFields: ['budget-range', 'timeline-event', 'image', 'signature'],
  },
  scale: {
    maxFields: 100,
    maxFileUploads: 20,
    allowConditionalLogic: true,
    allowCustomBranding: true,
    availableFieldTypes: Object.keys(
      WEDDING_FIELD_TEMPLATES,
    ) as WeddingFieldType[],
    advancedFields: Object.keys(WEDDING_FIELD_TEMPLATES) as WeddingFieldType[],
  },
  enterprise: {
    maxFields: -1, // unlimited
    maxFileUploads: -1, // unlimited
    allowConditionalLogic: true,
    allowCustomBranding: true,
    availableFieldTypes: Object.keys(
      WEDDING_FIELD_TEMPLATES,
    ) as WeddingFieldType[],
    advancedFields: Object.keys(WEDDING_FIELD_TEMPLATES) as WeddingFieldType[],
  },
};
