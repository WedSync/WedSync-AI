'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface KeywordAnalysis {
  keyword: string;
  searchVolume: number;
  competition: 'low' | 'medium' | 'high';
  relevance: number;
  currentRanking?: number;
}

interface CompetitorAnalysis {
  appName: string;
  title: string;
  description: string;
  keywords: string[];
  rating: number;
  downloads: string;
  screenshots: number;
}

interface StoreListing {
  title: string;
  subtitle?: string;
  shortDescription: string;
  fullDescription: string;
  keywords: string[];
  category: string;
  screenshots: string[];
  featureGraphic?: string;
}

interface StoreOptimizerProps {
  currentListing: StoreListing;
  keywordData: KeywordAnalysis[];
  competitorData: CompetitorAnalysis[];
  onOptimizationSave: (optimizedListing: StoreListing) => void;
}

const WEDDING_KEYWORDS: KeywordAnalysis[] = [
  {
    keyword: 'wedding planning',
    searchVolume: 45000,
    competition: 'high',
    relevance: 95,
  },
  {
    keyword: 'wedding management',
    searchVolume: 12000,
    competition: 'medium',
    relevance: 90,
  },
  {
    keyword: 'vendor coordination',
    searchVolume: 3200,
    competition: 'low',
    relevance: 85,
  },
  {
    keyword: 'wedding timeline',
    searchVolume: 8900,
    competition: 'medium',
    relevance: 82,
  },
  {
    keyword: 'budget tracker',
    searchVolume: 22000,
    competition: 'high',
    relevance: 75,
  },
  {
    keyword: 'wedding checklist',
    searchVolume: 15600,
    competition: 'high',
    relevance: 78,
  },
  {
    keyword: 'event coordination',
    searchVolume: 9800,
    competition: 'medium',
    relevance: 70,
  },
  {
    keyword: 'wedding organizer',
    searchVolume: 6700,
    competition: 'medium',
    relevance: 88,
  },
];

const COMPETITOR_DATA: CompetitorAnalysis[] = [
  {
    appName: 'WeddingWire',
    title: 'WeddingWire - Wedding Planner',
    description:
      "Plan your dream wedding with WeddingWire's comprehensive planning tools...",
    keywords: ['wedding planner', 'venue finder', 'vendor directory'],
    rating: 4.3,
    downloads: '1M+',
    screenshots: 8,
  },
  {
    appName: 'The Knot',
    title: 'The Knot Wedding Planner',
    description:
      'Your ultimate wedding planning companion with checklist, budget tracker...',
    keywords: ['wedding planning', 'budget tracker', 'checklist'],
    rating: 4.5,
    downloads: '500K+',
    screenshots: 6,
  },
  {
    appName: 'Zola',
    title: 'Zola Weddings',
    description:
      'All-in-one wedding planning with registry, website, and planning tools...',
    keywords: ['wedding registry', 'wedding website', 'planning tools'],
    rating: 4.7,
    downloads: '100K+',
    screenshots: 5,
  },
];

