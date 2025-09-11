'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Mic,
  MicOff,
  Camera,
  MapPin,
  AlertTriangle,
  Clock,
  Send,
} from 'lucide-react';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { AttachmentUploader } from './AttachmentUploader';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Validation schema for ticket submission
const ticketSubmissionSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(255, 'Title too long'),
  description: z
    .string()
    .min(20, 'Please provide more details (minimum 20 characters)')
    .max(5000, 'Description too long'),
  category: z.enum([
    'technical_issue',
    'billing_question',
    'feature_request',
    'wedding_day_emergency',
    'integration_problem',
    'data_issue',
    'account_access',
    'general_inquiry',
  ]),
  priority: z.enum(['low', 'normal', 'high', 'urgent', 'wedding_day']),
  venue_name: z.string().optional(),
  wedding_date: z.string().optional(),
  emergency_contact: z.string().optional(),
});

type TicketFormData = z.infer<typeof ticketSubmissionSchema>;

interface TicketSubmissionFormProps {
  onSubmitted?: (ticketId: string) => void;
  isWeddingDay?: boolean;
  weddingContext?: {
    wedding_id: string;
    venue_name: string;
    wedding_date: string;
  };
}

const CATEGORY_OPTIONS = [
  {
    value: 'wedding_day_emergency',
    label: '🚨 Wedding Day Emergency',
    urgent: true,
  },
  { value: 'technical_issue', label: '🔧 Technical Issue' },
  { value: 'billing_question', label: '💳 Billing Question' },
  { value: 'feature_request', label: '💡 Feature Request' },
  { value: 'integration_problem', label: '🔗 Integration Problem' },
  { value: 'data_issue', label: '📊 Data Issue' },
  { value: 'account_access', label: '🔐 Account Access' },
  { value: 'general_inquiry', label: '💬 General Question' },
];

const PRIORITY_OPTIONS = [
  {
    value: 'wedding_day',
    label: '🚨 Wedding Day Critical',
    color: 'bg-red-500',
    urgent: true,
  },
  { value: 'urgent', label: '⚡ Urgent', color: 'bg-orange-500' },
  { value: 'high', label: '🔥 High', color: 'bg-yellow-500' },
  { value: 'normal', label: '📋 Normal', color: 'bg-blue-500' },
  { value: 'low', label: '📝 Low', color: 'bg-gray-500' },
];

