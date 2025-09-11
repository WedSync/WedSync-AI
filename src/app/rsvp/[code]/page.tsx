'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Removed Radix RadioGroup in favor of native HTML radio inputs
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  MapPin,
  Users,
  Music,
  Utensils,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface RSVPPageProps {
  params: {
    code: string;
  };
}

interface EventDetails {
  id: string;
  event_name: string;
  event_date: string;
  event_time?: string;
  venue_name?: string;
  venue_address?: string;
  allow_plus_ones: boolean;
  require_meal_selection: boolean;
  require_song_requests: boolean;
  custom_message?: string;
  max_party_size: number;
}

interface GuestDetail {
  guest_name: string;
  is_primary: boolean;
  meal_preference?: string;
  dietary_restrictions: string[];
  allergies: string[];
  song_request?: string;
  age_group?: string;
}

export default function RSVPPage({ params }: RSVPPageProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [responseStatus, setResponseStatus] = useState<
    'attending' | 'not_attending' | 'maybe'
  >('attending');
  const [partySize, setPartySize] = useState(1);
  const [guests, setGuests] = useState<GuestDetail[]>([
    {
      guest_name: '',
      is_primary: true,
      dietary_restrictions: [],
      allergies: [],
      age_group: 'adult',
    },
  ]);
  const [notes, setNotes] = useState('');
  const [mealOptions, setMealOptions] = useState<any[]>([]);
  const [customQuestions, setCustomQuestions] = useState<any[]>([]);
  const [customResponses, setCustomResponses] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchEventDetails();
  }, [params.code]);

  const fetchEventDetails = async () => {
    try {
      // This would be a public endpoint that doesn't require auth
      const response = await fetch(
        `/api/rsvp/public/${params.code.toUpperCase()}`,
      );

      if (response.ok) {
        const data = await response.json();
        setEvent(data.event);
        setInvitation(data.invitation);
        setMealOptions(data.meal_options || []);
        setCustomQuestions(data.custom_questions || []);

        // Initialize guests array with primary guest
        setGuests([
          {
            guest_name: data.invitation.guest_name,
            is_primary: true,
            dietary_restrictions: [],
            allergies: [],
            age_group: 'adult',
          },
        ]);
      } else {
        toast({
          title: 'Invalid Code',
          description: 'The invitation code is not valid or has expired.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      toast({
        title: 'Error',
        description: 'Failed to load event details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePartySizeChange = (size: string) => {
    const newSize = parseInt(size);
    setPartySize(newSize);

    // Adjust guests array
    const newGuests = [...guests];
    if (newSize > guests.length) {
      // Add new guests
      for (let i = guests.length; i < newSize; i++) {
        newGuests.push({
          guest_name: '',
          is_primary: false,
          dietary_restrictions: [],
          allergies: [],
          age_group: 'adult',
        });
      }
    } else {
      // Remove extra guests
      newGuests.splice(newSize);
    }
    setGuests(newGuests);
  };

  const updateGuest = (index: number, field: string, value: any) => {
    const newGuests = [...guests];
    newGuests[index] = {
      ...newGuests[index],
      [field]: value,
    };
    setGuests(newGuests);
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      const payload = {
        invitation_code: params.code.toUpperCase(),
        response_status: responseStatus,
        party_size: responseStatus === 'attending' ? partySize : 0,
        notes,
        guests:
          responseStatus === 'attending'
            ? guests.filter((g) => g.guest_name)
            : [],
        custom_responses: Object.entries(customResponses).map(
          ([questionId, answer]) => ({
            question_id: questionId,
            answer_text:
              typeof answer === 'string' ? answer : JSON.stringify(answer),
          }),
        ),
      };

      const response = await fetch('/api/rsvp/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitted(true);
        toast({
          title: 'RSVP Submitted!',
          description: 'Thank you for your response.',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Submission Failed',
          description:
            error.error || 'Failed to submit RSVP. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit RSVP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!event || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
              <p className="text-muted-foreground">
                This invitation code is not valid or has expired.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
              <p className="text-lg mb-4">Your RSVP has been received.</p>
              {responseStatus === 'attending' && (
                <p className="text-muted-foreground">
                  We look forward to celebrating with you!
                </p>
              )}
              {event.thank_you_message && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm">{event.thank_you_message}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">
              {event.event_name}
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              You're invited! Please let us know if you can attend.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Event Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <span className="font-medium">
                  {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
                </span>
                {event.event_time && (
                  <span className="text-muted-foreground">
                    at {event.event_time}
                  </span>
                )}
              </div>

              {event.venue_name && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  <span>{event.venue_name}</span>
                </div>
              )}

              {event.venue_address && (
                <div className="ml-7 text-sm text-muted-foreground">
                  {event.venue_address}
                </div>
              )}
            </div>

            {/* Custom Message */}
            {event.custom_message && (
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm">{event.custom_message}</p>
              </div>
            )}

            {/* RSVP Response */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">
                Will you be attending?
              </Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="responseStatus"
                    value="attending"
                    id="attending"
                    checked={responseStatus === 'attending'}
                    onChange={(e) => setResponseStatus(e.target.value)}
                    className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <Label htmlFor="attending">Yes, I'll be there!</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="responseStatus"
                    value="not_attending"
                    id="not_attending"
                    checked={responseStatus === 'not_attending'}
                    onChange={(e) => setResponseStatus(e.target.value)}
                    className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <Label htmlFor="not_attending">Sorry, can't make it</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="responseStatus"
                    value="maybe"
                    id="maybe"
                    checked={responseStatus === 'maybe'}
                    onChange={(e) => setResponseStatus(e.target.value)}
                    className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <Label htmlFor="maybe">Not sure yet</Label>
                </div>
              </div>
            </div>

            {/* Party Details (only if attending) */}
            {responseStatus === 'attending' && (
              <>
                {/* Party Size */}
                <div className="space-y-2">
                  <Label htmlFor="party-size">Number of Guests</Label>
                  <Select
                    value={partySize.toString()}
                    onValueChange={handlePartySizeChange}
                  >
                    <SelectTrigger id="party-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        { length: invitation.max_party_size },
                        (_, i) => i + 1,
                      ).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? 'Guest' : 'Guests'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Guest Details */}
                {guests.map((guest, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {guest.is_primary
                          ? 'Your Details'
                          : `Guest ${index + 1}`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor={`name-${index}`}>Name</Label>
                        <Input
                          id={`name-${index}`}
                          value={guest.guest_name}
                          onChange={(e) =>
                            updateGuest(index, 'guest_name', e.target.value)
                          }
                          placeholder="Full name"
                        />
                      </div>

                      {event.require_meal_selection &&
                        mealOptions.length > 0 && (
                          <div>
                            <Label htmlFor={`meal-${index}`}>
                              Meal Preference
                            </Label>
                            <Select
                              value={guest.meal_preference}
                              onValueChange={(value) =>
                                updateGuest(index, 'meal_preference', value)
                              }
                            >
                              <SelectTrigger id={`meal-${index}`}>
                                <SelectValue placeholder="Select a meal" />
                              </SelectTrigger>
                              <SelectContent>
                                {mealOptions.map((option) => (
                                  <SelectItem
                                    key={option.id}
                                    value={option.meal_name}
                                  >
                                    {option.meal_name}
                                    {option.meal_description && (
                                      <span className="text-sm text-muted-foreground ml-2">
                                        - {option.meal_description}
                                      </span>
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                      <div>
                        <Label>Dietary Restrictions</Label>
                        <div className="space-y-2 mt-2">
                          {[
                            'Vegetarian',
                            'Vegan',
                            'Gluten-Free',
                            'Dairy-Free',
                            'Nut-Free',
                          ].map((restriction) => (
                            <div
                              key={restriction}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`${restriction}-${index}`}
                                checked={guest.dietary_restrictions.includes(
                                  restriction,
                                )}
                                onCheckedChange={(checked) => {
                                  const newRestrictions = checked
                                    ? [
                                        ...guest.dietary_restrictions,
                                        restriction,
                                      ]
                                    : guest.dietary_restrictions.filter(
                                        (r) => r !== restriction,
                                      );
                                  updateGuest(
                                    index,
                                    'dietary_restrictions',
                                    newRestrictions,
                                  );
                                }}
                              />
                              <Label htmlFor={`${restriction}-${index}`}>
                                {restriction}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {event.require_song_requests && (
                        <div>
                          <Label htmlFor={`song-${index}`}>
                            <Music className="inline h-4 w-4 mr-1" />
                            Song Request
                          </Label>
                          <Input
                            id={`song-${index}`}
                            value={guest.song_request || ''}
                            onChange={(e) =>
                              updateGuest(index, 'song_request', e.target.value)
                            }
                            placeholder="Song title and artist"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Custom Questions */}
                {customQuestions.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Additional Questions</h3>
                    {customQuestions.map((question) => (
                      <div key={question.id}>
                        <Label>{question.question_text}</Label>
                        {question.question_type === 'text' && (
                          <Input
                            value={customResponses[question.id] || ''}
                            onChange={(e) =>
                              setCustomResponses({
                                ...customResponses,
                                [question.id]: e.target.value,
                              })
                            }
                          />
                        )}
                        {question.question_type === 'multiple_choice' && (
                          <RadioGroup
                            value={customResponses[question.id] || ''}
                            onValueChange={(value) =>
                              setCustomResponses({
                                ...customResponses,
                                [question.id]: value,
                              })
                            }
                          >
                            {question.options?.map((option: string) => (
                              <div
                                key={option}
                                className="flex items-center space-x-2"
                              >
                                <RadioGroupItem
                                  value={option}
                                  id={`${question.id}-${option}`}
                                />
                                <Label htmlFor={`${question.id}-${option}`}>
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Comments (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or messages..."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? 'Submitting...' : 'Submit RSVP'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
