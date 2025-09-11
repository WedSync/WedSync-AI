// src/components/api/MigrationAssistant.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { MigrationPlan } from '@/types/api-versions';

export default function MigrationAssistant() {
  const [fromVersion, setFromVersion] = useState('v1');
  const [toVersion, setToVersion] = useState('v2');
  const [migrationPlan, setMigrationPlan] = useState<MigrationPlan | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const generateMigrationPlan = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/versions/migration-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromVersion, toVersion }),
      });

      const result = await response.json();
      setMigrationPlan(result.data);
    } catch (error) {
      console.error('Failed to generate migration plan:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">API Migration Assistant</h1>
        <p className="text-muted-foreground">
          Step-by-step guidance for migrating your wedding business integration
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Migration Path</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <label className="block text-sm font-medium mb-2">
                Current Version
              </label>
              <select
                value={fromVersion}
                onChange={(e) => setFromVersion(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="v1">v1 (Stable)</option>
                <option value="v1.1">v1.1 (Deprecated)</option>
                <option value="v1.2">v1.2 (Legacy)</option>
              </select>
            </div>

            <ArrowRight className="h-8 w-8 text-muted-foreground" />

            <div className="text-center">
              <label className="block text-sm font-medium mb-2">
                Target Version
              </label>
              <select
                value={toVersion}
                onChange={(e) => setToVersion(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="v2">v2 (Latest)</option>
                <option value="v2.1">v2.1 (Beta)</option>
                <option value="v3">v3 (Development)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <Button
              onClick={generateMigrationPlan}
              size="lg"
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Migration Plan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {migrationPlan && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                Migration Plan: {migrationPlan.from_version} →{' '}
                {migrationPlan.to_version}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-900">
                    {migrationPlan.total_estimated_hours}h
                  </p>
                  <p className="text-sm text-blue-700">Estimated Time</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-900">
                    {migrationPlan.benefits?.length || 0}
                  </p>
                  <p className="text-sm text-green-700">New Features</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-900">
                    {migrationPlan.steps?.length || 0}
                  </p>
                  <p className="text-sm text-orange-700">Migration Steps</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Migration Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Migration Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {migrationPlan.steps?.map((step, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                        {step.step_number}
                      </div>
                      <div>
                        <h3 className="font-semibold">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {step.estimated_time} • {step.difficulty} difficulty
                        </p>
                      </div>
                    </div>
                    <p className="text-sm mb-3">{step.description}</p>

                    {step.wedding_specific_notes &&
                      step.wedding_specific_notes.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded p-3">
                          <p className="text-sm font-medium text-amber-800 mb-1">
                            Wedding Industry Notes:
                          </p>
                          <ul className="text-sm text-amber-700 space-y-1">
                            {step.wedding_specific_notes.map(
                              (note, noteIndex) => (
                                <li key={noteIndex}>• {note}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Breaking Changes */}
          {migrationPlan.breaking_changes &&
            migrationPlan.breaking_changes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Breaking Changes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {migrationPlan.breaking_changes.map((change, index) => (
                      <div
                        key={index}
                        className="border border-red-200 rounded-lg p-4 bg-red-50"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <h3 className="font-semibold text-red-900">
                            {change.endpoint}
                          </h3>
                          <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">
                            {change.change_type}
                          </span>
                        </div>
                        <p className="text-sm text-red-800 mb-3">
                          {change.description}
                        </p>
                        <div className="bg-white border border-red-200 rounded p-3">
                          <p className="text-sm font-medium mb-1">
                            Migration Instructions:
                          </p>
                          <p className="text-sm">
                            {change.migration_instructions}
                          </p>
                        </div>
                        {change.wedding_feature_impact &&
                          change.wedding_feature_impact.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-red-800">
                                Affected Wedding Features:
                              </p>
                              <ul className="text-sm text-red-700 mt-1">
                                {change.wedding_feature_impact.map(
                                  (feature, featureIndex) => (
                                    <li key={featureIndex}>• {feature}</li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Benefits */}
          {migrationPlan.benefits && migrationPlan.benefits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Migration Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {migrationPlan.benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-green-800">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wedding Testing Requirements */}
          {migrationPlan.wedding_testing_requirements &&
            migrationPlan.wedding_testing_requirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Wedding Industry Testing Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {migrationPlan.wedding_testing_requirements.map(
                      (requirement, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h3 className="font-semibold mb-2">
                            {requirement.feature}
                          </h3>
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm font-medium">
                                Test Scenarios:
                              </p>
                              <ul className="text-sm text-muted-foreground mt-1">
                                {requirement.test_scenarios.map(
                                  (scenario, scenarioIndex) => (
                                    <li key={scenarioIndex}>• {scenario}</li>
                                  ),
                                )}
                              </ul>
                            </div>
                            {requirement.seasonal_considerations &&
                              requirement.seasonal_considerations.length >
                                0 && (
                                <div>
                                  <p className="text-sm font-medium">
                                    Seasonal Considerations:
                                  </p>
                                  <ul className="text-sm text-muted-foreground mt-1">
                                    {requirement.seasonal_considerations.map(
                                      (consideration, considerationIndex) => (
                                        <li key={considerationIndex}>
                                          • {consideration}
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              )}
                            {requirement.client_notification_needed && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                <p className="text-sm text-yellow-800">
                                  ⚠️ Client notification required before testing
                                  this feature
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
        </>
      )}
    </div>
  );
}
