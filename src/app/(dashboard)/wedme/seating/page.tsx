'use client';

import React, { Suspense } from 'react';
import { MobileSeatingViewer } from '@/components/mobile/seating/MobileSeatingViewer';
import { MobileSeatingDashboard } from '@/components/mobile/seating/MobileSeatingDashboard';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { useAuth } from '@/hooks/useAuth';
import { CoupleAuthGuard } from '@/components/mobile/seating/CoupleAuthGuard';
import { WedMeHeader } from '@/components/wedme/WedMeHeader';
import { WedMeNavigation } from '@/components/wedme/WedMeNavigation';

/**
 * WedMe Mobile Seating Arrangements Page
 * WS-154 - Team D Round 1 Implementation
 *
 * Touch-optimized seating interface for mobile devices
 * Features: Pinch-to-zoom, swipe gestures, offline capability
 */
export default function WedMeSeatingPage() {
  return (
    <CoupleAuthGuard>
      <div className="min-h-screen bg-gray-50 overflow-hidden">
        {/* WedMe Header with branding */}
        <WedMeHeader
          title="Seating Arrangements"
          subtitle="Manage your wedding seating with touch-friendly controls"
        />

        {/* Mobile Navigation */}
        <WedMeNavigation currentPage="seating" />

        {/* Main Content */}
        <main className="relative flex flex-col h-full">
          <Suspense fallback={<LoadingSkeleton variant="seating" />}>
            {/* Dashboard Overview */}
            <section className="px-4 py-3 bg-white border-b border-gray-200">
              <MobileSeatingDashboard />
            </section>

            {/* Seating Viewer */}
            <section className="flex-1 relative">
              <MobileSeatingViewer />
            </section>
          </Suspense>
        </main>
      </div>
    </CoupleAuthGuard>
  );
}
