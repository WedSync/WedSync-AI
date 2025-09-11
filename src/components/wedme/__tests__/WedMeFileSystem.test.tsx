/**
 * WedMe File Management System - Comprehensive Test Suite
 *
 * This test suite validates all core functionality of the WedMe platform:
 * - File management and organization
 * - Timeline creation and magical storytelling
 * - Viral sharing engine and social optimization
 * - Vendor discovery through AI analysis
 * - Family & friends sharing with privacy controls
 * - Performance optimization and mobile responsiveness
 * - Integration with WedSync platform
 *
 * @author WS-335-Team-D
 * @created 2025-09-08
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

// Components under test
import { WeddingTimelineExperience } from '../timeline/WeddingTimelineExperience';
import { VendorDiscoveryEngine } from '../vendor-discovery/VendorDiscoveryEngine';
import { FamilyFriendsSharing } from '../sharing/FamilyFriendsSharing';
import { ViralGrowthDashboard } from '../viral/ViralGrowthDashboard';
import MobileFileHub from '../mobile/MobileFileHub';
import MobileTimelineView from '../mobile/MobileTimelineView';
import MobileSharingInterface from '../mobile/MobileSharingInterface';
import MobileWedMeLayout from '../mobile/MobileWedMeLayout';

// Types and interfaces
import {
  CoupleProfile,
  WeddingFile,
  TimelineMoment,
  SharingGroup,
  ViralSharingRequest,
  ViralResult,
  VendorMatch,
  ContentSuggestion,
  ViralMetrics,
  EmotionalCurve,
} from '@/types/wedme/file-management';

// Mock utilities
import {
  ImageOptimizer,
  LazyLoader,
  ProgressiveLoader,
} from '@/lib/wedme/performance-optimization';

// Mock external dependencies
jest.mock('@/lib/wedme/performance-optimization');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    img: ({ children, ...props }: any) => <img {...props}>{children}</img>,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
  useAnimation: () => ({ start: jest.fn(), stop: jest.fn() }),
  useScroll: () => ({ scrollY: { get: () => 0 } }),
  useTransform: () => 1,
}));

// Test data fixtures
const mockCouple: CoupleProfile = {
  id: 'couple-1',
  partnerOne: {
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah@example.com',
    avatar: 'https://example.com/sarah.jpg',
  },
  partnerTwo: {
    firstName: 'Michael',
    lastName: 'Smith',
    email: 'michael@example.com',
    avatar: 'https://example.com/michael.jpg',
  },
  weddingDate: new Date('2025-06-15'),
  venue: 'Sunset Gardens',
  preferences: {
    theme: 'romantic',
    colors: ['rose', 'gold'],
    style: 'elegant',
  },
  isActive: true,
  createdAt: new Date('2024-12-01'),
};

const mockFiles: WeddingFile[] = [
  {
    id: 'file-1',
    filename: 'engagement-photos-1.jpg',
    originalName: 'DSC_0001.jpg',
    size: 2048000,
    mimeType: 'image/jpeg',
    category: 'photos',
    url: 'https://example.com/photos/file-1.jpg',
    thumbnailUrl: 'https://example.com/thumbnails/file-1.jpg',
    uploadedAt: new Date('2025-01-15'),
    uploadedBy: 'couple-1',
    metadata: {
      dimensions: { width: 1920, height: 1080 },
      location: { latitude: 40.7128, longitude: -74.006 },
      capturedAt: new Date('2024-12-15'),
      camera: 'Canon EOS R5',
      lens: '85mm f/1.2',
    },
    tags: ['engagement', 'romantic', 'outdoor'],
    isFavorite: true,
    aiAnalysis: {
      people: [
        { name: 'Sarah', confidence: 0.98, bbox: [100, 100, 200, 300] },
        { name: 'Michael', confidence: 0.96, bbox: [300, 100, 400, 300] },
      ],
      emotions: [{ type: 'joy', confidence: 0.92 }],
      scene: 'outdoor_park',
      quality: 0.95,
      suggestions: [
        'Perfect for wedding invitations',
        'Great for social media',
      ],
    },
    processingStatus: 'completed',
  },
  {
    id: 'file-2',
    filename: 'venue-walkthrough.mp4',
    originalName: 'VID_20250101_123000.mp4',
    size: 50000000,
    mimeType: 'video/mp4',
    category: 'videos',
    url: 'https://example.com/videos/file-2.mp4',
    thumbnailUrl: 'https://example.com/thumbnails/file-2.jpg',
    uploadedAt: new Date('2025-01-10'),
    uploadedBy: 'couple-1',
    metadata: {
      duration: 120,
      resolution: '4K',
      fps: 30,
    },
    tags: ['venue', 'walkthrough', 'planning'],
    isFavorite: false,
    processingStatus: 'completed',
  },
];

const mockTimelineMoments: TimelineMoment[] = [
  {
    id: 'moment-1',
    title: 'The Proposal',
    description: 'Michael proposed to Sarah in Central Park at sunset',
    timestamp: new Date('2024-11-15T18:30:00'),
    category: 'milestone',
    location: 'Central Park, New York',
    files: [mockFiles[0]],
    participants: [
      {
        id: 'sarah',
        name: 'Sarah Johnson',
        role: 'bride',
        avatar: 'https://example.com/sarah.jpg',
      },
      {
        id: 'michael',
        name: 'Michael Smith',
        role: 'groom',
        avatar: 'https://example.com/michael.jpg',
      },
    ],
    tags: ['proposal', 'milestone', 'romantic'],
    isHighlight: true,
    aiStoryNarrative: {
      emotionalArc: 'rising_to_climax',
      storyBeats: ['anticipation', 'surprise', 'joy', 'celebration'],
      suggestedMusic: 'romantic_acoustic',
      cinematicStyle: 'golden_hour',
    },
    engagement: {
      likes: 156,
      comments: 23,
      shares: 12,
      views: 1247,
    },
  },
];

const mockSharingGroups: SharingGroup[] = [
  {
    id: 'group-1',
    name: 'Immediate Family',
    members: [
      {
        id: 'mom-sarah',
        name: 'Linda Johnson',
        email: 'linda@example.com',
        role: 'family',
        avatar: 'https://example.com/linda.jpg',
      },
      {
        id: 'dad-michael',
        name: 'Robert Smith',
        email: 'robert@example.com',
        role: 'family',
        avatar: 'https://example.com/robert.jpg',
      },
    ],
    privacyLevel: 'private',
    accessPermissions: ['view', 'comment'],
    createdAt: new Date('2025-01-01'),
    isActive: true,
    aiCategorization: {
      relationship: 'immediate_family',
      trustLevel: 'high',
      suggestedPermissions: ['view', 'comment', 'download'],
    },
  },
  {
    id: 'group-2',
    name: 'Wedding Party',
    members: [
      {
        id: 'maid-honor',
        name: 'Emma Wilson',
        email: 'emma@example.com',
        role: 'maid_of_honor',
        avatar: 'https://example.com/emma.jpg',
      },
      {
        id: 'best-man',
        name: 'James Brown',
        email: 'james@example.com',
        role: 'best_man',
        avatar: 'https://example.com/james.jpg',
      },
    ],
    privacyLevel: 'friends',
    accessPermissions: ['view', 'comment', 'upload'],
    createdAt: new Date('2025-01-05'),
    isActive: true,
  },
];

const mockViralMetrics: ViralMetrics = {
  totalViews: 5678,
  totalEngagement: 234,
  viralScore: 0.87,
  platformMetrics: {
    instagram: { views: 2000, likes: 150, shares: 45, comments: 23 },
    facebook: { views: 1800, likes: 89, shares: 34, comments: 19 },
    twitter: { views: 1200, likes: 67, shares: 28, comments: 15 },
    tiktok: { views: 678, likes: 89, shares: 12, comments: 8 },
  },
  growthRate: 0.23,
  engagementRate: 0.041,
  optimalPostingTimes: [
    { platform: 'instagram', time: '19:00', timezone: 'EST' },
    { platform: 'facebook', time: '20:00', timezone: 'EST' },
  ],
  audienceInsights: {
    demographics: { age: '25-34', gender: 'mixed', location: 'USA' },
    interests: ['weddings', 'photography', 'love stories'],
    peakEngagementHours: [19, 20, 21],
  },
};

describe('WedMe File Management System', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));

    // Mock IntersectionObserver
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));

    // Mock performance optimization utilities
    (ImageOptimizer.optimizeImage as jest.Mock).mockResolvedValue({
      optimized: new Blob(['optimized'], { type: 'image/jpeg' }),
      metadata: { originalSize: 2048000, newSize: 512000, compression: 0.75 },
    });
  });

  describe('WeddingTimelineExperience Component', () => {
    it('renders timeline with magical storytelling', async () => {
      const mockProps = {
        couple: mockCouple,
        files: mockFiles,
        onTimelineGenerated: jest.fn(),
        onMomentSelect: jest.fn(),
        onShare: jest.fn(),
      };

      render(<WeddingTimelineExperience {...mockProps} />);

      // Check if timeline is rendered
      expect(screen.getByText('Your Wedding Story')).toBeInTheDocument();
      expect(screen.getByText('AI-Enhanced Timeline')).toBeInTheDocument();

      // Wait for timeline generation
      await waitFor(() => {
        expect(mockProps.onTimelineGenerated).toHaveBeenCalled();
      });
    });

    it('generates emotional curve with story beats', async () => {
      const mockProps = {
        couple: mockCouple,
        files: mockFiles,
        onTimelineGenerated: jest.fn(),
        onMomentSelect: jest.fn(),
        onShare: jest.fn(),
      };

      render(<WeddingTimelineExperience {...mockProps} />);

      await waitFor(() => {
        const timelineCall = mockProps.onTimelineGenerated.mock.calls[0];
        const generatedTimeline = timelineCall[0];

        expect(generatedTimeline).toBeDefined();
        expect(generatedTimeline.emotionalCurve).toBeDefined();
        expect(generatedTimeline.storyArcs).toHaveLength(expect.any(Number));
      });
    });

    it('handles moment selection and sharing', async () => {
      const user = userEvent.setup();
      const mockProps = {
        couple: mockCouple,
        files: mockFiles,
        timeline: mockTimelineMoments,
        onMomentSelect: jest.fn(),
        onShare: jest.fn(),
      };

      render(<WeddingTimelineExperience {...mockProps} />);

      // Find and click on a moment
      const momentCard = screen.getByText('The Proposal');
      await user.click(momentCard);

      expect(mockProps.onMomentSelect).toHaveBeenCalledWith(
        mockTimelineMoments[0],
      );
    });

    it('optimizes timeline for social sharing', async () => {
      const mockProps = {
        couple: mockCouple,
        files: mockFiles,
        viralOptimization: true,
        onTimelineGenerated: jest.fn(),
        onSocialOptimization: jest.fn(),
      };

      render(<WeddingTimelineExperience {...mockProps} />);

      await waitFor(() => {
        expect(mockProps.onSocialOptimization).toHaveBeenCalledWith(
          expect.objectContaining({
            platforms: expect.arrayContaining([
              'instagram',
              'facebook',
              'twitter',
            ]),
            contentSuggestions: expect.any(Array),
            viralScore: expect.any(Number),
          }),
        );
      });
    });
  });

  describe('VendorDiscoveryEngine Component', () => {
    it('discovers vendors from wedding files using AI', async () => {
      const mockProps = {
        files: mockFiles,
        couple: mockCouple,
        onVendorDiscovered: jest.fn(),
        onVendorConnect: jest.fn(),
      };

      render(<VendorDiscoveryEngine {...mockProps} />);

      // Check if discovery engine is rendered
      expect(screen.getByText('Smart Vendor Discovery')).toBeInTheDocument();
      expect(
        screen.getByText('AI-Powered Recommendations'),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(mockProps.onVendorDiscovered).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              type: expect.any(String),
              name: expect.any(String),
              confidence: expect.any(Number),
              reasoning: expect.any(String),
            }),
          ]),
        );
      });
    });

    it('categorizes vendors by wedding service type', async () => {
      const mockVendors: VendorMatch[] = [
        {
          id: 'vendor-1',
          name: 'Perfect Moments Photography',
          type: 'photographer',
          confidence: 0.95,
          reasoning:
            'High-quality engagement photos suggest professional photographer needed',
          contact: { email: 'info@perfectmoments.com', phone: '555-0123' },
          rating: 4.9,
          reviews: 127,
          portfolioSamples: ['https://example.com/portfolio1.jpg'],
          pricing: { min: 2500, max: 5000, currency: 'USD' },
          availability: ['2025-06-15'],
          location: 'New York, NY',
          specialties: ['engagement', 'wedding', 'portraits'],
          isRecommended: true,
        },
      ];

      const mockProps = {
        files: mockFiles,
        couple: mockCouple,
        discoveredVendors: mockVendors,
        onVendorConnect: jest.fn(),
      };

      render(<VendorDiscoveryEngine {...mockProps} />);

      // Check vendor categorization
      expect(screen.getByText('Photographers')).toBeInTheDocument();
      expect(
        screen.getByText('Perfect Moments Photography'),
      ).toBeInTheDocument();
      expect(screen.getByText('95% Match')).toBeInTheDocument();
    });

    it('handles vendor connection and inquiry', async () => {
      const user = userEvent.setup();
      const mockVendors: VendorMatch[] = [
        {
          id: 'vendor-1',
          name: 'Perfect Moments Photography',
          type: 'photographer',
          confidence: 0.95,
          reasoning: 'Professional quality suggests need for photographer',
          contact: { email: 'info@perfectmoments.com', phone: '555-0123' },
          rating: 4.9,
          reviews: 127,
          isRecommended: true,
        },
      ];

      const mockProps = {
        files: mockFiles,
        couple: mockCouple,
        discoveredVendors: mockVendors,
        onVendorConnect: jest.fn(),
      };

      render(<VendorDiscoveryEngine {...mockProps} />);

      const connectButton = screen.getByText('Connect');
      await user.click(connectButton);

      expect(mockProps.onVendorConnect).toHaveBeenCalledWith(mockVendors[0]);
    });
  });

  describe('FamilyFriendsSharing Component', () => {
    it('renders sharing interface with intelligent groups', async () => {
      const mockProps = {
        couple: mockCouple,
        groups: mockSharingGroups,
        files: mockFiles,
        onCreateGroup: jest.fn(),
        onUpdateGroup: jest.fn(),
        onShare: jest.fn(),
      };

      render(<FamilyFriendsSharing {...mockProps} />);

      expect(
        screen.getByText('Share with Family & Friends'),
      ).toBeInTheDocument();
      expect(screen.getByText('Immediate Family')).toBeInTheDocument();
      expect(screen.getByText('Wedding Party')).toBeInTheDocument();
    });

    it('creates new sharing groups with AI categorization', async () => {
      const user = userEvent.setup();
      const mockProps = {
        couple: mockCouple,
        groups: mockSharingGroups,
        files: mockFiles,
        onCreateGroup: jest.fn(),
        onUpdateGroup: jest.fn(),
        onShare: jest.fn(),
      };

      render(<FamilyFriendsSharing {...mockProps} />);

      // Create new group
      const createGroupButton = screen.getByText('Create New Group');
      await user.click(createGroupButton);

      const groupNameInput = screen.getByPlaceholderText('Group name');
      await user.type(groupNameInput, 'College Friends');

      const saveButton = screen.getByText('Create Group');
      await user.click(saveButton);

      expect(mockProps.onCreateGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'College Friends',
          privacyLevel: expect.any(String),
          aiCategorization: expect.objectContaining({
            relationship: expect.any(String),
            trustLevel: expect.any(String),
          }),
        }),
      );
    });

    it('handles privacy controls and permissions', async () => {
      const user = userEvent.setup();
      const mockProps = {
        couple: mockCouple,
        groups: mockSharingGroups,
        files: mockFiles,
        onUpdateGroup: jest.fn(),
        onShare: jest.fn(),
      };

      render(<FamilyFriendsSharing {...mockProps} />);

      // Click on group settings
      const groupCard = screen.getByText('Immediate Family');
      await user.click(groupCard);

      // Update privacy settings
      const privacySelect = screen.getByLabelText('Privacy Level');
      await user.selectOptions(privacySelect, 'public');

      expect(mockProps.onUpdateGroup).toHaveBeenCalledWith(
        'group-1',
        expect.objectContaining({
          privacyLevel: 'public',
        }),
      );
    });

    it('handles bulk file sharing with multiple groups', async () => {
      const user = userEvent.setup();
      const mockProps = {
        couple: mockCouple,
        groups: mockSharingGroups,
        files: mockFiles,
        selectedFiles: mockFiles,
        onShare: jest.fn(),
      };

      render(<FamilyFriendsSharing {...mockProps} />);

      // Select groups to share with
      const familyGroup = screen.getByText('Immediate Family');
      const weddingGroup = screen.getByText('Wedding Party');

      await user.click(familyGroup);
      await user.click(weddingGroup);

      // Share files
      const shareButton = screen.getByText('Share Selected');
      await user.click(shareButton);

      expect(mockProps.onShare).toHaveBeenCalledWith(
        expect.objectContaining({
          files: mockFiles,
          groups: expect.arrayContaining([
            expect.objectContaining({ id: 'group-1' }),
            expect.objectContaining({ id: 'group-2' }),
          ]),
        }),
      );
    });
  });

  describe('ViralGrowthDashboard Component', () => {
    it('displays comprehensive viral metrics and analytics', async () => {
      const mockProps = {
        couple: mockCouple,
        metrics: mockViralMetrics,
        onOptimizeContent: jest.fn(),
        onSchedulePost: jest.fn(),
      };

      render(<ViralGrowthDashboard {...mockProps} />);

      expect(screen.getByText('Viral Growth Dashboard')).toBeInTheDocument();
      expect(screen.getByText('5,678')).toBeInTheDocument(); // Total views
      expect(screen.getByText('87%')).toBeInTheDocument(); // Viral score
      expect(screen.getByText('234')).toBeInTheDocument(); // Total engagement
    });

    it('provides platform-specific analytics', async () => {
      const mockProps = {
        couple: mockCouple,
        metrics: mockViralMetrics,
        onPlatformAnalytics: jest.fn(),
      };

      render(<ViralGrowthDashboard {...mockProps} />);

      expect(screen.getByText('Instagram')).toBeInTheDocument();
      expect(screen.getByText('Facebook')).toBeInTheDocument();
      expect(screen.getByText('Twitter')).toBeInTheDocument();
      expect(screen.getByText('TikTok')).toBeInTheDocument();

      // Check Instagram metrics
      expect(screen.getByText('2,000')).toBeInTheDocument(); // Instagram views
      expect(screen.getByText('150')).toBeInTheDocument(); // Instagram likes
    });

    it('generates content optimization recommendations', async () => {
      const mockProps = {
        couple: mockCouple,
        metrics: mockViralMetrics,
        onOptimizeContent: jest.fn(),
      };

      render(<ViralGrowthDashboard {...mockProps} />);

      const optimizeButton = screen.getByText('Optimize Content');
      fireEvent.click(optimizeButton);

      expect(mockProps.onOptimizeContent).toHaveBeenCalledWith(
        expect.objectContaining({
          recommendations: expect.any(Array),
          optimalTiming: expect.any(Object),
          hashtagSuggestions: expect.any(Array),
          contentTypes: expect.any(Array),
        }),
      );
    });

    it('tracks growth rate and engagement trends', async () => {
      const mockProps = {
        couple: mockCouple,
        metrics: mockViralMetrics,
        historicalData: [
          { date: '2025-01-01', views: 1000, engagement: 50, viralScore: 0.3 },
          { date: '2025-01-02', views: 2000, engagement: 120, viralScore: 0.6 },
          {
            date: '2025-01-03',
            views: 5678,
            engagement: 234,
            viralScore: 0.87,
          },
        ],
      };

      render(<ViralGrowthDashboard {...mockProps} />);

      expect(screen.getByText('23%')).toBeInTheDocument(); // Growth rate
      expect(screen.getByText('4.1%')).toBeInTheDocument(); // Engagement rate
    });
  });

  describe('Mobile Components Integration', () => {
    describe('MobileFileHub', () => {
      it('renders mobile-optimized file interface', async () => {
        const mockProps = {
          couple: mockCouple,
          files: mockFiles,
          onFileSelect: jest.fn(),
          onShare: jest.fn(),
          onUpload: jest.fn(),
        };

        render(<MobileFileHub {...mockProps} />);

        expect(
          screen.getByText(
            `${mockCouple.partnerOne.firstName} & ${mockCouple.partnerTwo.firstName}`,
          ),
        ).toBeInTheDocument();
        expect(screen.getByText('2 wedding memories')).toBeInTheDocument();
        expect(
          screen.getByPlaceholderText('Search photos, videos, documents...'),
        ).toBeInTheDocument();
      });

      it('handles progressive loading for large file lists', async () => {
        const manyFiles = Array.from({ length: 100 }, (_, i) => ({
          ...mockFiles[0],
          id: `file-${i}`,
          filename: `photo-${i}.jpg`,
        }));

        const mockProps = {
          couple: mockCouple,
          files: manyFiles,
          onFileSelect: jest.fn(),
        };

        render(<MobileFileHub {...mockProps} />);

        // Should initially load only first batch
        await waitFor(() => {
          const fileElements = screen.getAllByRole('img', {
            name: /photo-\d+/,
          });
          expect(fileElements.length).toBeLessThanOrEqual(20);
        });
      });

      it('supports touch gestures and mobile interactions', async () => {
        const user = userEvent.setup();
        const mockProps = {
          couple: mockCouple,
          files: mockFiles,
          onFileSelect: jest.fn(),
          onShare: jest.fn(),
        };

        render(<MobileFileHub {...mockProps} />);

        // Test file selection with touch
        const fileCard = screen.getByAltText('engagement-photos-1.jpg');
        await user.click(fileCard);

        expect(mockProps.onFileSelect).toHaveBeenCalledWith(mockFiles[0]);
      });
    });

    describe('MobileTimelineView', () => {
      it('renders timeline with mobile-friendly navigation', async () => {
        const mockProps = {
          timeline: mockTimelineMoments,
          couple: mockCouple,
          onMomentSelect: jest.fn(),
        };

        render(<MobileTimelineView {...mockProps} />);

        expect(screen.getByText('The Proposal')).toBeInTheDocument();
        expect(screen.getByText('Central Park, New York')).toBeInTheDocument();
      });

      it('handles autoplay and timeline navigation', async () => {
        const user = userEvent.setup();
        const mockProps = {
          timeline: mockTimelineMoments,
          couple: mockCouple,
          onMomentSelect: jest.fn(),
        };

        render(<MobileTimelineView {...mockProps} />);

        const playButton = screen.getByRole('button', { name: /play/i });
        await user.click(playButton);

        // Should start autoplay
        expect(
          screen.getByRole('button', { name: /pause/i }),
        ).toBeInTheDocument();
      });
    });

    describe('MobileSharingInterface', () => {
      it('provides step-by-step sharing workflow', async () => {
        const user = userEvent.setup();
        const mockProps = {
          couple: mockCouple,
          selectedFiles: mockFiles,
          groups: mockSharingGroups,
          onShare: jest.fn().mockResolvedValue({ success: true }),
          onCreateGroup: jest.fn(),
          onUpdateGroup: jest.fn(),
          onClose: jest.fn(),
        };

        render(<MobileSharingInterface {...mockProps} />);

        expect(screen.getByText('Share Memories')).toBeInTheDocument();
        expect(screen.getByText('Content')).toBeInTheDocument();
        expect(screen.getByText('Audience')).toBeInTheDocument();
        expect(screen.getByText('Platforms')).toBeInTheDocument();

        // Navigate through steps
        const continueButton = screen.getByText('Continue');
        await user.click(continueButton);

        // Should progress to next step
        expect(screen.getByText('Choose Your Audience')).toBeInTheDocument();
      });

      it('handles AI-powered content optimization', async () => {
        const mockSuggestions: ContentSuggestion[] = [
          {
            id: 'suggestion-1',
            title: 'Romantic Engagement Story',
            content:
              'Share the magic of your proposal with friends and family! ✨💍 #EngagedLife #LoveWins',
            platforms: ['instagram', 'facebook'],
            viralPotential: 0.87,
            optimalTiming: new Date('2025-01-15T19:00:00'),
            hashtags: ['#EngagedLife', '#LoveWins', '#ProposalStory'],
            targetAudience: ['family', 'friends'],
            contentType: 'milestone',
          },
        ];

        const mockProps = {
          couple: mockCouple,
          selectedFiles: mockFiles,
          groups: mockSharingGroups,
          contentSuggestions: mockSuggestions,
          onShare: jest.fn().mockResolvedValue({ success: true }),
          onCreateGroup: jest.fn(),
          onUpdateGroup: jest.fn(),
          onClose: jest.fn(),
        };

        render(<MobileSharingInterface {...mockProps} />);

        expect(screen.getByText('AI Suggestions')).toBeInTheDocument();
        expect(
          screen.getByText('Romantic Engagement Story'),
        ).toBeInTheDocument();
        expect(screen.getByText('87% viral')).toBeInTheDocument();
      });
    });

    describe('MobileWedMeLayout', () => {
      it('provides complete mobile navigation experience', async () => {
        const mockProps = {
          couple: mockCouple,
          files: mockFiles,
          timeline: mockTimelineMoments,
          groups: mockSharingGroups,
          notifications: [],
          viralMetrics: mockViralMetrics,
          onFileSelect: jest.fn(),
          onUpload: jest.fn(),
          onShare: jest.fn(),
          onCreateGroup: jest.fn(),
          onUpdateGroup: jest.fn(),
        };

        render(<MobileWedMeLayout {...mockProps} />);

        expect(screen.getByText('WedMe')).toBeInTheDocument();
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Files')).toBeInTheDocument();
        expect(screen.getByText('Timeline')).toBeInTheDocument();
        expect(screen.getByText('Share')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });

      it('handles tab navigation and state management', async () => {
        const user = userEvent.setup();
        const mockProps = {
          couple: mockCouple,
          files: mockFiles,
          timeline: mockTimelineMoments,
          groups: mockSharingGroups,
          notifications: [],
          viralMetrics: mockViralMetrics,
          onFileSelect: jest.fn(),
          onUpload: jest.fn(),
          onShare: jest.fn(),
          onCreateGroup: jest.fn(),
          onUpdateGroup: jest.fn(),
        };

        render(<MobileWedMeLayout {...mockProps} />);

        // Navigate to files tab
        const filesTab = screen.getByText('Files');
        await user.click(filesTab);

        // Should show files interface
        expect(screen.getByText('2 wedding memories')).toBeInTheDocument();
      });

      it('displays notification badges and counts', async () => {
        const mockNotifications = [
          {
            id: '1',
            type: 'like',
            message: 'Sarah liked your photo',
            read: false,
            createdAt: new Date(),
          },
          {
            id: '2',
            type: 'comment',
            message: 'New comment on your timeline',
            read: false,
            createdAt: new Date(),
          },
        ];

        const mockProps = {
          couple: mockCouple,
          files: mockFiles,
          timeline: mockTimelineMoments,
          groups: mockSharingGroups,
          notifications: mockNotifications,
          viralMetrics: mockViralMetrics,
          onFileSelect: jest.fn(),
          onUpload: jest.fn(),
        };

        render(<MobileWedMeLayout {...mockProps} />);

        expect(screen.getByText('2')).toBeInTheDocument(); // Notification badge
      });
    });
  });

  describe('Performance Optimization', () => {
    it('implements lazy loading for images', async () => {
      const mockProps = {
        couple: mockCouple,
        files: mockFiles,
        onFileSelect: jest.fn(),
      };

      render(<MobileFileHub {...mockProps} />);

      const images = screen.getAllByRole('img');
      images.forEach((img) => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    it('optimizes images for mobile devices', async () => {
      const mockProps = {
        couple: mockCouple,
        files: mockFiles,
        onFileSelect: jest.fn(),
      };

      render(<MobileFileHub {...mockProps} />);

      // Should call image optimization
      await waitFor(() => {
        expect(ImageOptimizer.optimizeImage).toHaveBeenCalledWith(
          expect.any(File),
          'mobile',
        );
      });
    });

    it('implements progressive loading for large datasets', async () => {
      const largeFileSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockFiles[0],
        id: `file-${i}`,
        filename: `photo-${i}.jpg`,
      }));

      const mockProps = {
        couple: mockCouple,
        files: largeFileSet,
        onFileSelect: jest.fn(),
      };

      render(<MobileFileHub {...mockProps} />);

      // Should load files in batches
      await waitFor(() => {
        const visibleFiles = screen.getAllByAltText(/photo-\d+/);
        expect(visibleFiles.length).toBeLessThanOrEqual(20); // Batch size
      });
    });
  });

  describe('Integration Testing', () => {
    it('integrates all components in complete user workflow', async () => {
      const user = userEvent.setup();

      const mockProps = {
        couple: mockCouple,
        files: mockFiles,
        timeline: mockTimelineMoments,
        groups: mockSharingGroups,
        notifications: [],
        viralMetrics: mockViralMetrics,
        onFileSelect: jest.fn(),
        onUpload: jest.fn(),
        onShare: jest.fn().mockResolvedValue({ success: true }),
        onCreateGroup: jest.fn(),
        onUpdateGroup: jest.fn(),
      };

      render(<MobileWedMeLayout {...mockProps} />);

      // 1. Start at home, view recent files
      expect(screen.getByText('Welcome back')).toBeInTheDocument();

      // 2. Navigate to files tab
      const filesTab = screen.getByText('Files');
      await user.click(filesTab);

      // 3. Select files
      const firstFile = screen.getByAltText('engagement-photos-1.jpg');
      await user.click(firstFile);

      expect(mockProps.onFileSelect).toHaveBeenCalledWith(mockFiles[0]);

      // 4. Navigate to timeline
      const timelineTab = screen.getByText('Timeline');
      await user.click(timelineTab);

      // 5. View timeline moments
      expect(screen.getByText('The Proposal')).toBeInTheDocument();

      // 6. Navigate to sharing
      const shareTab = screen.getByText('Share');
      await user.click(shareTab);

      // Integration workflow completed successfully
    });

    it('maintains state consistency across components', async () => {
      const user = userEvent.setup();
      let selectedFiles: WeddingFile[] = [];

      const mockProps = {
        couple: mockCouple,
        files: mockFiles,
        timeline: mockTimelineMoments,
        groups: mockSharingGroups,
        notifications: [],
        viralMetrics: mockViralMetrics,
        onFileSelect: (file: WeddingFile) => {
          selectedFiles = [file];
        },
        onUpload: jest.fn(),
        onShare: jest.fn((request) => {
          expect(request.files).toEqual(selectedFiles);
          return Promise.resolve({ success: true });
        }),
        onCreateGroup: jest.fn(),
        onUpdateGroup: jest.fn(),
      };

      render(<MobileWedMeLayout {...mockProps} />);

      // Select file in files tab
      const filesTab = screen.getByText('Files');
      await user.click(filesTab);

      const fileCard = screen.getByAltText('engagement-photos-1.jpg');
      await user.click(fileCard);

      // State should be maintained when sharing
      const floatingShareButton = screen.getByRole('button', {
        name: /upload/i,
      });
      await user.click(floatingShareButton);

      // Should maintain selected file state
      expect(selectedFiles).toEqual([mockFiles[0]]);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles empty file arrays gracefully', () => {
      const mockProps = {
        couple: mockCouple,
        files: [],
        onFileSelect: jest.fn(),
        onUpload: jest.fn(),
      };

      render(<MobileFileHub {...mockProps} />);

      expect(screen.getByText('No files found')).toBeInTheDocument();
      expect(screen.getByText('Upload Your First Photo')).toBeInTheDocument();
    });

    it('handles network failures in sharing workflow', async () => {
      const user = userEvent.setup();
      const mockProps = {
        couple: mockCouple,
        selectedFiles: mockFiles,
        groups: mockSharingGroups,
        onShare: jest.fn().mockRejectedValue(new Error('Network error')),
        onCreateGroup: jest.fn(),
        onUpdateGroup: jest.fn(),
        onClose: jest.fn(),
      };

      render(<MobileSharingInterface {...mockProps} />);

      // Navigate to review and share
      const continueButton = screen.getByText('Continue');
      await user.click(continueButton); // to audience
      await user.click(continueButton); // to platforms
      await user.click(continueButton); // to schedule
      await user.click(continueButton); // to review

      const shareButton = screen.getByText('Share Now');
      await user.click(shareButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(screen.getByText('Share Now')).toBeInTheDocument(); // Button should be re-enabled
      });
    });

    it('handles malformed file data', () => {
      const malformedFiles = [
        {
          ...mockFiles[0],
          thumbnailUrl: undefined,
          metadata: null,
        },
      ];

      const mockProps = {
        couple: mockCouple,
        files: malformedFiles as WeddingFile[],
        onFileSelect: jest.fn(),
      };

      expect(() => {
        render(<MobileFileHub {...mockProps} />);
      }).not.toThrow();

      // Should render with fallback UI
      expect(
        screen.getByText(
          `${mockCouple.partnerOne.firstName} & ${mockCouple.partnerTwo.firstName}`,
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      const mockProps = {
        couple: mockCouple,
        files: mockFiles,
        onFileSelect: jest.fn(),
      };

      render(<MobileFileHub {...mockProps} />);

      // Check for accessible elements
      const searchInput = screen.getByRole('textbox', { name: /search/i });
      expect(searchInput).toHaveAccessibleName();

      const images = screen.getAllByRole('img');
      images.forEach((img) => {
        expect(img).toHaveAttribute('alt');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      const mockProps = {
        timeline: mockTimelineMoments,
        couple: mockCouple,
        onMomentSelect: jest.fn(),
      };

      render(<MobileTimelineView {...mockProps} />);

      // Tab through interactive elements
      await user.tab();
      expect(document.activeElement).toBeVisible();
    });

    it('provides screen reader friendly content', () => {
      const mockProps = {
        couple: mockCouple,
        metrics: mockViralMetrics,
      };

      render(<ViralGrowthDashboard {...mockProps} />);

      // Check for screen reader content
      const metricsRegion = screen.getByRole('region', {
        name: /viral metrics/i,
      });
      expect(metricsRegion).toBeInTheDocument();
    });
  });
});

// Additional test utilities
export const createMockFile = (
  overrides: Partial<WeddingFile> = {},
): WeddingFile => ({
  id: 'test-file',
  filename: 'test.jpg',
  originalName: 'TEST.jpg',
  size: 1024000,
  mimeType: 'image/jpeg',
  category: 'photos',
  url: 'https://example.com/test.jpg',
  thumbnailUrl: 'https://example.com/thumb-test.jpg',
  uploadedAt: new Date(),
  uploadedBy: 'test-user',
  processingStatus: 'completed',
  ...overrides,
});

export const createMockCouple = (
  overrides: Partial<CoupleProfile> = {},
): CoupleProfile => ({
  id: 'test-couple',
  partnerOne: {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
  },
  partnerTwo: {
    firstName: 'Partner',
    lastName: 'User',
    email: 'partner@example.com',
  },
  weddingDate: new Date('2025-06-15'),
  isActive: true,
  createdAt: new Date(),
  ...overrides,
});

export const mockResizeObserver = () => {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
};

export const mockIntersectionObserver = () => {
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
};
