/**
 * WS-198 Wedding Error Boundary - Wedding-specific error handling
 * Specialized error boundary for wedding industry workflows
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface WeddingErrorBoundaryProps {
  children: ReactNode;
  supplierType?: 'photographer' | 'venue' | 'florist' | 'catering' | 'other';
  weddingDate?: Date;
  clientId?: string;
  onCriticalError?: (error: Error, context: WeddingErrorContext) => void;
}

interface WeddingErrorContext {
  supplierType: string;
  isWeddingDay: boolean;
  isPeakSeason: boolean;
  daysUntilWedding: number;
  businessImpact: string;
  recommendedAction: string;
  escalationLevel: 'low' | 'medium' | 'high' | 'emergency';
}

export class WeddingErrorBoundary extends Component<WeddingErrorBoundaryProps> {
  private getWeddingContext(): WeddingErrorContext {
    const now = new Date();
    const weddingDate = this.props.weddingDate;
    const isWeddingDay = now.getDay() === 6; // Saturday
    const isPeakSeason = now.getMonth() >= 4 && now.getMonth() <= 9; // May-October wedding season

    let daysUntilWedding = 0;
    if (weddingDate) {
      const diffTime = weddingDate.getTime() - now.getTime();
      daysUntilWedding = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Determine business impact based on supplier type and timing
    const supplierType = this.props.supplierType || 'other';
    let businessImpact = '';
    let escalationLevel: WeddingErrorContext['escalationLevel'] = 'low';
    let recommendedAction = '';

    if (isWeddingDay) {
      businessImpact = getBusinessImpact(supplierType, 'wedding_day');
      escalationLevel = 'emergency';
      recommendedAction =
        'Immediate attention required - wedding day disruption';
    } else if (daysUntilWedding <= 7 && daysUntilWedding > 0) {
      businessImpact = getBusinessImpact(supplierType, 'final_week');
      escalationLevel = 'high';
      recommendedAction =
        'Final week critical - may affect wedding preparations';
    } else if (daysUntilWedding <= 30 && daysUntilWedding > 0) {
      businessImpact = getBusinessImpact(supplierType, 'planning_active');
      escalationLevel = 'medium';
      recommendedAction = 'Active planning phase - monitor closely';
    } else {
      businessImpact = getBusinessImpact(supplierType, 'general');
      escalationLevel = isPeakSeason ? 'medium' : 'low';
      recommendedAction = 'Standard monitoring and recovery';
    }

    return {
      supplierType,
      isWeddingDay,
      isPeakSeason,
      daysUntilWedding,
      businessImpact,
      recommendedAction,
      escalationLevel,
    };
  }

  private handleWeddingError = (error: Error, errorInfo: ErrorInfo) => {
    const weddingContext = this.getWeddingContext();

    // Wedding-specific error handling
    console.error('Wedding Error Boundary:', {
      error: error.message,
      weddingContext,
      errorInfo: errorInfo.componentStack,
    });

    // Call custom wedding error handler if provided
    if (
      this.props.onCriticalError &&
      weddingContext.escalationLevel === 'emergency'
    ) {
      this.props.onCriticalError(error, weddingContext);
    }

    // Log wedding-specific metrics and context
    this.logWeddingError(error, weddingContext);
  };

  private logWeddingError(error: Error, context: WeddingErrorContext) {
    try {
      // Log to wedding-specific error tracking
      fetch('/api/wedding-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'wedding_error',
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          context,
          clientId: this.props.clientId,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Silent fail - don't let error logging cause more errors
      });
    } catch (logError) {
      console.error('Failed to log wedding error:', logError);
    }
  }

  render() {
    const weddingContext = this.getWeddingContext();

    return (
      <ErrorBoundary
        context="supplier_dashboard"
        level={
          weddingContext.escalationLevel === 'emergency' ? 'critical' : 'page'
        }
        onError={this.handleWeddingError}
        enableRetry={weddingContext.escalationLevel !== 'emergency'}
        maxRetries={weddingContext.isWeddingDay ? 1 : 3}
      >
        {this.props.children}
      </ErrorBoundary>
    );
  }
}

// Helper function to determine business impact based on supplier type and timing
function getBusinessImpact(supplierType: string, phase: string): string {
  const impacts = {
    photographer: {
      wedding_day: 'Wedding day disruption - immediate attention required',
      final_week: 'May affect final photo planning and shot list preparation',
      planning_active:
        'May disrupt engagement session scheduling or album planning',
      general: 'Standard supplier workflow disruption',
    },
    venue: {
      wedding_day: 'Venue coordination disruption - critical wedding day issue',
      final_week: 'May affect final venue setup and coordination planning',
      planning_active: 'May disrupt venue booking and planning communications',
      general: 'Venue management workflow affected',
    },
    florist: {
      wedding_day:
        'Floral arrangement coordination disrupted - wedding day impact',
      final_week: 'May affect final floral design and delivery coordination',
      planning_active: 'May disrupt floral consultation and design process',
      general: 'Floral planning workflow affected',
    },
    catering: {
      wedding_day: 'Catering service disruption - immediate wedding day issue',
      final_week:
        'May affect final menu planning and dietary requirement handling',
      planning_active: 'May disrupt menu planning and catering coordination',
      general: 'Catering workflow management affected',
    },
    other: {
      wedding_day: 'Wedding service disruption - requires immediate attention',
      final_week: 'May affect final wedding preparations',
      planning_active: 'May disrupt active wedding planning workflow',
      general: 'Supplier workflow disruption',
    },
  };

  return (
    impacts[supplierType as keyof typeof impacts]?.[
      phase as keyof (typeof impacts)['photographer']
    ] || 'Supplier workflow disruption'
  );
}

// Wedding-specific error boundary variants
export const PhotographerErrorBoundary: React.FC<{
  children: ReactNode;
  weddingDate?: Date;
  clientId?: string;
}> = ({ children, weddingDate, clientId }) => (
  <WeddingErrorBoundary
    supplierType="photographer"
    weddingDate={weddingDate}
    clientId={clientId}
  >
    {children}
  </WeddingErrorBoundary>
);

export const VenueErrorBoundary: React.FC<{
  children: ReactNode;
  weddingDate?: Date;
  clientId?: string;
}> = ({ children, weddingDate, clientId }) => (
  <WeddingErrorBoundary
    supplierType="venue"
    weddingDate={weddingDate}
    clientId={clientId}
  >
    {children}
  </WeddingErrorBoundary>
);

export const FloristErrorBoundary: React.FC<{
  children: ReactNode;
  weddingDate?: Date;
  clientId?: string;
}> = ({ children, weddingDate, clientId }) => (
  <WeddingErrorBoundary
    supplierType="florist"
    weddingDate={weddingDate}
    clientId={clientId}
  >
    {children}
  </WeddingErrorBoundary>
);

export const CateringErrorBoundary: React.FC<{
  children: ReactNode;
  weddingDate?: Date;
  clientId?: string;
}> = ({ children, weddingDate, clientId }) => (
  <WeddingErrorBoundary
    supplierType="catering"
    weddingDate={weddingDate}
    clientId={clientId}
  >
    {children}
  </WeddingErrorBoundary>
);
