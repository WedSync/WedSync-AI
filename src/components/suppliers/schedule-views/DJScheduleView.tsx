'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Music,
  Clock,
  MapPin,
  Volume2,
  Mic,
  CheckCircle2,
  Play,
  Pause,
  SkipForward,
  Radio,
  Headphones,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  VendorSpecificScheduleViewProps,
  DJScheduleData,
  ScheduleConfirmation,
  ScheduleChangeRequest,
} from './types';

export function DJScheduleView({
  schedule,
  vendorData,
  onConfirmSchedule,
  onRequestChange,
  onUpdateStatus,
}: VendorSpecificScheduleViewProps) {
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [currentTrack, setCurrentTrack] = useState(0);
  const [volumeSettings, setVolumeSettings] = useState<Record<string, number>>(
    {},
  );

  // Mock DJ-specific data
  const djData: DJScheduleData = vendorData?.djData || {
    playlist: [
      {
        id: 'track-1',
        songTitle: 'Prelude in C Major',
        artist: 'Bach',
        duration: 240,
        scheduledTime: '16:25',
        eventPhase: 'Pre-Ceremony',
        notes: 'Soft classical for seating',
      },
      {
        id: 'track-2',
        songTitle: 'Canon in D',
        artist: 'Pachelbel',
        duration: 300,
        scheduledTime: '16:30',
        eventPhase: 'Processional',
        notes: 'Bridal party entrance',
      },
      {
        id: 'track-3',
        songTitle: 'Here Comes the Sun',
        artist: 'The Beatles',
        duration: 185,
        scheduledTime: '16:35',
        eventPhase: 'Bridal Entrance',
        notes: "Couple's special song",
      },
      {
        id: 'track-4',
        songTitle: 'Ode to Joy',
        artist: 'Beethoven',
        duration: 240,
        scheduledTime: '17:00',
        eventPhase: 'Recessional',
        notes: 'Celebratory exit',
      },
      {
        id: 'track-5',
        songTitle: 'At Last',
        artist: 'Etta James',
        duration: 200,
        scheduledTime: '20:00',
        eventPhase: 'First Dance',
        notes: 'First dance - slow and romantic',
      },
      {
        id: 'track-6',
        songTitle: 'September',
        artist: 'Earth, Wind & Fire',
        duration: 215,
        scheduledTime: '21:30',
        eventPhase: 'Reception Dancing',
        notes: 'High energy dance floor opener',
      },
    ],
    equipmentStatus: [
      {
        item: 'Main Sound System',
        status: 'working',
        notes: 'QSC K12.2 Powered Speakers',
      },
      {
        item: 'Wireless Microphones (2)',
        status: 'working',
        notes: 'Shure SM58 - fresh batteries',
      },
      { item: 'DJ Controller', status: 'working', notes: 'Pioneer DDJ-SZ2' },
      {
        item: 'Backup Laptop',
        status: 'working',
        notes: 'MacBook Pro with Serato',
      },
      {
        item: 'LED Uplighting (8)',
        status: 'needs_setup',
        notes: 'CHAUVET DJ SlimPAR Pro W USB',
      },
      { item: 'Extension Cables', status: 'working' },
      { item: 'Power Conditioner', status: 'working' },
      { item: 'Backup Audio Interface', status: 'working' },
    ],
    volumeCues: [
      { time: '16:25', level: 30, reason: 'Pre-ceremony background' },
      { time: '16:30', level: 50, reason: 'Processional entrance' },
      { time: '16:35', level: 60, reason: 'Bridal entrance' },
      { time: '16:45', level: 20, reason: 'Ceremony vows' },
      { time: '17:00', level: 70, reason: 'Recessional celebration' },
      { time: '18:00', level: 40, reason: 'Cocktail hour ambience' },
      { time: '20:00', level: 45, reason: 'First dance' },
      { time: '21:00', level: 80, reason: 'Dance party' },
    ],
    announcements: [
      {
        time: '16:28',
        announcement: 'Please welcome the wedding party!',
        priority: 1,
      },
      {
        time: '16:33',
        announcement: 'All rise for the bride!',
        priority: 1,
      },
      {
        time: '17:15',
        announcement: 'Cocktail hour begins in the garden!',
        priority: 2,
      },
      {
        time: '19:45',
        announcement: 'Please take your seats for dinner',
        priority: 1,
      },
      {
        time: '20:00',
        announcement: 'Ladies and gentlemen, the first dance!',
        priority: 1,
      },
      {
        time: '21:30',
        announcement: 'The dance floor is now open!',
        priority: 2,
      },
    ],
  };

  const handleConfirmSchedule = () => {
    const confirmation: ScheduleConfirmation = {
      scheduleId: schedule.supplierId,
      supplierId: schedule.supplierId,
      confirmedAt: new Date(),
      status: 'confirmed',
      notes: confirmationNotes,
      conditions: [],
      signedBy: schedule.supplierName,
    };
    onConfirmSchedule(confirmation);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVolumeColor = (level: number) => {
    if (level < 30) return 'bg-blue-500';
    if (level < 60) return 'bg-green-500';
    if (level < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getEquipmentStatusColor = (status: string) => {
    switch (status) {
      case 'working':
        return 'text-green-600';
      case 'needs_setup':
        return 'text-yellow-600';
      case 'issue':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getEventPhaseColor = (phase: string) => {
    const colors = {
      'Pre-Ceremony': 'bg-blue-100 text-blue-800',
      Processional: 'bg-purple-100 text-purple-800',
      'Bridal Entrance': 'bg-pink-100 text-pink-800',
      Ceremony: 'bg-green-100 text-green-800',
      Recessional: 'bg-orange-100 text-orange-800',
      'Cocktail Hour': 'bg-cyan-100 text-cyan-800',
      'First Dance': 'bg-red-100 text-red-800',
      'Reception Dancing': 'bg-yellow-100 text-yellow-800',
    };
    return colors[phase as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Music className="h-6 w-6" />
            <div>
              <div className="text-xl font-bold">{schedule.supplierName}</div>
              <div className="text-sm font-normal text-gray-500">
                DJ & Music Schedule
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {djData.playlist.length}
              </div>
              <div className="text-sm text-gray-500">Playlist Tracks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {
                  djData.equipmentStatus.filter((eq) => eq.status === 'working')
                    .length
                }
                /{djData.equipmentStatus.length}
              </div>
              <div className="text-sm text-gray-500">Equipment Ready</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {djData.announcements.length}
              </div>
              <div className="text-sm text-gray-500">Announcements</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {djData.volumeCues.length}
              </div>
              <div className="text-sm text-gray-500">Volume Cues</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleConfirmSchedule} className="flex-1">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm DJ Schedule
            </Button>
            <Button variant="outline">
              <Music className="h-4 w-4 mr-2" />
              Export Playlist
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="playlist" className="w-full">
            <div className="px-6 pt-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="playlist">Playlist</TabsTrigger>
                <TabsTrigger value="equipment">Equipment</TabsTrigger>
                <TabsTrigger value="announcements">Announcements</TabsTrigger>
                <TabsTrigger value="volume">Volume Control</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>
            </div>

            {/* Playlist Tab */}
            <TabsContent value="playlist" className="px-6 pb-6">
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {djData.playlist.map((track, index) => (
                    <div
                      key={track.id}
                      className={cn(
                        'border rounded-lg p-4 transition-colors',
                        index === currentTrack && 'bg-blue-50 border-blue-200',
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center gap-1 mt-1">
                            <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {track.scheduledTime}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0"
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{track.songTitle}</h4>
                              <Badge
                                variant="outline"
                                className={getEventPhaseColor(track.eventPhase)}
                              >
                                {track.eventPhase}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              {track.artist} • {formatDuration(track.duration)}
                            </div>
                            {track.notes && (
                              <p className="text-sm text-gray-500 mt-2">
                                {track.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Settings className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Equipment Tab */}
            <TabsContent value="equipment" className="px-6 pb-6">
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {djData.equipmentStatus.map((equipment, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn('w-3 h-3 rounded-full', {
                              'bg-green-500': equipment.status === 'working',
                              'bg-yellow-500':
                                equipment.status === 'needs_setup',
                              'bg-red-500': equipment.status === 'issue',
                            })}
                          />
                          <div>
                            <div className="font-medium">{equipment.item}</div>
                            {equipment.notes && (
                              <div className="text-sm text-gray-500">
                                {equipment.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-sm font-medium capitalize',
                              getEquipmentStatusColor(equipment.status),
                            )}
                          >
                            {equipment.status.replace('_', ' ')}
                          </span>
                          <Button variant="outline" size="sm">
                            <Settings className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Announcements Tab */}
            <TabsContent value="announcements" className="px-6 pb-6">
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {djData.announcements.map((announcement, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Mic className="h-5 w-5 text-blue-500 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {announcement.time}
                            </div>
                            <Badge
                              variant={
                                announcement.priority === 1
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              Priority {announcement.priority}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">
                            {announcement.announcement}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Play className="h-3 w-3 mr-1" />
                          Test
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Volume Control Tab */}
            <TabsContent value="volume" className="px-6 pb-6">
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {djData.volumeCues.map((cue, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {cue.time}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Volume2 className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              {cue.reason}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>0%</span>
                                <span className="font-medium">
                                  {cue.level}%
                                </span>
                                <span>100%</span>
                              </div>
                              <Progress value={cue.level} className="h-2" />
                            </div>
                            <Button variant="outline" size="sm">
                              Set
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="px-6 pb-6">
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {schedule.scheduleItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Music className="h-5 w-5 mt-1 text-blue-500" />
                          <div className="flex-1">
                            <h4 className="font-medium">{item.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(item.startTime, 'HH:mm')} -{' '}
                                {format(item.endTime, 'HH:mm')}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {item.location}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {item.phase}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Confirmation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Confirmation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Add any notes about playlist, volume preferences, or special requests..."
              value={confirmationNotes}
              onChange={(e) => setConfirmationNotes(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline">Save Draft</Button>
              <Button onClick={handleConfirmSchedule}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm DJ Schedule
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
