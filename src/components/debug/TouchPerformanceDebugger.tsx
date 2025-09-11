'use client';

import { useState, useEffect } from 'react';
import {
  useTouchPerformance,
  TouchPerformanceReport,
} from '@/lib/utils/touch-performance';

interface TouchPerformanceDebuggerProps {
  className?: string;
  isVisible?: boolean;
}

export function TouchPerformanceDebugger({
  className = '',
  isVisible = process.env.NODE_ENV === 'development',
}: TouchPerformanceDebuggerProps) {
  const {
    isMonitoring,
    report,
    startMonitoring,
    stopMonitoring,
    getReport,
    clearMetrics,
  } = useTouchPerformance();
  const [liveReport, setLiveReport] = useState<TouchPerformanceReport | null>(
    null,
  );

  // Update live report every second when monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      setLiveReport(getReport());
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, getReport]);

  if (!isVisible) return null;

  const currentReport = liveReport || report;

  const getPerformanceColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'text-green-600 bg-green-50';
      case 'B':
        return 'text-yellow-600 bg-yellow-50';
      case 'C':
        return 'text-orange-600 bg-orange-50';
      case 'D':
        return 'text-red-600 bg-red-50';
      case 'F':
        return 'text-red-800 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div
      className={`fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Touch Performance Monitor
        </h3>
        <div className="flex gap-2">
          {isMonitoring ? (
            <button
              onClick={stopMonitoring}
              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={startMonitoring}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              Start
            </button>
          )}
          <button
            onClick={clearMetrics}
            className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      </div>

      {currentReport && currentReport.totalMeasurements > 0 ? (
        <div className="space-y-2">
          {/* Performance Grade */}
          <div
            className={`px-3 py-2 rounded text-center font-semibold ${getPerformanceColor(currentReport.performanceGrade)}`}
          >
            Grade: {currentReport.performanceGrade}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-600">Avg Response</div>
              <div
                className={`font-mono font-semibold ${currentReport.averageResponseTime <= 16.67 ? 'text-green-600' : 'text-red-600'}`}
              >
                {currentReport.averageResponseTime.toFixed(2)}ms
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-600">Max Response</div>
              <div
                className={`font-mono font-semibold ${currentReport.maxResponseTime <= 16.67 ? 'text-green-600' : 'text-red-600'}`}
              >
                {currentReport.maxResponseTime.toFixed(2)}ms
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-600">Target 60fps</div>
              <div className="font-mono font-semibold text-blue-600">
                {currentReport.target60fps.toFixed(2)}ms
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-600">Measurements</div>
              <div className="font-mono font-semibold text-gray-800">
                {currentReport.totalMeasurements}
              </div>
            </div>
          </div>

          {/* Recent Events */}
          <div className="max-h-32 overflow-y-auto">
            <div className="text-xs text-gray-600 mb-1">Recent Events:</div>
            <div className="space-y-1">
              {currentReport.measurements
                .slice(-5)
                .map((measurement, index) => (
                  <div
                    key={index}
                    className="flex justify-between text-xs bg-gray-50 px-2 py-1 rounded"
                  >
                    <span className="truncate mr-2">
                      {measurement.targetElement}
                    </span>
                    <span
                      className={`font-mono ${measurement.responseTime <= 16.67 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {measurement.responseTime.toFixed(1)}ms
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Performance Status */}
          <div className="text-xs text-center pt-2 border-t">
            {isMonitoring && (
              <div className="flex items-center justify-center text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></div>
                Monitoring Active
              </div>
            )}
            {currentReport.averageResponseTime <= 16.67 ? (
              <div className="text-green-600">✓ Meeting 60fps target</div>
            ) : (
              <div className="text-red-600">⚠ Below 60fps target</div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center text-sm text-gray-500 py-4">
          {isMonitoring
            ? 'Monitoring... Interact with touch elements'
            : 'Click Start to begin monitoring'}
        </div>
      )}
    </div>
  );
}
