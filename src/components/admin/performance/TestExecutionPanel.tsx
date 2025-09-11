'use client';

import React, { useState, useCallback } from 'react';
import {
  Play,
  Square,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Zap,
  Target,
  Timer,
} from 'lucide-react';
import {
  TestExecutionPanelProps,
  TestConfiguration,
  TestType,
  RunningTest,
} from '@/types/performance-testing';
import { TestProgressIndicator } from './TestProgressIndicator';

interface TestForm {
  configId: string;
  name: string;
  type: TestType;
  targetUrl: string;
  duration: number;
  userCount: number;
  rampUpTime: number;
  environment: string;
}

const testTypeConfig = {
  load: {
    icon: Users,
    label: 'Load Test',
    description: 'Test normal expected load conditions',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    defaultUsers: 50,
    defaultDuration: 300, // 5 minutes
  },
  stress: {
    icon: Zap,
    label: 'Stress Test',
    description: 'Test beyond normal capacity to find breaking point',
    color: 'text-warning-600 bg-warning-50 border-warning-200',
    defaultUsers: 200,
    defaultDuration: 600, // 10 minutes
  },
  spike: {
    icon: Target,
    label: 'Spike Test',
    description: 'Test sudden increases in load',
    color: 'text-error-600 bg-error-50 border-error-200',
    defaultUsers: 300,
    defaultDuration: 180, // 3 minutes
  },
  endurance: {
    icon: Timer,
    label: 'Endurance Test',
    description: 'Test sustained load over extended period',
    color: 'text-primary-600 bg-primary-50 border-primary-200',
    defaultUsers: 100,
    defaultDuration: 1800, // 30 minutes
  },
};

