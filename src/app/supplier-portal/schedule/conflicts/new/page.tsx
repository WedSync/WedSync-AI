'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  Camera,
  FileText,
  Send,
  ArrowLeft,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useSupplierSchedule } from '@/hooks/useSupplierSchedule';

const conflictTypes = [
  {
    id: 'double_booking',
    label: 'Double Booking',
    description: 'Two events scheduled at the same time',
    severity: 'critical',
  },
  {
    id: 'travel_time',
    label: 'Travel Time Issue',
    description: 'Not enough time to travel between locations',
    severity: 'high',
  },
  {
    id: 'setup_overlap',
    label: 'Setup/Breakdown Conflict',
    description: 'Setup or breakdown time conflicts with other events',
    severity: 'medium',
  },
  {
    id: 'availability',
    label: 'Availability Change',
    description: 'Personal availability has changed',
    severity: 'medium',
  },
  {
    id: 'equipment',
    label: 'Equipment Conflict',
    description: 'Equipment needed for multiple events',
    severity: 'high',
  },
  {
    id: 'other',
    label: 'Other Issue',
    description: 'Another type of scheduling conflict',
    severity: 'medium',
  },
];

export default function NewConflictReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');

  const { todayEvents, reportConflict } = useSupplierSchedule();
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>(
    eventId ? [eventId] : [],
  );
  const [conflictType, setConflictType] = useState('');
  const [description, setDescription] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timeString: string) => {
    return new Date(timeString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEventSelection = (eventId: string, selected: boolean) => {
    if (selected) {
      setSelectedEventIds((prev) => [...prev, eventId]);
    } else {
      setSelectedEventIds((prev) => prev.filter((id) => id !== eventId));
    }
  };

  const handlePhotoCapture = () => {
    // Create file input for photo capture
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.multiple = true;

    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      setPhotos((prev) => [...prev, ...files]);
    };

    input.click();
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!conflictType || selectedEventIds.length === 0 || !description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Report the conflict
      await reportConflict(selectedEventIds, description, conflictType);

      // If photos are included, upload them (would be implemented with file upload API)
      if (photos.length > 0) {
        // Mock photo upload - in real implementation, you'd upload to storage
        console.log('Uploading photos:', photos);
      }

      // Show success feedback
      alert(
        'Conflict reported successfully! Our team will review it promptly.',
      );
      router.push('/supplier-portal');
    } catch (error) {
      console.error('Failed to report conflict:', error);
      alert('Failed to report conflict. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType = conflictTypes.find((t) => t.id === conflictType);

  return (
    <div className="space-y-4 py-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">
              Report Conflict
            </h1>
            <p className="text-sm text-gray-600">
              Help us resolve scheduling conflicts quickly
            </p>
          </div>

          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
      </Card>

      {/* Affected Events */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Affected Events
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Select all events involved in this conflict
        </p>

        <div className="space-y-3">
          {todayEvents.map((event) => {
            const isSelected = selectedEventIds.includes(event.id);

            return (
              <div
                key={event.id}
                className={cn(
                  'border rounded-lg p-3 transition-all duration-200',
                  'touch-manipulation cursor-pointer',
                  isSelected && 'border-red-300 bg-red-50',
                )}
                onClick={() => handleEventSelection(event.id, !isSelected)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div
                      className={cn(
                        'w-4 h-4 border-2 rounded',
                        isSelected
                          ? 'bg-red-500 border-red-500'
                          : 'border-gray-300',
                      )}
                    >
                      {isSelected && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{event.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatDate(event.start_time)} at{' '}
                          {formatTime(event.start_time)}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Client: {event.client_name}
                    </p>
                  </div>

                  <Badge
                    className={cn(
                      event.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : event.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800',
                    )}
                  >
                    {event.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Conflict Type */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Conflict Type
        </h2>

        <RadioGroup value={conflictType} onValueChange={setConflictType}>
          <div className="space-y-3">
            {conflictTypes.map((type) => (
              <div key={type.id} className="flex items-center space-x-3">
                <RadioGroupItem value={type.id} id={type.id} />
                <Label htmlFor={type.id} className="flex-1 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {type.label}
                      </div>
                      <div className="text-sm text-gray-600">
                        {type.description}
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        'ml-2',
                        type.severity === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : type.severity === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800',
                      )}
                    >
                      {type.severity}
                    </Badge>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </Card>

      {/* Description */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Detailed Description
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Please provide specific details about the conflict
        </p>

        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the conflict in detail. Include times, locations, and any other relevant information..."
          className="min-h-24"
        />

        <div className="flex items-center justify-between mt-3">
          <div className="text-sm text-gray-500">
            {description.length}/500 characters
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="urgent"
              checked={isUrgent}
              onCheckedChange={setIsUrgent}
            />
            <Label htmlFor="urgent" className="text-sm font-medium">
              Mark as urgent
            </Label>
          </div>
        </div>
      </Card>

      {/* Photo Evidence */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Photo Evidence (Optional)
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Add photos to help explain the conflict
        </p>

        <div className="space-y-3">
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 h-6 w-6"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            onClick={handlePhotoCapture}
            className="w-full"
          >
            <Camera className="w-4 h-4 mr-2" />
            Add Photo
          </Button>
        </div>
      </Card>

      {/* Summary */}
      {selectedEventIds.length > 0 && conflictType && (
        <Card className="p-4 border-orange-200 bg-orange-50">
          <h3 className="font-medium text-gray-900 mb-2">Conflict Summary</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              <strong>Type:</strong> {selectedType?.label}
            </p>
            <p>
              <strong>Severity:</strong> {selectedType?.severity}
            </p>
            <p>
              <strong>Events Affected:</strong> {selectedEventIds.length}
            </p>
            <p>
              <strong>Priority:</strong> {isUrgent ? 'Urgent' : 'Normal'}
            </p>
            {photos.length > 0 && (
              <p>
                <strong>Photos:</strong> {photos.length} attached
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Submit Button */}
      <Card className="p-4">
        <Button
          onClick={handleSubmit}
          disabled={
            submitting ||
            !conflictType ||
            selectedEventIds.length === 0 ||
            !description.trim()
          }
          className={cn(
            'w-full h-12',
            isUrgent
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-orange-600 hover:bg-orange-700',
          )}
        >
          <Send className="w-4 h-4 mr-2" />
          {submitting ? 'Reporting Conflict...' : 'Report Conflict'}
        </Button>

        <p className="text-xs text-gray-500 text-center mt-2">
          {isUrgent
            ? 'Urgent conflicts will be prioritized for immediate review'
            : 'We typically respond to conflict reports within 2 hours'}
        </p>
      </Card>
    </div>
  );
}
