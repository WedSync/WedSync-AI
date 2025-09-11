'use client';

import { useState } from 'react';
import { Camera, MapPin, Star, Heart, Award, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface SupplierPreviewProps {
  supplierName: string;
  supplierType: string;
  supplierLogoUrl?: string;
  brandColor?: string;
  coupleNames?: string;
  weddingDate?: string;
  personalizedMessage?: string;
  className?: string;
}

const supplierTypeIcons = {
  photographer: Camera,
  videographer: Camera,
  planner: Calendar,
  venue: MapPin,
  florist: Heart,
  caterer: Award,
  dj: Award,
  band: Award,
  makeup: Award,
  default: Star,
};

const supplierTypeColors = {
  photographer: 'bg-blue-50 text-blue-700 border-blue-200',
  videographer: 'bg-purple-50 text-purple-700 border-purple-200',
  planner: 'bg-green-50 text-green-700 border-green-200',
  venue: 'bg-orange-50 text-orange-700 border-orange-200',
  florist: 'bg-pink-50 text-pink-700 border-pink-200',
  caterer: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  dj: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  band: 'bg-red-50 text-red-700 border-red-200',
  makeup: 'bg-rose-50 text-rose-700 border-rose-200',
  default: 'bg-gray-50 text-gray-700 border-gray-200',
};

export default function SupplierPreview({
  supplierName,
  supplierType,
  supplierLogoUrl,
  brandColor = '#000000',
  coupleNames,
  weddingDate,
  personalizedMessage,
  className,
}: SupplierPreviewProps) {
  const [imageError, setImageError] = useState(false);

  const IconComponent =
    supplierTypeIcons[supplierType as keyof typeof supplierTypeIcons] ||
    supplierTypeIcons.default;
  const typeColorClass =
    supplierTypeColors[supplierType as keyof typeof supplierTypeColors] ||
    supplierTypeColors.default;

  const formatSupplierType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatWeddingDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Brand color accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: brandColor }}
      />

      <div className="p-4 md:p-6">
        {/* Supplier Header - Mobile responsive */}
        <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
          {/* Logo or Icon - Mobile responsive */}
          <div className="relative">
            {supplierLogoUrl && !imageError ? (
              <img
                src={supplierLogoUrl}
                alt={`${supplierName} logo`}
                className="w-12 h-12 md:w-16 md:h-16 rounded-lg object-cover border-2 border-gray-100"
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className="w-12 h-12 md:w-16 md:h-16 rounded-lg flex items-center justify-center border-2"
                style={{
                  backgroundColor: `${brandColor}10`,
                  borderColor: `${brandColor}30`,
                }}
              >
                <IconComponent
                  className="w-6 h-6 md:w-8 md:h-8"
                  style={{ color: brandColor }}
                />
              </div>
            )}
          </div>

          {/* Supplier Info - Mobile responsive */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
                {supplierName}
              </h3>
              <Badge
                variant="outline"
                className={cn(
                  typeColorClass,
                  'text-xs self-start sm:self-auto',
                )}
              >
                {formatSupplierType(supplierType)}
              </Badge>
            </div>

            {/* Wedding Context - Mobile responsive */}
            {(coupleNames || weddingDate) && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm text-gray-600">
                {coupleNames && (
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3 md:w-4 md:h-4 text-red-400 flex-shrink-0" />
                    <span className="truncate">{coupleNames}</span>
                  </div>
                )}
                {weddingDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 md:w-4 md:h-4 text-blue-400 flex-shrink-0" />
                    <span className="truncate">
                      {formatWeddingDate(weddingDate)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Personalized Message */}
        {personalizedMessage && (
          <div className="mb-6">
            <blockquote className="relative">
              <div className="absolute -left-1 -top-1 text-4xl text-gray-200 font-serif">
                "
              </div>
              <p className="text-gray-700 italic pl-6 text-lg leading-relaxed">
                {personalizedMessage}
              </p>
              <div className="absolute -right-1 -bottom-1 text-4xl text-gray-200 font-serif">
                "
              </div>
            </blockquote>
          </div>
        )}

        {/* Trust Indicators */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span>Trusted Wedding Professional</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Award className="w-4 h-4 text-blue-400" />
            <span>Verified by WedMe</span>
          </div>
        </div>
      </div>

      {/* Subtle pattern background */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='${brandColor?.replace('#', '%23') || '%23000000'}' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </Card>
  );
}
