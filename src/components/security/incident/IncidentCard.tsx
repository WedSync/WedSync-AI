'use client';

import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  assignee: {
    name: string;
    role: string;
    avatar?: string;
  };
  weddingContext?: {
    couple: string;
    venue: string;
    date: string;
    guestCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
  affectedSystems: string[];
  potentialImpact: string;
  containmentStatus: 'none' | 'partial' | 'full';
  evidenceCount: number;
  isWeddingDay: boolean;
}

interface IncidentCardProps {
  incident: Incident;
  onViewDetails: (incidentId: string) => void;
  onAssignee?: (incidentId: string) => void;
  onStatusUpdate?: (incidentId: string, status: string) => void;
  compact?: boolean;
}

const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  onViewDetails,
  onAssignee,
  onStatusUpdate,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const severityConfig = {
    P1: {
      color: 'border-red-500 bg-red-50',
      textColor: 'text-red-800',
      badge: 'bg-red-100 text-red-700',
      icon: AlertTriangle,
      label: 'Critical',
    },
    P2: {
      color: 'border-orange-500 bg-orange-50',
      textColor: 'text-orange-800',
      badge: 'bg-orange-100 text-orange-700',
      icon: AlertTriangle,
      label: 'High',
    },
    P3: {
      color: 'border-yellow-500 bg-yellow-50',
      textColor: 'text-yellow-800',
      badge: 'bg-yellow-100 text-yellow-700',
      icon: AlertTriangle,
      label: 'Medium',
    },
    P4: {
      color: 'border-blue-500 bg-blue-50',
      textColor: 'text-blue-800',
      badge: 'bg-blue-100 text-blue-700',
      icon: AlertTriangle,
      label: 'Low',
    },
  };

  const statusConfig = {
    open: { color: 'bg-gray-100 text-gray-700', icon: XCircle },
    investigating: { color: 'bg-blue-100 text-blue-700', icon: Eye },
    contained: { color: 'bg-yellow-100 text-yellow-700', icon: CheckCircle },
    resolved: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
    closed: { color: 'bg-gray-100 text-gray-600', icon: CheckCircle },
  };

  const config = severityConfig[incident.severity];
  const statusStyle = statusConfig[incident.status];
  const StatusIcon = statusStyle.icon;
  const SeverityIcon = config.icon;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  return (
    <div
      className={`
      border-2 rounded-xl p-4 transition-all duration-200 hover:shadow-lg
      ${config.color} ${incident.isWeddingDay ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}
      ${compact ? 'p-3' : ''}
    `}
    >
      {/* Wedding Day Alert Banner */}
      {incident.isWeddingDay && (
        <div className="mb-3 px-3 py-2 bg-purple-100 border border-purple-200 rounded-lg">
          <div className="flex items-center text-purple-800 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 mr-2" />
            WEDDING DAY PROTOCOL ACTIVE
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${config.badge}`}>
            <SeverityIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3
                className={`font-semibold ${config.textColor} ${compact ? 'text-sm' : 'text-base'}`}
              >
                {incident.title}
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${config.badge}`}
              >
                {config.label}
              </span>
            </div>
            <p
              className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'} mt-1`}
            >
              #{incident.id}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle.color} flex items-center`}
          >
            <StatusIcon className="w-3 h-3 mr-1" />
            {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Description */}
      <p className={`text-gray-700 mb-3 ${compact ? 'text-sm' : ''}`}>
        {incident.description}
      </p>

      {/* Wedding Context */}
      {incident.weddingContext && (
        <div className="mb-3 p-3 bg-white bg-opacity-60 rounded-lg border border-white border-opacity-80">
          <h4 className="font-medium text-gray-800 text-sm mb-2 flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            Wedding Context
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div>
              <span className="font-medium">Couple:</span>{' '}
              {incident.weddingContext.couple}
            </div>
            <div>
              <span className="font-medium">Date:</span>{' '}
              {incident.weddingContext.date}
            </div>
            <div>
              <span className="font-medium">Venue:</span>{' '}
              {incident.weddingContext.venue}
            </div>
            <div>
              <span className="font-medium">Guests:</span>{' '}
              {incident.weddingContext.guestCount}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Affected Systems */}
          <div>
            <h4 className="font-medium text-gray-800 text-sm mb-2">
              Affected Systems
            </h4>
            <div className="flex flex-wrap gap-2">
              {incident.affectedSystems.map((system, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-white bg-opacity-80 rounded-md text-xs text-gray-700 border"
                >
                  {system}
                </span>
              ))}
            </div>
          </div>

          {/* Impact Assessment */}
          <div>
            <h4 className="font-medium text-gray-800 text-sm mb-2">
              Potential Impact
            </h4>
            <p className="text-sm text-gray-600 bg-white bg-opacity-60 p-2 rounded">
              {incident.potentialImpact}
            </p>
          </div>

          {/* Containment Status */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium text-gray-700">Containment: </span>
              <span
                className={`font-medium ${
                  incident.containmentStatus === 'full'
                    ? 'text-green-600'
                    : incident.containmentStatus === 'partial'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {incident.containmentStatus === 'none'
                  ? 'Not Contained'
                  : incident.containmentStatus === 'partial'
                    ? 'Partially Contained'
                    : 'Fully Contained'}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {incident.evidenceCount} evidence items
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white border-opacity-50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center text-sm text-gray-600">
            <User className="w-4 h-4 mr-1" />
            <span className="font-medium">{incident.assignee.name}</span>
            <span className="text-gray-500 ml-1">
              ({incident.assignee.role})
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            {formatTime(incident.updatedAt)}
          </div>
          <button
            onClick={() => onViewDetails(incident.id)}
            className="px-4 py-2 bg-white bg-opacity-80 text-gray-700 rounded-lg hover:bg-opacity-100 transition-all text-sm font-medium border border-white border-opacity-50 hover:border-opacity-100"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncidentCard;
