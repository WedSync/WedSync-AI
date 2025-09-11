'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Search,
  Star,
  Users,
  TrendingUp,
  Crown,
  Zap,
  Filter,
  ArrowRight,
  ChevronRight,
  Play,
  ShoppingBag,
  Award,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MarketplaceTemplate {
  id: string;
  title: string;
  description: string;
  templateType: string;
  category: string;
  subcategory: string;
  priceCents: number;
  currency: string;
  minimumTier: 'starter' | 'professional' | 'scale';
  previewImages: string[];
  installCount: number;
  averageRating: number;
  ratingCount: number;
  creator: {
    id: string;
    businessName: string;
    vendorType: string;
    avatarUrl?: string;
  };
  featured: boolean;
  tags: string[];
  targetWeddingTypes: string[];
  targetPriceRange: string;
}

interface CategoryData {
  id: string;
  name: string;
  icon: string;
  count: number;
  description: string;
  trending: boolean;
}

interface Props {
  userTier?: 'starter' | 'professional' | 'scale';
  vendorType?: string;
}

export default function MarketplacePage({
  userTier = 'starter',
  vendorType = 'planning',
}: Props) {
  // State management
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [featuredTemplates, setFeaturedTemplates] = useState<
    MarketplaceTemplate[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const categories: CategoryData[] = [
    {
      id: 'all',
      name: 'All Templates',
      icon: '📄',
      count: 0,
      description: 'Browse all available templates',
      trending: false,
    },
    {
      id: 'photography',
      name: 'Photography',
      icon: '📸',
      count: 0,
      description: 'Client intake forms, contracts, workflow templates',
      trending: true,
    },
    {
      id: 'catering',
      name: 'Catering',
      icon: '🍽️',
      count: 0,
      description: 'Menu planning, dietary requirements, service agreements',
      trending: false,
    },
    {
      id: 'venue',
      name: 'Venues',
      icon: '🏰',
      count: 0,
      description: 'Booking forms, site visit questionnaires, contracts',
      trending: true,
    },
    {
      id: 'planning',
      name: 'Planning',
      icon: '📋',
      count: 0,
      description: 'Timelines, checklists, coordination templates',
      trending: false,
    },
    {
      id: 'florals',
      name: 'Florals',
      icon: '🌸',
      count: 0,
      description: 'Design briefs, order forms, delivery schedules',
      trending: false,
    },
    {
      id: 'music',
      name: 'Music & DJ',
      icon: '🎵',
      count: 0,
      description: 'Playlist requests, equipment checklists, contracts',
      trending: false,
    },
  ];

  // Load data on mount and when filters change
  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchFeaturedTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(searchQuery && { search: searchQuery }),
        sort: 'popular',
        limit: '12',
      });

      const response = await fetch(`/api/marketplace/templates?${params}`);
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedTemplates = async () => {
    setFeaturedLoading(true);
    try {
      const response = await fetch('/api/marketplace/analytics/popular');
      const data = await response.json();
      setFeaturedTemplates(data.featured || []);
    } catch (error) {
      console.error('Failed to fetch featured templates:', error);
      // Mock data for development
      setFeaturedTemplates([
        {
          id: 'featured-1',
          title: 'Luxury Photography Client Intake Suite',
          description:
            'Complete intake system that generates £340k+ annually with 73% conversion rate',
          templateType: 'form',
          category: 'photography',
          subcategory: 'client_intake',
          priceCents: 4700,
          currency: 'GBP',
          minimumTier: 'professional',
          previewImages: ['/api/placeholder/400/250'],
          installCount: 234,
          averageRating: 4.9,
          ratingCount: 87,
          creator: {
            id: 'creator-1',
            businessName: 'Elite Wedding Photography',
            vendorType: 'photography',
            avatarUrl: '/api/placeholder/40/40',
          },
          featured: true,
          tags: ['high-conversion', 'luxury', 'client-intake'],
          targetWeddingTypes: ['luxury', 'destination'],
          targetPriceRange: '£10k-20k+',
        },
      ]);
    } finally {
      setFeaturedLoading(false);
    }
  };

  const formatPrice = (priceCents: number, currency: string): string => {
    const price = priceCents / 100;
    const formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
    });
    return formatter.format(price);
  };

  const canAccessTemplate = (template: MarketplaceTemplate): boolean => {
    const tierLevels = { starter: 1, professional: 2, scale: 3 };
    const userLevel = tierLevels[userTier];
    const requiredLevel = tierLevels[template.minimumTier];
    return userLevel >= requiredLevel;
  };

  const getPersonalizationRecommendation = (
    template: MarketplaceTemplate,
  ): string | null => {
    if (template.creator.vendorType === vendorType) {
      return 'From your industry';
    }
    if (template.tags.includes(vendorType)) {
      return 'Relevant to your business';
    }
    if (template.installCount > 100 && template.averageRating > 4.5) {
      return 'Highly rated';
    }
    return null;
  };

  const handleTemplateClick = (templateId: string) => {
    window.location.href = `/wedme/marketplace/templates/${templateId}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              Wedding Business Templates
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Proven forms, email sequences, and workflows from top-performing
              wedding vendors. Save time and increase bookings with templates
              that have generated millions in revenue.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search templates (e.g., photography intake, venue contract)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-4 text-lg bg-white text-gray-900 border-0 shadow-xl rounded-xl focus:ring-2 focus:ring-white/20"
                />
                <Button
                  onClick={fetchTemplates}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg"
                >
                  Search
                </Button>
              </div>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">£2.4M+</div>
                <p className="text-blue-100">
                  Revenue generated using our templates
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">73%</div>
                <p className="text-blue-100">
                  Average conversion rate improvement
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">12h</div>
                <p className="text-blue-100">
                  Time saved per template vs. building from scratch
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Templates */}
        {!featuredLoading && featuredTemplates.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Featured This Week
                </h2>
                <p className="text-gray-600">
                  Hand-picked templates with proven results
                </p>
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                View All <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-purple-200"
                  onClick={() => handleTemplateClick(template.id)}
                >
                  <div className="relative overflow-hidden rounded-t-lg">
                    {template.previewImages[0] && (
                      <img
                        src={template.previewImages[0]}
                        alt={template.title}
                        className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <Badge className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                      <Crown className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                    <Button
                      size="sm"
                      className="absolute top-3 right-3 bg-white/90 text-gray-700 hover:bg-white"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-purple-600 transition-colors">
                      {template.title}
                    </CardTitle>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <img
                          src={template.creator.avatarUrl}
                          alt={template.creator.businessName}
                          className="w-4 h-4 rounded-full"
                        />
                        {template.creator.businessName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {template.installCount} installs
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {template.description}
                    </p>

                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-2xl font-bold text-gray-900">
                          {formatPrice(template.priceCents, template.currency)}
                        </span>
                        <div className="flex items-center mt-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm ml-1 font-medium">
                            {template.averageRating.toFixed(1)} (
                            {template.ratingCount})
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={!canAccessTemplate(template)}
                        className={cn(
                          'flex items-center gap-2',
                          !canAccessTemplate(template) && 'opacity-50',
                        )}
                      >
                        <ShoppingBag className="w-4 h-4" />
                        {canAccessTemplate(template)
                          ? 'View Details'
                          : 'Locked'}
                      </Button>
                    </div>

                    {!canAccessTemplate(template) && (
                      <Badge
                        variant="outline"
                        className="w-full justify-center text-xs"
                      >
                        Requires {template.minimumTier} tier
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Category Navigation */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Browse by Category
              </h2>
              <p className="text-gray-600">
                Discover templates designed for your wedding business type
              </p>
            </div>
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            {/* Category Pills */}
            <div className="mb-8">
              <TabsList className="inline-flex bg-gray-100 p-1 rounded-xl">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <span className="text-lg">{category.icon}</span>
                    <span className="font-medium">{category.name}</span>
                    {category.trending && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-green-100 text-green-700 ml-2"
                      >
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Trending
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value={selectedCategory}>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Card key={index} className="animate-pulse">
                      <div className="w-full h-48 bg-gray-200 rounded-t-lg"></div>
                      <CardHeader>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-full"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {templates.map((template) => {
                    const recommendation =
                      getPersonalizationRecommendation(template);
                    return (
                      <Card
                        key={template.id}
                        className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
                        onClick={() => handleTemplateClick(template.id)}
                      >
                        <div className="relative overflow-hidden rounded-t-lg">
                          {template.previewImages[0] && (
                            <img
                              src={template.previewImages[0]}
                              alt={template.title}
                              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                          {recommendation && (
                            <Badge className="absolute top-2 right-2 bg-green-500 text-white border-0">
                              <Award className="w-3 h-3 mr-1" />
                              {recommendation}
                            </Badge>
                          )}
                        </div>

                        <CardHeader className="pb-2">
                          <CardTitle className="text-base line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {template.title}
                          </CardTitle>
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>by {template.creator.businessName}</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {template.installCount}
                            </span>
                          </div>
                        </CardHeader>

                        <CardContent>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="font-bold text-lg">
                                {formatPrice(
                                  template.priceCents,
                                  template.currency,
                                )}
                              </span>
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="text-sm ml-1">
                                  {template.averageRating.toFixed(1)}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={
                                canAccessTemplate(template)
                                  ? 'default'
                                  : 'outline'
                              }
                              disabled={!canAccessTemplate(template)}
                              className="flex items-center gap-1"
                            >
                              {canAccessTemplate(template) ? (
                                <>
                                  <ChevronRight className="w-4 h-4" />
                                  View
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4" />
                                  Locked
                                </>
                              )}
                            </Button>
                          </div>

                          {!canAccessTemplate(template) && (
                            <Badge
                              variant="outline"
                              className="w-full justify-center text-xs"
                            >
                              Requires {template.minimumTier} tier
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {!loading && templates.length === 0 && (
                <div className="text-center py-16">
                  <div className="mb-6">
                    <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No templates found
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      {searchQuery
                        ? `No results for "${searchQuery}" in ${categories.find((c) => c.id === selectedCategory)?.name}`
                        : `No templates available in ${categories.find((c) => c.id === selectedCategory)?.name} yet`}
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                    <Button
                      onClick={() =>
                        (window.location.href = '/wedme/marketplace/create')
                      }
                      className="flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Create Template
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>

        {/* Creator Spotlight */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Top Creators This Month
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Meet the wedding professionals who have built the most
                successful templates
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((rank) => (
                <div
                  key={rank}
                  className="bg-white rounded-xl p-6 text-center shadow-sm"
                >
                  <div className="relative mb-4">
                    <img
                      src="/api/placeholder/80/80"
                      alt="Creator"
                      className="w-20 h-20 rounded-full mx-auto"
                    />
                    <Badge
                      className={cn(
                        'absolute -top-2 -right-2',
                        rank === 1
                          ? 'bg-yellow-500'
                          : rank === 2
                            ? 'bg-gray-400'
                            : 'bg-amber-600',
                      )}
                    >
                      #{rank}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Elite Photography Studios
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Photography • Manchester
                  </p>
                  <div className="flex justify-center gap-4 text-sm">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {145 - rank * 20}
                      </div>
                      <div className="text-gray-600">Sales</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        4.{9 - rank}
                      </div>
                      <div className="text-gray-600">Rating</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="bg-green-50 rounded-2xl p-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Success Stories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">
                £340k
              </div>
              <p className="text-gray-700 font-medium mb-2">
                Annual Revenue Generated
              </p>
              <p className="text-sm text-gray-600">
                Using our top-rated photography intake form with 73% conversion
                rate
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">73%</div>
              <p className="text-gray-700 font-medium mb-2">
                Average Conversion Increase
              </p>
              <p className="text-sm text-gray-600">
                Wedding vendors see immediate improvement after template
                installation
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">
                12hr
              </div>
              <p className="text-gray-700 font-medium mb-2">
                Time Saved Per Template
              </p>
              <p className="text-sm text-gray-600">
                Compared to building forms, email sequences, and workflows from
                scratch
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
