/**
 * PlaceDetails Component
 * Comprehensive venue information display for WedSync wedding planning
 * Uses Untitled UI design system with mobile-first responsive design
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  MapPin,
  Phone,
  Globe,
  Star,
  Clock,
  Users,
  Car,
  Wheelchair,
  Heart,
  Share,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  DollarSign,
} from 'lucide-react';
import type {
  PlaceDetailsProps,
  PlaceDetails,
  GooglePlacePhoto,
} from '@/types/google-places';

/**
 * Photo gallery component
 */
function PhotoGallery({
  photos,
  placeName,
}: {
  photos: GooglePlacePhoto[];
  placeName: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    setImageLoading(true);
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    setImageLoading(true);
  }, [photos.length]);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  if (!photos?.length) {
    return (
      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <MapPin size={48} className="mx-auto mb-2" />
          <p className="text-sm">No photos available</p>
        </div>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];
  // Note: In production, you'd need to implement Google Places Photo API
  const photoUrl = `/api/google-places/photo?photo_reference=${currentPhoto.photo_reference}&maxwidth=800`;

  return (
    <div className="relative group">
      {/* Main Image */}
      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" />
          </div>
        )}

        <img
          src={photoUrl}
          alt={`${placeName} - Photo ${currentIndex + 1} of ${photos.length}`}
          onLoad={handleImageLoad}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {/* Navigation Buttons */}
        {photos.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous photo"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next photo"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Photo Counter */}
        {photos.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/60 text-white px-2 py-1 rounded text-sm">
            {currentIndex + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {photos.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {photos.map((photo, index) => (
            <button
              key={photo.photo_reference}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-primary-600 opacity-100'
                  : 'border-transparent opacity-60 hover:opacity-80'
              }`}
            >
              <img
                src={`/api/google-places/photo?photo_reference=${photo.photo_reference}&maxwidth=100`}
                alt={`${placeName} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Rating display component
 */
function RatingDisplay({
  rating,
  totalRatings,
}: {
  rating?: number;
  totalRatings?: number;
}) {
  if (!rating) {
    return <div className="text-sm text-gray-500">No ratings available</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Star size={16} className="text-yellow-400 fill-current" />
        <span className="font-semibold text-gray-900">{rating.toFixed(1)}</span>
      </div>
      {totalRatings && (
        <span className="text-sm text-gray-500">
          ({totalRatings.toLocaleString()}{' '}
          {totalRatings === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
}

/**
 * Operating hours component
 */
function OperatingHours({
  openingHours,
}: {
  openingHours?: PlaceDetails['opening_hours'];
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!openingHours) {
    return null;
  }

  const { open_now, weekday_text } = openingHours;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          <span
            className={`text-sm font-medium ${
              open_now ? 'text-success-600' : 'text-error-600'
            }`}
          >
            {open_now ? 'Open now' : 'Closed'}
          </span>
        </div>
        {weekday_text?.length && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
          >
            {isExpanded ? 'Hide hours' : 'Show hours'}
          </button>
        )}
      </div>

      {isExpanded && weekday_text && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          {weekday_text.map((hours, index) => (
            <div
              key={index}
              className="text-sm text-gray-700 flex justify-between"
            >
              <span className="font-medium">{hours.split(': ')[0]}:</span>
              <span>{hours.split(': ')[1] || 'Closed'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * PlaceDetails Component
 * Displays comprehensive venue information for wedding planning
 */
export function PlaceDetails({
  place,
  showPhotos = true,
  showReviews = true,
  showContactInfo = true,
  onSaveToFavorites,
  onShare,
  onAddToWedding,
  className = '',
}: PlaceDetailsProps) {
  // Calculate wedding suitability score based on types and features
  const weddingSuitabilityScore = useMemo(() => {
    const weddingTypes = [
      'wedding_venue',
      'banquet_hall',
      'restaurant',
      'church',
      'park',
      'hotel',
    ];
    const hasWeddingType = place.types?.some((type) =>
      weddingTypes.includes(type),
    );
    const hasHighRating = (place.rating || 0) >= 4.0;
    const hasPhotos = (place.photos?.length || 0) > 0;

    let score = 50; // Base score
    if (hasWeddingType) score += 30;
    if (hasHighRating) score += 15;
    if (hasPhotos) score += 5;

    return Math.min(100, score);
  }, [place]);

  // Wedding-specific features
  const weddingFeatures = useMemo(() => {
    const features = [];

    if (place.types?.includes('restaurant'))
      features.push('Catering Available');
    if (place.types?.includes('hotel')) features.push('Guest Accommodation');
    if (place.types?.includes('park')) features.push('Outdoor Ceremony');
    if (place.parking_available) features.push('Parking Available');
    if (place.accessibility_features?.wheelchairAccessible)
      features.push('Wheelchair Accessible');
    if (place.outdoor_seating) features.push('Outdoor Space');

    return features;
  }, [place]);

  // Price level display
  const priceLevel = useMemo(() => {
    if (!place.price_level) return null;
    return '$'.repeat(place.price_level);
  }, [place.price_level]);

  const handleSaveToFavorites = useCallback(() => {
    onSaveToFavorites?.(place);
  }, [onSaveToFavorites, place]);

  const handleShare = useCallback(() => {
    if (navigator.share && place.url) {
      navigator.share({
        title: place.name,
        text: `Check out this venue: ${place.name}`,
        url: place.url,
      });
    } else {
      onShare?.(place);
    }
  }, [onShare, place]);

  const handleAddToWedding = useCallback(() => {
    onAddToWedding?.(place);
  }, [onAddToWedding, place]);

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs ${className}`}
    >
      {/* Photo Gallery */}
      {showPhotos && place.photos && (
        <div className="p-4 pb-0">
          <PhotoGallery photos={place.photos} placeName={place.name} />
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="space-y-3">
          {/* Title and Actions */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-gray-900 truncate">
                {place.name}
              </h2>
              {place.business_status &&
                place.business_status !== 'OPERATIONAL' && (
                  <span className="inline-flex items-center px-2 py-1 mt-1 rounded-full text-xs font-medium bg-error-50 text-error-700 border border-error-200">
                    {place.business_status.replace('_', ' ').toLowerCase()}
                  </span>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Share venue"
              >
                <Share size={20} />
              </button>
              {onSaveToFavorites && (
                <button
                  onClick={handleSaveToFavorites}
                  className="p-2 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                  aria-label="Save to favorites"
                >
                  <Heart size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Rating and Price */}
          <div className="flex items-center justify-between">
            <RatingDisplay
              rating={place.rating}
              totalRatings={place.user_ratings_total}
            />
            {priceLevel && (
              <div className="flex items-center gap-1 text-gray-600">
                <DollarSign size={16} />
                <span className="font-medium">{priceLevel}</span>
              </div>
            )}
          </div>

          {/* Wedding Suitability */}
          <div className="bg-primary-50 rounded-lg p-3 border border-primary-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-primary-900">
                Wedding Suitability
              </span>
              <span className="text-sm font-semibold text-primary-700">
                {weddingSuitabilityScore}%
              </span>
            </div>
            <div className="w-full bg-primary-100 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${weddingSuitabilityScore}%` }}
              />
            </div>
            {weddingFeatures.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {weddingFeatures.map((feature, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-3">
          <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-gray-700">
            {place.formatted_address}
          </span>
        </div>

        {/* Contact Information */}
        {showContactInfo && (
          <div className="space-y-3">
            {/* Phone */}
            {place.formatted_phone_number && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-400 flex-shrink-0" />
                <a
                  href={`tel:${place.international_phone_number || place.formatted_phone_number}`}
                  className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
                >
                  {place.formatted_phone_number}
                </a>
              </div>
            )}

            {/* Website */}
            {place.website && (
              <div className="flex items-center gap-3">
                <Globe size={16} className="text-gray-400 flex-shrink-0" />
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1"
                >
                  Visit Website
                  <ExternalLink size={14} />
                </a>
              </div>
            )}

            {/* Operating Hours */}
            <OperatingHours openingHours={place.opening_hours} />
          </div>
        )}

        {/* Capacity Information (if available) */}
        {place.venue_capacity && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-900">
                Venue Capacity
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {place.venue_capacity.seated && (
                <div>
                  <span className="text-gray-500">Seated:</span>
                  <span className="ml-1 font-medium">
                    {place.venue_capacity.seated} guests
                  </span>
                </div>
              )}
              {place.venue_capacity.standing && (
                <div>
                  <span className="text-gray-500">Standing:</span>
                  <span className="ml-1 font-medium">
                    {place.venue_capacity.standing} guests
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Editorial Summary */}
        {place.editorial_summary?.overview && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-sm text-blue-900">
              {place.editorial_summary.overview}
            </p>
          </div>
        )}

        {/* Reviews Preview */}
        {showReviews && place.reviews && place.reviews.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">
              Recent Reviews
            </h3>
            <div className="space-y-3">
              {place.reviews.slice(0, 2).map((review, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {review.author_name}
                      </span>
                      <div className="flex items-center gap-1">
                        <Star
                          size={12}
                          className="text-yellow-400 fill-current"
                        />
                        <span className="text-sm text-gray-600">
                          {review.rating}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {review.relative_time_description}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3">
                    {review.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {place.url && (
            <a
              href={place.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors text-sm"
            >
              <MapPin size={16} />
              View on Google Maps
            </a>
          )}

          {onAddToWedding && (
            <button
              onClick={handleAddToWedding}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors text-sm shadow-sm"
            >
              <Calendar size={16} />
              Add to Wedding
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlaceDetails;
