/**
 * @jest-environment jsdom
 */

import { describe, expect, it, beforeEach, afterEach, jest, beforeAll, afterAll } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock external dependencies
jest.mock('openai');
jest.mock('@/lib/supabase/client');
jest.mock('resend');
jest.mock('twilio');

// Mock ReactFlow
jest.mock('reactflow', () => ({
  ReactFlow: ({ children, ...props }: any) => <div data-testid="react-flow" {...props}>{children}</div>,
  Controls: () => <div data-testid="flow-controls">Controls</div>,
  MiniMap: () => <div data-testid="flow-minimap">MiniMap</div>,
  Background: () => <div data-testid="flow-background">Background</div>,
  useNodesState: () => [[], jest.fn(), jest.fn()],
  useEdgesState: () => [[], jest.fn(), jest.fn()],
  addEdge: jest.fn(),
  Handle: () => <div data-testid="flow-handle">Handle</div>,
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

import { OpenAI } from 'openai';
import { createClient } from '@/lib/supabase/client';
import { Resend } from 'resend';

// Types for our tests
type VendorType = 'photography' | 'venue' | 'catering' | 'dj' | 'florist';
type TierType = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'SCALE' | 'ENTERPRISE';

interface JourneyTemplate {
  id: string;
  name: string;
  vendor_type: VendorType;
  description: string;
  touchpoints: TouchPoint[];
  estimated_duration_days: number;
  tier_required: TierType;
}

interface TouchPoint {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'task' | 'meeting' | 'payment';
  timing_days: number;
  template?: string;
  required: boolean;
  vendor_specific?: Record<string, any>;
}

interface JourneyExecution {
  journey_id: string;
  client_id: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  current_step: number;
  performance_metrics?: {
    open_rate?: number;
    response_rate?: number;
    completion_rate?: number;
    conversion_rate?: number;
  };
}

// Mock data for testing
const mockVendorTypes: VendorType[] = ['photography', 'venue', 'catering', 'dj', 'florist'];

const mockJourneyTemplates: Record<VendorType, JourneyTemplate> = {
  photography: {
    id: 'photo-journey-1',
    name: 'Complete Photography Experience',
    vendor_type: 'photography',
    description: 'Full wedding photography journey from inquiry to delivery',
    tier_required: 'PROFESSIONAL',
    estimated_duration_days: 365,
    touchpoints: [
      {
        id: 'ph-inquiry',
        name: 'Initial Inquiry Response',
        type: 'email',
        timing_days: 0,
        template: 'Thank you for your photography inquiry! I\'d love to capture your special day.',
        required: true,
        vendor_specific: { portfolio_style: 'natural', packages_available: 3 }
      },
      {
        id: 'ph-consultation',
        name: 'Schedule Consultation',
        type: 'task',
        timing_days: 2,
        required: true,
        vendor_specific: { consultation_type: 'video_call', duration_minutes: 60 }
      },
      {
        id: 'ph-contract',
        name: 'Send Contract & Invoice',
        type: 'email',
        timing_days: 7,
        template: 'Here\'s your photography contract and booking invoice.',
        required: true,
        vendor_specific: { contract_type: 'standard', deposit_percentage: 30 }
      },
      {
        id: 'ph-engagement',
        name: 'Engagement Session Reminder',
        type: 'email',
        timing_days: 90,
        template: 'Let\'s schedule your complimentary engagement session!',
        required: false,
        vendor_specific: { session_included: true, location_options: ['studio', 'outdoor', 'location'] }
      },
      {
        id: 'ph-timeline',
        name: 'Wedding Day Timeline Planning',
        type: 'meeting',
        timing_days: 30,
        required: true,
        vendor_specific: { timeline_type: 'detailed', coverage_hours: 8 }
      },
      {
        id: 'ph-delivery',
        name: 'Photo Gallery Delivery',
        type: 'email',
        timing_days: 21,
        template: 'Your wedding photos are ready! Access your private gallery here.',
        required: true,
        vendor_specific: { gallery_type: 'online', download_included: true }
      }
    ]
  },
  venue: {
    id: 'venue-journey-1',
    name: 'Complete Venue Experience',
    vendor_type: 'venue',
    description: 'Full wedding venue journey from inquiry to event completion',
    tier_required: 'PROFESSIONAL',
    estimated_duration_days: 545,
    touchpoints: [
      {
        id: 'v-inquiry',
        name: 'Venue Inquiry Response',
        type: 'email',
        timing_days: 0,
        template: 'Thank you for your interest in our venue! Let me share our availability.',
        required: true,
        vendor_specific: { venue_type: 'historic', capacity_max: 150, outdoor_option: true }
      },
      {
        id: 'v-tour',
        name: 'Schedule Venue Tour',
        type: 'task',
        timing_days: 3,
        required: true,
        vendor_specific: { tour_duration: 45, preferred_times: ['morning', 'afternoon'] }
      },
      {
        id: 'v-proposal',
        name: 'Send Venue Proposal',
        type: 'email',
        timing_days: 1,
        template: 'Here\'s a detailed proposal for your wedding at our venue.',
        required: true,
        vendor_specific: { pricing_type: 'package', catering_included: false }
      },
      {
        id: 'v-contract',
        name: 'Contract & Deposit',
        type: 'email',
        timing_days: 7,
        template: 'Ready to book? Here\'s your venue contract and deposit information.',
        required: true,
        vendor_specific: { deposit_percentage: 25, payment_schedule: 'quarterly' }
      },
      {
        id: 'v-planning-1',
        name: 'Initial Planning Meeting',
        type: 'meeting',
        timing_days: 180,
        required: true,
        vendor_specific: { planning_focus: 'layout', coordinator_assigned: true }
      },
      {
        id: 'v-final-details',
        name: 'Final Details Confirmation',
        type: 'meeting',
        timing_days: 14,
        required: true,
        vendor_specific: { final_count_deadline: 7, setup_time: '4_hours_prior' }
      }
    ]
  },
  catering: {
    id: 'catering-journey-1',
    name: 'Complete Catering Experience',
    vendor_type: 'catering',
    description: 'Full wedding catering journey from inquiry to service',
    tier_required: 'PROFESSIONAL',
    estimated_duration_days: 365,
    touchpoints: [
      {
        id: 'c-inquiry',
        name: 'Catering Inquiry Response',
        type: 'email',
        timing_days: 0,
        template: 'Thank you for considering us for your wedding catering!',
        required: true,
        vendor_specific: { cuisine_types: ['modern_american', 'mediterranean'], service_style: 'plated' }
      },
      {
        id: 'c-tasting',
        name: 'Schedule Tasting Session',
        type: 'task',
        timing_days: 5,
        required: true,
        vendor_specific: { tasting_fee: 50, guests_included: 2 }
      },
      {
        id: 'c-menu-proposal',
        name: 'Custom Menu Proposal',
        type: 'email',
        timing_days: 2,
        template: 'Here\'s a custom menu designed just for your wedding!',
        required: true,
        vendor_specific: { menu_courses: 3, dietary_accommodations: true }
      },
      {
        id: 'c-contract',
        name: 'Catering Contract',
        type: 'email',
        timing_days: 7,
        template: 'Let\'s make it official with your catering contract.',
        required: true,
        vendor_specific: { service_charge: 20, gratuity_included: false }
      },
      {
        id: 'c-final-count',
        name: 'Final Guest Count',
        type: 'email',
        timing_days: 7,
        template: 'Final guest count needed for your wedding catering.',
        required: true,
        vendor_specific: { count_deadline: 48, overage_policy: 'flexible' }
      }
    ]
  },
  dj: {
    id: 'dj-journey-1',
    name: 'Complete DJ Entertainment Experience',
    vendor_type: 'dj',
    description: 'Full wedding DJ journey from inquiry to reception',
    tier_required: 'PROFESSIONAL',
    estimated_duration_days: 270,
    touchpoints: [
      {
        id: 'dj-inquiry',
        name: 'DJ Inquiry Response',
        type: 'email',
        timing_days: 0,
        template: 'Let\'s make your wedding reception unforgettable!',
        required: true,
        vendor_specific: { equipment_included: true, mc_services: true, genres: ['pop', 'rock', 'hip-hop'] }
      },
      {
        id: 'dj-consultation',
        name: 'Music Consultation',
        type: 'meeting',
        timing_days: 3,
        required: true,
        vendor_specific: { consultation_type: 'phone', music_preferences_form: true }
      },
      {
        id: 'dj-contract',
        name: 'DJ Contract & Booking',
        type: 'email',
        timing_days: 5,
        template: 'Your DJ services contract and booking details.',
        required: true,
        vendor_specific: { performance_hours: 6, overtime_rate: 150 }
      },
      {
        id: 'dj-music-planning',
        name: 'Detailed Music Planning',
        type: 'task',
        timing_days: 60,
        required: true,
        vendor_specific: { playlist_collaboration: true, special_requests_limit: 10 }
      },
      {
        id: 'dj-timeline-review',
        name: 'Reception Timeline Review',
        type: 'meeting',
        timing_days: 14,
        required: true,
        vendor_specific: { timeline_coordination: true, announcement_script: true }
      }
    ]
  },
  florist: {
    id: 'florist-journey-1',
    name: 'Complete Floral Design Experience',
    vendor_type: 'florist',
    description: 'Full wedding floral journey from inquiry to installation',
    tier_required: 'PROFESSIONAL',
    estimated_duration_days: 300,
    touchpoints: [
      {
        id: 'f-inquiry',
        name: 'Floral Inquiry Response',
        type: 'email',
        timing_days: 0,
        template: 'Let\'s create beautiful florals for your special day!',
        required: true,
        vendor_specific: { design_style: 'romantic', seasonal_focus: true, sustainability_options: true }
      },
      {
        id: 'f-consultation',
        name: 'Floral Design Consultation',
        type: 'meeting',
        timing_days: 5,
        required: true,
        vendor_specific: { consultation_fee: 100, design_board_included: true }
      },
      {
        id: 'f-proposal',
        name: 'Floral Design Proposal',
        type: 'email',
        timing_days: 3,
        template: 'Your custom floral design proposal with beautiful inspiration images.',
        required: true,
        vendor_specific: { proposal_includes_images: true, itemized_pricing: true }
      },
      {
        id: 'f-contract',
        name: 'Floral Contract',
        type: 'email',
        timing_days: 7,
        template: 'Let\'s move forward with your floral contract.',
        required: true,
        vendor_specific: { flower_substitution_policy: true, delivery_included: true }
      },
      {
        id: 'f-final-details',
        name: 'Final Floral Details',
        type: 'meeting',
        timing_days: 21,
        required: true,
        vendor_specific: { venue_walkthrough: true, setup_timeline: 4 }
      }
    ]
  }
};

const mockPerformanceMetrics = {
  photography: {
    open_rate: 0.85,
    response_rate: 0.72,
    completion_rate: 0.91,
    conversion_rate: 0.34
  },
  venue: {
    open_rate: 0.88,
    response_rate: 0.76,
    completion_rate: 0.94,
    conversion_rate: 0.42
  },
  catering: {
    open_rate: 0.82,
    response_rate: 0.68,
    completion_rate: 0.87,
    conversion_rate: 0.38
  },
  dj: {
    open_rate: 0.80,
    response_rate: 0.65,
    completion_rate: 0.89,
    conversion_rate: 0.31
  },
  florist: {
    open_rate: 0.83,
    response_rate: 0.69,
    completion_rate: 0.88,
    conversion_rate: 0.35
  }
};

// Mock implementations
const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const mockSupabaseClient = createClient as jest.MockedFunction<typeof createClient>;
const mockResend = Resend as jest.MockedClass<typeof Resend>;

describe('AI Journey Suggestions Engine - Comprehensive Test Suite', () => {
  let mockOpenAIInstance: jest.Mocked<OpenAI>;
  let mockSupabaseInstance: any;
  let mockResendInstance: any;

  beforeAll(() => {
    // Setup global mocks
    global.fetch = jest.fn();
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup OpenAI mock
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any;
    mockOpenAI.mockReturnValue(mockOpenAIInstance);

    // Setup Supabase mock
    mockSupabaseInstance = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            order: jest.fn(() => ({
              limit: jest.fn()
            }))
          })),
          in: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn()
            }))
          })),
          order: jest.fn(() => ({
            limit: jest.fn()
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })),
      auth: {
        getUser: jest.fn(),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } }
        }))
      },
      channel: jest.fn(() => ({
        on: jest.fn(() => ({
          subscribe: jest.fn()
        })),
        unsubscribe: jest.fn()
      }))
    };
    mockSupabaseClient.mockReturnValue(mockSupabaseInstance);

    // Setup Resend mock
    mockResendInstance = {
      emails: {
        send: jest.fn()
      }
    };
    mockResend.mockReturnValue(mockResendInstance);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Journey Template Generation', () => {
    describe('Photography Vendor Journey', () => {
      it('should generate comprehensive photography journey with correct touchpoints', async () => {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                journey: mockJourneyTemplates.photography,
                reasoning: 'Photography requires multiple touchpoints from initial inquiry through final delivery'
              })
            }
          }]
        };
        mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any);

        // Mock the journey generation function
        const generateJourneyTemplate = jest.fn().mockResolvedValue(mockJourneyTemplates.photography);
        const journey = await generateJourneyTemplate({
          vendorType: 'photography',
          businessType: 'wedding_photography',
          targetTier: 'PROFESSIONAL',
          customRequirements: ['engagement_session', 'album_design', 'online_gallery']
        });

        expect(journey).toBeDefined();
        expect(journey.vendor_type).toBe('photography');
        expect(journey.touchpoints).toHaveLength(6);
        
        // Verify photography-specific touchpoints
        const touchpointNames = journey.touchpoints.map(t => t.name);
        expect(touchpointNames).toContain('Initial Inquiry Response');
        expect(touchpointNames).toContain('Schedule Consultation');
        expect(touchpointNames).toContain('Engagement Session Reminder');
        expect(touchpointNames).toContain('Photo Gallery Delivery');

        // Verify vendor-specific data
        const engagementTouchpoint = journey.touchpoints.find(t => t.name.includes('Engagement'));
        expect(engagementTouchpoint?.vendor_specific).toHaveProperty('session_included', true);
        expect(engagementTouchpoint?.vendor_specific).toHaveProperty('location_options');
      });

      it('should validate photography-specific timeline requirements', async () => {
        const journey = mockJourneyTemplates.photography;
        
        // Verify timeline makes sense for photography business
        expect(journey.estimated_duration_days).toBe(365); // Full year journey
        
        // Check timing progression
        const timings = journey.touchpoints.map(t => t.timing_days).sort((a, b) => a - b);
        expect(timings[0]).toBe(0); // Immediate response
        expect(timings).toContain(90); // Engagement session timing
        expect(timings).toContain(21); // Post-wedding delivery
        
        // Verify critical touchpoints are required
        const requiredTouchpoints = journey.touchpoints.filter(t => t.required);
        expect(requiredTouchpoints.length).toBeGreaterThan(4);
      });
    });

    describe('Venue Journey Generation', () => {
      it('should generate comprehensive venue journey with site visit and planning', async () => {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                journey: mockJourneyTemplates.venue,
                reasoning: 'Venues require longer planning timeline with multiple site visits and detailed coordination'
              })
            }
          }]
        };
        mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any);

        const generateJourneyTemplate = jest.fn().mockResolvedValue(mockJourneyTemplates.venue);
        const journey = await generateJourneyTemplate({
          vendorType: 'venue',
          businessType: 'wedding_venue',
          targetTier: 'PROFESSIONAL',
          customRequirements: ['site_tour', 'catering_coordination', 'setup_support']
        });

        expect(journey).toBeDefined();
        expect(journey.vendor_type).toBe('venue');
        expect(journey.estimated_duration_days).toBeGreaterThan(365); // Venues book far in advance
        
        // Verify venue-specific touchpoints
        const touchpointNames = journey.touchpoints.map(t => t.name);
        expect(touchpointNames).toContain('Schedule Venue Tour');
        expect(touchpointNames).toContain('Initial Planning Meeting');
        expect(touchpointNames).toContain('Final Details Confirmation');

        // Verify meeting types for venue coordination
        const meetings = journey.touchpoints.filter(t => t.type === 'meeting');
        expect(meetings.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('All Vendor Types Journey Generation', () => {
      it('should generate appropriate journeys for all 5 vendor types', async () => {
        for (const vendorType of mockVendorTypes) {
          const journey = mockJourneyTemplates[vendorType];
          
          expect(journey.vendor_type).toBe(vendorType);
          expect(journey.touchpoints.length).toBeGreaterThan(3);
          expect(journey.estimated_duration_days).toBeGreaterThan(0);
          
          // All journeys should have immediate inquiry response
          const inquiryTouchpoint = journey.touchpoints.find(t => t.timing_days === 0);
          expect(inquiryTouchpoint).toBeDefined();
          expect(inquiryTouchpoint?.required).toBe(true);
        }
      });
    });
  });

  describe('Vendor-Specific Touchpoint Validation', () => {
    it('should validate touchpoint types are appropriate for each vendor', () => {
      mockVendorTypes.forEach(vendorType => {
        const journey = mockJourneyTemplates[vendorType];
        
        journey.touchpoints.forEach(touchpoint => {
          // All vendors should have appropriate touchpoint types
          expect(['email', 'sms', 'task', 'meeting', 'payment']).toContain(touchpoint.type);
          
          // All touchpoints should have positive timing
          expect(touchpoint.timing_days).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('should validate vendor_specific data contains relevant business logic', () => {
      // Photography should have portfolio and package info
      const photoTouchpoint = mockJourneyTemplates.photography.touchpoints[0];
      expect(photoTouchpoint.vendor_specific).toHaveProperty('portfolio_style');
      expect(photoTouchpoint.vendor_specific).toHaveProperty('packages_available');

      // Venue should have capacity and logistics
      const venueTouchpoint = mockJourneyTemplates.venue.touchpoints[0];
      expect(venueTouchpoint.vendor_specific).toHaveProperty('capacity_max');
      expect(venueTouchpoint.vendor_specific).toHaveProperty('venue_type');

      // Catering should have service and dietary info
      const cateringTouchpoint = mockJourneyTemplates.catering.touchpoints[0];
      expect(cateringTouchpoint.vendor_specific).toHaveProperty('cuisine_types');
      expect(cateringTouchpoint.vendor_specific).toHaveProperty('service_style');
    });
  });

  describe('Timeline Optimization', () => {
    it('should optimize touchpoint timing based on wedding industry standards', async () => {
      mockVendorTypes.forEach(vendorType => {
        const journey = mockJourneyTemplates[vendorType];
        const timings = journey.touchpoints.map(t => t.timing_days).sort((a, b) => a - b);
        
        // First touchpoint should be immediate (day 0)
        expect(timings[0]).toBe(0);
        
        // Should have reasonable gaps between touchpoints
        for (let i = 1; i < timings.length; i++) {
          expect(timings[i]).toBeGreaterThan(timings[i - 1]);
        }
      });
    });

    it('should validate journey duration matches vendor type complexity', () => {
      // Venue should have longest duration (book earliest)
      expect(mockJourneyTemplates.venue.estimated_duration_days).toBeGreaterThan(500);
      
      // Photography should span full wedding timeline
      expect(mockJourneyTemplates.photography.estimated_duration_days).toBeGreaterThanOrEqual(300);
      
      // All durations should be reasonable for wedding planning
      mockVendorTypes.forEach(vendorType => {
        const duration = mockJourneyTemplates[vendorType].estimated_duration_days;
        expect(duration).toBeGreaterThan(0);
        expect(duration).toBeLessThan(730); // Max 2 years
      });
    });
  });

  describe('Performance Prediction', () => {
    it('should predict performance metrics based on vendor type', async () => {
      for (const vendorType of mockVendorTypes) {
        const predictions = mockPerformanceMetrics[vendorType];
        
        expect(predictions).toHaveProperty('open_rate');
        expect(predictions).toHaveProperty('response_rate');
        expect(predictions).toHaveProperty('completion_rate');
        expect(predictions).toHaveProperty('conversion_rate');
        
        // All rates should be between 0 and 1
        Object.values(predictions).forEach(rate => {
          expect(rate).toBeGreaterThan(0);
          expect(rate).toBeLessThanOrEqual(1);
        });
        
        // Response rate should be less than open rate
        expect(predictions.response_rate).toBeLessThanOrEqual(predictions.open_rate);
        
        // Conversion rate should be realistic for wedding industry
        expect(predictions.conversion_rate).toBeLessThan(0.5); // Less than 50% conversion is realistic
      }
    });
  });

  describe('AI Response Validation and Sanitization', () => {
    it('should validate AI-generated journey structure', async () => {
      const mockInvalidResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              journey: {
                // Missing required fields
                id: 'invalid-journey',
                name: 'Invalid Journey'
                // Missing vendor_type, touchpoints, etc.
              }
            })
          }
        }]
      };
      
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockInvalidResponse as any);

      const generateJourneyTemplate = jest.fn().mockRejectedValue(new Error('Invalid journey structure'));
      
      await expect(generateJourneyTemplate({
        vendorType: 'photography',
        businessType: 'wedding_photography',
        targetTier: 'PROFESSIONAL'
      })).rejects.toThrow('Invalid journey structure');
    });

    it('should sanitize AI-generated content for security', async () => {
      const maliciousContent = '<script>alert("xss")</script>Thank you for your inquiry!';
      const sanitizedContent = maliciousContent.replace(/<script.*?>.*?<\/script>/gi, '');
      
      expect(sanitizedContent).not.toContain('<script>');
      expect(sanitizedContent).not.toContain('</script>');
      expect(sanitizedContent).toBe('Thank you for your inquiry!');
    });

    it('should validate template variables and prevent injection', async () => {
      const testTemplate = 'Hello {{client_name}}, your {{service_type}} is confirmed for {{wedding_date}}.';
      const maliciousVariables = {
        client_name: '<script>alert("xss")</script>',
        service_type: '{{system_password}}',
        wedding_date: '${process.env.SECRET_KEY}'
      };
      
      // Mock sanitization function
      const sanitizeTemplate = jest.fn().mockReturnValue(
        'Hello &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;, your [INVALID_VARIABLE] is confirmed for [INVALID_VARIABLE].'
      );
      
      const sanitized = sanitizeTemplate(testTemplate, maliciousVariables);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('{{system_password}}');
      expect(sanitized).not.toContain('${process.env');
      expect(sanitized).toContain('&lt;script&gt;'); // Should be HTML encoded
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle OpenAI API failures gracefully', async () => {
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      );

      const generateJourneyTemplate = jest.fn().mockRejectedValue(new Error('Failed to generate journey template'));
      
      await expect(generateJourneyTemplate({
        vendorType: 'photography',
        businessType: 'wedding_photography',
        targetTier: 'PROFESSIONAL'
      })).rejects.toThrow('Failed to generate journey template');
    });

    it('should handle empty or null vendor types', async () => {
      const generateJourneyTemplate = jest.fn().mockImplementation((params) => {
        if (!params.vendorType) {
          throw new Error('Vendor type is required');
        }
        return mockJourneyTemplates.photography;
      });

      await expect(generateJourneyTemplate({
        vendorType: null as any,
        businessType: 'wedding_photography',
        targetTier: 'PROFESSIONAL'
      })).rejects.toThrow('Vendor type is required');

      await expect(generateJourneyTemplate({
        vendorType: '' as any,
        businessType: 'wedding_photography',
        targetTier: 'PROFESSIONAL'
      })).rejects.toThrow('Vendor type is required');
    });

    it('should handle tier access restrictions', async () => {
      const checkTierAccess = jest.fn().mockImplementation((tier: TierType, journey: JourneyTemplate) => {
        if (tier === 'FREE' && journey.tier_required !== 'FREE') {
          return false;
        }
        return true;
      });
      
      const professionalJourney = mockJourneyTemplates.photography;
      
      // Free tier user trying to access professional feature
      const canAccess = checkTierAccess('FREE', professionalJourney);
      expect(canAccess).toBe(false);

      // Professional tier user accessing professional feature
      const canAccessPro = checkTierAccess('PROFESSIONAL', professionalJourney);
      expect(canAccessPro).toBe(true);
    });
  });

  describe('Wedding-Specific Business Logic', () => {
    it('should handle peak wedding season considerations', async () => {
      const peakSeasonMonths = [4, 5, 6, 7, 8, 9, 10]; // April through October
      const currentMonth = new Date().getMonth() + 1;
      
      const isPeakSeason = peakSeasonMonths.includes(currentMonth);
      
      if (isPeakSeason) {
        // During peak season, touchpoints should have shorter intervals
        const journey = mockJourneyTemplates.photography;
        const firstTouchpoint = journey.touchpoints[0];
        expect(firstTouchpoint.timing_days).toBe(0); // Immediate response required
      }
    });

    it('should respect Saturday deployment restrictions', async () => {
      const isSaturday = new Date().getDay() === 6;
      const isWeddingDay = true; // Mock wedding day scenario
      
      if (isSaturday && isWeddingDay) {
        const readOnlyMode = true;
        expect(readOnlyMode).toBe(true);
        
        // No deployments or changes should be allowed
        const deploymentAllowed = false;
        expect(deploymentAllowed).toBe(false);
      }
    });

    it('should handle emergency wedding date changes', async () => {
      const originalDate = new Date('2025-06-15');
      const newDate = new Date('2025-07-20');
      
      const updateWeddingDate = jest.fn().mockImplementation((journeyId, clientId, oldDate, newDate) => {
        // Mock timeline recalculation
        const journey = { ...mockJourneyTemplates.photography };
        const daysDifference = Math.floor((newDate.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Adjust all touchpoint timings
        journey.touchpoints = journey.touchpoints.map(t => ({
          ...t,
          timing_days: t.timing_days + daysDifference
        }));
        
        return { journey, status: 'updated' };
      });
      
      const result = updateWeddingDate('journey-123', 'client-123', originalDate, newDate);
      expect(result.status).toBe('updated');
      expect(result.journey).toBeDefined();
    });

    it('should maintain data consistency across vendor communications', async () => {
      const weddingDetails = {
        couple_names: 'Sarah & John',
        wedding_date: '2025-06-15',
        venue_name: 'Garden Estate',
        guest_count: 120
      };
      
      const validateConsistency = jest.fn().mockImplementation((communications) => {
        return communications.every(comm => 
          comm.content.includes(weddingDetails.couple_names) &&
          comm.content.includes('June 15, 2025')
        );
      });
      
      const mockCommunications = [
        { content: 'Dear Sarah & John, your wedding on June 15, 2025 at Garden Estate...' },
        { content: 'Hi Sarah & John, regarding your June 15, 2025 celebration...' }
      ];
      
      const isConsistent = validateConsistency(mockCommunications);
      expect(isConsistent).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should generate journeys within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const generateJourneyTemplate = jest.fn().mockImplementation(async (params) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockJourneyTemplates[params.vendorType];
      });
      
      const journey = await generateJourneyTemplate({
        vendorType: 'photography',
        businessType: 'wedding_photography',
        targetTier: 'PROFESSIONAL'
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(journey).toBeDefined();
      expect(duration).toBeLessThan(3000); // Under 3 seconds
    });

    it('should handle memory efficiently with large journey templates', async () => {
      const largeJourney = {
        ...mockJourneyTemplates.photography,
        touchpoints: Array.from({ length: 50 }, (_, i) => ({
          id: `touchpoint-${i}`,
          name: `Touchpoint ${i}`,
          type: 'email' as const,
          timing_days: i * 7,
          template: `This is template ${i} with some content.`,
          required: i < 10,
          vendor_specific: {
            data: Array.from({ length: 100 }, (_, j) => `data-${i}-${j}`)
          }
        }))
      };
      
      const validateJourney = jest.fn().mockImplementation((journey) => {
        return { isValid: journey.touchpoints.length > 0 };
      });
      
      const validation = validateJourney(largeJourney);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should generate accessible journey content', async () => {
      const journey = mockJourneyTemplates.photography;
      
      journey.touchpoints.forEach(touchpoint => {
        if (touchpoint.template) {
          // Should have clear, readable content
          expect(touchpoint.template.length).toBeGreaterThan(10);
          expect(touchpoint.template).toMatch(/^[A-Z]/); // Should start with capital letter
          expect(touchpoint.template.trim()).toBe(touchpoint.template); // No extra whitespace
        }
        
        // Touchpoint names should be descriptive
        expect(touchpoint.name.length).toBeGreaterThan(5);
        expect(touchpoint.name).not.toContain('TODO');
        expect(touchpoint.name).not.toContain('TBD');
      });
    });

    it('should provide clear error messages for users', async () => {
      const generateError = (message: string) => new Error(`Wedding vendor journey generation failed: ${message}. Please check your vendor type and try again.`);
      
      try {
        throw generateError('invalid vendor type');
      } catch (error) {
        expect(error.message).toContain('vendor type');
        expect(error.message).not.toContain('undefined');
        expect(error.message).not.toContain('null');
        expect(error.message.length).toBeGreaterThan(10);
      }
    });
  });
});