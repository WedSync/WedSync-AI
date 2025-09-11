'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  TrendingUp,
  MapPin,
  Clock,
  Users,
  Heart,
  Camera,
  Music,
  Flower,
  Utensils,
  Car,
  Gift,
  Star,
  Sun,
  Cloud,
  CloudRain,
  Thermometer,
  Wind,
  Eye,
  ChevronDown,
  ChevronUp,
  Filter,
  Download,
  Share2,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Zap,
  Target,
  Award,
  AlertTriangle,
  Info,
} from 'lucide-react';

// Type imports
import type {
  WeddingAnalyticsPatternsProps,
  SeasonalPattern,
  VenueTypePattern,
  WeddingDayTimeline,
  ServiceDemandPattern,
  WeatherImpactData,
  GeographicPattern,
  BudgetDistributionPattern,
  WeddingTrendAnalysis,
  SeasonalityMetric,
  VenuePerformanceMetric,
  ServiceBookingPattern,
  ClientBehaviorPattern,
  MarketTrendIndicator,
  WeddingAnalyticsInsight,
} from '@/types/analytics';

// Mock data generators for wedding-specific patterns
const generateSeasonalPatterns = (): SeasonalPattern[] => [
  {
    season: 'Spring (Mar-May)',
    bookingsCount: 156,
    averageRevenue: 2840,
    popularServices: ['Photography', 'Flowers', 'Outdoor Venues'],
    peakMonths: ['April', 'May'],
    bookingTrend: 23.5,
    seasonalFactors: [
      'Perfect weather conditions',
      'Garden venues at their best',
      'Cherry blossom photography popular',
    ],
    colorCode: '#10B981',
    icon: Flower,
  },
  {
    season: 'Summer (Jun-Aug)',
    bookingsCount: 287,
    averageRevenue: 3420,
    popularServices: ['Outdoor Photography', 'Garden Venues', 'Live Music'],
    peakMonths: ['June', 'July'],
    bookingTrend: 45.2,
    seasonalFactors: [
      'Peak wedding season',
      'Longest daylight hours',
      'School holidays for guests',
    ],
    colorCode: '#F59E0B',
    icon: Sun,
  },
  {
    season: 'Autumn (Sep-Nov)',
    bookingsCount: 198,
    averageRevenue: 3180,
    popularServices: ['Rustic Venues', 'Warm Lighting', 'Seasonal Decor'],
    peakMonths: ['September', 'October'],
    bookingTrend: 18.7,
    seasonalFactors: [
      'Beautiful autumn colors',
      'Harvest season atmosphere',
      'Comfortable temperatures',
    ],
    colorCode: '#DC2626',
    icon: Wind,
  },
  {
    season: 'Winter (Dec-Feb)',
    bookingsCount: 89,
    averageRevenue: 2950,
    popularServices: ['Indoor Venues', 'Fairy Lights', 'Cozy Atmosphere'],
    peakMonths: ['December'],
    bookingTrend: -12.3,
    seasonalFactors: [
      'Holiday season overlap',
      'Limited daylight',
      'Weather uncertainty',
    ],
    colorCode: '#3B82F6',
    icon: CloudRain,
  },
];

const generateVenuePatterns = (): VenueTypePattern[] => [
  {
    venueType: 'Garden/Outdoor',
    bookingsPercentage: 34.2,
    averageBudget: 3800,
    seasonalPreference: 'Spring/Summer',
    commonServices: ['Photography', 'Floral Design', 'Weather Backup'],
    clientSatisfaction: 4.7,
    bookingLead: 8.5,
    challenges: ['Weather dependency', 'Backup plans needed'],
    opportunities: ['Extended seasons', 'Unique locations'],
  },
  {
    venueType: 'Historic Buildings',
    bookingsPercentage: 28.6,
    averageBudget: 4200,
    seasonalPreference: 'Year-round',
    commonServices: [
      'Traditional Photography',
      'Classic Catering',
      'Heritage Tours',
    ],
    clientSatisfaction: 4.5,
    bookingLead: 12.3,
    challenges: ['Strict regulations', 'Limited facilities'],
    opportunities: ['Unique character', 'Premium pricing'],
  },
  {
    venueType: 'Modern Hotels',
    bookingsPercentage: 22.1,
    averageBudget: 3500,
    seasonalPreference: 'Year-round',
    commonServices: [
      'Comprehensive Packages',
      'Accommodation',
      'Event Coordination',
    ],
    clientSatisfaction: 4.3,
    bookingLead: 6.8,
    challenges: ['Generic feel', 'Package limitations'],
    opportunities: ['Convenience', 'All-in-one service'],
  },
  {
    venueType: 'Barns/Rustic',
    bookingsPercentage: 15.1,
    averageBudget: 2900,
    seasonalPreference: 'Autumn/Spring',
    commonServices: ['Rustic Decor', 'Country Catering', 'Acoustic Music'],
    clientSatisfaction: 4.6,
    bookingLead: 9.2,
    challenges: ['Weather exposure', 'Limited amenities'],
    opportunities: ['Authentic atmosphere', 'Photography appeal'],
  },
];