export const TestExecutionPanel: React.FC<TestExecutionPanelProps> = ({
  availableTests,
  onTestTrigger,
  runningTests,
  onTestStop,
  loading = false,
}) => {
  const [selectedConfig, setSelectedConfig] =
    useState<TestConfiguration | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TestForm>({
    configId: '',
    name: '',
    type: 'load',
    targetUrl: '',
    duration: 300,
    userCount: 50,
    rampUpTime: 60,
    environment: 'staging',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback((data: TestForm): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.name.trim()) {
      errors.name = 'Test name is required';
    }

    if (!data.targetUrl.trim()) {
      errors.targetUrl = 'Target URL is required';
    } else {
      try {
        new URL(data.targetUrl);
      } catch {
        errors.targetUrl = 'Please enter a valid URL';
      }
    }

    if (data.userCount < 1) {
      errors.userCount = 'User count must be at least 1';
    } else if (data.userCount > 1000) {
      errors.userCount = 'User count cannot exceed 1000';
    }

    if (data.duration < 30) {
      errors.duration = 'Duration must be at least 30 seconds';
    } else if (data.duration > 3600) {
      errors.duration = 'Duration cannot exceed 1 hour';
    }

    if (data.rampUpTime < 0) {
      errors.rampUpTime = 'Ramp up time cannot be negative';
    } else if (data.rampUpTime >= data.duration) {
      errors.rampUpTime = 'Ramp up time must be less than total duration';
    }

    return errors;
  }, []);

  const handleQuickTest = async (config: TestConfiguration) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onTestTrigger(config);
    } catch (error) {
      console.error('Failed to start test:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm(formData);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const config: TestConfiguration = {
        id: `custom-${Date.now()}`,
        name: formData.name,
        type: formData.type,
        targetUrl: formData.targetUrl,
        duration: formData.duration,
        userCount: formData.userCount,
        rampUpTime: formData.rampUpTime,
        thresholds: {
          responseTime: { p95: 2000, p99: 5000 },
          errorRate: 5,
          throughput: 10,
        },
        tags: ['custom'],
        environment: formData.environment,
      };

      await onTestTrigger(config);
      setShowCustomForm(false);
      setFormData({
        configId: '',
        name: '',
        type: 'load',
        targetUrl: '',
        duration: 300,
        userCount: 50,
        rampUpTime: 60,
        environment: 'staging',
      });
    } catch (error) {
      console.error('Failed to start custom test:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStopTest = async (testId: string) => {
    try {
      await onTestStop(testId);
    } catch (error) {
      console.error('Failed to stop test:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Running Tests */}
      {runningTests.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Running Tests ({runningTests.length})
            </h3>
          </div>

          <div className="space-y-4">
            {runningTests.map((test) => (
              <div
                key={test.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        test.status === 'running'
                          ? 'text-blue-600 bg-blue-50 border-blue-200'
                          : 'text-gray-600 bg-gray-50 border-gray-200'
                      }`}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {test.status}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {test.name}
                    </span>
                  </div>

                  {test.status === 'running' && (
                    <button
                      onClick={() => handleStopTest(test.id)}
                      className="inline-flex items-center px-3 py-1.5 bg-error-600 hover:bg-error-700 text-white text-xs font-medium rounded-md transition-colors duration-200"
                    >
                      <Square className="w-3 h-3 mr-1" />
                      Stop Test
                    </button>
                  )}
                </div>

                <TestProgressIndicator runningTest={test} compact={true} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Tests */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Quick Tests</h3>
          <button
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="inline-flex items-center px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
          >
            <Settings className="w-4 h-4 mr-1" />
            Custom Test
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {availableTests.slice(0, 4).map((config) => {
            const typeConfig = testTypeConfig[config.type];
            const IconComponent = typeConfig.icon;

            return (
              <div
                key={config.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${typeConfig.color}`}
                    >
                      <IconComponent className="w-3 h-3 mr-1" />
                      {typeConfig.label}
                    </div>
                  </div>
                  <button
                    onClick={() => handleQuickTest(config)}
                    disabled={isSubmitting || loading}
                    className="inline-flex items-center px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-md transition-colors duration-200"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Start
                  </button>
                </div>

                <h4 className="font-semibold text-gray-900 mb-1">
                  {config.name}
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  {typeConfig.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>Users: {config.userCount}</div>
                  <div>Duration: {formatDuration(config.duration)}</div>
                  <div>Environment: {config.environment}</div>
                  <div>Ramp: {formatDuration(config.rampUpTime)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Test Form */}
      {showCustomForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Custom Test Configuration
          </h3>

          <form onSubmit={handleCustomTestSubmit} className="space-y-4">
            {/* Test Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={`w-full px-3.5 py-2.5 bg-white border ${
                  formErrors.name ? 'border-error-300' : 'border-gray-300'
                } rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200`}
                placeholder="Enter test name"
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-error-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.name}
                </p>
              )}
            </div>

            {/* Test Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  Object.entries(testTypeConfig) as [
                    TestType,
                    typeof testTypeConfig.load,
                  ][]
                ).map(([type, config]) => {
                  const IconComponent = config.icon;
                  return (
                    <label key={type} className="relative">
                      <input
                        type="radio"
                        name="testType"
                        value={type}
                        checked={formData.type === type}
                        onChange={(e) => {
                          const newType = e.target.value as TestType;
                          setFormData({
                            ...formData,
                            type: newType,
                            userCount: config.defaultUsers,
                            duration: config.defaultDuration,
                          });
                        }}
                        className="sr-only"
                      />
                      <div
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          formData.type === type
                            ? 'border-primary-300 bg-primary-50 ring-4 ring-primary-100'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <IconComponent className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {config.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Target URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target URL
              </label>
              <input
                type="url"
                value={formData.targetUrl}
                onChange={(e) =>
                  setFormData({ ...formData, targetUrl: e.target.value })
                }
                className={`w-full px-3.5 py-2.5 bg-white border ${
                  formErrors.targetUrl ? 'border-error-300' : 'border-gray-300'
                } rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200`}
                placeholder="https://api.wedsync.com"
              />
              {formErrors.targetUrl && (
                <p className="mt-1 text-sm text-error-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.targetUrl}
                </p>
              )}
            </div>

            {/* Parameters Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Concurrent Users
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.userCount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      userCount: parseInt(e.target.value) || 1,
                    })
                  }
                  className={`w-full px-3.5 py-2.5 bg-white border ${
                    formErrors.userCount
                      ? 'border-error-300'
                      : 'border-gray-300'
                  } rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200`}
                />
                {formErrors.userCount && (
                  <p className="mt-1 text-sm text-error-600">
                    {formErrors.userCount}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min="30"
                  max="3600"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration: parseInt(e.target.value) || 30,
                    })
                  }
                  className={`w-full px-3.5 py-2.5 bg-white border ${
                    formErrors.duration ? 'border-error-300' : 'border-gray-300'
                  } rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200`}
                />
                {formErrors.duration && (
                  <p className="mt-1 text-sm text-error-600">
                    {formErrors.duration}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ramp Up (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.rampUpTime}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rampUpTime: parseInt(e.target.value) || 0,
                    })
                  }
                  className={`w-full px-3.5 py-2.5 bg-white border ${
                    formErrors.rampUpTime
                      ? 'border-error-300'
                      : 'border-gray-300'
                  } rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200`}
                />
                {formErrors.rampUpTime && (
                  <p className="mt-1 text-sm text-error-600">
                    {formErrors.rampUpTime}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Environment
                </label>
                <select
                  value={formData.environment}
                  onChange={(e) =>
                    setFormData({ ...formData, environment: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowCustomForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Starting Test...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Test
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
