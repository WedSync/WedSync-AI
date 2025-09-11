'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Mic,
  MicOff,
  Send,
  MapPin,
  Phone,
  Camera,
  Clock,
  User,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmergencyReport {
  id?: string;
  type: 'medical' | 'security' | 'fire' | 'weather' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  reportedBy: string;
  timestamp: Date;
  coordinates?: GeolocationCoordinates;
  voiceRecording?: Blob;
  photos?: File[];
  contactsNotified: string[];
  status: 'draft' | 'submitted' | 'acknowledged';
}

interface EmergencyResponseMobileProps {
  venueId: string;
  userId: string;
  userName: string;
  onReportSubmit?: (report: EmergencyReport) => void;
  onEmergencyEscalation?: (reportId: string, escalationLevel: string) => void;
}

export const EmergencyResponseMobile: React.FC<
  EmergencyResponseMobileProps
> = ({ venueId, userId, userName, onReportSubmit, onEmergencyEscalation }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentLocation, setCurrentLocation] =
    useState<GeolocationCoordinates | null>(null);
  const [report, setReport] = useState<Partial<EmergencyReport>>({
    type: 'other',
    severity: 'medium',
    location: '',
    description: '',
    reportedBy: userName,
    timestamp: new Date(),
    contactsNotified: [],
    status: 'draft',
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation(position.coords);
          setReport((prev) => ({
            ...prev,
            coordinates: position.coords,
            location:
              prev.location ||
              `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
          }));
        },
        (error) => console.warn('Location access denied:', error),
      );
    }
  }, []);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });
        setReport((prev) => ({ ...prev, voiceRecording: audioBlob }));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setReport((prev) => ({
      ...prev,
      photos: [...(prev.photos || []), ...files],
    }));
  };

  const handleSubmitReport = async () => {
    const fullReport: EmergencyReport = {
      ...report,
      id: `emergency_${Date.now()}`,
      timestamp: new Date(),
      status: 'submitted',
    } as EmergencyReport;

    if (onReportSubmit) {
      onReportSubmit(fullReport);
    }

    // Auto-escalate critical incidents
    if (report.severity === 'critical') {
      handleEmergencyEscalation(fullReport.id!, 'emergency-services');
    }

    // Reset form
    setReport({
      type: 'other',
      severity: 'medium',
      location: currentLocation
        ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
        : '',
      description: '',
      reportedBy: userName,
      timestamp: new Date(),
      contactsNotified: [],
      status: 'draft',
    });
  };

  const handleEmergencyEscalation = (
    reportId: string,
    escalationLevel: string,
  ) => {
    if (onEmergencyEscalation) {
      onEmergencyEscalation(reportId, escalationLevel);
    }

    // Show escalation confirmation
    alert(
      `Emergency escalated to ${escalationLevel}. Response team has been notified.`,
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'medical':
        return '🚑';
      case 'security':
        return '🚨';
      case 'fire':
        return '🔥';
      case 'weather':
        return '⛈️';
      default:
        return '⚠️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const isFormValid =
    report.type && report.severity && report.location && report.description;

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Emergency Response
        </h1>
        <div className="flex items-center text-sm text-gray-600">
          <User className="w-4 h-4 mr-1" />
          <span>Reporting as: {userName}</span>
        </div>
      </div>

      {/* Critical Emergency Button */}
      <Card className="mb-6 border-red-500 bg-red-50">
        <CardContent className="p-4">
          <Button
            onClick={() => {
              setReport((prev) => ({
                ...prev,
                severity: 'critical',
                type: 'medical',
              }));
              window.location.href = 'tel:911';
            }}
            size="lg"
            variant="destructive"
            className="w-full min-h-[64px] text-lg font-bold"
          >
            <Phone className="w-6 h-6 mr-3" />
            CALL 911 - EMERGENCY
          </Button>
          <p className="text-xs text-red-600 mt-2 text-center">
            For life-threatening emergencies
          </p>
        </CardContent>
      </Card>

      {/* Incident Report Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Incident Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Incident Type */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Incident Type
            </label>
            <Select
              value={report.type}
              onValueChange={(value) =>
                setReport((prev) => ({ ...prev, type: value as any }))
              }
            >
              <SelectTrigger className="min-h-[48px]">
                <SelectValue placeholder="Select incident type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medical">🚑 Medical Emergency</SelectItem>
                <SelectItem value="security">🚨 Security Issue</SelectItem>
                <SelectItem value="fire">🔥 Fire/Evacuation</SelectItem>
                <SelectItem value="weather">⛈️ Weather Emergency</SelectItem>
                <SelectItem value="other">⚠️ Other Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Severity Level */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Severity Level
            </label>
            <Select
              value={report.severity}
              onValueChange={(value) =>
                setReport((prev) => ({ ...prev, severity: value as any }))
              }
            >
              <SelectTrigger className="min-h-[48px]">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">
                  🔴 Critical - Immediate Response
                </SelectItem>
                <SelectItem value="high">🟠 High - Urgent Response</SelectItem>
                <SelectItem value="medium">
                  🟡 Medium - Prompt Response
                </SelectItem>
                <SelectItem value="low">🟢 Low - Standard Response</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location
            </label>
            <Input
              value={report.location}
              onChange={(e) =>
                setReport((prev) => ({ ...prev, location: e.target.value }))
              }
              placeholder="Specify exact location (e.g., Main Hall, Kitchen, Garden)"
              className="min-h-[48px]"
            />
            {currentLocation && (
              <p className="text-xs text-gray-500 mt-1">
                GPS: {currentLocation.latitude.toFixed(6)},{' '}
                {currentLocation.longitude.toFixed(6)}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Description
            </label>
            <Textarea
              value={report.description}
              onChange={(e) =>
                setReport((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Describe the incident in detail. Include what happened, who is involved, and what immediate action is needed."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Voice Recording */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Voice Report (Optional)
            </label>
            <div className="flex gap-2">
              <Button
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                variant={isRecording ? 'destructive' : 'outline'}
                size="lg"
                className="flex-1 min-h-[48px]"
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-5 h-5 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 mr-2" />
                    Start Voice Report
                  </>
                )}
              </Button>
            </div>
            {report.voiceRecording && (
              <Badge className="mt-2">Voice recording saved</Badge>
            )}
          </div>

          {/* Photo Capture */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Photos (Optional)
            </label>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="lg"
              className="w-full min-h-[48px]"
            >
              <Camera className="w-5 h-5 mr-2" />
              Capture Photos
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />
            {report.photos && report.photos.length > 0 && (
              <Badge className="mt-2">
                {report.photos.length} photos captured
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Card>
        <CardContent className="p-4">
          <Button
            onClick={handleSubmitReport}
            disabled={!isFormValid}
            size="lg"
            className="w-full min-h-[56px] text-lg font-medium"
          >
            <Send className="w-5 h-5 mr-3" />
            Submit Emergency Report
          </Button>

          {report.severity === 'critical' && (
            <p className="text-xs text-red-600 mt-2 text-center">
              Critical incidents will automatically notify emergency services
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Button
          variant="outline"
          size="lg"
          className="min-h-[48px]"
          onClick={() => handleEmergencyEscalation('current', 'venue-security')}
        >
          Alert Security
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="min-h-[48px]"
          onClick={() =>
            handleEmergencyEscalation('current', 'wedding-coordinator')
          }
        >
          Notify Coordinator
        </Button>
      </div>
    </div>
  );
};

export default EmergencyResponseMobile;