export function StoreOptimizer({
  currentListing,
  keywordData = WEDDING_KEYWORDS,
  competitorData = COMPETITOR_DATA,
  onOptimizationSave,
}: StoreOptimizerProps) {
  const [listing, setListing] = useState<StoreListing>(currentListing);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(
    currentListing.keywords || [],
  );
  const [titleCharCount, setTitleCharCount] = useState(0);
  const [descriptionCharCount, setDescriptionCharCount] = useState(0);
  const [optimizationScore, setOptimizationScore] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Character limits by platform
  const PLATFORM_LIMITS = {
    microsoft: { title: 50, shortDescription: 200, fullDescription: 2000 },
    google_play: { title: 50, shortDescription: 80, fullDescription: 4000 },
    apple: { title: 30, subtitle: 30, fullDescription: 4000 },
  };

  useEffect(() => {
    setTitleCharCount(listing.title.length);
    setDescriptionCharCount(listing.fullDescription.length);
    calculateOptimizationScore();
  }, [listing]);

  const calculateOptimizationScore = useCallback(() => {
    let score = 0;

    // Title optimization (30 points)
    if (listing.title.length > 0 && listing.title.length <= 50) score += 15;
    if (
      selectedKeywords.some((keyword) =>
        listing.title.toLowerCase().includes(keyword.toLowerCase()),
      )
    )
      score += 15;

    // Description optimization (25 points)
    if (
      listing.fullDescription.length >= 500 &&
      listing.fullDescription.length <= 4000
    )
      score += 10;
    if (
      selectedKeywords.filter((keyword) =>
        listing.fullDescription.toLowerCase().includes(keyword.toLowerCase()),
      ).length >= 3
    )
      score += 15;

    // Keywords optimization (25 points)
    if (selectedKeywords.length >= 5 && selectedKeywords.length <= 10)
      score += 15;
    if (
      selectedKeywords.some(
        (keyword) =>
          keywordData.find((k) => k.keyword === keyword)?.competition === 'low',
      )
    )
      score += 10;

    // Screenshots optimization (20 points)
    if (listing.screenshots.length >= 3) score += 10;
    if (listing.screenshots.length >= 5) score += 10;

    setOptimizationScore(score);
  }, [listing, selectedKeywords, keywordData]);

  const handleKeywordToggle = useCallback((keyword: string) => {
    setSelectedKeywords((prev) => {
      const newKeywords = prev.includes(keyword)
        ? prev.filter((k) => k !== keyword)
        : [...prev, keyword];

      setListing((current) => ({ ...current, keywords: newKeywords }));
      return newKeywords;
    });
  }, []);

  const handleAutoOptimize = useCallback(async () => {
    setIsAnalyzing(true);

    try {
      // Simulate AI optimization process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Auto-select high-relevance, low-competition keywords
      const optimalKeywords = keywordData
        .filter((k) => k.relevance > 80 && k.competition !== 'high')
        .slice(0, 8)
        .map((k) => k.keyword);

      // Optimize title
      const optimizedTitle = `WedSync - Professional Wedding Management & Vendor Coordination`;

      // Optimize description
      const optimizedDescription = `Transform your wedding planning with WedSync's professional wedding management platform. 

✓ Streamline vendor coordination with real-time communication tools
✓ Manage your wedding timeline with intelligent scheduling
✓ Track your budget with automated expense monitoring  
✓ Coordinate with photographers, venues, and all wedding suppliers
✓ Access your wedding dashboard from any device, anywhere

Perfect for wedding couples, planners, and vendors who demand professional results. Join thousands of successful weddings managed through WedSync.

Features:
• Real-time vendor coordination and communication
• Visual wedding timeline builder with task management
• Integrated budget tracker with vendor invoicing
• Professional photo gallery and sharing tools
• Mobile-responsive design for on-the-go planning
• Secure data protection and backup
• 24/7 customer support during your wedding journey

Whether you're planning an intimate ceremony or grand celebration, WedSync provides the professional wedding management tools you need for a stress-free wedding experience.

Download now and transform your wedding planning today!`;

      setListing((prev) => ({
        ...prev,
        title: optimizedTitle,
        fullDescription: optimizedDescription,
        keywords: optimalKeywords,
      }));

      setSelectedKeywords(optimalKeywords);
    } catch (error) {
      console.error('Auto-optimization failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [keywordData]);

  const getCompetitionColor = (competition: string) => {
    switch (competition) {
      case 'low':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'high':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Store Listing Optimizer</h2>
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div
              className={`text-2xl font-bold ${getScoreColor(optimizationScore)}`}
            >
              {optimizationScore}%
            </div>
            <div className="text-xs text-gray-500">Optimization Score</div>
          </div>
          <Button onClick={handleAutoOptimize} disabled={isAnalyzing}>
            {isAnalyzing ? 'Optimizing...' : 'Auto-Optimize'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="listing" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="listing">Store Listing</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="listing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Listing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  App Title
                  <span className="ml-2 text-xs text-gray-500">
                    ({titleCharCount}/50 characters)
                  </span>
                </label>
                <Input
                  value={listing.title}
                  onChange={(e) =>
                    setListing((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="WedSync - Wedding Management Platform"
                  maxLength={50}
                />
                {titleCharCount > 50 && (
                  <p className="text-xs text-red-500 mt-1">
                    Title exceeds character limit
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Short Description
                  <span className="ml-2 text-xs text-gray-500">
                    ({listing.shortDescription.length}/200 characters)
                  </span>
                </label>
                <Textarea
                  value={listing.shortDescription}
                  onChange={(e) =>
                    setListing((prev) => ({
                      ...prev,
                      shortDescription: e.target.value,
                    }))
                  }
                  placeholder="Professional wedding planning and vendor coordination platform"
                  maxLength={200}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Full Description
                  <span className="ml-2 text-xs text-gray-500">
                    ({descriptionCharCount}/4000 characters)
                  </span>
                </label>
                <Textarea
                  value={listing.fullDescription}
                  onChange={(e) =>
                    setListing((prev) => ({
                      ...prev,
                      fullDescription: e.target.value,
                    }))
                  }
                  placeholder="Detailed description of WedSync's features and benefits..."
                  rows={10}
                  maxLength={4000}
                />
                {descriptionCharCount > 4000 && (
                  <p className="text-xs text-red-500 mt-1">
                    Description exceeds character limit
                  </p>
                )}
              </div>

              <Button
                onClick={() => onOptimizationSave(listing)}
                className="w-full"
              >
                Save Optimized Listing
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Keyword Optimization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Selected Keywords ({selectedKeywords.length})
                  </span>
                  <Badge variant="outline">Optimal: 5-10 keywords</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {keywordData.map((keyword) => (
                    <div
                      key={keyword.keyword}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedKeywords.includes(keyword.keyword)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleKeywordToggle(keyword.keyword)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {keyword.keyword}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-2 h-2 rounded-full ${getCompetitionColor(keyword.competition)}`}
                          />
                          <span className="text-xs text-gray-500">
                            {keyword.competition}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          Volume: {keyword.searchVolume.toLocaleString()}
                        </span>
                        <span>Relevance: {keyword.relevance}%</span>
                      </div>
                      {keyword.currentRanking && (
                        <div className="text-xs text-blue-600 mt-1">
                          Current rank: #{keyword.currentRanking}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">
                    Selected Keywords Preview
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedKeywords.map((keyword) => (
                      <Badge
                        key={keyword}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleKeywordToggle(keyword)}
                      >
                        {keyword} ✕
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Competitor Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {competitorData.map((competitor) => (
                  <div
                    key={competitor.appName}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{competitor.appName}</h4>
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline">{competitor.rating} ⭐</Badge>
                        <Badge variant="secondary">
                          {competitor.downloads}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      {competitor.title}
                    </p>

                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {competitor.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {competitor.keywords.slice(0, 3).map((keyword) => (
                          <Badge key={keyword} size="sm" variant="outline">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">
                        {competitor.screenshots} screenshots
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">23%</div>
                  <p className="text-sm text-gray-500">Conversion Rate</p>
                  <p className="text-xs text-green-600">+5% vs last month</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    1,247
                  </div>
                  <p className="text-sm text-gray-500">Store Views</p>
                  <p className="text-xs text-green-600">+12% vs last week</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">4.6</div>
                  <p className="text-sm text-gray-500">Average Rating</p>
                  <p className="text-xs text-green-600">+0.2 vs last month</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Optimization Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Title Optimization</span>
                  <Progress value={75} className="w-24" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Description Optimization</span>
                  <Progress value={60} className="w-24" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Keyword Optimization</span>
                  <Progress value={85} className="w-24" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Visual Assets</span>
                  <Progress value={40} className="w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
