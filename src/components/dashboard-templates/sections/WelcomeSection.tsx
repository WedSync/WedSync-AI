'use client';

import React from 'react';
import { Heart, Calendar, Users, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DashboardSection } from '@/lib/services/dashboardTemplateService';

interface WelcomeSectionProps {
  section: DashboardSection;
  clientId: string;
  clientData?: {
    first_name?: string;
    last_name?: string;
    partner_first_name?: string;
    partner_last_name?: string;
    wedding_date?: string;
    venue_name?: string;
    guest_count?: number;
  };
  customConfig?: any;
  onInteraction?: (action: string, data?: any) => void;
}

export default function WelcomeSection({
  section,
  clientId,
  clientData,
  customConfig,
  onInteraction,
}: WelcomeSectionProps) {
  const config = { ...section.section_config, ...customConfig };

  // Get client names
  const clientName = clientData?.first_name
    ? `${clientData.first_name} ${clientData.last_name || ''}`.trim()
    : 'there';

  const partnerName = clientData?.partner_first_name
    ? `${clientData.partner_first_name} ${clientData.partner_last_name || ''}`.trim()
    : null;

  // Calculate days until wedding
  const daysUntilWedding = clientData?.wedding_date
    ? Math.ceil(
        (new Date(clientData.wedding_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const getWeddingGreeting = () => {
    if (!daysUntilWedding) return null;

    if (daysUntilWedding < 0) {
      return 'Congratulations on your recent wedding!';
    } else if (daysUntilWedding === 0) {
      return "It's your wedding day! 🎉";
    } else if (daysUntilWedding <= 7) {
      return `Your big day is ${daysUntilWedding} ${daysUntilWedding === 1 ? 'day' : 'days'} away!`;
    } else if (daysUntilWedding <= 30) {
      return `${daysUntilWedding} days until your special day`;
    } else {
      return `${Math.ceil(daysUntilWedding / 30)} ${Math.ceil(daysUntilWedding / 30) === 1 ? 'month' : 'months'} until your wedding`;
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-primary-50 to-white">
      {/* Welcome Message */}
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-primary-100 rounded-xl">
          <Heart className="h-6 w-6 text-primary-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome
            {partnerName ? ` ${clientName} & ${partnerName}` : ` ${clientName}`}
            !
          </h2>
          <p className="text-gray-600 leading-relaxed">
            {config.message ||
              section.description ||
              'Welcome to your personalized wedding dashboard! Everything you need to plan your perfect day is right here.'}
          </p>
        </div>
      </div>

      {/* Wedding Countdown */}
      {config.show_countdown !== false &&
        daysUntilWedding &&
        daysUntilWedding >= 0 && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-primary-200">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {getWeddingGreeting()}
                </p>
                {clientData?.wedding_date && (
                  <p className="text-sm text-gray-600">
                    {new Date(clientData.wedding_date).toLocaleDateString(
                      'en-GB',
                      {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      },
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Wedding Details */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Venue Information */}
        {clientData?.venue_name && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Venue</p>
                <p className="text-sm text-gray-600">{clientData.venue_name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Guest Count */}
        {clientData?.guest_count && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Guests</p>
                <p className="text-sm text-gray-600">
                  {clientData.guest_count} expected
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {config.show_quick_actions !== false && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className="cursor-pointer hover:bg-primary-100 transition-colors"
            onClick={() => onInteraction?.('navigate', { section: 'timeline' })}
          >
            View Timeline
          </Badge>
          <Badge
            variant="secondary"
            className="cursor-pointer hover:bg-primary-100 transition-colors"
            onClick={() => onInteraction?.('navigate', { section: 'tasks' })}
          >
            Check Tasks
          </Badge>
          <Badge
            variant="secondary"
            className="cursor-pointer hover:bg-primary-100 transition-colors"
            onClick={() => onInteraction?.('navigate', { section: 'budget' })}
          >
            Review Budget
          </Badge>
        </div>
      )}
    </div>
  );
}
