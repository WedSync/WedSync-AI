'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Camera,
  Music,
  Flower,
  Car,
  Building,
  Utensils,
  Users,
  Heart,
  Palette,
  Sparkles,
  Gift,
  MapPin,
  Crown,
  Shirt,
  Diamond,
  Clock,
  Star,
  TrendingUp,
} from 'lucide-react';

interface VendorCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  subcategories?: VendorSubcategory[];
  vendorCount: number;
  averagePrice: string;
  popular: boolean;
  essential: boolean;
  description: string;
}

interface VendorSubcategory {
  id: string;
  name: string;
  vendorCount: number;
  description: string;
}

interface VendorCategoryFilterProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  className?: string;
  compact?: boolean;
  showCounts?: boolean;
  showSubcategories?: boolean;
}

const VENDOR_CATEGORIES: VendorCategory[] = [
  {
    id: 'photography',
    name: 'Photography',
    icon: <Camera className="w-5 h-5" />,
    vendorCount: 1247,
    averagePrice: '£1,800',
    popular: true,
    essential: true,
    description:
      'Capture your special moments with professional wedding photographers',
    subcategories: [
      {
        id: 'wedding-photography',
        name: 'Wedding Photography',
        vendorCount: 892,
        description: 'Full wedding day coverage',
      },
      {
        id: 'engagement-photography',
        name: 'Engagement Photography',
        vendorCount: 643,
        description: 'Pre-wedding couple shoots',
      },
      {
        id: 'bridal-portraits',
        name: 'Bridal Portraits',
        vendorCount: 456,
        description: 'Individual bridal photography',
      },
      {
        id: 'destination-photography',
        name: 'Destination Photography',
        vendorCount: 234,
        description: 'Travel photographers for destination weddings',
      },
    ],
  },
  {
    id: 'videography',
    name: 'Videography',
    icon: <Camera className="w-5 h-5" />,
    vendorCount: 567,
    averagePrice: '£1,200',
    popular: true,
    essential: true,
    description: 'Professional wedding videography and cinematography services',
    subcategories: [
      {
        id: 'wedding-films',
        name: 'Wedding Films',
        vendorCount: 423,
        description: 'Cinematic wedding videos',
      },
      {
        id: 'drone-videography',
        name: 'Drone Videography',
        vendorCount: 189,
        description: 'Aerial wedding footage',
      },
      {
        id: 'live-streaming',
        name: 'Live Streaming',
        vendorCount: 156,
        description: 'Stream your wedding live',
      },
    ],
  },
  {
    id: 'venues',
    name: 'Venues',
    icon: <Building className="w-5 h-5" />,
    vendorCount: 892,
    averagePrice: '£4,500',
    popular: true,
    essential: true,
    description: 'Beautiful venues to host your perfect wedding celebration',
    subcategories: [
      {
        id: 'hotels',
        name: 'Hotels',
        vendorCount: 234,
        description: 'Hotel wedding venues',
      },
      {
        id: 'manor-houses',
        name: 'Manor Houses',
        vendorCount: 189,
        description: 'Historic manor houses',
      },
      {
        id: 'barns',
        name: 'Barns',
        vendorCount: 167,
        description: 'Rustic barn venues',
      },
      {
        id: 'outdoor-venues',
        name: 'Outdoor Venues',
        vendorCount: 145,
        description: 'Garden and outdoor spaces',
      },
      {
        id: 'registrars',
        name: 'Registrar Offices',
        vendorCount: 123,
        description: 'Civil ceremony venues',
      },
    ],
  },
  {
    id: 'catering',
    name: 'Catering',
    icon: <Utensils className="w-5 h-5" />,
    vendorCount: 756,
    averagePrice: '£65/head',
    popular: true,
    essential: true,
    description: 'Delicious catering services for your wedding reception',
    subcategories: [
      {
        id: 'wedding-breakfast',
        name: 'Wedding Breakfast',
        vendorCount: 456,
        description: 'Formal dining service',
      },
      {
        id: 'buffet-catering',
        name: 'Buffet Catering',
        vendorCount: 298,
        description: 'Self-service buffet options',
      },
      {
        id: 'canape-service',
        name: 'Canapé Service',
        vendorCount: 234,
        description: 'Cocktail reception catering',
      },
      {
        id: 'dietary-specialists',
        name: 'Dietary Specialists',
        vendorCount: 189,
        description: 'Vegan, gluten-free specialists',
      },
    ],
  },
  {
    id: 'florists',
    name: 'Florists',
    icon: <Flower className="w-5 h-5" />,
    vendorCount: 645,
    averagePrice: '£450',
    popular: true,
    essential: true,
    description: 'Beautiful floral arrangements and bouquets for your wedding',
    subcategories: [
      {
        id: 'bridal-bouquets',
        name: 'Bridal Bouquets',
        vendorCount: 567,
        description: 'Custom bridal bouquets',
      },
      {
        id: 'ceremony-flowers',
        name: 'Ceremony Flowers',
        vendorCount: 434,
        description: 'Ceremony decorations',
      },
      {
        id: 'reception-centerpieces',
        name: 'Reception Centerpieces',
        vendorCount: 398,
        description: 'Table centerpieces',
      },
      {
        id: 'venue-styling',
        name: 'Venue Styling',
        vendorCount: 267,
        description: 'Full venue floral styling',
      },
    ],
  },
  {
    id: 'music-dj',
    name: 'Music & DJ',
    icon: <Music className="w-5 h-5" />,
    vendorCount: 523,
    averagePrice: '£650',
    popular: true,
    essential: true,
    description: 'Wedding entertainment, DJs, and live music',
    subcategories: [
      {
        id: 'wedding-djs',
        name: 'Wedding DJs',
        vendorCount: 345,
        description: 'Professional wedding DJs',
      },
      {
        id: 'live-bands',
        name: 'Live Bands',
        vendorCount: 189,
        description: 'Wedding bands and musicians',
      },
      {
        id: 'acoustic-acts',
        name: 'Acoustic Acts',
        vendorCount: 156,
        description: 'Acoustic ceremony music',
      },
      {
        id: 'string-quartets',
        name: 'String Quartets',
        vendorCount: 98,
        description: 'Classical ceremony music',
      },
    ],
  },
  {
    id: 'wedding-cakes',
    name: 'Wedding Cakes',
    icon: <Heart className="w-5 h-5" />,
    vendorCount: 434,
    averagePrice: '£350',
    popular: false,
    essential: true,
    description: 'Custom wedding cakes and sweet treats',
    subcategories: [
      {
        id: 'tiered-cakes',
        name: 'Tiered Cakes',
        vendorCount: 298,
        description: 'Traditional tiered wedding cakes',
      },
      {
        id: 'cupcakes',
        name: 'Cupcakes',
        vendorCount: 156,
        description: 'Wedding cupcake towers',
      },
      {
        id: 'dessert-tables',
        name: 'Dessert Tables',
        vendorCount: 123,
        description: 'Sweet treat displays',
      },
    ],
  },
  {
    id: 'bridal-wear',
    name: 'Bridal Wear',
    icon: <Crown className="w-5 h-5" />,
    vendorCount: 387,
    averagePrice: '£1,200',
    popular: false,
    essential: true,
    description: 'Wedding dresses, shoes, and bridal accessories',
    subcategories: [
      {
        id: 'wedding-dresses',
        name: 'Wedding Dresses',
        vendorCount: 234,
        description: 'Designer wedding gowns',
      },
      {
        id: 'bridesmaid-dresses',
        name: 'Bridesmaid Dresses',
        vendorCount: 189,
        description: 'Bridesmaid attire',
      },
      {
        id: 'bridal-shoes',
        name: 'Bridal Shoes',
        vendorCount: 156,
        description: 'Wedding shoes and accessories',
      },
      {
        id: 'veils-accessories',
        name: 'Veils & Accessories',
        vendorCount: 134,
        description: 'Bridal veils and jewelry',
      },
    ],
  },
  {
    id: 'grooms-wear',
    name: 'Grooms Wear',
    icon: <Shirt className="w-5 h-5" />,
    vendorCount: 298,
    averagePrice: '£350',
    popular: false,
    essential: true,
    description: 'Suits, formal wear, and accessories for the groom',
    subcategories: [
      {
        id: 'wedding-suits',
        name: 'Wedding Suits',
        vendorCount: 187,
        description: 'Groom and groomsmen suits',
      },
      {
        id: 'formal-hire',
        name: 'Formal Hire',
        vendorCount: 134,
        description: 'Suit rental services',
      },
      {
        id: 'accessories',
        name: 'Accessories',
        vendorCount: 98,
        description: 'Ties, cufflinks, shoes',
      },
    ],
  },
  {
    id: 'hair-makeup',
    name: 'Hair & Makeup',
    icon: <Sparkles className="w-5 h-5" />,
    vendorCount: 678,
    averagePrice: '£280',
    popular: true,
    essential: true,
    description: 'Professional wedding hair styling and makeup services',
    subcategories: [
      {
        id: 'bridal-makeup',
        name: 'Bridal Makeup',
        vendorCount: 456,
        description: 'Wedding day makeup',
      },
      {
        id: 'bridal-hair',
        name: 'Bridal Hair',
        vendorCount: 423,
        description: 'Wedding hairstyling',
      },
      {
        id: 'mobile-services',
        name: 'Mobile Services',
        vendorCount: 298,
        description: 'On-location services',
      },
      {
        id: 'trial-sessions',
        name: 'Trial Sessions',
        vendorCount: 234,
        description: 'Makeup and hair trials',
      },
    ],
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: <Car className="w-5 h-5" />,
    vendorCount: 245,
    averagePrice: '£280',
    popular: false,
    essential: false,
    description: 'Wedding transport and chauffeur services',
    subcategories: [
      {
        id: 'luxury-cars',
        name: 'Luxury Cars',
        vendorCount: 134,
        description: 'Luxury wedding cars',
      },
      {
        id: 'vintage-cars',
        name: 'Vintage Cars',
        vendorCount: 98,
        description: 'Classic vintage vehicles',
      },
      {
        id: 'horse-carriage',
        name: 'Horse & Carriage',
        vendorCount: 45,
        description: 'Traditional horse carriages',
      },
    ],
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: <Users className="w-5 h-5" />,
    vendorCount: 189,
    averagePrice: '£450',
    popular: false,
    essential: false,
    description: 'Wedding entertainment and performers',
    subcategories: [
      {
        id: 'magicians',
        name: 'Magicians',
        vendorCount: 67,
        description: 'Wedding magicians',
      },
      {
        id: 'photo-booths',
        name: 'Photo Booths',
        vendorCount: 89,
        description: 'Interactive photo booths',
      },
      {
        id: 'performers',
        name: 'Performers',
        vendorCount: 45,
        description: 'Entertainers and shows',
      },
    ],
  },
];

