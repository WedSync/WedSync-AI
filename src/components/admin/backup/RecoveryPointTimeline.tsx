'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  User,
  Calendar,
  Download,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { RecoveryPoint } from '../../../types/backup';

interface RecoveryPointTimelineProps {
  recoveryPoints: RecoveryPoint[];
}

const RecoveryPointTimeline: React.FC<RecoveryPointTimelineProps> = ({
  recoveryPoints,
}) => {
  const [selectedPoint, setSelectedPoint] = useState<RecoveryPoint | null>(
    null,
  );
  const [showDetails, setShowDetails] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Sort recovery points by timestamp (newest first)
  const sortedPoints = [...recoveryPoints].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );

  // Check scroll state
  const checkScrollState = () => {
    if (timelineRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = timelineRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollState();
    const timeline = timelineRef.current;
    if (timeline) {
      timeline.addEventListener('scroll', checkScrollState);
      return () => timeline.removeEventListener('scroll', checkScrollState);
    }
  }, [recoveryPoints]);

  const scrollTimeline = (direction: 'left' | 'right') => {
    if (timelineRef.current) {
      const scrollAmount = 200;
      const targetScroll =
        direction === 'left'
          ? timelineRef.current.scrollLeft - scrollAmount
          : timelineRef.current.scrollLeft + scrollAmount;

      timelineRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
    }
  };

  const formatFileSize = (sizeInGB: number) => {
    if (sizeInGB < 1) {
      return `${(sizeInGB * 1024).toFixed(0)} MB`;
    }
    return `${sizeInGB.toFixed(1)} GB`;
  };

  const formatDateTime = (date: Date) => {
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year:
          date.getFullYear() !== new Date().getFullYear()
            ? 'numeric'
            : undefined,
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    };
  };

  const getStatusIcon = (point: RecoveryPoint) => {
    const iconClass = 'w-4 h-4';
    if (point.status === 'corrupted') {
      return <XCircle className={`${iconClass} text-red-500`} />;
    }
    return <CheckCircle2 className={`${iconClass} text-green-500`} />;
  };

  const getTypeIcon = (type: 'automatic' | 'manual') => {
    const iconClass = 'w-3 h-3';
    return type === 'manual' ? (
      <User className={`${iconClass} text-blue-500`} />
    ) : (
      <Play className={`${iconClass} text-purple-500`} />
    );
  };

  const handlePointSelect = (point: RecoveryPoint) => {
    setSelectedPoint(point);
    setShowDetails(true);
  };

  const handleRestore = (point: RecoveryPoint) => {
    // Team B will implement restore functionality
    console.log('Restore from point:', point.id);
    alert(
      `Restore functionality will be implemented by Team B for point: ${point.description}`,
    );
  };

  const handleDownload = (point: RecoveryPoint) => {
    // Team B will implement download functionality
    console.log('Download point:', point.id);
    alert(
      `Download functionality will be implemented by Team B for point: ${point.description}`,
    );
  };

  if (sortedPoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Recovery Points Available
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-sm">
          Recovery points will appear here once backups are created. Create your
          first backup to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {sortedPoints.length} recovery points available
          </span>
        </div>

        {/* Scroll Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => scrollTimeline('left')}
            disabled={!canScrollLeft}
            className="p-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Scroll timeline left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scrollTimeline('right')}
            disabled={!canScrollRight}
            className="p-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Scroll timeline right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute top-8 left-6 right-6 h-0.5 bg-gray-200 dark:bg-gray-700"></div>

        {/* Scrollable Timeline */}
        <div
          ref={timelineRef}
          className="flex space-x-8 overflow-x-auto pb-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {sortedPoints.map((point, index) => {
            const { date, time } = formatDateTime(point.timestamp);
            const isSelected = selectedPoint?.id === point.id;

            return (
              <div
                key={point.id}
                className="flex-shrink-0 relative cursor-pointer group"
                onClick={() => handlePointSelect(point)}
              >
                {/* Timeline Point */}
                <div
                  className={`relative z-10 w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    isSelected
                      ? 'bg-purple-600 border-purple-600 scale-125'
                      : point.status === 'corrupted'
                        ? 'bg-red-500 border-red-500 group-hover:scale-110'
                        : 'bg-green-500 border-green-500 group-hover:scale-110'
                  }`}
                >
                  {/* Pulse animation for selected point */}
                  {isSelected && (
                    <div className="absolute inset-0 rounded-full bg-purple-600 animate-ping opacity-25"></div>
                  )}
                </div>

                {/* Point Details Card */}
                <div
                  className={`absolute top-8 left-1/2 transform -translate-x-1/2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 transition-all duration-200 ${
                    isSelected
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                  }`}
                >
                  {/* Arrow pointing to timeline point */}
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 rotate-45"></div>

                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(point)}
                      <span
                        className={`text-sm font-medium ${
                          point.status === 'corrupted'
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-green-700 dark:text-green-300'
                        }`}
                      >
                        {point.status === 'corrupted' ? 'Corrupted' : 'Healthy'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      {getTypeIcon(point.type)}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          point.type === 'manual'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                        }`}
                      >
                        {point.type}
                      </span>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {date}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {time}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    {point.description}
                  </p>

                  {/* Size */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Size:
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatFileSize(point.size)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(point);
                      }}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(point);
                      }}
                      disabled={point.status === 'corrupted'}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg text-purple-700 bg-purple-100 hover:bg-purple-200 dark:text-purple-300 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Restore
                    </button>
                  </div>

                  {/* Corruption Warning */}
                  {point.status === 'corrupted' && (
                    <div className="flex items-start space-x-2 mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-red-700 dark:text-red-300">
                        This recovery point is corrupted and cannot be used for
                        restoration.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile-friendly cards for small screens */}
      <div className="block lg:hidden mt-6">
        <div className="space-y-3">
          {sortedPoints.map((point) => {
            const { date, time } = formatDateTime(point.timestamp);

            return (
              <div
                key={point.id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(point)}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {date} at {time}
                    </span>
                  </div>
                  {getTypeIcon(point.type)}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {point.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(point.size)}
                  </span>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDownload(point)}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleRestore(point)}
                      disabled={point.status === 'corrupted'}
                      className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 disabled:opacity-50"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export { RecoveryPointTimeline };
export default RecoveryPointTimeline;
