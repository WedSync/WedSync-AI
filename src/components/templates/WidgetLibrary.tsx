'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  Grid3x3,
  List,
  Plus,
  Star,
  Download,
  Upload,
  Settings,
  Eye,
  Heart,
  Calendar,
  Users,
  DollarSign,
  MessageCircle,
  CheckSquare,
  Camera,
  FileText,
  MapPin,
  Clock,
  Music2,
  Cloud,
  Sparkles,
  LayoutDashboard,
  Layers,
  Bell,
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  Zap,
  Shield,
  Briefcase,
  Gift,
  Coffee,
  Utensils,
  Flower,
  Cake,
  Car,
  Home,
  Phone,
  Mail,
  Globe,
  Share2,
  BookOpen,
  Video,
  Mic,
  Headphones,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Input } from '@/components/ui/input-untitled';
import { Card } from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Widget type definitions
export interface WidgetConfig {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  subcategory?: string;
  icon: string;
  default_size: {
    width: number;
    height: number;
    min_width?: number;
    min_height?: number;
    max_width?: number;
    max_height?: number;
  };
  settings_schema: WidgetSettingField[];
  default_settings: Record<string, any>;
  tier_restrictions: (
    | 'free'
    | 'starter'
    | 'professional'
    | 'scale'
    | 'enterprise'
  )[];
  is_premium: boolean;
  is_custom: boolean;
  vendor_types: string[];
  wedding_styles: string[];
  preview_data?: any;
  dependencies?: string[];
  installation_count?: number;
  rating?: number;
  reviews?: number;
  created_by?: {
    name: string;
    avatar?: string;
    verified: boolean;
  };
  created_at: string;
  updated_at: string;
}

export type WidgetCategory =
  | 'essential'
  | 'communication'
  | 'planning'
  | 'financial'
  | 'visual'
  | 'analytics'
  | 'automation'
  | 'integration'
  | 'social'
  | 'custom';

export interface WidgetSettingField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'color' | 'image' | 'json';
  required: boolean;
  default_value: any;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  description?: string;
  conditional?: {
    field: string;
    value: any;
    operator: 'equals' | 'not_equals' | 'contains';
  };
}

export interface WidgetInstance {
  id: string;
  widget_id: string;
  title: string;
  settings: Record<string, any>;
  position: { x: number; y: number };
  size: { width: number; height: number };
  is_active: boolean;
  is_locked: boolean;
  z_index: number;
}

// Icon mapping for widgets
const WIDGET_ICONS = {
  heart: Heart,
  calendar: Calendar,
  users: Users,
  'dollar-sign': DollarSign,
  'pound-sterling': DollarSign,
  'message-circle': MessageCircle,
  'check-square': CheckSquare,
  camera: Camera,
  image: Camera,
  'file-text': FileText,
  'map-pin': MapPin,
  clock: Clock,
  music2: Music2,
  cloud: Cloud,
  sparkles: Sparkles,
  'layout-dashboard': LayoutDashboard,
  layers: Layers,
  bell: Bell,
  'bar-chart-3': BarChart3,
  'pie-chart': PieChart,
  'trending-up': TrendingUp,
  activity: Activity,
  zap: Zap,
  shield: Shield,
  briefcase: Briefcase,
  gift: Gift,
  coffee: Coffee,
  utensils: Utensils,
  flower: Flower,
  cake: Cake,
  car: Car,
  home: Home,
  phone: Phone,
  mail: Mail,
  globe: Globe,
  share2: Share2,
  'book-open': BookOpen,
  video: Video,
  mic: Mic,
  headphones: Headphones,
  tag: Tag,
} as const;

