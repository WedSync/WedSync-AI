'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Clock,
  HardDrive,
  Zap,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import {
  MediaPerformanceBenchmark,
  PerformanceMonitor,
  type MediaBenchmarkResult,
} from '@/lib/performance/media-benchmarks';

interface MediaPerformanceMonitorProps {
  onBenchmarkComplete?: (results: MediaBenchmarkResult[]) => void;
}

export function MediaPerformanceMonitor({
  onBenchmarkComplete,
}: MediaPerformanceMonitorProps) {
  const [benchmark] = useState(() => new MediaPerformanceBenchmark());
  const [performanceMonitor] = useState(() => PerformanceMonitor.getInstance());
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [results, setResults] = useState<MediaBenchmarkResult[]>([]);
  const [avgMetrics, setAvgMetrics] = useState({ avgTime: 0, avgMemory: 0 });

  useEffect(() => {
    updateMetrics();
  }, [results]);

  const updateMetrics = () => {
    const metrics = performanceMonitor.getAveragePerformance();
    setAvgMetrics(metrics);
  };

  const runSingleImageTest = async () => {
    setIsRunning(true);
    setCurrentTest('Single Portfolio Image');

    try {
      // Create test image file
      const testFile = await createTestImageFile(
        'portfolio-test.jpg',
        5 * 1024 * 1024,
      ); // 5MB
      const result = await benchmark.benchmarkImageUpload(
        testFile,
        'singlePortfolio',
      );

      performanceMonitor.recordMetric(result);
      setResults((prev) => [...prev, result]);
      onBenchmarkComplete?.([result]);
    } catch (error) {
      console.error('Single image test failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const runWeddingGalleryTest = async () => {
    setIsRunning(true);
    setCurrentTest('Wedding Gallery Upload (5 images)');

    try {
      // Create multiple test files
      const testFiles = await Promise.all(
        Array.from(
          { length: 5 },
          (_, i) =>
            createTestImageFile(`wedding-${i + 1}.jpg`, 4 * 1024 * 1024), // 4MB each
        ),
      );

      const batchResults = await benchmark.benchmarkBatchUpload(
        testFiles,
        'quickPreview',
      );

      batchResults.forEach((result) => performanceMonitor.recordMetric(result));
      setResults((prev) => [...prev, ...batchResults]);
      onBenchmarkComplete?.(batchResults);
    } catch (error) {
      console.error('Wedding gallery test failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const runWeddingDayStressTest = async () => {
    setIsRunning(true);
    setCurrentTest('Wedding Day Stress Test');

    try {
      await benchmark.runWeddingDayStressTest();
    } catch (error) {
      console.error('Wedding day stress test failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const createTestImageFile = async (
    name: string,
    size: number,
  ): Promise<File> => {
    // Create a canvas-based test image
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d')!;

    // Fill with gradient to simulate real image
    const gradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(1, '#4ecdc4');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add text overlay
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.fillText('WedSync Test Image', 50, 100);
    ctx.fillText(new Date().toLocaleString(), 50, 160);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          const file = new File([blob!], name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(file);
        },
        'image/jpeg',
        0.9,
      );
    });
  };

  const getPerformanceGrade = (
    time: number,
  ): { grade: string; color: string; icon: React.ReactNode } => {
    if (time < 2000)
      return {
        grade: 'A+',
        color: 'text-green-600',
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      };
    if (time < 3000)
      return {
        grade: 'B',
        color: 'text-blue-600',
        icon: <CheckCircle className="h-4 w-4 text-blue-500" />,
      };
    if (time < 5000)
      return {
        grade: 'C',
        color: 'text-yellow-600',
        icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
      };
    return {
      grade: 'D',
      color: 'text-red-600',
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
    };
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Activity className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Media Performance Monitor
            </h3>
            <p className="text-sm text-gray-500">
              Test CMS media upload performance
            </p>
          </div>
        </div>

        {results.length > 0 && (
          <button
            onClick={clearResults}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear Results
          </button>
        )}
      </div>

      {/* Performance Summary */}
      {avgMetrics.avgTime > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Avg Upload Time
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-semibold text-gray-900">
                {(avgMetrics.avgTime / 1000).toFixed(2)}s
              </span>
              {getPerformanceGrade(avgMetrics.avgTime).icon}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <HardDrive className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Avg Memory Usage
              </span>
            </div>
            <span className="text-2xl font-semibold text-gray-900">
              {(avgMetrics.avgMemory / 1024 / 1024).toFixed(1)}MB
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Zap className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Performance Grade
              </span>
            </div>
            <span
              className={`text-2xl font-semibold ${getPerformanceGrade(avgMetrics.avgTime).color}`}
            >
              {getPerformanceGrade(avgMetrics.avgTime).grade}
            </span>
          </div>
        </div>
      )}

      {/* Test Controls */}
      <div className="space-y-4 mb-6">
        <h4 className="text-md font-medium text-gray-900">Performance Tests</h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={runSingleImageTest}
            disabled={isRunning}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors disabled:opacity-50"
          >
            <Clock className="h-4 w-4" />
            <span className="font-medium">Single Image</span>
          </button>

          <button
            onClick={runWeddingGalleryTest}
            disabled={isRunning}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition-colors disabled:opacity-50"
          >
            <Activity className="h-4 w-4" />
            <span className="font-medium">Gallery (5 Images)</span>
          </button>

          <button
            onClick={runWeddingDayStressTest}
            disabled={isRunning}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 transition-colors disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            <span className="font-medium">Stress Test</span>
          </button>
        </div>
      </div>

      {/* Current Test Status */}
      {isRunning && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <p className="text-sm font-medium text-blue-800">Running Test</p>
              <p className="text-sm text-blue-600">{currentTest}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Recent Results</h4>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results
              .slice(-10)
              .reverse()
              .map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getPerformanceGrade(result.totalTime).icon}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {(result.totalTime / 1000).toFixed(2)}s upload
                      </p>
                      <p className="text-xs text-gray-500">
                        {(result.originalSize / 1024 / 1024).toFixed(1)}MB →{' '}
                        {(result.optimizedSize / 1024 / 1024).toFixed(1)}MB (
                        {(result.compressionRatio * 100).toFixed(0)}%
                        compression)
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-600">
                      {result.deviceType}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(result.memoryUsage / 1024 / 1024).toFixed(1)}MB memory
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Wedding Day Performance Tips */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h5 className="text-sm font-medium text-yellow-800 mb-1">
              Wedding Day Performance Tips
            </h5>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>
                • Target &lt;3 seconds per image upload for optimal vendor
                experience
              </li>
              <li>
                • Batch uploads should complete within 2 minutes for wedding
                galleries
              </li>
              <li>
                • Monitor memory usage - keep under 100MB for mobile devices
              </li>
              <li>
                • Test performance on 3G networks (common at wedding venues)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