export const TicketSubmissionForm: React.FC<TicketSubmissionFormProps> = ({
  onSubmitted,
  isWeddingDay = false,
  weddingContext,
}) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [voiceNote, setVoiceNote] = useState<Blob | null>(null);
  const [userLocation, setUserLocation] =
    useState<GeolocationCoordinates | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [autoSaveKey, setAutoSaveKey] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isDirty },
    reset,
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSubmissionSchema),
    defaultValues: {
      priority: isWeddingDay ? 'wedding_day' : 'normal',
      category: isWeddingDay ? 'wedding_day_emergency' : 'general_inquiry',
      venue_name: weddingContext?.venue_name || '',
      wedding_date: weddingContext?.wedding_date || '',
    },
  });

  // Auto-save form data every 30 seconds
  useEffect(() => {
    const key = `ticket_draft_${Date.now()}`;
    setAutoSaveKey(key);

    const interval = setInterval(() => {
      if (isDirty) {
        const formData = getValues();
        localStorage.setItem(key, JSON.stringify(formData));
        toast.success('Draft saved automatically', { duration: 1000 });
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      localStorage.removeItem(key);
    };
  }, [isDirty, getValues]);

  // Get user's location for venue context
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    setIsLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation(position.coords);
        setIsLocationLoading(false);
        toast.success('Location captured for venue context');
      },
      (error) => {
        setIsLocationLoading(false);
        toast.error('Could not get location: ' + error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }, []);

  // Handle form submission
  const onSubmit = async (data: TicketFormData) => {
    try {
      setIsSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to submit a ticket');
        return;
      }

      // Prepare ticket data
      const ticketData = {
        ...data,
        user_id: user.id,
        organization_id: user.user_metadata?.organization_id,
        wedding_id: weddingContext?.wedding_id || null,
        user_location: userLocation
          ? {
              lat: userLocation.latitude,
              lng: userLocation.longitude,
              accuracy: userLocation.accuracy,
              timestamp: new Date().toISOString(),
            }
          : null,
        device_info: {
          platform: navigator.platform,
          user_agent: navigator.userAgent,
          is_mobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
          is_pwa: window.matchMedia('(display-mode: standalone)').matches,
          screen_size: `${window.screen.width}x${window.screen.height}`,
          viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        },
      };

      // Submit ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert(ticketData)
        .select('id, ticket_number')
        .single();

      if (ticketError) throw ticketError;

      // Upload attachments if any
      if (attachments.length > 0 || voiceNote) {
        const uploads = [];

        // Upload regular attachments
        for (const file of attachments) {
          const filePath = `tickets/${ticket.id}/${file.name}`;
          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from('support-attachments')
              .upload(filePath, file);

          if (!uploadError) {
            uploads.push({
              ticket_id: ticket.id,
              filename: file.name,
              file_type: file.type,
              file_size: file.size,
              storage_path: uploadData.path,
              captured_on_mobile: /Mobile|Android|iPhone|iPad/.test(
                navigator.userAgent,
              ),
              uploaded_by: user.id,
            });
          }
        }

        // Upload voice note if present
        if (voiceNote) {
          const voiceFileName = `voice_note_${Date.now()}.webm`;
          const voiceFilePath = `tickets/${ticket.id}/${voiceFileName}`;

          const { data: voiceUpload, error: voiceError } =
            await supabase.storage
              .from('support-attachments')
              .upload(voiceFilePath, voiceNote);

          if (!voiceError) {
            uploads.push({
              ticket_id: ticket.id,
              filename: voiceFileName,
              file_type: 'audio/webm',
              file_size: voiceNote.size,
              storage_path: voiceUpload.path,
              captured_on_mobile: true,
              uploaded_by: user.id,
            });
          }
        }

        // Save attachment records
        if (uploads.length > 0) {
          await supabase.from('support_ticket_attachments').insert(uploads);
        }
      }

      // Clear draft
      localStorage.removeItem(autoSaveKey);

      toast.success(`Ticket ${ticket.ticket_number} submitted successfully!`);

      if (onSubmitted) {
        onSubmitted(ticket.id);
      } else {
        router.push(`/support/tickets/${ticket.id}`);
      }

      reset();
      setAttachments([]);
      setVoiceNote(null);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.error('Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Watch for category changes to auto-adjust priority
  const watchedCategory = watch('category');
  useEffect(() => {
    if (watchedCategory === 'wedding_day_emergency') {
      setValue('priority', 'wedding_day');
    }
  }, [watchedCategory, setValue]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          {isWeddingDay && <AlertTriangle className="h-6 w-6 text-red-500" />}
          Submit Support Ticket
          {isWeddingDay && <Badge variant="destructive">Wedding Day</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Quick Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Issue Category</Label>
            <Select
              value={watch('category')}
              onValueChange={(value) => setValue('category', value as any)}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span
                      className={option.urgent ? 'font-bold text-red-600' : ''}
                    >
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority Level</Label>
            <Select
              value={watch('priority')}
              onValueChange={(value) => setValue('priority', value as any)}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${option.color}`} />
                      <span
                        className={
                          option.urgent ? 'font-bold text-red-600' : ''
                        }
                      >
                        {option.label}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.priority && (
              <p className="text-sm text-red-600">{errors.priority.message}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Issue Title</Label>
            <Input
              {...register('title')}
              className="h-12 text-base"
              placeholder="Brief description of your issue"
              autoComplete="off"
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description</Label>
            <Textarea
              {...register('description')}
              className="min-h-32 text-base resize-none"
              placeholder="Please provide detailed information about your issue. Include any error messages, steps to reproduce, and relevant context."
            />
            {errors.description && (
              <p className="text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Wedding Context Fields */}
          {(isWeddingDay || watch('category') === 'wedding_day_emergency') && (
            <>
              <div className="space-y-2">
                <Label htmlFor="venue_name">Venue Name</Label>
                <Input
                  {...register('venue_name')}
                  className="h-12 text-base"
                  placeholder="Wedding venue name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wedding_date">Wedding Date</Label>
                <Input
                  {...register('wedding_date')}
                  type="date"
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input
                  {...register('emergency_contact')}
                  className="h-12 text-base"
                  placeholder="Phone number for urgent contact"
                />
              </div>
            </>
          )}

          {/* Location Button */}
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={isLocationLoading}
            className="h-12 w-full"
          >
            <MapPin className="h-4 w-4 mr-2" />
            {isLocationLoading
              ? 'Getting Location...'
              : userLocation
                ? '✓ Location Captured'
                : 'Add Current Location'}
          </Button>

          {/* Voice Note Recorder */}
          <VoiceNoteRecorder onRecordingComplete={setVoiceNote} />

          {/* Attachment Uploader */}
          <AttachmentUploader onFilesSelected={setAttachments} />

          {/* Wedding Day Emergency Alert */}
          {watch('priority') === 'wedding_day' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Wedding Day Emergency</strong> - This will be escalated
                immediately to our on-call team. Expected response time: 5
                minutes or less.
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full text-base font-medium"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Submitting Ticket...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Support Ticket
              </>
            )}
          </Button>

          {/* Auto-save indicator */}
          {isDirty && (
            <div className="text-center text-sm text-muted-foreground">
              Changes are automatically saved every 30 seconds
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
