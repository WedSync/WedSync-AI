'use client';

import React from 'react';
import { Users, Star, MapPin, Phone, Mail, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { DashboardSection } from '@/lib/services/dashboardTemplateService';

interface VendorPortfolioSectionProps {
  section: DashboardSection;
  clientId: string;
  clientData?: any;
  customConfig?: any;
  onInteraction?: (action: string, data?: any) => void;
}

// Mock vendor data
const mockVendors = [
  {
    id: '1',
    name: 'Elegant Events Photography',
    category: 'Photography',
    rating: 4.8,
    reviewCount: 127,
    location: 'London, UK',
    phone: '+44 20 1234 5678',
    email: 'hello@elegantevents.co.uk',
    website: 'https://elegantevents.co.uk',
    image: '/api/placeholder/300/200',
    specialties: ['Wedding Photography', 'Portrait Photography'],
    priceRange: '£2,000 - £5,000',
    availability: 'Available',
  },
  {
    id: '2',
    name: 'Blooms & Blossoms Florist',
    category: 'Floristry',
    rating: 4.9,
    reviewCount: 89,
    location: 'Surrey, UK',
    phone: '+44 1234 567890',
    email: 'orders@bloomsblossoms.co.uk',
    website: 'https://bloomsblossoms.co.uk',
    image: '/api/placeholder/300/200',
    specialties: ['Bridal Bouquets', 'Venue Decoration'],
    priceRange: '£800 - £3,000',
    availability: 'Booking Fast',
  },
];

export default function VendorPortfolioSection({
  section,
  clientId,
  clientData,
  customConfig,
  onInteraction,
}: VendorPortfolioSectionProps) {
  const config = { ...section.section_config, ...customConfig };
  const vendors = mockVendors;

  const getAvailabilityBadge = (availability: string) => {
    switch (availability) {
      case 'Available':
        return (
          <Badge variant="success" size="sm">
            Available
          </Badge>
        );
      case 'Booking Fast':
        return (
          <Badge variant="warning" size="sm">
            Booking Fast
          </Badge>
        );
      case 'Fully Booked':
        return (
          <Badge variant="destructive" size="sm">
            Fully Booked
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" size="sm">
            {availability}
          </Badge>
        );
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{section.title}</h3>
            <p className="text-sm text-gray-600">{section.description}</p>
          </div>
        </div>

        <Badge variant="outline">{vendors.length} vendors</Badge>
      </div>

      {/* Vendor Cards */}
      <div className="space-y-4">
        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={() => onInteraction?.('view_vendor', { vendor })}
          >
            <div className="flex gap-4">
              {/* Vendor Image */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
              </div>

              {/* Vendor Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 truncate">
                      {vendor.name}
                    </h4>
                    <p className="text-sm text-gray-600">{vendor.category}</p>
                  </div>
                  {getAvailabilityBadge(vendor.availability)}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">{vendor.rating}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    ({vendor.reviewCount} reviews)
                  </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>{vendor.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{vendor.priceRange}</span>
                  </div>
                </div>

                {/* Specialties */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {vendor.specialties.map((specialty, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>

                {/* Contact Actions */}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInteraction?.('contact_vendor', {
                        vendor,
                        method: 'inquiry',
                      });
                    }}
                  >
                    Send Inquiry
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Phone className="h-3 w-3" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onInteraction?.('contact_vendor', {
                        vendor,
                        method: 'call',
                      });
                    }}
                  >
                    Call
                  </Button>
                  <Button
                    variant="tertiary"
                    size="sm"
                    leftIcon={<ExternalLink className="h-3 w-3" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(vendor.website, '_blank');
                    }}
                  >
                    Website
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Browse More */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-center">
        <Button
          variant="secondary"
          onClick={() => onInteraction?.('browse_all', {})}
        >
          Browse All Vendors
        </Button>
      </div>
    </div>
  );
}
