'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Network,
  Shield,
  Users,
  Star,
  MapPin,
  Phone,
  Globe,
  CheckCircle,
  AlertTriangle,
  Clock,
  Link,
  Unlink,
  Settings,
  Search,
  Filter,
  TrendingUp,
  Award,
  Camera,
  Building2,
  Utensils,
  Flower,
  Music,
  Car,
  Crown,
} from 'lucide-react';

interface VendorProfile {
  id: string;
  businessName: string;
  ownerName: string;
  businessType:
    | 'photography'
    | 'venue'
    | 'catering'
    | 'florist'
    | 'music'
    | 'planning'
    | 'transport'
    | 'beauty'
    | 'other';
  location: {
    city: string;
    state: string;
    country: string;
    serviceRadius: number;
  };
  contact: {
    email: string;
    phone?: string;
    website?: string;
  };
  branding: {
    logo?: string;
    primaryColor?: string;
    description: string;
  };
  credentials: {
    certifications: string[];
    awards: string[];
    yearsInBusiness: number;
    insuranceCoverage: boolean;
  };
  ssoProfile: {
    enabled: boolean;
    providers: string[];
    teamSize: number;
    lastAuthenticated?: Date;
  };
  networkStatus: {
    isVerified: boolean;
    trustScore: number;
    referralCount: number;
    averageRating: number;
    totalReviews: number;
    joinedDate: Date;
  };
  collaboration: {
    preferredPartners: string[];
    blacklistedVendors: string[];
    collaborationHistory: number;
    responseTime: 'fast' | 'medium' | 'slow';
  };
}

interface NetworkConnection {
  id: string;
  vendorId: string;
  connectionType:
    | 'referral'
    | 'collaboration'
    | 'subcontractor'
    | 'partnership';
  status: 'active' | 'pending' | 'suspended';
  permissions: string[];
  establishedDate: Date;
  lastInteraction: Date;
  totalProjects: number;
  mutualConnections: number;
}

interface NetworkRegion {
  name: string;
  boundaries: {
    cities: string[];
    states: string[];
    radius?: number;
  };
  vendorCount: number;
  averageRating: number;
  specialties: string[];
  leadVendors: VendorProfile[];
}

interface VendorNetworkSSOProps {
  organizationId: string;
  currentVendorId?: string;
  region?: string;
  onConnectionEstablished?: (connection: NetworkConnection) => void;
  onSSOAuthenticated?: (vendor: VendorProfile) => void;
  showRegionalView?: boolean;
  allowDirectMessaging?: boolean;
}

// Wedding vendor type configurations
const vendorTypes = {
  photography: {
    icon: Camera,
    label: '📸 Photography',
    color: 'bg-yellow-500',
    specialties: [
      'Wedding Photography',
      'Engagement Sessions',
      'Bridal Portraits',
      'Destination Weddings',
    ],
    averageTeamSize: 3,
  },
  venue: {
    icon: Building2,
    label: '🏛️ Venues',
    color: 'bg-green-500',
    specialties: ['Ballrooms', 'Gardens', 'Beaches', 'Historic Sites', 'Barns'],
    averageTeamSize: 8,
  },
  catering: {
    icon: Utensils,
    label: '🍽️ Catering',
    color: 'bg-orange-500',
    specialties: [
      'Full Service',
      'Buffet Style',
      'Cocktail Hour',
      'Dietary Restrictions',
    ],
    averageTeamSize: 12,
  },
  florist: {
    icon: Flower,
    label: '🌺 Florals',
    color: 'bg-pink-500',
    specialties: [
      'Bridal Bouquets',
      'Centerpieces',
      'Ceremony Arch',
      'Venue Decoration',
    ],
    averageTeamSize: 4,
  },
  music: {
    icon: Music,
    label: '🎵 Music/DJ',
    color: 'bg-purple-500',
    specialties: [
      'Wedding DJs',
      'Live Bands',
      'Ceremony Music',
      'Sound Equipment',
    ],
    averageTeamSize: 2,
  },
  planning: {
    icon: Crown,
    label: '👑 Planning',
    color: 'bg-blue-500',
    specialties: [
      'Full Planning',
      'Day-of Coordination',
      'Partial Planning',
      'Destination Weddings',
    ],
    averageTeamSize: 3,
  },
  transport: {
    icon: Car,
    label: '🚗 Transportation',
    color: 'bg-gray-500',
    specialties: ['Luxury Cars', 'Limousines', 'Party Buses', 'Classic Cars'],
    averageTeamSize: 2,
  },
  beauty: {
    icon: Star,
    label: '💄 Beauty',
    color: 'bg-rose-500',
    specialties: ['Bridal Makeup', 'Hair Styling', 'Manicures', 'Spa Services'],
    averageTeamSize: 3,
  },
  other: {
    icon: Users,
    label: '🛍️ Other',
    color: 'bg-slate-500',
    specialties: ['Specialty Services'],
    averageTeamSize: 2,
  },
};