// Mock widget library data - in production this would come from API
const WIDGET_LIBRARY: WidgetConfig[] = [
  {
    id: 'welcome-message',
    name: 'Welcome Message',
    description: 'Personalized welcome message with couple names and countdown',
    category: 'essential',
    subcategory: 'header',
    icon: 'heart',
    default_size: { width: 12, height: 3, min_height: 2, max_height: 6 },
    settings_schema: [
      {
        key: 'message',
        label: 'Welcome Message',
        type: 'text',
        required: true,
        default_value: 'Welcome to your wedding dashboard!',
      },
      {
        key: 'show_countdown',
        label: 'Show Countdown',
        type: 'boolean',
        required: false,
        default_value: true,
      },
      {
        key: 'background_color',
        label: 'Background Color',
        type: 'color',
        required: false,
        default_value: '#f8fafc',
      },
      {
        key: 'text_color',
        label: 'Text Color',
        type: 'color',
        required: false,
        default_value: '#1f2937',
      },
    ],
    default_settings: {
      message: 'Welcome to your wedding dashboard!',
      show_countdown: true,
      background_color: '#f8fafc',
      text_color: '#1f2937',
    },
    tier_restrictions: [
      'free',
      'starter',
      'professional',
      'scale',
      'enterprise',
    ],
    is_premium: false,
    is_custom: false,
    vendor_types: ['photographer', 'planner', 'venue', 'florist', 'caterer'],
    wedding_styles: [
      'traditional',
      'modern',
      'rustic',
      'luxury',
      'destination',
    ],
    installation_count: 15420,
    rating: 4.8,
    reviews: 234,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-12-20T14:22:00Z',
  },
  {
    id: 'wedding-timeline',
    name: 'Wedding Timeline',
    description:
      'Interactive timeline with milestones, tasks, and vendor coordination',
    category: 'planning',
    subcategory: 'timeline',
    icon: 'calendar',
    default_size: {
      width: 12,
      height: 6,
      min_width: 8,
      min_height: 4,
      max_height: 10,
    },
    settings_schema: [
      {
        key: 'view_type',
        label: 'View Type',
        type: 'select',
        required: true,
        default_value: 'gantt',
        options: [
          { value: 'gantt', label: 'Gantt Chart' },
          { value: 'list', label: 'List View' },
          { value: 'calendar', label: 'Calendar View' },
        ],
      },
      {
        key: 'show_milestones',
        label: 'Show Milestones',
        type: 'boolean',
        required: false,
        default_value: true,
      },
      {
        key: 'color_coding',
        label: 'Color Coding',
        type: 'boolean',
        required: false,
        default_value: true,
      },
      {
        key: 'allow_editing',
        label: 'Allow Client Editing',
        type: 'boolean',
        required: false,
        default_value: false,
      },
    ],
    default_settings: {
      view_type: 'gantt',
      show_milestones: true,
      color_coding: true,
      allow_editing: false,
    },
    tier_restrictions: ['starter', 'professional', 'scale', 'enterprise'],
    is_premium: false,
    is_custom: false,
    vendor_types: ['planner', 'coordinator', 'photographer', 'venue'],
    wedding_styles: ['traditional', 'modern', 'luxury', 'destination'],
    installation_count: 8932,
    rating: 4.9,
    reviews: 156,
    created_at: '2024-02-10T09:15:00Z',
    updated_at: '2024-12-18T11:45:00Z',
  },
  {
    id: 'budget-tracker',
    name: 'Smart Budget Tracker',
    description:
      'AI-powered budget tracking with vendor integration and alerts',
    category: 'financial',
    subcategory: 'budgeting',
    icon: 'pound-sterling',
    default_size: {
      width: 8,
      height: 5,
      min_width: 6,
      min_height: 4,
      max_width: 12,
    },
    settings_schema: [
      {
        key: 'currency',
        label: 'Currency',
        type: 'select',
        required: true,
        default_value: 'GBP',
        options: [
          { value: 'GBP', label: '£ British Pound' },
          { value: 'USD', label: '$ US Dollar' },
          { value: 'EUR', label: '€ Euro' },
        ],
      },
      {
        key: 'show_charts',
        label: 'Show Charts',
        type: 'boolean',
        required: false,
        default_value: true,
      },
      {
        key: 'budget_alerts',
        label: 'Budget Alerts',
        type: 'boolean',
        required: false,
        default_value: true,
      },
      {
        key: 'vendor_integration',
        label: 'Vendor Integration',
        type: 'boolean',
        required: false,
        default_value: true,
      },
    ],
    default_settings: {
      currency: 'GBP',
      show_charts: true,
      budget_alerts: true,
      vendor_integration: true,
    },
    tier_restrictions: ['professional', 'scale', 'enterprise'],
    is_premium: true,
    is_custom: false,
    vendor_types: ['planner', 'coordinator'],
    wedding_styles: ['luxury', 'traditional', 'modern'],
    installation_count: 5624,
    rating: 4.7,
    reviews: 89,
    created_by: {
      name: 'WedSync Team',
      verified: true,
    },
    created_at: '2024-03-22T16:20:00Z',
    updated_at: '2024-12-15T08:30:00Z',
  },
  {
    id: 'vendor-showcase',
    name: 'Vendor Showcase',
    description:
      'Beautiful portfolio display with ratings and booking integration',
    category: 'visual',
    subcategory: 'portfolio',
    icon: 'users',
    default_size: { width: 12, height: 8, min_width: 8, min_height: 6 },
    settings_schema: [
      {
        key: 'layout',
        label: 'Layout Style',
        type: 'select',
        required: true,
        default_value: 'grid',
        options: [
          { value: 'grid', label: 'Grid Layout' },
          { value: 'carousel', label: 'Carousel' },
          { value: 'masonry', label: 'Masonry' },
        ],
      },
      {
        key: 'show_ratings',
        label: 'Show Ratings',
        type: 'boolean',
        required: false,
        default_value: true,
      },
      {
        key: 'show_pricing',
        label: 'Show Pricing',
        type: 'boolean',
        required: false,
        default_value: false,
      },
      {
        key: 'enable_booking',
        label: 'Enable Booking',
        type: 'boolean',
        required: false,
        default_value: true,
      },
    ],
    default_settings: {
      layout: 'grid',
      show_ratings: true,
      show_pricing: false,
      enable_booking: true,
    },
    tier_restrictions: ['starter', 'professional', 'scale', 'enterprise'],
    is_premium: false,
    is_custom: false,
    vendor_types: [
      'photographer',
      'planner',
      'venue',
      'florist',
      'caterer',
      'band',
    ],
    wedding_styles: [
      'traditional',
      'modern',
      'rustic',
      'luxury',
      'destination',
    ],
    installation_count: 12847,
    rating: 4.6,
    reviews: 203,
    created_at: '2024-01-28T14:10:00Z',
    updated_at: '2024-12-10T17:55:00Z',
  },
  {
    id: 'guest-manager',
    name: 'Guest Management Pro',
    description:
      'Complete guest list management with RSVP tracking and dietary preferences',
    category: 'planning',
    subcategory: 'guests',
    icon: 'users',
    default_size: { width: 10, height: 6, min_width: 8, min_height: 5 },
    settings_schema: [
      {
        key: 'show_dietary',
        label: 'Show Dietary Preferences',
        type: 'boolean',
        required: false,
        default_value: true,
      },
      {
        key: 'show_plus_ones',
        label: 'Show Plus Ones',
        type: 'boolean',
        required: false,
        default_value: true,
      },
      {
        key: 'rsvp_deadline',
        label: 'RSVP Deadline',
        type: 'text',
        required: false,
        default_value: '',
      },
      {
        key: 'export_formats',
        label: 'Export Formats',
        type: 'select',
        required: false,
        default_value: 'csv',
        options: [
          { value: 'csv', label: 'CSV' },
          { value: 'pdf', label: 'PDF' },
          { value: 'excel', label: 'Excel' },
        ],
      },
    ],
    default_settings: {
      show_dietary: true,
      show_plus_ones: true,
      rsvp_deadline: '',
      export_formats: 'csv',
    },
    tier_restrictions: ['professional', 'scale', 'enterprise'],
    is_premium: true,
    is_custom: false,
    vendor_types: ['planner', 'coordinator', 'venue', 'caterer'],
    wedding_styles: ['traditional', 'modern', 'luxury'],
    installation_count: 7234,
    rating: 4.8,
    reviews: 124,
    created_at: '2024-02-14T11:25:00Z',
    updated_at: '2024-12-12T13:40:00Z',
  },
  {
    id: 'task-kanban',
    name: 'Task Kanban Board',
    description:
      'Kanban-style task management with vendor assignments and deadlines',
    category: 'planning',
    subcategory: 'tasks',
    icon: 'check-square',
    default_size: {
      width: 8,
      height: 6,
      min_width: 6,
      min_height: 5,
      max_width: 12,
    },
    settings_schema: [
      {
        key: 'board_columns',
        label: 'Board Columns',
        type: 'json',
        required: true,
        default_value: '["To Do", "In Progress", "Review", "Done"]',
      },
      {
        key: 'assign_to_vendors',
        label: 'Assign to Vendors',
        type: 'boolean',
        required: false,
        default_value: true,
      },
      {
        key: 'deadline_alerts',
        label: 'Deadline Alerts',
        type: 'boolean',
        required: false,
        default_value: true,
      },
      {
        key: 'priority_levels',
        label: 'Priority Levels',
        type: 'boolean',
        required: false,
        default_value: true,
      },
    ],
    default_settings: {
      board_columns: '["To Do", "In Progress", "Review", "Done"]',
      assign_to_vendors: true,
      deadline_alerts: true,
      priority_levels: true,
    },
    tier_restrictions: ['starter', 'professional', 'scale', 'enterprise'],
    is_premium: false,
    is_custom: false,
    vendor_types: ['planner', 'coordinator', 'photographer'],
    wedding_styles: ['traditional', 'modern', 'destination'],
    installation_count: 9876,
    rating: 4.7,
    reviews: 167,
    created_at: '2024-03-05T15:35:00Z',
    updated_at: '2024-12-08T10:20:00Z',
  },
  {
    id: 'photo-gallery',
    name: 'Interactive Photo Gallery',
    description:
      'Stunning photo gallery with categories, lightbox, and client uploads',
    category: 'visual',
    subcategory: 'gallery',
    icon: 'camera',
    default_size: {
      width: 8,
      height: 6,
      min_width: 6,
      min_height: 4,
      max_width: 12,
      max_height: 10,
    },
    settings_schema: [
      {
        key: 'layout_style',
        label: 'Layout Style',
        type: 'select',
        required: true,
        default_value: 'masonry',
        options: [
          { value: 'masonry', label: 'Masonry' },
          { value: 'grid', label: 'Grid' },
          { value: 'carousel', label: 'Carousel' },
        ],
      },
      {
        key: 'categories',
        label: 'Categories',
        type: 'json',
        required: false,
        default_value: '["Venue", "Flowers", "Catering", "Inspiration"]',
      },
      {
        key: 'allow_uploads',
        label: 'Allow Client Uploads',
        type: 'boolean',
        required: false,
        default_value: true,
      },
      {
        key: 'watermark',
        label: 'Watermark',
        type: 'boolean',
        required: false,
        default_value: false,
      },
    ],
    default_settings: {
      layout_style: 'masonry',
      categories: '["Venue", "Flowers", "Catering", "Inspiration"]',
      allow_uploads: true,
      watermark: false,
    },
    tier_restrictions: ['starter', 'professional', 'scale', 'enterprise'],
    is_premium: false,
    is_custom: false,
    vendor_types: ['photographer', 'planner', 'venue', 'florist'],
    wedding_styles: [
      'traditional',
      'modern',
      'rustic',
      'luxury',
      'destination',
    ],
    installation_count: 11234,
    rating: 4.9,
    reviews: 189,
    created_at: '2024-01-20T12:45:00Z',
    updated_at: '2024-12-05T16:15:00Z',
  },
  {
    id: 'ai-chatbot',
    name: 'AI Wedding Assistant',
    description:
      'Intelligent chatbot for instant client support and FAQ answers',
    category: 'automation',
    subcategory: 'ai',
    icon: 'sparkles',
    default_size: {
      width: 6,
      height: 4,
      min_width: 4,
      min_height: 3,
      max_width: 8,
      max_height: 6,
    },
    settings_schema: [
      {
        key: 'bot_name',
        label: 'Bot Name',
        type: 'text',
        required: true,
        default_value: 'Wedding Assistant',
      },
      {
        key: 'greeting_message',
        label: 'Greeting Message',
        type: 'text',
        required: false,
        default_value: 'Hi! How can I help with your wedding planning today?',
      },
      {
        key: 'knowledge_base',
        label: 'Knowledge Base',
        type: 'select',
        required: true,
        default_value: 'wedding_general',
        options: [
          { value: 'wedding_general', label: 'General Wedding' },
          { value: 'photography', label: 'Photography Focus' },
          { value: 'venue', label: 'Venue Focus' },
          { value: 'catering', label: 'Catering Focus' },
        ],
      },
      {
        key: 'escalation_enabled',
        label: 'Enable Escalation',
        type: 'boolean',
        required: false,
        default_value: true,
      },
    ],
    default_settings: {
      bot_name: 'Wedding Assistant',
      greeting_message: 'Hi! How can I help with your wedding planning today?',
      knowledge_base: 'wedding_general',
      escalation_enabled: true,
    },
    tier_restrictions: ['professional', 'scale', 'enterprise'],
    is_premium: true,
    is_custom: false,
    vendor_types: ['photographer', 'planner', 'venue', 'florist', 'caterer'],
    wedding_styles: ['traditional', 'modern', 'luxury', 'destination'],
    installation_count: 3456,
    rating: 4.5,
    reviews: 67,
    created_by: {
      name: 'WedSync AI Team',
      verified: true,
    },
    created_at: '2024-04-18T09:30:00Z',
    updated_at: '2024-12-01T14:25:00Z',
  },
];