const generateWeddingDayTimeline = (): WeddingDayTimeline => ({
  timeSlots: [
    {
      time: '08:00-10:00',
      activity: 'Preparation',
      popularServices: ['Hair & Makeup', 'Photography'],
      averageDuration: 120,
      stressLevel: 'Medium',
      criticalFactors: ['Timing coordination', 'Venue access'],
    },
    {
      time: '10:00-12:00',
      activity: 'Getting Ready',
      popularServices: ['Photography', 'Videography'],
      averageDuration: 120,
      stressLevel: 'High',
      criticalFactors: ['Natural lighting', 'Space management'],
    },
    {
      time: '12:00-14:00',
      activity: 'Ceremony',
      popularServices: ['Photography', 'Videography', 'Music'],
      averageDuration: 60,
      stressLevel: 'Very High',
      criticalFactors: [
        'Weather backup',
        'Sound systems',
        'Guest coordination',
      ],
    },
    {
      time: '14:00-16:00',
      activity: 'Photos & Cocktails',
      popularServices: ['Photography', 'Catering', 'Bar Service'],
      averageDuration: 120,
      stressLevel: 'Medium',
      criticalFactors: ['Golden hour timing', 'Guest entertainment'],
    },
    {
      time: '16:00-22:00',
      activity: 'Reception',
      popularServices: ['Catering', 'DJ/Music', 'Photography'],
      averageDuration: 360,
      stressLevel: 'Low',
      criticalFactors: ['Food service timing', 'Entertainment flow'],
    },
    {
      time: '22:00-24:00',
      activity: 'Late Night',
      popularServices: ['Music', 'Late Bar', 'Transport'],
      averageDuration: 120,
      stressLevel: 'Low',
      criticalFactors: ['Noise restrictions', 'Guest transport'],
    },
  ],
  peakStressTimes: ['11:30-12:30', '14:30-15:30'],
  criticalMilestones: [
    { time: '12:00', milestone: 'Ceremony Start', importance: 'Critical' },
    { time: '14:00', milestone: 'Photos Begin', importance: 'High' },
    { time: '18:00', milestone: 'Dinner Service', importance: 'High' },
    { time: '20:00', milestone: 'First Dance', importance: 'Medium' },
  ],
});

const generateServiceDemandPatterns = (): ServiceDemandPattern[] => [
  {
    service: 'Photography',
    demandPercentage: 98.5,
    averageBookingLead: 8.2,
    peakSeasons: ['Spring', 'Summer'],
    priceRange: { min: 800, max: 3500, average: 1850 },
    marketGrowth: 12.3,
    competitionLevel: 'High',
    opportunities: [
      'Drone photography',
      'Same-day editing',
      'Social media packages',
    ],
  },
  {
    service: 'Catering',
    demandPercentage: 94.2,
    averageBookingLead: 6.5,
    peakSeasons: ['All year'],
    priceRange: { min: 1200, max: 8000, average: 3200 },
    marketGrowth: 8.7,
    competitionLevel: 'Medium',
    opportunities: [
      'Dietary specializations',
      'Interactive food stations',
      'Sustainable options',
    ],
  },
  {
    service: 'Floral Design',
    demandPercentage: 87.3,
    averageBookingLead: 4.2,
    peakSeasons: ['Spring', 'Summer'],
    priceRange: { min: 400, max: 2500, average: 950 },
    marketGrowth: 15.6,
    competitionLevel: 'Medium',
    opportunities: [
      'Dried flowers',
      'Sustainable arrangements',
      'DIY packages',
    ],
  },
  {
    service: 'Music/DJ',
    demandPercentage: 89.1,
    averageBookingLead: 5.8,
    peakSeasons: ['All year'],
    priceRange: { min: 300, max: 1800, average: 750 },
    marketGrowth: 6.2,
    competitionLevel: 'High',
    opportunities: [
      'Live streaming',
      'Interactive playlists',
      'Acoustic ceremonies',
    ],
  },
  {
    service: 'Videography',
    demandPercentage: 76.4,
    averageBookingLead: 7.1,
    peakSeasons: ['Spring', 'Summer'],
    priceRange: { min: 600, max: 2800, average: 1400 },
    marketGrowth: 22.8,
    competitionLevel: 'Medium',
    opportunities: [
      'Same-day highlights',
      'Drone footage',
      'Documentary style',
    ],
  },
];