// Sample network regions (in real app, this would be dynamic)
const networkRegions: NetworkRegion[] = [
  {
    name: 'San Francisco Bay Area',
    boundaries: {
      cities: ['San Francisco', 'San Jose', 'Oakland', 'Palo Alto', 'Berkeley'],
      states: ['CA'],
      radius: 50,
    },
    vendorCount: 1247,
    averageRating: 4.7,
    specialties: ['Tech Weddings', 'Vineyard Venues', 'Outdoor Ceremonies'],
    leadVendors: [],
  },
  {
    name: 'New York Metro',
    boundaries: {
      cities: ['New York', 'Brooklyn', 'Queens', 'Manhattan', 'Bronx'],
      states: ['NY', 'NJ', 'CT'],
      radius: 75,
    },
    vendorCount: 2156,
    averageRating: 4.6,
    specialties: ['Urban Weddings', 'Historic Venues', 'Rooftop Ceremonies'],
    leadVendors: [],
  },
  {
    name: 'Los Angeles',
    boundaries: {
      cities: [
        'Los Angeles',
        'Beverly Hills',
        'Santa Monica',
        'Pasadena',
        'Long Beach',
      ],
      states: ['CA'],
      radius: 60,
    },
    vendorCount: 1894,
    averageRating: 4.8,
    specialties: ['Beach Weddings', 'Celebrity Weddings', 'Film Industry'],
    leadVendors: [],
  },
];

