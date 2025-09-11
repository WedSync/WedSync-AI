/**
 * Music Dashboard Component
 * Feature ID: WS-128
 * Main dashboard for managing wedding music, playlists, and AI recommendations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Music,
  PlayCircle,
  PauseCircle,
  Plus,
  Search,
  Sparkles,
  Users,
  Clock,
  Heart,
} from 'lucide-react';
import type {
  MusicTrack,
  MusicPlaylist,
  MusicRecommendation,
  GuestMusicRequest,
} from '@/types/music';

interface MusicDashboardProps {
  clientId: string;
}

export default function MusicDashboard({ clientId }: MusicDashboardProps) {
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [recommendations, setRecommendations] = useState<MusicRecommendation[]>(
    [],
  );
  const [guestRequests, setGuestRequests] = useState<GuestMusicRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('playlists');

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [clientId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [playlistsRes, tracksRes, recommendationsRes] = await Promise.all([
        fetch(`/api/music/playlists?client_id=${clientId}`),
        fetch(`/api/music?limit=50`),
        fetch(`/api/music/recommendations?client_id=${clientId}`),
      ]);

      const playlistsData = await playlistsRes.json();
      const tracksData = await tracksRes.json();
      const recommendationsData = await recommendationsRes.json();

      setPlaylists(playlistsData.playlists || []);
      setTracks(tracksData.tracks || []);
      setRecommendations(recommendationsData.recommendations || []);

      // Fetch guest requests for playlists with requests enabled
      const playlistsWithRequests = playlistsData.playlists?.filter(
        (p: MusicPlaylist) => p.guest_requests_enabled,
      );

      if (playlistsWithRequests?.length > 0) {
        const requestsPromises = playlistsWithRequests.map(
          (playlist: MusicPlaylist) =>
            fetch(`/api/music/guest-requests?playlist_id=${playlist.id}`),
        );

        const requestsResponses = await Promise.all(requestsPromises);
        const allRequests = await Promise.all(
          requestsResponses.map((res) => res.json()),
        );

        const flatRequests = allRequests.flatMap((data) => data.requests || []);
        setGuestRequests(flatRequests);
      }
    } catch (error) {
      console.error('Failed to fetch music data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIRecommendations = async () => {
    try {
      const response = await fetch('/api/music/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          recommendation_type: 'new_playlist',
          context: {
            wedding_date: new Date().toISOString().split('T')[0],
            guest_count: 150,
            venue_type: 'indoor',
          },
          limit: 15,
        }),
      });

      if (response.ok) {
        await fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    }
  };

  const createNewPlaylist = async () => {
    try {
      const response = await fetch('/api/music/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Wedding Playlist',
          client_id: clientId,
          playlist_type: 'dancing',
          wedding_phase: ['dancing'],
          auto_generate: true,
          generation_criteria: {
            mood_preference: ['upbeat', 'celebratory'],
            energy_progression: 'gradual_buildup',
            avoid_explicit: true,
          },
        }),
      });

      if (response.ok) {
        await fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to create playlist:', error);
    }
  };

  const filteredTracks = tracks.filter(
    (track) =>
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const pendingGuestRequests = guestRequests.filter(
    (req) => req.status === 'pending',
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Music className="h-8 w-8" />
            Wedding Music
          </h1>
          <p className="text-muted-foreground">
            AI-powered music management for your perfect wedding day
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={generateAIRecommendations} className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Recommendations
          </Button>
          <Button onClick={createNewPlaylist} className="gap-2">
            <Plus className="h-4 w-4" />
            New Playlist
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Music className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Playlists
                </p>
                <p className="text-2xl font-bold">{playlists.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <PlayCircle className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Tracks
                </p>
                <p className="text-2xl font-bold">{tracks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">
                  AI Suggestions
                </p>
                <p className="text-2xl font-bold">{recommendations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Guest Requests
                </p>
                <p className="text-2xl font-bold">
                  {pendingGuestRequests.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="playlists">Playlists</TabsTrigger>
          <TabsTrigger value="tracks">Music Library</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
          <TabsTrigger value="requests">Guest Requests</TabsTrigger>
        </TabsList>

        {/* Playlists Tab */}
        <TabsContent value="playlists" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((playlist) => (
              <Card
                key={playlist.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{playlist.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {playlist.total_tracks} tracks •{' '}
                        {Math.floor(
                          (playlist.total_duration_seconds || 0) / 60,
                        )}{' '}
                        min
                      </p>
                    </div>
                    <Badge variant="secondary">{playlist.playlist_type}</Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Updated{' '}
                      {new Date(playlist.updated_at).toLocaleDateString()}
                    </span>
                  </div>

                  {playlist.guest_requests_enabled && (
                    <div className="mt-2">
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        Guest Requests
                      </Badge>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" className="flex-1">
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Play
                    </Button>
                    <Button size="sm" variant="ghost">
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Music Library Tab */}
        <TabsContent value="tracks" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredTracks.map((track) => (
              <Card key={track.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button size="sm" variant="ghost">
                      <PlayCircle className="h-4 w-4" />
                    </Button>
                    <div>
                      <h4 className="font-medium">{track.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      <Badge variant="secondary">{track.mood}</Badge>
                      <Badge variant="outline">
                        Energy: {track.energy_level}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {Math.floor(track.duration_seconds / 60)}:
                      {(track.duration_seconds % 60)
                        .toString()
                        .padStart(2, '0')}
                    </div>
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* AI Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.map((recommendation) => (
            <Card key={recommendation.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    {recommendation.recommendation_type.replace('_', ' ')}{' '}
                    Recommendations
                  </CardTitle>
                  <Badge variant="secondary">
                    {Math.round(recommendation.confidence_score * 100)}%
                    confident
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {recommendation.reasoning}
                </p>

                <div className="space-y-2">
                  {recommendation.recommended_tracks
                    .slice(0, 5)
                    .map((recTrack) => (
                      <div
                        key={recTrack.track_id}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <div className="flex items-center gap-2">
                          <PlayCircle className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Track Recommendation</p>
                            <p className="text-sm text-muted-foreground">
                              {recTrack.reason}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {Math.round(recTrack.confidence_score * 100)}%
                          </Badge>
                          <Button size="sm">Add</Button>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button>Accept All</Button>
                  <Button variant="outline">Customize</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Guest Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {pendingGuestRequests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">
                      "{request.track_title}" by {request.artist_name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Requested by {request.guest_name}
                      {request.special_message && (
                        <span> • "{request.special_message}"</span>
                      )}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Heart className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost">
                      Decline
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