const generateGeographicPatterns = (): GeographicPattern[] => [
  {
    region: 'London & South East',
    marketShare: 42.3,
    averageBudget: 4200,
    bookingDensity: 'Very High',
    competitionLevel: 'Extreme',
    preferredStyles: ['Modern', 'Luxury', 'Urban'],
    seasonalVariation: 'Low',
    opportunities: [
      'Destination weddings',
      'Micro-weddings',
      'Luxury services',
    ],
    challenges: ['High competition', 'Venue costs', 'Travel logistics'],
  },
  {
    region: 'Cotswolds',
    marketShare: 18.7,
    averageBudget: 3800,
    bookingDensity: 'High',
    competitionLevel: 'Medium',
    preferredStyles: ['Rustic', 'Country', 'Garden'],
    seasonalVariation: 'High',
    opportunities: [
      'Destination packages',
      'Multi-day events',
      'Photography tourism',
    ],
    challenges: [
      'Seasonal dependency',
      'Accommodation limited',
      'Weather risks',
    ],
  },
  {
    region: 'Lake District',
    marketShare: 12.1,
    averageBudget: 3200,
    bookingDensity: 'Medium',
    competitionLevel: 'Low',
    preferredStyles: ['Natural', 'Adventure', 'Intimate'],
    seasonalVariation: 'Very High',
    opportunities: [
      'Adventure weddings',
      'Small intimate ceremonies',
      'Photography workshops',
    ],
    challenges: ['Weather dependency', 'Limited vendors', 'Access issues'],
  },
  {
    region: 'Scotland',
    marketShare: 15.2,
    averageBudget: 3500,
    bookingDensity: 'Medium',
    competitionLevel: 'Low',
    preferredStyles: ['Traditional', 'Castle', 'Highland'],
    seasonalVariation: 'High',
    opportunities: [
      'Castle venues',
      'Traditional ceremonies',
      'Heritage experiences',
    ],
    challenges: [
      'Weather unpredictability',
      'Travel distances',
      'Cultural requirements',
    ],
  },
  {
    region: 'Other UK',
    marketShare: 11.7,
    averageBudget: 2900,
    bookingDensity: 'Low',
    competitionLevel: 'Very Low',
    preferredStyles: ['Local', 'Budget-friendly', 'Community'],
    seasonalVariation: 'Medium',
    opportunities: [
      'Budget services',
      'Community venues',
      'Local partnerships',
    ],
    challenges: ['Lower budgets', 'Limited venues', 'Service availability'],
  },
];

