'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  Verified,
  Camera,
  Heart,
  ExternalLink,
  Instagram,
  Facebook,
  Twitter,
} from 'lucide-react';
import Image from 'next/image';

interface Vendor {
  id: string;
  business_name: string;
  contact_name: string;
  role: string;
  category: string;
  description?: string;
  website_url?: string;
  phone?: string;
  email?: string;
  address?: any;
  logo_url?: string;
  gallery_images: string[];
  social_media: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  rating?: number;
  review_count?: number;
  verified: boolean;
  specialties: string[];
  contract_signed: boolean;
  budget_allocated?: number;
}

interface VendorStats {
  total_vendors: number;
  categories_count: number;
  verified_vendors: number;
  average_rating: number;
}

interface VendorInformationProps {
  websiteId: string;
  className?: string;
  layout?: 'grid' | 'list' | 'categories';
}

export function VendorInformation({
  websiteId,
  className = '',
  layout = 'categories',
}: VendorInformationProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsByCategory, setVendorsByCategory] = useState<
    Record<string, Vendor[]>
  >({});
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchVendors();
  }, [websiteId]);

  const fetchVendors = async () => {
    try {
      const response = await fetch(
        `/api/wedding-website/vendors?website_id=${websiteId}`,
      );
      const result = await response.json();

      if (result.success) {
        setVendors(result.data.vendors);
        setVendorsByCategory(result.data.vendors_by_category);
        setStats(result.data.stats);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch vendor information');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      case 'facebook':
        return <Facebook className="h-4 w-4" />;
      case 'twitter':
        return <Twitter className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const formatAddress = (address: any) => {
    if (!address) return '';
    if (typeof address === 'string') return address;

    const parts = [
      address.street,
      address.city,
      address.state,
      address.zip,
    ].filter(Boolean);

    return parts.join(', ');
  };

  const renderVendorCard = (vendor: Vendor) => (
    <Card
      key={vendor.id}
      className="group hover:shadow-lg transition-shadow cursor-pointer"
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {vendor.logo_url ? (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                <Image
                  src={vendor.logo_url}
                  alt={`${vendor.business_name} logo`}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <Camera className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>{vendor.business_name}</span>
                {vendor.verified && (
                  <Verified className="h-4 w-4 text-blue-500" />
                )}
              </CardTitle>
              <p className="text-sm text-gray-600">{vendor.role}</p>
            </div>
          </div>
          <Badge variant="secondary">{vendor.category}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {vendor.description && (
          <p className="text-gray-600 text-sm line-clamp-2">
            {vendor.description}
          </p>
        )}

        {/* Rating */}
        {vendor.rating && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(vendor.rating!)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">
              {vendor.rating.toFixed(1)} ({vendor.review_count} reviews)
            </span>
          </div>
        )}

        {/* Specialties */}
        {vendor.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {vendor.specialties.slice(0, 3).map((specialty, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {specialty}
              </Badge>
            ))}
            {vendor.specialties.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{vendor.specialties.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Contact Info */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex space-x-2">
            {vendor.phone && (
              <Button variant="ghost" size="sm" asChild>
                <a href={`tel:${vendor.phone}`}>
                  <Phone className="h-4 w-4" />
                </a>
              </Button>
            )}
            {vendor.email && (
              <Button variant="ghost" size="sm" asChild>
                <a href={`mailto:${vendor.email}`}>
                  <Mail className="h-4 w-4" />
                </a>
              </Button>
            )}
            {vendor.website_url && (
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={vendor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedVendor(vendor)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-48"></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="pt-6">
          <p className="text-red-600 text-center">
            {error || 'Unable to load vendor information'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const categories = Object.keys(vendorsByCategory);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Our Wedding Vendors</CardTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.total_vendors}
              </div>
              <div className="text-sm text-gray-600">Total Vendors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.categories_count}
              </div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.verified_vendors}
              </div>
              <div className="text-sm text-gray-600">Verified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.average_rating.toFixed(1)}★
              </div>
              <div className="text-sm text-gray-600">Avg. Rating</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Vendors by Category */}
      {layout === 'categories' && (
        <div className="space-y-8">
          {categories.map((category) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{category}</span>
                  <Badge variant="outline">
                    {vendorsByCategory[category].length} vendors
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vendorsByCategory[category].map(renderVendorCard)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Grid Layout */}
      {layout === 'grid' && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendors.map(renderVendorCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List Layout */}
      {layout === 'list' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="flex space-x-4 p-4 border rounded-lg"
                >
                  {vendor.logo_url ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={vendor.logo_url}
                        alt={`${vendor.business_name} logo`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Camera className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center space-x-2">
                        <span>{vendor.business_name}</span>
                        {vendor.verified && (
                          <Verified className="h-4 w-4 text-blue-500" />
                        )}
                      </h3>
                      <Badge variant="secondary">{vendor.category}</Badge>
                    </div>
                    <p className="text-gray-600 text-sm">{vendor.role}</p>
                    {vendor.description && (
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                        {vendor.description}
                      </p>
                    )}
                    {vendor.rating && (
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(vendor.rating!)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {vendor.rating.toFixed(1)} ({vendor.review_count}{' '}
                          reviews)
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedVendor(vendor)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <Dialog
          open={!!selectedVendor}
          onOpenChange={() => setSelectedVendor(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                {selectedVendor.logo_url && (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                    <Image
                      src={selectedVendor.logo_url}
                      alt={`${selectedVendor.business_name} logo`}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span>{selectedVendor.business_name}</span>
                    {selectedVendor.verified && (
                      <Verified className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 font-normal">
                    {selectedVendor.role}
                  </p>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Description */}
              {selectedVendor.description && (
                <div>
                  <h4 className="font-semibold mb-2">About</h4>
                  <p className="text-gray-600">{selectedVendor.description}</p>
                </div>
              )}

              {/* Contact Information */}
              <div>
                <h4 className="font-semibold mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedVendor.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <a
                        href={`tel:${selectedVendor.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {selectedVendor.phone}
                      </a>
                    </div>
                  )}
                  {selectedVendor.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <a
                        href={`mailto:${selectedVendor.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {selectedVendor.email}
                      </a>
                    </div>
                  )}
                  {selectedVendor.website_url && (
                    <div className="flex items-center space-x-3">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <a
                        href={selectedVendor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center space-x-1"
                      >
                        <span>Visit Website</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {selectedVendor.address && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">
                        {formatAddress(selectedVendor.address)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Social Media */}
              {Object.keys(selectedVendor.social_media).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Social Media</h4>
                  <div className="flex space-x-3">
                    {Object.entries(selectedVendor.social_media).map(
                      ([platform, url]) => (
                        <Button
                          key={platform}
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {getSocialIcon(platform)}
                            <span className="ml-2 capitalize">{platform}</span>
                          </a>
                        </Button>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Specialties */}
              {selectedVendor.specialties.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Specialties</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.specialties.map((specialty, index) => (
                      <Badge key={index} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Gallery */}
              {selectedVendor.gallery_images.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Gallery</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedVendor.gallery_images.map((image, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg overflow-hidden"
                      >
                        <Image
                          src={image}
                          alt={`${selectedVendor.business_name} gallery ${index + 1}`}
                          fill
                          className="object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rating */}
              {selectedVendor.rating && (
                <div>
                  <h4 className="font-semibold mb-3">Rating & Reviews</h4>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < Math.floor(selectedVendor.rating!)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-semibold">
                      {selectedVendor.rating.toFixed(1)}
                    </span>
                    <span className="text-gray-600">
                      ({selectedVendor.review_count} reviews)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