export default function VendorNetworkSSO({
  organizationId,
  currentVendorId,
  region = 'San Francisco Bay Area',
  onConnectionEstablished,
  onSSOAuthenticated,
  showRegionalView = true,
  allowDirectMessaging = true,
}: VendorNetworkSSOProps) {
  const [networkVendors, setNetworkVendors] = useState<VendorProfile[]>([]);
  const [connections, setConnections] = useState<NetworkConnection[]>([]);
  const [currentRegion, setCurrentRegion] = useState<NetworkRegion | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRating, setFilterRating] = useState<number>(0);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(
    null,
  );
  const [networkView, setNetworkView] = useState<'grid' | 'map' | 'list'>(
    'grid',
  );
  const supabase = createClient();

  useEffect(() => {
    loadNetworkVendors();
    loadConnections();
    loadRegionData();
  }, [organizationId, region]);

  const loadNetworkVendors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_network_profiles')
        .select(
          `
          *,
          vendor_ratings(average_rating, total_reviews),
          vendor_certifications(certification_name, issued_by),
          sso_configurations(enabled, providers, team_size, last_authenticated)
        `,
        )
        .eq('region', region)
        .eq('status', 'active')
        .order('network_trust_score', { ascending: false });

      if (error) throw error;

      const vendors: VendorProfile[] = (data || []).map((vendor) => ({
        id: vendor.id,
        businessName: vendor.business_name,
        ownerName: vendor.owner_name,
        businessType: vendor.business_type,
        location: {
          city: vendor.city,
          state: vendor.state,
          country: vendor.country,
          serviceRadius: vendor.service_radius || 25,
        },
        contact: {
          email: vendor.email,
          phone: vendor.phone,
          website: vendor.website,
        },
        branding: {
          logo: vendor.logo_url,
          primaryColor: vendor.primary_color,
          description: vendor.description,
        },
        credentials: {
          certifications:
            vendor.vendor_certifications?.map(
              (c: any) => c.certification_name,
            ) || [],
          awards: vendor.awards || [],
          yearsInBusiness: vendor.years_in_business || 0,
          insuranceCoverage: vendor.insurance_coverage || false,
        },
        ssoProfile: {
          enabled: vendor.sso_configurations?.enabled || false,
          providers: vendor.sso_configurations?.providers || [],
          teamSize: vendor.sso_configurations?.team_size || 1,
          lastAuthenticated: vendor.sso_configurations?.last_authenticated
            ? new Date(vendor.sso_configurations.last_authenticated)
            : undefined,
        },
        networkStatus: {
          isVerified: vendor.is_verified || false,
          trustScore: vendor.network_trust_score || 0,
          referralCount: vendor.referral_count || 0,
          averageRating: vendor.vendor_ratings?.average_rating || 0,
          totalReviews: vendor.vendor_ratings?.total_reviews || 0,
          joinedDate: new Date(vendor.joined_date),
        },
        collaboration: {
          preferredPartners: vendor.preferred_partners || [],
          blacklistedVendors: vendor.blacklisted_vendors || [],
          collaborationHistory: vendor.collaboration_count || 0,
          responseTime: vendor.avg_response_time || 'medium',
        },
      }));

      setNetworkVendors(vendors);
    } catch (error) {
      console.error('Error loading network vendors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_network_connections')
        .select('*')
        .eq('vendor_id', currentVendorId)
        .eq('status', 'active')
        .order('last_interaction', { ascending: false });

      if (error) throw error;

      const networkConnections: NetworkConnection[] = (data || []).map(
        (conn) => ({
          id: conn.id,
          vendorId: conn.connected_vendor_id,
          connectionType: conn.connection_type,
          status: conn.status,
          permissions: conn.permissions || [],
          establishedDate: new Date(conn.established_date),
          lastInteraction: new Date(conn.last_interaction),
          totalProjects: conn.total_projects || 0,
          mutualConnections: conn.mutual_connections || 0,
        }),
      );

      setConnections(networkConnections);
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const loadRegionData = () => {
    const regionData = networkRegions.find((r) => r.name === region);
    setCurrentRegion(regionData || networkRegions[0]);
  };

  const authenticateWithVendorSSO = async (
    vendor: VendorProfile,
    provider: string,
  ) => {
    try {
      // Simulate SSO authentication with vendor's system
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: `${window.location.origin}/vendor-network/authenticated`,
          queryParams: {
            vendor_id: vendor.id,
            network_region: region,
            connection_type: 'sso_authentication',
          },
        },
      });

      if (error) throw error;

      // Log the authentication attempt
      await supabase.from('vendor_sso_authentications').insert({
        vendor_id: vendor.id,
        authenticated_by: currentVendorId,
        provider,
        region,
        authenticated_at: new Date().toISOString(),
      });

      onSSOAuthenticated?.(vendor);
    } catch (error) {
      console.error('Error authenticating with vendor SSO:', error);
    }
  };

  const establishConnection = async (
    targetVendorId: string,
    connectionType: string,
  ) => {
    try {
      const { data, error } = await supabase
        .from('vendor_network_connections')
        .insert({
          vendor_id: currentVendorId,
          connected_vendor_id: targetVendorId,
          connection_type: connectionType,
          status: 'pending',
          permissions: ['basic_info', 'contact_sharing'],
          established_date: new Date().toISOString(),
          last_interaction: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const newConnection: NetworkConnection = {
        id: data.id,
        vendorId: targetVendorId,
        connectionType: connectionType as any,
        status: 'pending',
        permissions: ['basic_info', 'contact_sharing'],
        establishedDate: new Date(),
        lastInteraction: new Date(),
        totalProjects: 0,
        mutualConnections: 0,
      };

      onConnectionEstablished?.(newConnection);
      await loadConnections();
    } catch (error) {
      console.error('Error establishing connection:', error);
    }
  };

  const getVendorTypeIcon = (type: string) => {
    const typeConfig =
      vendorTypes[type as keyof typeof vendorTypes] || vendorTypes.other;
    const Icon = typeConfig.icon;
    return <Icon className="h-4 w-4" />;
  };

  const getVendorTypeBadge = (type: string) => {
    const typeConfig =
      vendorTypes[type as keyof typeof vendorTypes] || vendorTypes.other;
    return (
      <Badge variant="outline" className="flex items-center gap-1 text-xs">
        {getVendorTypeIcon(type)}
        {typeConfig.label}
      </Badge>
    );
  };

  const getTrustScoreBadge = (score: number) => {
    let variant: 'success' | 'warning' | 'secondary' = 'secondary';
    let text = 'Standard';

    if (score >= 90) {
      variant = 'success';
      text = 'Excellent';
    } else if (score >= 70) {
      variant = 'warning';
      text = 'Good';
    }

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Shield className="h-3 w-3" />
        {text} ({score})
      </Badge>
    );
  };

  const getResponseTimeBadge = (responseTime: string) => {
    const config = {
      fast: { variant: 'success' as const, text: '⚡ Fast', icon: CheckCircle },
      medium: { variant: 'warning' as const, text: '⏱️ Medium', icon: Clock },
      slow: {
        variant: 'destructive' as const,
        text: '🐌 Slow',
        icon: AlertTriangle,
      },
    };

    const timeConfig =
      config[responseTime as keyof typeof config] || config.medium;

    return (
      <Badge variant={timeConfig.variant} className="text-xs">
        {timeConfig.text}
      </Badge>
    );
  };

  const isConnected = (vendorId: string) => {
    return connections.some(
      (conn) => conn.vendorId === vendorId && conn.status === 'active',
    );
  };

  const filteredVendors = networkVendors.filter((vendor) => {
    const matchesSearch =
      vendor.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.location.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === 'all' || vendor.businessType === filterType;
    const matchesRating =
      filterRating === 0 || vendor.networkStatus.averageRating >= filterRating;
    const matchesVerified =
      !showVerifiedOnly || vendor.networkStatus.isVerified;

    return matchesSearch && matchesType && matchesRating && matchesVerified;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Loading vendor network...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6" />
            Wedding Vendor Network
          </h2>
          <p className="text-muted-foreground">
            Connect with verified wedding professionals in your area
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentRegion && (
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {currentRegion.name}
            </Badge>
          )}
          <Badge variant="success" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {connections.length} Connected
          </Badge>
        </div>
      </div>

      {/* Region Overview */}
      {showRegionalView && currentRegion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {currentRegion.name} Wedding Network
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {currentRegion.vendorCount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Active Vendors</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-500 flex items-center justify-center gap-1">
                  <Star className="h-5 w-5" />
                  {currentRegion.averageRating}
                </p>
                <p className="text-sm text-muted-foreground">Average Rating</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">
                  {currentRegion.specialties.length}
                </p>
                <p className="text-sm text-muted-foreground">Specialties</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">
                  {connections.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  Your Connections
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Popular Specialties:</p>
              <div className="flex flex-wrap gap-2">
                {currentRegion.specialties.map((specialty) => (
                  <Badge
                    key={specialty}
                    variant="secondary"
                    className="text-xs"
                  >
                    {specialty}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search vendors by name, business, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(vendorTypes).map(([key, type]) => (
                    <SelectItem key={key} value={key}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterRating.toString()}
                onValueChange={(value) => setFilterRating(parseFloat(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any Rating</SelectItem>
                  <SelectItem value="4">4+ Stars</SelectItem>
                  <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  <SelectItem value="4.8">4.8+ Stars</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={showVerifiedOnly}
                  onCheckedChange={setShowVerifiedOnly}
                />
                <Label className="text-sm whitespace-nowrap">
                  Verified Only
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map((vendor) => {
          const typeConfig =
            vendorTypes[vendor.businessType] || vendorTypes.other;
          const connected = isConnected(vendor.id);

          return (
            <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={vendor.branding.logo} />
                    <AvatarFallback
                      className={`${typeConfig.color} text-white`}
                    >
                      {React.createElement(typeConfig.icon, {
                        className: 'h-5 w-5',
                      })}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium truncate">
                        {vendor.businessName}
                      </h4>
                      {vendor.networkStatus.isVerified && (
                        <Badge variant="success" className="text-xs">
                          <CheckCircle className="h-2 w-2 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {vendor.ownerName}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      {getVendorTypeBadge(vendor.businessType)}
                      {vendor.networkStatus.averageRating > 0 && (
                        <Badge
                          variant="outline"
                          className="text-xs flex items-center gap-1"
                        >
                          <Star className="h-2 w-2 text-yellow-500" />
                          {vendor.networkStatus.averageRating.toFixed(1)}
                          <span className="text-muted-foreground">
                            ({vendor.networkStatus.totalReviews})
                          </span>
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {vendor.location.city}, {vendor.location.state}
                        <span>• {vendor.location.serviceRadius}mi radius</span>
                      </p>
                      <p className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3" />
                        {vendor.credentials.yearsInBusiness} years experience
                        <span>
                          • {vendor.collaboration.collaborationHistory} projects
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        {getTrustScoreBadge(vendor.networkStatus.trustScore)}
                        {getResponseTimeBadge(
                          vendor.collaboration.responseTime,
                        )}
                      </div>

                      {vendor.ssoProfile.enabled && (
                        <Badge
                          variant="success"
                          className="text-xs flex items-center gap-1"
                        >
                          <Shield className="h-2 w-2" />
                          SSO
                        </Badge>
                      )}
                    </div>

                    {vendor.credentials.certifications.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {vendor.credentials.certifications
                          .slice(0, 2)
                          .map((cert) => (
                            <Badge
                              key={cert}
                              variant="secondary"
                              className="text-xs"
                            >
                              <Award className="h-2 w-2 mr-1" />
                              {cert}
                            </Badge>
                          ))}
                        {vendor.credentials.certifications.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{vendor.credentials.certifications.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  {connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        establishConnection(vendor.id, 'collaboration')
                      }
                    >
                      <Link className="h-3 w-3 mr-1" />
                      Connect
                    </Button>
                  )}

                  {vendor.ssoProfile.enabled && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        authenticateWithVendorSSO(
                          vendor,
                          vendor.ssoProfile.providers[0],
                        )
                      }
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      SSO Login
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedVendor(vendor)}
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredVendors.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Network className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No Vendors Found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm ||
              filterType !== 'all' ||
              filterRating > 0 ||
              showVerifiedOnly
                ? 'Try adjusting your search filters to find more wedding professionals'
                : 'No verified wedding vendors found in this region'}
            </p>
            <Button
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setFilterRating(0);
                setShowVerifiedOnly(false);
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedVendor.branding.logo} />
                    <AvatarFallback
                      className={`${vendorTypes[selectedVendor.businessType].color} text-white text-xl`}
                    >
                      {React.createElement(
                        vendorTypes[selectedVendor.businessType].icon,
                        { className: 'h-6 w-6' },
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">
                      {selectedVendor.businessName}
                    </h3>
                    <p className="text-muted-foreground">
                      {selectedVendor.ownerName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {getVendorTypeBadge(selectedVendor.businessType)}
                      {selectedVendor.networkStatus.isVerified && (
                        <Badge variant="success">Verified</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVendor(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto max-h-96">
              <div>
                <h4 className="font-medium mb-2">About</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedVendor.branding.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium">Location & Service Area</h4>
                  <p className="text-muted-foreground">
                    {selectedVendor.location.city},{' '}
                    {selectedVendor.location.state}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedVendor.location.serviceRadius} mile radius
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Experience</h4>
                  <p className="text-muted-foreground">
                    {selectedVendor.credentials.yearsInBusiness} years in
                    business
                  </p>
                  <p className="text-muted-foreground">
                    {selectedVendor.collaboration.collaborationHistory} wedding
                    collaborations
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Network Stats</h4>
                  <p className="text-muted-foreground">
                    Trust Score: {selectedVendor.networkStatus.trustScore}/100
                  </p>
                  <p className="text-muted-foreground">
                    {selectedVendor.networkStatus.referralCount} referrals given
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Contact</h4>
                  {selectedVendor.contact.phone && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedVendor.contact.phone}
                    </p>
                  )}
                  {selectedVendor.contact.website && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      <a
                        href={selectedVendor.contact.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        Website
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {selectedVendor.credentials.certifications.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Certifications & Awards</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.credentials.certifications.map((cert) => (
                      <Badge key={cert} variant="secondary">
                        <Award className="h-3 w-3 mr-1" />
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedVendor.ssoProfile.enabled && (
                <div>
                  <h4 className="font-medium mb-2">SSO Authentication</h4>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Team Size: {selectedVendor.ssoProfile.teamSize} members
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedVendor.ssoProfile.providers.map((provider) => (
                        <Button
                          key={provider}
                          size="sm"
                          onClick={() =>
                            authenticateWithVendorSSO(selectedVendor, provider)
                          }
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          Login via {provider}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      )}

      {/* Wedding Industry Context */}
      <Alert>
        <Network className="h-4 w-4" />
        <AlertDescription>
          <strong>🎊 Wedding Vendor Ecosystem:</strong> Connect securely with
          trusted wedding professionals in your region. SSO authentication
          enables seamless collaboration while maintaining professional
          boundaries and client confidentiality.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export type {
  VendorProfile,
  NetworkConnection,
  NetworkRegion,
  VendorNetworkSSOProps,
};