const WeddingAnalyticsPatterns: React.FC<WeddingAnalyticsPatternsProps> = ({
  dateRange,
  selectedPatterns = ['seasonal', 'venue', 'service', 'geographic'],
  comparisonMode = false,
  showPredictions = true,
  detailLevel = 'standard',
  onPatternSelect,
  onInsightGenerate,
  className = '',
}) => {
  // State management
  const [activePattern, setActivePattern] = useState<string>('seasonal');
  const [seasonalData, setSeasonalData] = useState<SeasonalPattern[]>(
    generateSeasonalPatterns(),
  );
  const [venueData, setVenueData] = useState<VenueTypePattern[]>(
    generateVenuePatterns(),
  );
  const [timelineData, setTimelineData] = useState<WeddingDayTimeline>(
    generateWeddingDayTimeline(),
  );
  const [serviceData, setServiceData] = useState<ServiceDemandPattern[]>(
    generateServiceDemandPatterns(),
  );
  const [geographicData, setGeographicData] = useState<GeographicPattern[]>(
    generateGeographicPatterns(),
  );
  const [selectedSeason, setSelectedSeason] =
    useState<string>('Summer (Jun-Aug)');
  const [selectedVenue, setSelectedVenue] = useState<string>('Garden/Outdoor');
  const [showInsights, setShowInsights] = useState<boolean>(true);
  const [animationEnabled, setAnimationEnabled] = useState<boolean>(true);

  // Generate insights based on patterns
  const generateInsights = useCallback((): WeddingAnalyticsInsight[] => {
    return [
      {
        id: 'seasonal-peak',
        type: 'opportunity',
        title: 'Summer Peak Optimization',
        description:
          'Summer bookings are 45% higher than average. Consider premium pricing and additional service packages.',
        impact: 'high',
        actionable: true,
        relatedPattern: 'seasonal',
      },
      {
        id: 'venue-garden-growth',
        type: 'trend',
        title: 'Garden Venue Dominance',
        description:
          'Garden venues account for 34% of bookings with highest satisfaction (4.7/5). Weather backup services in high demand.',
        impact: 'medium',
        actionable: true,
        relatedPattern: 'venue',
      },
      {
        id: 'service-videography-boom',
        type: 'growth',
        title: 'Videography Market Explosion',
        description:
          'Videography demand growing 22.8% annually. Same-day highlight reels becoming essential.',
        impact: 'high',
        actionable: true,
        relatedPattern: 'service',
      },
      {
        id: 'geographic-cotswolds',
        type: 'opportunity',
        title: 'Cotswolds Destination Weddings',
        description:
          'Cotswolds shows 18.7% market share with lower competition. Multi-day event packages recommended.',
        impact: 'medium',
        actionable: true,
        relatedPattern: 'geographic',
      },
    ];
  }, []);

  const insights = useMemo(() => generateInsights(), [generateInsights]);

  // Pattern components
  const SeasonalPatternView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Seasonal Booking Patterns
        </h3>
        <div className="flex space-x-2">
          <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">
            2024
          </button>
          <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full">
            2023
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {seasonalData.map((season, index) => (
          <motion.div
            key={season.season}
            className={`bg-white rounded-xl shadow-sm border-2 p-6 cursor-pointer transition-all ${
              selectedSeason === season.season
                ? 'border-blue-500 shadow-lg'
                : 'border-gray-200'
            }`}
            onClick={() => setSelectedSeason(season.season)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`p-3 rounded-full`}
                style={{ backgroundColor: `${season.colorCode}20` }}
              >
                <season.icon
                  className="w-6 h-6"
                  style={{ color: season.colorCode }}
                />
              </div>
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  season.bookingTrend > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {season.bookingTrend > 0 ? '+' : ''}
                {season.bookingTrend}%
              </div>
            </div>

            <h4 className="font-semibold text-gray-900 mb-2">
              {season.season}
            </h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium">{season.bookingsCount}</span>{' '}
                bookings
              </p>
              <p>
                <span className="font-medium">
                  £{season.averageRevenue.toLocaleString()}
                </span>{' '}
                avg revenue
              </p>
            </div>

            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-2">Peak months</div>
              <div className="flex flex-wrap gap-1">
                {season.peakMonths.map((month) => (
                  <span
                    key={month}
                    className="px-2 py-1 bg-gray-100 text-xs rounded-full"
                  >
                    {month}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {selectedSeason && (
        <motion.div
          className="bg-white rounded-xl shadow-sm p-6"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          {seasonalData
            .filter((s) => s.season === selectedSeason)
            .map((season) => (
              <div key={season.season}>
                <h4 className="font-semibold text-gray-900 mb-4">
                  {season.season} - Detailed Analysis
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">
                      Popular Services
                    </h5>
                    <div className="space-y-2">
                      {season.popularServices.map((service, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                        >
                          <span className="text-sm">{service}</span>
                          <span className="text-xs text-gray-500">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">
                      Seasonal Factors
                    </h5>
                    <div className="space-y-2">
                      {season.seasonalFactors.map((factor, idx) => (
                        <div key={idx} className="flex items-center py-2">
                          <div
                            className="w-2 h-2 rounded-full mr-3"
                            style={{ backgroundColor: season.colorCode }}
                          ></div>
                          <span className="text-sm text-gray-700">
                            {factor}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </motion.div>
      )}
    </div>
  );

  const VenuePatternView = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Venue Type Performance
      </h3>

      <div className="grid grid-cols-1 gap-4">
        {venueData.map((venue, index) => (
          <motion.div
            key={venue.venueType}
            className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all ${
              selectedVenue === venue.venueType
                ? 'border-blue-500 shadow-lg'
                : 'border-gray-200'
            }`}
            onClick={() => setSelectedVenue(venue.venueType)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                {venue.venueType}
              </h4>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {venue.bookingsPercentage}%
                  </div>
                  <div className="text-xs text-gray-500">Market Share</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  £{venue.averageBudget.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Avg Budget</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {venue.clientSatisfaction}★
                </div>
                <div className="text-xs text-gray-500">Satisfaction</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {venue.bookingLead} mo
                </div>
                <div className="text-xs text-gray-500">Lead Time</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {venue.seasonalPreference}
                </div>
                <div className="text-xs text-gray-500">Peak Season</div>
              </div>
            </div>

            {selectedVenue === venue.venueType && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-t pt-4 mt-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">
                      Opportunities
                    </h5>
                    <div className="space-y-2">
                      {venue.opportunities.map((opp, idx) => (
                        <div key={idx} className="flex items-center">
                          <Zap className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm text-gray-700">{opp}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">
                      Challenges
                    </h5>
                    <div className="space-y-2">
                      {venue.challenges.map((challenge, idx) => (
                        <div key={idx} className="flex items-center">
                          <AlertTriangle className="w-4 h-4 text-orange-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            {challenge}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );

  const ServiceDemandView = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Service Demand Analysis
      </h3>

      <div className="grid grid-cols-1 gap-4">
        {serviceData.map((service, index) => (
          <motion.div
            key={service.service}
            className="bg-white rounded-xl shadow-sm border p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                {service.service}
              </h4>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  service.competitionLevel === 'High'
                    ? 'bg-red-100 text-red-700'
                    : service.competitionLevel === 'Medium'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-green-100 text-green-700'
                }`}
              >
                {service.competitionLevel} Competition
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {service.demandPercentage}%
                </div>
                <div className="text-xs text-gray-500">Demand Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {service.averageBookingLead}mo
                </div>
                <div className="text-xs text-gray-500">Booking Lead</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  £{service.priceRange.average}
                </div>
                <div className="text-xs text-gray-500">Avg Price</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  +{service.marketGrowth}%
                </div>
                <div className="text-xs text-gray-500">Growth Rate</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  £{service.priceRange.min}-{service.priceRange.max}
                </div>
                <div className="text-xs text-gray-500">Price Range</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h5 className="font-medium text-gray-900 mb-3">
                Growth Opportunities
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {service.opportunities.map((opp, idx) => (
                  <div
                    key={idx}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                  >
                    <div className="flex items-center">
                      <Target className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-900">
                        {opp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const GeographicPatternView = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Geographic Market Analysis
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {geographicData.map((region, index) => (
          <motion.div
            key={region.region}
            className="bg-white rounded-xl shadow-sm border p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                {region.region}
              </h4>
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900">
                  {region.marketShare}%
                </div>
                <div className="text-xs text-gray-500">Market Share</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  £{region.averageBudget.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Avg Budget</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {region.bookingDensity}
                </div>
                <div className="text-xs text-gray-500">Booking Density</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {region.seasonalVariation}
                </div>
                <div className="text-xs text-gray-500">Seasonal Var</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">
                  Popular Styles
                </h5>
                <div className="flex flex-wrap gap-2">
                  {region.preferredStyles.map((style) => (
                    <span
                      key={style}
                      className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                    >
                      {style}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Opportunities
                  </h5>
                  <div className="space-y-1">
                    {region.opportunities.slice(0, 3).map((opp, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-green-700 flex items-center"
                      >
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                        {opp}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Challenges
                  </h5>
                  <div className="space-y-1">
                    {region.challenges.slice(0, 3).map((challenge, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-red-700 flex items-center"
                      >
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></div>
                        {challenge}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const WeddingDayTimelineView = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Wedding Day Timeline Patterns
      </h3>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="space-y-4">
          {timelineData.timeSlots.map((slot, index) => (
            <motion.div
              key={slot.time}
              className="flex items-center p-4 bg-gray-50 rounded-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex-shrink-0 w-24">
                <div className="font-semibold text-gray-900">{slot.time}</div>
                <div className="text-xs text-gray-500">
                  {slot.averageDuration}min
                </div>
              </div>

              <div className="flex-grow ml-4">
                <h4 className="font-semibold text-gray-900">{slot.activity}</h4>
                <div className="flex flex-wrap gap-2 mt-1">
                  {slot.popularServices.map((service) => (
                    <span
                      key={service}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex-shrink-0 ml-4 text-right">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    slot.stressLevel === 'Very High'
                      ? 'bg-red-100 text-red-700'
                      : slot.stressLevel === 'High'
                        ? 'bg-orange-100 text-orange-700'
                        : slot.stressLevel === 'Medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                  }`}
                >
                  {slot.stressLevel} Stress
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t">
          <h4 className="font-semibold text-gray-900 mb-3">
            Critical Milestones
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {timelineData.criticalMilestones.map((milestone, index) => (
              <div
                key={index}
                className="text-center p-3 bg-gray-50 rounded-lg"
              >
                <div className="font-semibold text-gray-900">
                  {milestone.time}
                </div>
                <div className="text-sm text-gray-600">
                  {milestone.milestone}
                </div>
                <div
                  className={`text-xs mt-1 ${
                    milestone.importance === 'Critical'
                      ? 'text-red-600'
                      : milestone.importance === 'High'
                        ? 'text-orange-600'
                        : 'text-blue-600'
                  }`}
                >
                  {milestone.importance}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPatternView = () => {
    switch (activePattern) {
      case 'seasonal':
        return <SeasonalPatternView />;
      case 'venue':
        return <VenuePatternView />;
      case 'service':
        return <ServiceDemandView />;
      case 'geographic':
        return <GeographicPatternView />;
      case 'timeline':
        return <WeddingDayTimelineView />;
      default:
        return <SeasonalPatternView />;
    }
  };

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Activity className="w-6 h-6 text-purple-600 mr-2" />
                <h1 className="text-xl font-bold text-gray-900">
                  Wedding Analytics Patterns
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                className="flex items-center px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                onClick={() => setShowInsights(!showInsights)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showInsights ? 'Hide' : 'Show'} Insights
              </button>
              <button className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </button>
            </div>
          </div>

          {/* Pattern Navigation */}
          <div className="flex space-x-1 mt-4 bg-gray-100 rounded-lg p-1">
            {[
              { id: 'seasonal', label: 'Seasonal', icon: Calendar },
              { id: 'venue', label: 'Venues', icon: MapPin },
              { id: 'service', label: 'Services', icon: Star },
              { id: 'geographic', label: 'Geographic', icon: MapPin },
              { id: 'timeline', label: 'Timeline', icon: Clock },
            ].map((pattern) => (
              <button
                key={pattern.id}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activePattern === pattern.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActivePattern(pattern.id)}
              >
                <pattern.icon className="w-4 h-4 mr-2" />
                {pattern.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className={`flex-grow p-6 ${showInsights ? 'mr-80' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activePattern}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderPatternView()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Insights Sidebar */}
        <AnimatePresence>
          {showInsights && (
            <motion.div
              className="fixed right-0 top-16 bottom-0 w-80 bg-white shadow-xl border-l overflow-y-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Pattern Insights
                  </h3>
                  <button
                    onClick={() => setShowInsights(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  {insights.map((insight, index) => (
                    <motion.div
                      key={insight.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        insight.type === 'opportunity'
                          ? 'bg-green-50 border-green-500'
                          : insight.type === 'trend'
                            ? 'bg-blue-50 border-blue-500'
                            : insight.type === 'growth'
                              ? 'bg-purple-50 border-purple-500'
                              : 'bg-orange-50 border-orange-500'
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {insight.title}
                        </h4>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            insight.impact === 'high'
                              ? 'bg-red-100 text-red-700'
                              : insight.impact === 'medium'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {insight.impact}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {insight.description}
                      </p>
                      {insight.actionable && (
                        <button className="text-xs bg-gray-900 text-white px-3 py-1 rounded-full hover:bg-gray-800">
                          Take Action
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Info className="w-4 h-4 text-blue-600 mr-2" />
                    <h4 className="font-medium text-blue-900">
                      Pattern Summary
                    </h4>
                  </div>
                  <p className="text-sm text-blue-700">
                    Based on your current data, summer garden weddings with
                    comprehensive photography packages show the highest growth
                    potential and client satisfaction rates.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WeddingAnalyticsPatterns;
