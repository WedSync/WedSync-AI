'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Search,
  MapPin,
  Users,
  Star,
  MessageSquare,
  UserPlus,
  Filter,
  ChevronRight,
  Briefcase,
  Clock,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscoveredVendor {
  id: string;
  business_name: string;
  primary_category: string;
  secondary_categories?: string[];
  city: string;
  county: string;
  years_in_business?: number;
  team_size?: number;
  featured_image?: string;
  description: string;
  network_score: number;
  total_connections: number;
  relevance_score: number;
  open_to_networking: boolean;
  seeking_referrals: boolean;
  offering_referrals: boolean;
  collaboration_interests: string[];
  expertise_keywords: string[];
}

interface DiscoveryFilters {
  category?: string;
  location?: string;
  radius?: number;
  seeking?: 'referrals' | 'collaboration' | 'mentorship';
}

export default function VendorDiscovery() {
  const [vendors, setVendors] = useState<DiscoveredVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<DiscoveryFilters>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  const categories = [
    'Photography',
    'Videography',
    'Venue',
    'Catering',
    'Florist',
    'Music',
    'DJ',
    'Makeup',
    'Hair',
    'Planning',
    'Transport',
    'Cake',
  ];

  useEffect(() => {
    loadVendors(true);
  }, [filters]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== '') {
        loadVendors(true);
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const loadVendors = async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (filters.category) params.append('category', filters.category);
      if (filters.location) params.append('location', filters.location);
      if (filters.radius) params.append('radius', filters.radius.toString());
      if (filters.seeking) params.append('seeking', filters.seeking);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch('/api/placeholder');
      if (!response.ok) throw new Error('Failed to load vendors');

      const data = await response.json();

      if (reset) {
        setVendors(data.vendors || []);
        setPage(1);
      } else {
        setVendors((prev) => [...prev, ...(data.vendors || [])]);
      }

      setHasMore(data.pagination?.hasMore || false);
      if (!reset) setPage((prev) => prev + 1);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (
    vendorId: string,
    connectionType = 'professional',
  ) => {
    try {
      setConnecting(vendorId);

      const response = await fetch('/api/vendor-networking/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: vendorId,
          connection_type: connectionType,
          initial_message: `Hi! I'd like to connect and explore potential collaboration opportunities. I think we could work well together on weddings.`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send connection request');
      }

      // Remove vendor from discovery list
      setVendors((prev) => prev.filter((v) => v.id !== vendorId));

      // Show success message (you might want to use a toast library)
      alert('Connection request sent successfully!');
    } catch (error) {
      console.error('Error connecting:', error);
      alert('Failed to send connection request. Please try again.');
    } finally {
      setConnecting(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getNetworkScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search vendors, categories, locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category filter chips */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            <Button
              variant={!filters.category ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setFilters((prev) => ({ ...prev, category: undefined }))
              }
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={filters.category === category ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    category: prev.category === category ? undefined : category,
                  }))
                }
                className="whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Quick filter options */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            <Button
              variant={filters.seeking === 'referrals' ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  seeking:
                    prev.seeking === 'referrals' ? undefined : 'referrals',
                }))
              }
            >
              Seeking Referrals
            </Button>
            <Button
              variant={
                filters.seeking === 'collaboration' ? 'default' : 'outline'
              }
              size="sm"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  seeking:
                    prev.seeking === 'collaboration'
                      ? undefined
                      : 'collaboration',
                }))
              }
            >
              Collaborators
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="p-4 space-y-4">
        {loading && vendors.length === 0 ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-16 w-16 bg-gray-200 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                  </div>
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {vendors.map((vendor) => (
              <Card key={vendor.id} className="p-4">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={vendor.featured_image} />
                      <AvatarFallback className="text-lg">
                        {getInitials(vendor.business_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-900 truncate">
                        {vendor.business_name}
                      </h3>
                      <p className="text-sm text-gray-600 font-medium">
                        {vendor.primary_category}
                      </p>

                      {/* Location and experience */}
                      <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>
                            {vendor.city}, {vendor.county}
                          </span>
                        </div>
                        {vendor.years_in_business && (
                          <div className="flex items-center">
                            <Briefcase className="h-4 w-4 mr-1" />
                            <span>{vendor.years_in_business}y exp</span>
                          </div>
                        )}
                      </div>

                      {/* Network stats */}
                      <div className="flex items-center mt-2 space-x-4 text-sm">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1 text-blue-600" />
                          <span>{vendor.total_connections} connections</span>
                        </div>
                        <div className="flex items-center">
                          <Award
                            className={cn(
                              'h-4 w-4 mr-1',
                              getNetworkScoreColor(vendor.network_score),
                            )}
                          />
                          <span
                            className={getNetworkScoreColor(
                              vendor.network_score,
                            )}
                          >
                            {vendor.network_score} score
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Relevance score */}
                    <div className="text-right">
                      <Badge variant="secondary" className="mb-2">
                        {Math.round(vendor.relevance_score)}% match
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {vendor.description}
                  </p>

                  {/* Tags and interests */}
                  <div className="space-y-2">
                    {vendor.expertise_keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {vendor.expertise_keywords
                          .slice(0, 4)
                          .map((keyword) => (
                            <Badge
                              key={keyword}
                              variant="outline"
                              className="text-xs"
                            >
                              {keyword}
                            </Badge>
                          ))}
                        {vendor.expertise_keywords.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{vendor.expertise_keywords.length - 4} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Networking interests */}
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      {vendor.seeking_referrals && (
                        <span className="flex items-center bg-green-50 text-green-700 px-2 py-1 rounded">
                          <UserPlus className="h-3 w-3 mr-1" />
                          Seeking referrals
                        </span>
                      )}
                      {vendor.offering_referrals && (
                        <span className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          <Users className="h-3 w-3 mr-1" />
                          Offers referrals
                        </span>
                      )}
                      {vendor.collaboration_interests.length > 0 && (
                        <span className="flex items-center bg-purple-50 text-purple-700 px-2 py-1 rounded">
                          <Star className="h-3 w-3 mr-1" />
                          Collaborates
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleConnect(vendor.id)}
                      disabled={connecting === vendor.id}
                    >
                      {connecting === vendor.id ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Connect
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {/* Load more button */}
            {hasMore && !loading && (
              <Button
                variant="outline"
                onClick={() => loadVendors(false)}
                className="w-full"
              >
                Load More Vendors
              </Button>
            )}

            {vendors.length === 0 && !loading && (
              <Card className="p-8">
                <div className="text-center text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">
                    No vendors found
                  </h3>
                  <p className="text-sm mb-4">
                    Try adjusting your search terms or filters to find more
                    vendors to connect with.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setFilters({});
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Loading indicator for infinite scroll */}
      {loading && vendors.length > 0 && (
        <div className="p-4">
          <div className="flex justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
}
