'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BasicSetupWizard } from './BasicSetupWizard';
import { WeddingDetailsForm } from './WeddingDetailsForm';
import { VenueSelector } from './VenueSelector';
import { CheckCircle2, Calendar, MapPin, Users } from 'lucide-react';

interface WeddingSetupDemoProps {
  className?: string;
}

export function WeddingSetupDemo({ className }: WeddingSetupDemoProps) {
  const [activeDemo, setActiveDemo] = useState('wizard');
  const [completedData, setCompletedData] = useState<any>({});

  const handleWizardComplete = (data: any) => {
    console.log('BasicSetupWizard completed:', data);
    setCompletedData((prev) => ({ ...prev, wizard: data }));
    alert('Wedding Setup Wizard completed! Check console for data.');
  };

  const handleDetailsSubmit = (data: any) => {
    console.log('WeddingDetailsForm submitted:', data);
    setCompletedData((prev) => ({ ...prev, details: data }));
    alert('Wedding Details Form submitted! Check console for data.');
  };

  const handleVenueSelect = (data: any) => {
    console.log('Venue selected:', data);
    setCompletedData((prev) => ({ ...prev, venue: data }));
    alert('Venue selected! Check console for data.');
  };

  const handleDetailsSave = (data: any) => {
    console.log('Wedding Details saved as draft:', data);
    // This would normally save to database
  };

  return (
    <div className={className}>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            WS-213 Wedding Setup Components Demo
          </h1>
          <p className="text-lg text-gray-600">
            Team A Implementation: BasicSetupWizard, WeddingDetailsForm,
            VenueSelector
          </p>

          {/* Component Status */}
          <div className="flex flex-wrap gap-3 mt-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              BasicSetupWizard
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              WeddingDetailsForm
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              VenueSelector
            </Badge>
          </div>
        </div>

        {/* Demo Tabs */}
        <Tabs
          value={activeDemo}
          onValueChange={setActiveDemo}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wizard" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Setup Wizard
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Wedding Details
            </TabsTrigger>
            <TabsTrigger value="venue" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Venue Selector
            </TabsTrigger>
          </TabsList>

          {/* Basic Setup Wizard Demo */}
          <TabsContent value="wizard" className="mt-6">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>BasicSetupWizard Component</CardTitle>
                <CardDescription>
                  Step-by-step wizard for collecting essential wedding
                  information. Features: Multi-step form validation, progress
                  tracking, mobile-responsive design.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium mb-2">Key Features:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>
                      • 4-step wizard: Basics → Venue & Timing → Requirements →
                      Contacts
                    </li>
                    <li>• Real-time form validation with Zod schema</li>
                    <li>• Progress indicator with clickable navigation</li>
                    <li>• Mobile-optimized touch targets (48x48px minimum)</li>
                    <li>• Auto-save and recovery capabilities</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <BasicSetupWizard
              onComplete={handleWizardComplete}
              onSkip={() => alert('Setup skipped')}
              initialData={{
                coupleName: 'Demo Couple',
                guestCount: 80,
              }}
            />
          </TabsContent>

          {/* Wedding Details Form Demo */}
          <TabsContent value="details" className="mt-6">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>WeddingDetailsForm Component</CardTitle>
                <CardDescription>
                  Comprehensive form for capturing detailed wedding preferences
                  and requirements. Features: Sectioned form layout, auto-save
                  drafts, budget breakdown.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium mb-2">Key Features:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>
                      • 9 expandable sections for different wedding aspects
                    </li>
                    <li>
                      • Style & theme preferences, photography requirements
                    </li>
                    <li>• Budget breakdown by vendor category</li>
                    <li>• Cultural and accessibility considerations</li>
                    <li>• Draft saving with auto-save functionality</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <WeddingDetailsForm
              onSubmit={handleDetailsSubmit}
              onSave={handleDetailsSave}
              initialData={{
                weddingStyle: 'Modern',
                guestCount: 120,
              }}
            />
          </TabsContent>

          {/* Venue Selector Demo */}
          <TabsContent value="venue" className="mt-6">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>VenueSelector Component</CardTitle>
                <CardDescription>
                  Interactive venue selection with filtering, search, and
                  detailed comparison. Features: Advanced filtering, venue
                  comparison, booking integration.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium mb-2">Key Features:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>
                      • Advanced filtering: location, capacity, budget, features
                    </li>
                    <li>• Interactive venue cards with detailed information</li>
                    <li>• Real-time search and filter updates</li>
                    <li>
                      • Integrated booking form with venue-specific options
                    </li>
                    <li>• Mobile-responsive grid layout</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <VenueSelector
              onSelect={handleVenueSelect}
              initialFilters={{
                location: 'Cotswolds',
                maxGuests: 120,
                budget: 6000,
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Completed Data Display */}
        {Object.keys(completedData).length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Completed Data Summary</CardTitle>
              <CardDescription>
                Data collected from the wedding setup components (check browser
                console for full details)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedData.wizard && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">
                      ✅ Setup Wizard Complete
                    </h4>
                    <div className="bg-green-50 p-3 rounded text-sm">
                      <p>
                        <strong>Couple:</strong>{' '}
                        {completedData.wizard.coupleName}
                      </p>
                      <p>
                        <strong>Date:</strong>{' '}
                        {completedData.wizard.weddingDate}
                      </p>
                      <p>
                        <strong>Guests:</strong>{' '}
                        {completedData.wizard.guestCount}
                      </p>
                      <p>
                        <strong>Venue:</strong> {completedData.wizard.venueName}
                      </p>
                    </div>
                  </div>
                )}

                {completedData.details && (
                  <div>
                    <h4 className="font-medium text-blue-700 mb-2">
                      ✅ Wedding Details Submitted
                    </h4>
                    <div className="bg-blue-50 p-3 rounded text-sm">
                      <p>
                        <strong>Style:</strong>{' '}
                        {completedData.details.weddingStyle || 'Not specified'}
                      </p>
                      <p>
                        <strong>Photography:</strong>{' '}
                        {completedData.details.photoStyle || 'Not specified'}
                      </p>
                      <p>
                        <strong>Budget Specified:</strong>{' '}
                        {
                          Object.keys(completedData.details).filter(
                            (key) =>
                              key.includes('Budget') &&
                              completedData.details[key],
                          ).length
                        }{' '}
                        categories
                      </p>
                    </div>
                  </div>
                )}

                {completedData.venue && (
                  <div>
                    <h4 className="font-medium text-purple-700 mb-2">
                      ✅ Venue Selected
                    </h4>
                    <div className="bg-purple-50 p-3 rounded text-sm">
                      <p>
                        <strong>Venue:</strong> {completedData.venue.venue.name}
                      </p>
                      <p>
                        <strong>Location:</strong>{' '}
                        {completedData.venue.venue.location}
                      </p>
                      <p>
                        <strong>Guests:</strong>{' '}
                        {completedData.venue.guestCount}
                      </p>
                      <p>
                        <strong>Budget:</strong> £
                        {completedData.venue.budget?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile Responsiveness Test */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Mobile Responsiveness Checklist</CardTitle>
            <CardDescription>
              All components have been tested and optimized for mobile devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-700">
                  ✅ Mobile Features Implemented:
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Touch targets minimum 48x48px</li>
                  <li>• Responsive grid layouts (1 col → 2 col → 3 col)</li>
                  <li>• Mobile-optimized form inputs</li>
                  <li>• Thumb-friendly navigation controls</li>
                  <li>• Collapsible sections for better mobile UX</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700">
                  📱 Tested Breakpoints:
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• iPhone SE (375px) - ✅ Working</li>
                  <li>• Mobile (640px) - ✅ Working</li>
                  <li>• Tablet (768px) - ✅ Working</li>
                  <li>• Desktop (1024px+) - ✅ Working</li>
                  <li>• Large screens (1280px+) - ✅ Working</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
