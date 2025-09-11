'use client';

import { useEffect, useState } from 'react';
import {
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  Heart,
  Twitter,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface MaintenanceInfo {
  title?: string;
  message?: string;
  estimatedDuration?: string;
  startTime?: string;
  endTime?: string;
  currentTime?: string;
  progress?: number;
  status?: 'scheduled' | 'in_progress' | 'completing' | 'completed';
  affectedServices?: string[];
  updates?: Array<{
    time: string;
    message: string;
    status: 'info' | 'success' | 'warning' | 'error';
  }>;
}

interface MaintenancePageProps {
  maintenanceInfo?: MaintenanceInfo;
  showProgressBar?: boolean;
  allowFeedback?: boolean;
  customMessage?: string;
}

export default function MaintenancePage({
  maintenanceInfo = {},
  showProgressBar = true,
  allowFeedback = true,
  customMessage,
}: MaintenancePageProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshAttempts, setRefreshAttempts] = useState(0);

  const {
    title = "We're Making Things Better!",
    message = 'WedSync is currently undergoing scheduled maintenance to improve your wedding planning experience.',
    estimatedDuration = '2-3 hours',
    startTime,
    endTime,
    progress = 45,
    status = 'in_progress',
    affectedServices = [
      'Client Dashboard',
      'Photo Uploads',
      'Vendor Communication',
    ],
    updates = [],
  } = maintenanceInfo;

  useEffect(() => {
    // Update current time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-8 w-8 text-blue-600" />;
      case 'in_progress':
        return <Wrench className="h-8 w-8 text-orange-600 animate-pulse" />;
      case 'completing':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'completed':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      default:
        return <AlertCircle className="h-8 w-8 text-yellow-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'scheduled':
        return 'text-blue-600';
      case 'in_progress':
        return 'text-orange-600';
      case 'completing':
      case 'completed':
        return 'text-green-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'scheduled':
        return 'Maintenance Scheduled';
      case 'in_progress':
        return 'Maintenance in Progress';
      case 'completing':
        return 'Nearly Complete';
      case 'completed':
        return 'Maintenance Complete';
      default:
        return 'System Status Unknown';
    }
  };

  const handleRefreshCheck = () => {
    setRefreshAttempts((prev) => prev + 1);
    // In a real implementation, this would check if maintenance is complete
    window.location.reload();
  };

  const handleSendFeedback = () => {
    const feedback = prompt(
      'Is there anything specific you were trying to do? We can help prioritize based on your wedding timeline.',
    );
    if (feedback) {
      // In a real implementation, this would submit to the feedback API
      alert(
        'Thank you for your feedback! We will keep you updated on our progress.',
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-6">
        {/* Main Status Card */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full">
                {getStatusIcon()}
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">
              {title}
            </CardTitle>
            <Badge
              className={`text-sm ${getStatusColor()} bg-transparent border-current`}
            >
              {getStatusText()}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-4">
                {customMessage || message}
              </p>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <Heart className="h-4 w-4 inline mr-1" />
                  Don't worry - all your wedding data is safe and secure during
                  this maintenance.
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            {showProgressBar && status === 'in_progress' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Estimated completion: {estimatedDuration}
                </p>
              </div>
            )}

            {/* Time Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              {startTime && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Started</p>
                  <p className="font-medium">
                    {new Date(startTime).toLocaleTimeString()}
                  </p>
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground">Current Time</p>
                <p className="font-medium">
                  {currentTime.toLocaleTimeString()}
                </p>
              </div>
              {endTime && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Expected End</p>
                  <p className="font-medium">
                    {new Date(endTime).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleRefreshCheck}
                className="flex-1"
                disabled={refreshAttempts >= 3}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {refreshAttempts >= 3 ? 'Please Wait...' : 'Check Status'}
              </Button>
              {allowFeedback && (
                <Button
                  variant="outline"
                  onClick={handleSendFeedback}
                  className="flex-1"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Feedback
                </Button>
              )}
            </div>

            {refreshAttempts >= 3 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                  Please wait a few minutes before checking again. We'll have
                  you back to planning your perfect wedding soon!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Affected Services */}
        {affectedServices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Affected Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {affectedServices.map((service, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="justify-center py-2"
                  >
                    {service}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Updates */}
        {updates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {updates.map((update, index) => {
                  const getUpdateIcon = () => {
                    switch (update.status) {
                      case 'success':
                        return (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        );
                      case 'warning':
                        return (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        );
                      case 'error':
                        return <AlertCircle className="h-4 w-4 text-red-600" />;
                      default:
                        return <Clock className="h-4 w-4 text-blue-600" />;
                    }
                  };

                  return (
                    <div
                      key={index}
                      className="flex gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      {getUpdateIcon()}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{update.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {update.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Information */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Need immediate assistance for your upcoming wedding?
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" size="sm">
                  <Twitter className="h-4 w-4 mr-2" />
                  @WedSync
                </Button>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Support
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Emergency support is available for weddings happening within 48
                hours.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Wedding-themed Footer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            💍 We're working hard to make your wedding planning experience even
            more magical! 💒
          </p>
        </div>
      </div>
    </div>
  );
}