interface WidgetLibraryProps {
  onWidgetSelect?: (widget: WidgetConfig) => void;
  onWidgetInstall?: (widget: WidgetConfig) => Promise<void>;
  selectedWidgets?: string[];
  userTier?: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
  vendorType?: string;
  weddingStyle?: string;
  className?: string;
}

export default function WidgetLibrary({
  onWidgetSelect,
  onWidgetInstall,
  selectedWidgets = [],
  userTier = 'starter',
  vendorType = '',
  weddingStyle = '',
  className,
}: WidgetLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest'>(
    'popular',
  );
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);

  // Filter and sort widgets
  const filteredWidgets = useMemo(() => {
    let filtered = WIDGET_LIBRARY.filter((widget) => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !widget.name.toLowerCase().includes(term) &&
          !widget.description.toLowerCase().includes(term) &&
          !widget.category.toLowerCase().includes(term)
        ) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && widget.category !== selectedCategory) {
        return false;
      }

      // Tier filter
      if (!widget.tier_restrictions.includes(userTier)) {
        return false;
      }

      // Vendor type filter
      if (vendorType && !widget.vendor_types.includes(vendorType)) {
        return false;
      }

      // Wedding style filter
      if (weddingStyle && !widget.wedding_styles.includes(weddingStyle)) {
        return false;
      }

      // Premium filter
      if (showPremiumOnly && !widget.is_premium) {
        return false;
      }

      return true;
    });

    // Sort widgets
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.installation_count || 0) - (a.installation_count || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'newest':
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    searchTerm,
    selectedCategory,
    userTier,
    vendorType,
    weddingStyle,
    showPremiumOnly,
    sortBy,
  ]);

  // Get widget categories with counts
  const categories = useMemo(() => {
    const counts = WIDGET_LIBRARY.reduce(
      (acc, widget) => {
        acc[widget.category] = (acc[widget.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return [
      { value: 'all', label: 'All Widgets', count: WIDGET_LIBRARY.length },
      { value: 'essential', label: 'Essential', count: counts.essential || 0 },
      { value: 'planning', label: 'Planning', count: counts.planning || 0 },
      { value: 'financial', label: 'Financial', count: counts.financial || 0 },
      { value: 'visual', label: 'Visual', count: counts.visual || 0 },
      {
        value: 'communication',
        label: 'Communication',
        count: counts.communication || 0,
      },
      { value: 'analytics', label: 'Analytics', count: counts.analytics || 0 },
      {
        value: 'automation',
        label: 'Automation',
        count: counts.automation || 0,
      },
      {
        value: 'integration',
        label: 'Integration',
        count: counts.integration || 0,
      },
      { value: 'social', label: 'Social', count: counts.social || 0 },
      { value: 'custom', label: 'Custom', count: counts.custom || 0 },
    ];
  }, []);

  const handleWidgetInstall = async (widget: WidgetConfig) => {
    if (installing || !onWidgetInstall) return;

    setInstalling(widget.id);
    try {
      await onWidgetInstall(widget);
    } finally {
      setInstalling(null);
    }
  };

  const isWidgetSelected = (widgetId: string) =>
    selectedWidgets.includes(widgetId);
  const isWidgetInstalling = (widgetId: string) => installing === widgetId;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Widget Library</h2>
          <p className="text-gray-600 mt-1">
            Customize your client dashboards with powerful, ready-to-use widgets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">{filteredWidgets.length} widgets</Badge>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <Input
            placeholder="Search widgets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300 transition-colors"
        >
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label} ({category.count})
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300 transition-colors"
        >
          <option value="popular">Most Popular</option>
          <option value="rating">Highest Rated</option>
          <option value="newest">Newest First</option>
        </select>

        {/* View Mode */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'px-3 py-1 rounded-md transition-colors',
              viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200',
            )}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'px-3 py-1 rounded-md transition-colors',
              viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200',
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Additional Filters */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Switch
            checked={showPremiumOnly}
            onCheckedChange={setShowPremiumOnly}
            size="sm"
          />
          <span>Premium widgets only</span>
        </div>
      </div>

      {/* Widget Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredWidgets.map((widget) => {
            const IconComponent =
              WIDGET_ICONS[widget.icon as keyof typeof WIDGET_ICONS] ||
              LayoutDashboard;
            const isSelected = isWidgetSelected(widget.id);
            const isInstalling = isWidgetInstalling(widget.id);

            return (
              <Card
                key={widget.id}
                className={cn(
                  'p-6 cursor-pointer transition-all hover:shadow-lg group',
                  isSelected && 'ring-2 ring-primary-500 bg-primary-50',
                )}
                onClick={() => onWidgetSelect?.(widget)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <IconComponent className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {widget.name}
                      </h3>
                      {widget.is_premium && (
                        <Badge variant="warning" className="text-xs mt-1">
                          Premium
                        </Badge>
                      )}
                    </div>
                  </div>

                  {widget.rating && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{widget.rating}</span>
                    </div>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {widget.description}
                </p>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {widget.category}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {widget.default_size.width}×{widget.default_size.height}
                    </span>
                  </div>

                  {widget.installation_count && (
                    <span className="text-xs text-gray-500">
                      {widget.installation_count.toLocaleString()} installs
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={isSelected ? 'secondary' : 'primary'}
                    size="sm"
                    className="flex-1"
                    leftIcon={
                      isSelected ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isSelected && onWidgetInstall) {
                        handleWidgetInstall(widget);
                      } else if (onWidgetSelect) {
                        onWidgetSelect(widget);
                      }
                    }}
                    loading={isInstalling}
                  >
                    {isSelected ? 'View' : 'Add'}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Settings className="h-4 w-4" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onWidgetSelect?.(widget);
                    }}
                  />
                </div>

                {widget.created_by && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {widget.created_by.name.charAt(0)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-600">
                      {widget.created_by.name}
                    </span>
                    {widget.created_by.verified && (
                      <Shield className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWidgets.map((widget) => {
            const IconComponent =
              WIDGET_ICONS[widget.icon as keyof typeof WIDGET_ICONS] ||
              LayoutDashboard;
            const isSelected = isWidgetSelected(widget.id);
            const isInstalling = isWidgetInstalling(widget.id);

            return (
              <Card
                key={widget.id}
                className={cn(
                  'p-6 cursor-pointer transition-all hover:shadow-md',
                  isSelected && 'ring-2 ring-primary-500 bg-primary-50',
                )}
                onClick={() => onWidgetSelect?.(widget)}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-100 rounded-lg flex-shrink-0">
                    <IconComponent className="h-6 w-6 text-primary-600" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {widget.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {widget.category}
                          </Badge>
                          {widget.is_premium && (
                            <Badge variant="warning" className="text-xs">
                              Premium
                            </Badge>
                          )}
                          {widget.rating && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span>{widget.rating}</span>
                              <span className="text-gray-500">
                                ({widget.reviews})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant={isSelected ? 'secondary' : 'primary'}
                          size="sm"
                          leftIcon={
                            isSelected ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isSelected && onWidgetInstall) {
                              handleWidgetInstall(widget);
                            } else if (onWidgetSelect) {
                              onWidgetSelect(widget);
                            }
                          }}
                          loading={isInstalling}
                        >
                          {isSelected ? 'View' : 'Add'}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Settings className="h-4 w-4" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onWidgetSelect?.(widget);
                          }}
                        />
                      </div>
                    </div>

                    <p className="text-gray-600 mb-3">{widget.description}</p>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span>
                          Size: {widget.default_size.width}×
                          {widget.default_size.height}
                        </span>
                        {widget.installation_count && (
                          <span>
                            {widget.installation_count.toLocaleString()}{' '}
                            installs
                          </span>
                        )}
                        {widget.created_by && (
                          <div className="flex items-center gap-1">
                            <span>by {widget.created_by.name}</span>
                            {widget.created_by.verified && (
                              <Shield className="h-3 w-3 text-blue-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredWidgets.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No widgets found
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Try adjusting your search terms or filters to find more widgets for
            your dashboard.
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setShowPremiumOnly(false);
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
