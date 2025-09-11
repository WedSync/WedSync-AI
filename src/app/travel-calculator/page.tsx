'use client';

import React from 'react';
import { TravelTimeCalculator } from '@/components/travel/TravelTimeCalculator';

export default function TravelCalculatorPage() {
  // In a real implementation, this would come from environment variables
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const handleRouteCalculated = (route: any) => {
    console.log('Route calculated:', route);
  };

  const handleTravelTimeCalculated = (travelTime: any) => {
    console.log('Travel time calculated:', travelTime);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TravelTimeCalculator
          apiKey={googleMapsApiKey}
          onRouteCalculated={handleRouteCalculated}
          onTravelTimeCalculated={handleTravelTimeCalculated}
          weddingDate="2025-06-15T10:00:00Z"
        />
      </div>
    </div>
  );
}