export function VendorCategoryFilter({
  selectedCategories,
  onChange,
  className,
  compact = false,
  showCounts = true,
  showSubcategories = false,
}: VendorCategoryFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [showEssentialOnly, setShowEssentialOnly] = useState(false);
  const [showPopularOnly, setShowPopularOnly] = useState(false);

  const filteredCategories = useMemo(() => {
    let categories = VENDOR_CATEGORIES;

    // Apply search filter
    if (searchQuery) {
      categories = categories.filter(
        (category) =>
          category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          category.subcategories?.some((sub) =>
            sub.name.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      );
    }

    // Apply essential filter
    if (showEssentialOnly) {
      categories = categories.filter((category) => category.essential);
    }

    // Apply popular filter
    if (showPopularOnly) {
      categories = categories.filter((category) => category.popular);
    }

    return categories;
  }, [searchQuery, showEssentialOnly, showPopularOnly]);

  const handleCategoryToggle = (categoryId: string) => {
    const isSelected = selectedCategories.includes(categoryId);
    if (isSelected) {
      onChange(selectedCategories.filter((id) => id !== categoryId));
    } else {
      onChange([...selectedCategories, categoryId]);
    }
  };

  const handleSubcategoryToggle = (subcategoryId: string) => {
    const isSelected = selectedCategories.includes(subcategoryId);
    if (isSelected) {
      onChange(selectedCategories.filter((id) => id !== subcategoryId));
    } else {
      onChange([...selectedCategories, subcategoryId]);
    }
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const clearAllCategories = () => {
    onChange([]);
  };

  const selectEssentialCategories = () => {
    const essentialIds = VENDOR_CATEGORIES.filter((cat) => cat.essential).map(
      (cat) => cat.id,
    );
    onChange(essentialIds);
  };

  const CategoryCard = ({ category }: { category: VendorCategory }) => {
    const isSelected = selectedCategories.includes(category.id);
    const isExpanded = expandedCategories.has(category.id);
    const hasSelectedSubcategories = category.subcategories?.some((sub) =>
      selectedCategories.includes(sub.id),
    );

    return (
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200',
          isSelected && 'ring-2 ring-blue-500 bg-blue-50',
          hasSelectedSubcategories &&
            !isSelected &&
            'ring-1 ring-blue-300 bg-blue-25',
        )}
      >
        <CardContent className={cn('p-4', compact && 'p-3')}>
          <div
            className="flex items-center justify-between"
            onClick={() => handleCategoryToggle(category.id)}
          >
            <div className="flex items-center space-x-3 flex-1">
              <Checkbox
                checked={isSelected}
                onChange={() => {}} // Handled by parent onClick
                className="flex-shrink-0"
              />

              <div
                className={cn(
                  'flex-shrink-0 p-2 rounded-lg',
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600',
                )}
              >
                {category.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3
                    className={cn(
                      'font-medium text-gray-900',
                      compact ? 'text-sm' : 'text-base',
                    )}
                  >
                    {category.name}
                  </h3>

                  {category.essential && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-orange-100 text-orange-800"
                    >
                      Essential
                    </Badge>
                  )}

                  {category.popular && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-green-100 text-green-800"
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                </div>

                {!compact && (
                  <p className="text-sm text-gray-600 mb-2">
                    {category.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  {showCounts && <span>{category.vendorCount} vendors</span>}
                  <span className="font-medium text-gray-700">
                    {category.averagePrice}
                  </span>
                </div>
              </div>
            </div>

            {showSubcategories &&
              category.subcategories &&
              category.subcategories.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategoryExpansion(category.id);
                  }}
                  className="ml-2"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              )}
          </div>

          {/* Subcategories */}
          {showSubcategories && isExpanded && category.subcategories && (
            <div className="mt-4 pl-8 border-l-2 border-gray-100 space-y-2">
              {category.subcategories.map((subcategory) => {
                const isSubSelected = selectedCategories.includes(
                  subcategory.id,
                );

                return (
                  <div
                    key={subcategory.id}
                    className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubcategoryToggle(subcategory.id);
                    }}
                  >
                    <Checkbox
                      checked={isSubSelected}
                      onChange={() => {}} // Handled by parent onClick
                      className="flex-shrink-0"
                    />

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            isSubSelected ? 'text-blue-900' : 'text-gray-700',
                          )}
                        >
                          {subcategory.name}
                        </span>

                        {showCounts && (
                          <span className="text-xs text-gray-500">
                            {subcategory.vendorCount}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600">
                        {subcategory.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className={cn(
            'font-semibold text-gray-900',
            compact ? 'text-sm' : 'text-base',
          )}
        >
          Vendor Categories
          {selectedCategories.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedCategories.length}
            </Badge>
          )}
        </h3>

        {selectedCategories.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllCategories}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="essential-only"
              checked={showEssentialOnly}
              onCheckedChange={setShowEssentialOnly}
            />
            <Label htmlFor="essential-only" className="text-sm">
              Essential only
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="popular-only"
              checked={showPopularOnly}
              onCheckedChange={setShowPopularOnly}
            />
            <Label htmlFor="popular-only" className="text-sm">
              Popular only
            </Label>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectEssentialCategories}
          >
            <Star className="w-4 h-4 mr-1" />
            Select Essentials
          </Button>
        </div>
      </div>

      {/* Selected Categories */}
      {selectedCategories.length > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium mb-2">Selected Categories:</div>
          <div className="flex flex-wrap gap-1">
            {selectedCategories.map((categoryId) => {
              const category =
                VENDOR_CATEGORIES.find((c) => c.id === categoryId) ||
                VENDOR_CATEGORIES.find((c) =>
                  c.subcategories?.some((sub) => sub.id === categoryId),
                )?.subcategories?.find((sub) => sub.id === categoryId);

              return (
                <Badge
                  key={categoryId}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {category?.name || categoryId}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => {
                      if (VENDOR_CATEGORIES.find((c) => c.id === categoryId)) {
                        handleCategoryToggle(categoryId);
                      } else {
                        handleSubcategoryToggle(categoryId);
                      }
                    }}
                  />
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div
        className={cn(
          'grid gap-4',
          compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2',
        )}
      >
        {filteredCategories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>

      {filteredCategories.length === 0 && searchQuery && (
        <div className="text-center py-8 text-gray-500">
          <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No categories found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}

export default VendorCategoryFilter;
