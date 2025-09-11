/**
 * Comprehensive test suite for WedMe Couple Reporting Platform
 * Tests all major components and services
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Components
import { CoupleReportDashboard } from '@/components/couples/reporting/CoupleReportDashboard';
import { WeddingProgressReport } from '@/components/couples/reporting/WeddingProgressReport';
import { BudgetAnalysisReport } from '@/components/couples/reporting/BudgetAnalysisReport';
import { SocialShareableReport } from '@/components/couples/reporting/SocialShareableReport';
import { VendorPerformanceReport } from '@/components/couples/reporting/VendorPerformanceReport';

// Services
import { CoupleReportingService } from '@/services/couples/CoupleReportingService';
import { BudgetOptimizationEngine } from '@/services/couples/BudgetOptimizationEngine';
import { VendorPerformanceAnalyzer } from '@/services/couples/VendorPerformanceAnalyzer';

// Types
import {
  CoupleReportRequest,
  WeddingDetails,
  WeddingBudget,
  SelectedVendor,
  WeddingHighlight,
  ProgressReport,
  BudgetAnalysis,
  VendorReport
} from '@/types/couple-reporting';

// Mock data generators
const createMockWeddingDetails = (): WeddingDetails => ({
  weddingId: 'wedding_123',
  coupleNames: 'Sarah & James',
  weddingDate: new Date('2024-06-15'),
  venue: 'Dream Venue',
  estimatedGuests: 150,
  selectedVendors: [
    {
      id: 'vendor_photo',
      name: 'Amazing Photography',
      category: 'photography',
      status: 'booked',
      contract: {
        signed: true,
        value: 2500,
        paymentSchedule: []
      },
      rating: 4.8,
      communication: {
        lastContact: new Date('2024-01-10'),
        responseTime: 4,
        preferredChannel: 'email'
      }
    }
  ],
  budget: {
    totalBudget: 35000,
    categories: [
      {
        category: 'photography',
        allocatedAmount: 3000,
        spentAmount: 2500,
        remainingAmount: 500,
        percentOfTotal: 8.6,
        status: 'on_budget',
        averageMarketPrice: 2800,
        comparisonToMarket: 'average'
      }
    ],
    weddingDate: new Date('2024-06-15'),
    region: 'London',
    guestCount: 150,
    priorities: ['photography', 'venue', 'catering']
  },
  highlights: [
    {
      highlightId: 'highlight_1',
      type: 'vendor',
      title: 'Photographer Booked',
      description: 'Amazing photography team secured!',
      date: new Date('2024-01-10'),
      category: 'photography',
      rating: 5,
      vendorId: 'vendor_photo',
      images: [],
      completed: true
    }
  ],
  timeline: {
    milestones: [],
    criticalPath: [],
    buffer: 14,
    lastUpdated: new Date()
  }
});

const createMockProgressReport = (): ProgressReport => ({
  overallProgress: 75,
  milestoneStatus: [
    {
      milestoneId: 'milestone_1',
      title: 'Venue Booking',
      description: 'Secure wedding venue',
      category: 'venue',
      dueDate: new Date('2024-02-01'),
      completedDate: new Date('2024-01-15'),
      status: 'completed',
      priority: 'high',
      progress: 100,
      blockers: [],
      dependencies: []
    }
  ],
  vendorCoordination: [
    {
      vendorId: 'vendor_photo',
      vendorName: 'Amazing Photography',
      category: 'photography',
      status: 'excellent',
      communicationScore: 95,
      timelinessScore: 88,
      lastContact: new Date('2024-01-10'),
      nextDeadline: new Date('2024-02-15'),
      outstandingTasks: 2,
      responseTime: 4
    }
  ],
  timelineAdherence: {
    overallScore: 85,
    onTrackMilestones: 8,
    delayedMilestones: 2,
    criticalPathRisk: 'low',
    bufferDays: 14
  },
  budgetUtilization: {
    totalBudget: 35000,
    allocatedAmount: 28000,
    spentAmount: 21000,
    remainingAmount: 14000,
    utilizationRate: 0.6,
    projectedTotal: 33500,
    budgetHealth: 'healthy'
  },
  upcomingTasks: [
    {
      taskId: 'task_1',
      title: 'Final Menu Tasting',
      description: 'Attend final menu tasting with caterer',
      dueDate: new Date('2024-02-20'),
      priority: 'high',
      estimatedTime: 120,
      category: 'catering',
      dependencies: []
    }
  ],
  riskFactors: [],
  weddingCountdown: {
    daysRemaining: 120,
    weeksRemaining: 17,
    monthsRemaining: 4,
    milestonesThisWeek: 3,
    upcomingDeadlines: []
  }
});

describe('CoupleReportingPlatform', () => {
  let mockWeddingDetails: WeddingDetails;
  let mockProgressReport: ProgressReport;
  let reportingService: CoupleReportingService;
  let budgetEngine: BudgetOptimizationEngine;
  let vendorAnalyzer: VendorPerformanceAnalyzer;

  beforeEach(() => {
    mockWeddingDetails = createMockWeddingDetails();
    mockProgressReport = createMockProgressReport();
    reportingService = CoupleReportingService.getInstance();
    budgetEngine = BudgetOptimizationEngine.getInstance();
    vendorAnalyzer = VendorPerformanceAnalyzer.getInstance();

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CoupleReportDashboard Component', () => {
    const defaultProps = {
      coupleId: 'couple_123',
      weddingId: 'wedding_123',
      weddingDetails: mockWeddingDetails,
      onReportGenerate: jest.fn()
    };

    it('renders wedding header with couple names and date', () => {
      render(<CoupleReportDashboard {...defaultProps} />);
      
      expect(screen.getByText('Sarah & James Wedding Journey')).toBeInTheDocument();
      expect(screen.getByText(/June 15, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/days to go!/)).toBeInTheDocument();
    });

    it('displays progress overview section', async () => {
      render(<CoupleReportDashboard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Your Wedding at a Glance')).toBeInTheDocument();
      });
    });

    it('shows report type selector with all options', () => {
      render(<CoupleReportDashboard {...defaultProps} />);
      
      expect(screen.getByText('Progress Report')).toBeInTheDocument();
      expect(screen.getByText('Budget Analysis')).toBeInTheDocument();
      expect(screen.getByText('Vendor Report Card')).toBeInTheDocument();
      expect(screen.getByText('Social Highlights')).toBeInTheDocument();
    });

    it('allows switching between report types', async () => {
      render(<CoupleReportDashboard {...defaultProps} />);
      
      const budgetButton = screen.getByText('Budget Analysis');
      fireEvent.click(budgetButton);
      
      await waitFor(() => {
        expect(screen.getByText('Smart insights to optimize your wedding spending')).toBeInTheDocument();
      });
    });

    it('handles report generation correctly', async () => {
      const mockOnReportGenerate = jest.fn();
      render(<CoupleReportDashboard {...defaultProps} onReportGenerate={mockOnReportGenerate} />);
      
      const generateButton = screen.getByText('Generate Full Progress Report');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(mockOnReportGenerate).toHaveBeenCalledWith(expect.objectContaining({
          coupleId: 'couple_123',
          weddingId: 'wedding_123',
          reportType: 'progress'
        }));
      });
    });
  });

  describe('WeddingProgressReport Component', () => {
    const defaultProps = {
      progressData: mockProgressReport,
      onGenerateReport: jest.fn(),
      isPending: false
    };

    it('displays overall progress percentage', () => {
      render(<WeddingProgressReport {...defaultProps} />);
      
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('shows milestone timeline with status indicators', () => {
      render(<WeddingProgressReport {...defaultProps} />);
      
      expect(screen.getByText('Planning Milestones')).toBeInTheDocument();
      expect(screen.getByText('Venue Booking')).toBeInTheDocument();
    });

    it('displays vendor coordination status', () => {
      render(<WeddingProgressReport {...defaultProps} />);
      
      expect(screen.getByText('Vendor Coordination Status')).toBeInTheDocument();
      expect(screen.getByText('Amazing Photography')).toBeInTheDocument();
    });

    it('shows upcoming tasks section', () => {
      render(<WeddingProgressReport {...defaultProps} />);
      
      expect(screen.getByText('Upcoming Tasks')).toBeInTheDocument();
      expect(screen.getByText('Final Menu Tasting')).toBeInTheDocument();
    });

    it('handles loading state correctly', () => {
      render(<WeddingProgressReport {...defaultProps} progressData={null} />);
      
      expect(screen.getByText('Analyzing your budget...')).toBeInTheDocument();
    });
  });

  describe('BudgetAnalysisReport Component', () => {
    const defaultProps = {
      weddingBudget: mockWeddingDetails.budget,
      onGenerateReport: jest.fn(),
      isPending: false
    };

    it('displays budget summary cards', async () => {
      render(<BudgetAnalysisReport {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Budget')).toBeInTheDocument();
        expect(screen.getByText('£35,000')).toBeInTheDocument();
      });
    });

    it('shows category breakdown section', async () => {
      render(<BudgetAnalysisReport {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Budget Breakdown by Category')).toBeInTheDocument();
      });
    });

    it('displays savings opportunities', async () => {
      render(<BudgetAnalysisReport {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('💰 Smart Savings Opportunities')).toBeInTheDocument();
      });
    });

    it('shows market price comparison', async () => {
      render(<BudgetAnalysisReport {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('📊 Market Price Comparison')).toBeInTheDocument();
      });
    });
  });

  describe('SocialShareableReport Component', () => {
    const defaultProps = {
      weddingHighlights: mockWeddingDetails.highlights,
      onGenerateReport: jest.fn(),
      isPending: false
    };

    it('displays template selector options', () => {
      render(<SocialShareableReport {...defaultProps} />);
      
      expect(screen.getByText('Instagram Story')).toBeInTheDocument();
      expect(screen.getByText('Instagram Post')).toBeInTheDocument();
      expect(screen.getByText('Carousel Post')).toBeInTheDocument();
    });

    it('shows wedding stats infographic', () => {
      render(<SocialShareableReport {...defaultProps} />);
      
      expect(screen.getByText('📈 Your Wedding by the Numbers')).toBeInTheDocument();
    });

    it('displays vendor shoutouts section', () => {
      render(<SocialShareableReport {...defaultProps} />);
      
      expect(screen.getByText('🎉 Vendor Love')).toBeInTheDocument();
    });

    it('shows viral growth features', () => {
      render(<SocialShareableReport {...defaultProps} />);
      
      expect(screen.getByText('🚀 Share the Love')).toBeInTheDocument();
      expect(screen.getByText('Tag Your Vendors')).toBeInTheDocument();
    });

    it('displays hashtag recommendations', () => {
      render(<SocialShareableReport {...defaultProps} />);
      
      expect(screen.getByText('📱 Trending Hashtags for You')).toBeInTheDocument();
    });
  });

  describe('VendorPerformanceReport Component', () => {
    const defaultProps = {
      vendors: mockWeddingDetails.selectedVendors,
      onGenerateReport: jest.fn(),
      isPending: false
    };

    it('displays overall team performance score', async () => {
      render(<VendorPerformanceReport {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('🌟 Your Dream Team Performance')).toBeInTheDocument();
      });
    });

    it('shows individual vendor performance cards', async () => {
      render(<VendorPerformanceReport {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Individual Vendor Performance')).toBeInTheDocument();
      });
    });

    it('displays performance comparison chart', async () => {
      render(<VendorPerformanceReport {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('📊 Performance Comparison')).toBeInTheDocument();
      });
    });

    it('shows AI-powered recommendations', async () => {
      render(<VendorPerformanceReport {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('🎯 AI-Powered Recommendations')).toBeInTheDocument();
      });
    });
  });

  describe('CoupleReportingService', () => {
    it('generates personalized progress reports', async () => {
      const request: CoupleReportRequest = {
        coupleId: 'couple_123',
        weddingId: 'wedding_123',
        reportType: 'progress',
        timeframe: { start: new Date('2024-01-01'), end: new Date() },
        includeVendors: ['vendor_photo'],
        sharingSettings: {
          allowPublicSharing: true,
          includeVendorTags: true,
          watermarkStyle: 'elegant',
          socialPlatforms: ['instagram']
        },
        visualStyle: 'romantic_elegant',
        privacyLevel: 'friends'
      };

      const report = await reportingService.generatePersonalizedReport(request);
      
      expect(report).toBeDefined();
      expect(report.reportType).toBe('progress');
      expect(report.coupleId).toBe('couple_123');
      expect(report.weddingId).toBe('wedding_123');
      expect(report.reportId).toMatch(/^report_/);
    });

    it('tracks wedding progress accurately', async () => {
      const progressReport = await reportingService.trackWeddingProgress('wedding_123');
      
      expect(progressReport).toBeDefined();
      expect(typeof progressReport.overallProgress).toBe('number');
      expect(progressReport.overallProgress).toBeGreaterThanOrEqual(0);
      expect(progressReport.overallProgress).toBeLessThanOrEqual(100);
    });

    it('creates shareable social content', async () => {
      const insights = {
        milestones: [],
        vendorHighlights: mockWeddingDetails.highlights,
        budgetInsights: [],
        timelineMetrics: [],
        personalizedRecommendations: [],
        socialShareableStats: []
      };

      const shareableContent = await reportingService.createShareableInsights(insights);
      
      expect(shareableContent).toBeDefined();
      expect(shareableContent.contentId).toBeDefined();
      expect(shareableContent.platform).toBeDefined();
    });
  });

  describe('BudgetOptimizationEngine', () => {
    it('analyzes budget and identifies opportunities', async () => {
      const analysis = await budgetEngine.analyzeBudget(mockWeddingDetails.budget);
      
      expect(analysis).toBeDefined();
      expect(analysis.totalBudget).toBe(35000);
      expect(analysis.categoryBreakdown).toHaveLength(1);
      expect(analysis.savingsOpportunities).toBeDefined();
      expect(Array.isArray(analysis.savingsOpportunities)).toBe(true);
    });

    it('calculates budget health scores', async () => {
      const analysis = await budgetEngine.analyzeBudget(mockWeddingDetails.budget);
      
      expect(analysis.budgetHealth).toBeDefined();
      expect(analysis.budgetHealth.overallScore).toBeGreaterThanOrEqual(0);
      expect(analysis.budgetHealth.overallScore).toBeLessThanOrEqual(100);
      expect(analysis.budgetHealth.factors).toBeDefined();
    });

    it('identifies realistic savings opportunities', async () => {
      const analysis = await budgetEngine.analyzeBudget(mockWeddingDetails.budget);
      
      analysis.savingsOpportunities.forEach(opportunity => {
        expect(opportunity.potentialSavings).toBeGreaterThan(0);
        expect(['low', 'medium', 'high']).toContain(opportunity.effort);
        expect(['low', 'medium', 'high']).toContain(opportunity.risk);
        expect(opportunity.actionSteps).toBeDefined();
        expect(opportunity.actionSteps.length).toBeGreaterThan(0);
      });
    });
  });

  describe('VendorPerformanceAnalyzer', () => {
    it('analyzes vendor performance comprehensively', async () => {
      const vendorReport = await vendorAnalyzer.analyzeVendorPerformance(mockWeddingDetails.selectedVendors);
      
      expect(vendorReport).toBeDefined();
      expect(vendorReport.overallScore).toBeGreaterThanOrEqual(0);
      expect(vendorReport.overallScore).toBeLessThanOrEqual(100);
      expect(vendorReport.vendorPerformance).toBeDefined();
      expect(Array.isArray(vendorReport.vendorPerformance)).toBe(true);
    });

    it('calculates accurate performance metrics', async () => {
      const vendorReport = await vendorAnalyzer.analyzeVendorPerformance(mockWeddingDetails.selectedVendors);
      
      vendorReport.vendorPerformance.forEach(vendor => {
        expect(vendor.overallScore).toBeGreaterThanOrEqual(0);
        expect(vendor.overallScore).toBeLessThanOrEqual(100);
        expect(vendor.responsiveness).toBeGreaterThanOrEqual(0);
        expect(vendor.quality).toBeGreaterThanOrEqual(0);
        expect(vendor.timeliness).toBeGreaterThanOrEqual(0);
      });
    });

    it('provides actionable recommendations', async () => {
      const vendorReport = await vendorAnalyzer.analyzeVendorPerformance(mockWeddingDetails.selectedVendors);
      
      expect(vendorReport.recommendationStrength).toBeDefined();
      expect(typeof vendorReport.recommendationStrength.overallScore).toBe('number');
      expect(Array.isArray(vendorReport.recommendationStrength.topPerformers)).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('generates reports within performance benchmarks', async () => {
      const startTime = Date.now();
      
      const request: CoupleReportRequest = {
        coupleId: 'couple_123',
        weddingId: 'wedding_123',
        reportType: 'progress',
        timeframe: { start: new Date('2024-01-01'), end: new Date() },
        includeVendors: ['vendor_photo'],
        sharingSettings: {
          allowPublicSharing: true,
          includeVendorTags: true,
          watermarkStyle: 'elegant',
          socialPlatforms: ['instagram']
        },
        visualStyle: 'romantic_elegant',
        privacyLevel: 'friends'
      };
      
      const report = await reportingService.generatePersonalizedReport(request);
      const generationTime = Date.now() - startTime;
      
      // Performance target: <3s for standard reports
      expect(generationTime).toBeLessThan(3000);
      expect(report).toBeDefined();
    });

    it('handles concurrent report generation efficiently', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        coupleId: `couple_${i}`,
        weddingId: `wedding_${i}`,
        reportType: 'progress' as const,
        timeframe: { start: new Date('2024-01-01'), end: new Date() },
        includeVendors: ['vendor_photo'],
        sharingSettings: {
          allowPublicSharing: true,
          includeVendorTags: true,
          watermarkStyle: 'elegant' as const,
          socialPlatforms: ['instagram' as const]
        },
        visualStyle: 'romantic_elegant' as const,
        privacyLevel: 'friends' as const
      }));
      
      const startTime = Date.now();
      const reports = await Promise.all(
        requests.map(request => reportingService.generatePersonalizedReport(request))
      );
      const totalTime = Date.now() - startTime;
      
      expect(reports).toHaveLength(5);
      expect(totalTime).toBeLessThan(10000); // All 5 reports in <10s
      reports.forEach(report => expect(report).toBeDefined());
    });
  });

  describe('Business Logic Validation', () => {
    it('respects privacy settings in generated reports', async () => {
      const request: CoupleReportRequest = {
        coupleId: 'couple_123',
        weddingId: 'wedding_123',
        reportType: 'budget',
        timeframe: { start: new Date('2024-01-01'), end: new Date() },
        includeVendors: ['vendor_photo'],
        sharingSettings: {
          allowPublicSharing: false,
          includeVendorTags: false,
          watermarkStyle: 'none',
          socialPlatforms: []
        },
        visualStyle: 'modern_minimalist',
        privacyLevel: 'private'
      };
      
      const report = await reportingService.generatePersonalizedReport(request);
      
      expect(report.privacySettings.isPublic).toBe(false);
      expect(report.privacySettings.allowVendorSharing).toBe(false);
      expect(report.privacySettings.hideBudgetDetails).toBe(true);
    });

    it('generates appropriate recommendations based on wedding context', async () => {
      const analysis = await budgetEngine.analyzeBudget(mockWeddingDetails.budget);
      
      // Verify recommendations are relevant to wedding industry
      analysis.savingsOpportunities.forEach(opportunity => {
        expect(['venue', 'catering', 'photography', 'flowers', 'music', 'attire', 'multiple'])
          .toContain(opportunity.category);
        expect(opportunity.description).toMatch(/wedding|vendor|ceremony|reception/i);
      });
    });

    it('maintains data consistency across report types', async () => {
      const progressRequest: CoupleReportRequest = {
        coupleId: 'couple_123',
        weddingId: 'wedding_123',
        reportType: 'progress',
        timeframe: { start: new Date('2024-01-01'), end: new Date() },
        includeVendors: ['vendor_photo'],
        sharingSettings: {
          allowPublicSharing: true,
          includeVendorTags: true,
          watermarkStyle: 'elegant',
          socialPlatforms: ['instagram']
        },
        visualStyle: 'romantic_elegant',
        privacyLevel: 'friends'
      };

      const budgetRequest: CoupleReportRequest = {
        ...progressRequest,
        reportType: 'budget'
      };
      
      const [progressReport, budgetReport] = await Promise.all([
        reportingService.generatePersonalizedReport(progressRequest),
        reportingService.generatePersonalizedReport(budgetRequest)
      ]);
      
      // Both reports should reference the same wedding
      expect(progressReport.coupleId).toBe(budgetReport.coupleId);
      expect(progressReport.weddingId).toBe(budgetReport.weddingId);
    });
  });
});