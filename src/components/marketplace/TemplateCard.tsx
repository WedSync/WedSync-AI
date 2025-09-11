'use client';

import { useState } from 'react';
import {
  Star,
  Users,
  ShoppingBag,
  Play,
  Award,
  Clock,
  ChevronRight,
  Heart,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Creator {
  id: string;
  businessName: string;
  vendorType: string;
  avatarUrl?: string;
}

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
  creator: Creator;
  featured: boolean;
  tags: string[];
  targetWeddingTypes: string[];
  targetPriceRange: string;
}

interface Props {
  template: MarketplaceTemplate;
  onView: (templateId: string) => void;
  onPurchase: (templateId: string) => void;
  showCreator?: boolean;
  size?: 'compact' | 'standard' | 'detailed';
  userTier?: 'starter' | 'professional' | 'scale';
  vendorType?: string;
}

export function TemplateCard({
  template,
  onView,
  onPurchase,
  showCreator = true,
  size = 'standard',
  userTier = 'starter',
  vendorType = 'planning',
}: Props) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatPrice = (priceCents: number, currency: string): string => {
    const price = priceCents / 100;
    const formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
    });
    return formatter.format(price);
  };

  const canAccessTemplate = (): boolean => {
    const tierLevels = { starter: 1, professional: 2, scale: 3 };
    const userLevel = tierLevels[userTier];
    const requiredLevel = tierLevels[template.minimumTier];
    return userLevel >= requiredLevel;
  };

  const getPersonalizationTag = (): string | null => {
    if (template.creator.vendorType === vendorType) {
      return 'From your industry';
    }
    if (template.tags.includes(vendorType)) {
      return 'Relevant to your business';
    }
    if (template.installCount > 100 && template.averageRating > 4.5) {
      return 'Highly rated';
    }
    if (template.featured) {
      return 'Featured';
    }
    return null;
  };

  const getTemplateTypeIcon = (type: string): string => {
    const icons = {
      form: '📋',
      email_sequence: '📧',
      journey_workflow: '🔄',
      bundle: '📦',
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  const personalizationTag = getPersonalizationTag();
  const canAccess = canAccessTemplate();

  const cardClasses = cn(
    'group cursor-pointer transition-all duration-300 overflow-hidden',
    'hover:shadow-xl hover:-translate-y-1',
    size === 'compact' ? 'h-auto' : 'h-full',
    !canAccess && 'opacity-75',
  );

  const imageHeight =
    size === 'compact' ? 'h-32' : size === 'detailed' ? 'h-64' : 'h-48';

  return (
    <Card className={cardClasses} onClick={() => onView(template.id)}>
      {/* Image Section */}
      <div className={cn('relative overflow-hidden', imageHeight)}>
        {template.previewImages[0] ? (
          <>
            <img
              src={template.previewImages[0]}
              alt={template.title}
              className={cn(
                'w-full h-full object-cover transition-all duration-500 group-hover:scale-110',
                !imageLoaded && 'opacity-0',
              )}
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                <span className="text-4xl">
                  {getTemplateTypeIcon(template.templateType)}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <span className="text-6xl opacity-50">
              {getTemplateTypeIcon(template.templateType)}
            </span>
          </div>
        )}

        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {template.featured && (
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
              <Award className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          )}
          {personalizationTag && !template.featured && (
            <Badge className="bg-green-500 text-white border-0">
              <Award className="w-3 h-3 mr-1" />
              {personalizationTag}
            </Badge>
          )}
        </div>

        <div className="absolute top-3 right-3 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="bg-white/90 text-gray-700 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              // Handle preview
            }}
          >
            <Play className="w-3 h-3 mr-1" />
            Preview
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              'bg-white/90 hover:bg-white w-8 h-8 p-0',
              isFavorited && 'text-red-500',
            )}
            onClick={(e) => {
              e.stopPropagation();
              setIsFavorited(!isFavorited);
            }}
          >
            <Heart className={cn('w-4 h-4', isFavorited && 'fill-current')} />
          </Button>
        </div>

        {/* Template Type Indicator */}
        <div className="absolute bottom-3 left-3">
          <Badge
            variant="secondary"
            className="bg-black/50 text-white border-0 backdrop-blur-sm"
          >
            {template.templateType.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Content Section */}
      <CardHeader className={cn('pb-2', size === 'compact' && 'pb-1')}>
        <CardTitle
          className={cn(
            'line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight',
            size === 'compact'
              ? 'text-sm'
              : size === 'detailed'
                ? 'text-xl'
                : 'text-base',
          )}
        >
          {template.title}
        </CardTitle>

        {showCreator && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {template.creator.avatarUrl && (
              <img
                src={template.creator.avatarUrl}
                alt={template.creator.businessName}
                className="w-4 h-4 rounded-full"
              />
            )}
            <span className="truncate">by {template.creator.businessName}</span>
            <div className="flex items-center gap-1 ml-auto">
              <Users className="w-3 h-3" />
              <span className="text-xs">{template.installCount}</span>
            </div>
          </div>
        )}

        {size === 'detailed' && (
          <p className="text-gray-600 text-sm line-clamp-2 mt-2">
            {template.description}
          </p>
        )}
      </CardHeader>

      <CardContent className={cn('pt-0', size === 'compact' && 'pb-3')}>
        {/* Price and Rating */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <span
              className={cn(
                'font-bold text-gray-900',
                size === 'compact'
                  ? 'text-base'
                  : size === 'detailed'
                    ? 'text-2xl'
                    : 'text-lg',
              )}
            >
              {formatPrice(template.priceCents, template.currency)}
            </span>
            <div className="flex items-center mt-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm ml-1 font-medium">
                {template.averageRating.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500 ml-1">
                ({template.ratingCount})
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {size !== 'compact' && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    `/wedme/marketplace/templates/${template.id}`,
                    '_blank',
                  );
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="sm"
              disabled={!canAccess}
              className={cn(
                'flex items-center gap-1',
                !canAccess && 'opacity-50 cursor-not-allowed',
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (canAccess) {
                  onPurchase(template.id);
                }
              }}
            >
              {canAccess ? (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  {size === 'compact' ? 'Buy' : 'Purchase'}
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  Locked
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Access Requirements */}
        {!canAccess && (
          <div className="mb-3">
            <Badge
              variant="outline"
              className="w-full justify-center text-xs bg-orange-50 text-orange-700 border-orange-200"
            >
              Requires {template.minimumTier} tier or higher
            </Badge>
          </div>
        )}

        {/* Tags (for detailed view) */}
        {size === 'detailed' && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag.replace('-', ' ')}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{template.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Call to Action */}
        <Button
          variant="ghost"
          className="w-full justify-between p-0 h-auto text-blue-600 hover:text-blue-700 hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            onView(template.id);
          }}
        >
          <span className="text-sm font-medium">View Details</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
