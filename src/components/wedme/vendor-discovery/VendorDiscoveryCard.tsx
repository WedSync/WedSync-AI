'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  VendorDiscovery,
  VendorProfile,
  CoupleProfile,
  WeddingFile,
  DiscoverySource,
  AvailabilityStatus,
} from '@/types/wedme/file-management';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Star,
  MapPin,
  Heart,
  Eye,
  Phone,
  Mail,
  Globe,
  Instagram,
  Facebook,
  Bookmark,
  Share2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  CheckCircle,
  Camera,
  Play,
  Award,
  Zap,
  Calendar,
} from 'lucide-react';

interface VendorDiscoveryCardProps {
  discovery: VendorDiscovery;
  couple: CoupleProfile;
  isSaved: boolean;
  onSave: () => void;
  onContact: () => void;
  onFileView: (file: WeddingFile) => void;
  index: number;
}

const VendorDiscoveryCard: React.FC<VendorDiscoveryCardProps> = ({
  discovery,
  couple,
  isSaved,
  onSave,
  onContact,
  onFileView,
  index,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const {
    vendor,
    workExamples,
    discoverySource,
    contextMatch,
    availabilityStatus,
    pricingEstimate,
    reviewSummary,
  } = discovery;

  // Get discovery source info
  const getDiscoverySourceInfo = (source: DiscoverySource) => {
    switch (source) {
      case 'file_metadata':
        return {
          label: 'From Files',
          color: 'bg-blue-100 text-blue-700',
          icon: Camera,
        };
      case 'ai_recognition':
        return {
          label: 'AI Discovered',
          color: 'bg-purple-100 text-purple-700',
          icon: Sparkles,
        };
      case 'style_matching':
        return {
          label: 'Style Match',
          color: 'bg-pink-100 text-pink-700',
          icon: Heart,
        };
      case 'location_based':
        return {
          label: 'Near You',
          color: 'bg-green-100 text-green-700',
          icon: MapPin,
        };
      case 'social_network':
        return {
          label: 'Friend Recommended',
          color: 'bg-orange-100 text-orange-700',
          icon: Users,
        };
      case 'recommendation_engine':
        return {
          label: 'Recommended',
          color: 'bg-indigo-100 text-indigo-700',
          icon: TrendingUp,
        };
      default:
        return {
          label: 'Discovered',
          color: 'bg-gray-100 text-gray-700',
          icon: Eye,
        };
    }
  };

  const getAvailabilityBadge = (status: AvailabilityStatus) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-700">Available</Badge>;
      case 'limited':
        return <Badge className="bg-yellow-100 text-yellow-700">Limited</Badge>;
      case 'booked':
        return <Badge className="bg-red-100 text-red-700">Booked</Badge>;
      case 'unknown':
      default:
        return <Badge variant="secondary">Check Availability</Badge>;
    }
  };

  const sourceInfo = getDiscoverySourceInfo(discoverySource);
  const SourceIcon = sourceInfo.icon;

  const avgRating =
    vendor.reviews.length > 0
      ? vendor.reviews.reduce((sum, r) => sum + r.rating, 0) /
        vendor.reviews.length
      : 0;

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${(price / 1000).toFixed(1)}k`;
    }
    return `$${price}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5 }}
      className="group"
    >
      <Card className="overflow-hidden bg-white border-purple-100 hover:shadow-xl hover:border-purple-300 transition-all duration-300">
        {/* Header Image Carousel */}
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {workExamples.length > 0 ? (
            <>
              <div
                className="flex transition-transform duration-500 ease-in-out h-full"
                style={{
                  transform: `translateX(-${currentImageIndex * 100}%)`,
                }}
              >
                {workExamples.map((file, idx) => (
                  <div key={file.id} className="w-full flex-shrink-0 relative">
                    {file.type === 'photo' ? (
                      <img
                        src={file.thumbnailUrl || file.url}
                        alt={`${vendor.name} work example`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => onFileView(file)}
                      />
                    ) : file.type === 'video' ? (
                      <div
                        className="w-full h-full bg-gray-900 flex items-center justify-center cursor-pointer relative"
                        onClick={() => onFileView(file)}
                      >
                        <Play className="w-12 h-12 text-white" />
                        {file.thumbnailUrl && (
                          <img
                            src={file.thumbnailUrl}
                            alt="Video thumbnail"
                            className="absolute inset-0 w-full h-full object-cover opacity-50"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <Camera className="w-12 h-12 text-purple-400" />
                      </div>
                    )}

                    {/* Viral Indicator */}
                    {file.viralPotential > 80 && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Viral
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Image Navigation */}
              {workExamples.length > 1 && (
                <>
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
                    {workExamples.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentImageIndex((prev) =>
                        prev > 0 ? prev - 1 : workExamples.length - 1,
                      )
                    }
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    ←
                  </button>

                  <button
                    onClick={() =>
                      setCurrentImageIndex((prev) =>
                        prev < workExamples.length - 1 ? prev + 1 : 0,
                      )
                    }
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    →
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <Camera className="w-12 h-12 text-purple-400" />
            </div>
          )}

          {/* Discovery Source Badge */}
          <div className="absolute top-3 right-3">
            <Badge className={sourceInfo.color}>
              <SourceIcon className="w-3 h-3 mr-1" />
              {sourceInfo.label}
            </Badge>
          </div>

          {/* Save Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isSaved
                ? 'bg-pink-500 text-white'
                : 'bg-white/90 hover:bg-white text-gray-700 hover:text-pink-500'
            }`}
          >
            {isSaved ? (
              <Heart className="w-5 h-5 fill-current" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Vendor Info */}
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={vendor.portfolio[0]?.imageUrl} />
                  <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    {vendor.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                    {vendor.businessName}
                  </h3>
                  <p className="text-purple-600 text-sm font-medium capitalize">
                    {vendor.category.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Trending Badge */}
              {vendor.trendingStatus === 'hot' && (
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                  <Zap className="w-3 h-3 mr-1" />
                  Hot
                </Badge>
              )}
            </div>

            {/* Rating and Location */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                {avgRating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-medium">{avgRating.toFixed(1)}</span>
                    <span className="text-gray-500">
                      ({vendor.reviews.length})
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {vendor.location.city}, {vendor.location.state}
                  </span>
                </div>
              </div>

              {getAvailabilityBadge(availabilityStatus)}
            </div>
          </div>

          {/* Context Match */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Match Score</span>
              <span className="font-medium text-purple-600">
                {Math.round(contextMatch * 100)}%
              </span>
            </div>
            <Progress value={contextMatch * 100} className="h-2" />
          </div>

          {/* Specialties */}
          {vendor.specialties.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {vendor.specialties.slice(0, 3).map((specialty, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs border-purple-200 text-purple-700"
                >
                  {specialty}
                </Badge>
              ))}
              {vendor.specialties.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-xs border-gray-200 text-gray-500"
                >
                  +{vendor.specialties.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Pricing */}
          {pricingEstimate && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Starting at</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  {formatPrice(pricingEstimate.min)} -{' '}
                  {formatPrice(pricingEstimate.max)}
                </div>
                {pricingEstimate.unit && (
                  <div className="text-xs text-gray-500">
                    {pricingEstimate.unit}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Work Examples Count */}
          {workExamples.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Camera className="w-4 h-4" />
                <span>{workExamples.length} work examples</span>
              </div>

              {reviewSummary && (
                <div className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  <span>{reviewSummary.totalReviews} reviews</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 pt-0">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-1 border-purple-200 hover:bg-purple-50"
            >
              <Eye className="w-4 h-4 mr-2" />
              {isExpanded ? 'Hide Details' : 'View Details'}
            </Button>

            <Button
              onClick={onContact}
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Contact
            </Button>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50 p-4 space-y-4"
          >
            {/* About */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">About</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {vendor.portfolio[0]?.description ||
                  `Professional ${vendor.category} specializing in ${vendor.specialties.join(', ')}.`}
              </p>
            </div>

            {/* Recent Reviews */}
            {vendor.reviews.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Recent Reviews
                </h4>
                <div className="space-y-2">
                  {vendor.reviews.slice(0, 2).map((review) => (
                    <div key={review.id} className="bg-white p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < review.rating
                                  ? 'text-yellow-500 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(review.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {review.comment}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        - {review.reviewer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Contact</h4>
              <div className="grid grid-cols-2 gap-3">
                {vendor.contactInfo.email && (
                  <Button variant="outline" size="sm" className="justify-start">
                    <Mail className="w-3 h-3 mr-2" />
                    Email
                  </Button>
                )}
                {vendor.contactInfo.phone && (
                  <Button variant="outline" size="sm" className="justify-start">
                    <Phone className="w-3 h-3 mr-2" />
                    Call
                  </Button>
                )}
                {vendor.contactInfo.website && (
                  <Button variant="outline" size="sm" className="justify-start">
                    <Globe className="w-3 h-3 mr-2" />
                    Website
                  </Button>
                )}
                {vendor.socialProfiles.length > 0 && (
                  <Button variant="outline" size="sm" className="justify-start">
                    <Instagram className="w-3 h-3 mr-2" />
                    Social
                  </Button>
                )}
              </div>
            </div>

            {/* Booking CTA */}
            <div className="pt-2">
              <Button
                onClick={onContact}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Check Availability & Book
              </Button>
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};

export default VendorDiscoveryCard;
