'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  Copy,
  Trash2,
  Edit,
  Calendar,
  Users,
  TrendingUp,
} from 'lucide-react';

interface JourneyCanvas {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  execution_count: number;
  last_executed_at?: string;
  created_at: string;
  updated_at: string;
  canvas_data: {
    nodes: any[];
    edges: any[];
  };
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  archived: 'bg-red-100 text-red-800 border-red-200',
};

export default function JourneysPage() {
  const [journeys, setJourneys] = useState<JourneyCanvas[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchJourneys();
  }, []);

  const fetchJourneys = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/journeys');
      if (!response.ok) throw new Error('Failed to fetch journeys');
      const data = await response.json();
      setJourneys(data.canvases || []);
    } catch (error) {
      console.error('Error fetching journeys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredJourneys = journeys.filter((journey) => {
    const matchesSearch =
      journey.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      journey.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || journey.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDuplicateJourney = async (journeyId: string) => {
    const journey = journeys.find((j) => j.id === journeyId);
    if (journey) {
      try {
        const response = await fetch('/api/journeys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${journey.name} (Copy)`,
            description: journey.description,
            canvas_data: journey.canvas_data,
          }),
        });
        if (!response.ok) throw new Error('Failed to duplicate journey');
        await fetchJourneys();
      } catch (error) {
        console.error('Error duplicating journey:', error);
      }
    }
  };

  const handleDeleteJourney = async (journeyId: string) => {
    if (!confirm('Are you sure you want to archive this journey?')) return;

    try {
      const response = await fetch(`/api/journeys/${journeyId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to archive journey');
      await fetchJourneys();
    } catch (error) {
      console.error('Error archiving journey:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Client Journeys
          </h1>
          <p className="text-muted-foreground">
            Design and manage automated client experiences
          </p>
        </div>

        <Link href="/journeys/new">
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>New Journey</span>
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Journeys</p>
                <p className="text-2xl font-bold">{journeys.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Executions
                </p>
                <p className="text-2xl font-bold">
                  {journeys.reduce((sum, j) => sum + j.execution_count, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Nodes</p>
                <p className="text-2xl font-bold">
                  {journeys.reduce(
                    (sum, j) => sum + (j.canvas_data?.nodes?.length || 0),
                    0,
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Play className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Journeys</p>
                <p className="text-2xl font-bold">
                  {journeys.filter((j) => j.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search journeys..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Journey Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredJourneys.map((journey) => (
          <Card
            key={journey.id}
            className="group hover:shadow-lg transition-shadow"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">
                    {journey.name}
                  </CardTitle>
                  {journey.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {journey.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDuplicateJourney(journey.id)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDeleteJourney(journey.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Status and Metrics */}
              <div className="flex items-center justify-between">
                <Badge className={statusColors[journey.status]}>
                  {journey.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {journey.canvas_data?.nodes?.length || 0} nodes
                </span>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Executions</p>
                  <p className="font-semibold">{journey.execution_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Edges</p>
                  <p className="font-semibold">
                    {journey.canvas_data?.edges?.length || 0}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div className="text-xs text-muted-foreground">
                <p>Modified: {formatDate(journey.updated_at)}</p>
                <p>Created: {formatDate(journey.created_at)}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 pt-2">
                <Link href={`/journeys/${journey.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </Link>

                {journey.status === 'active' && (
                  <Button variant="outline" size="sm">
                    <Play className="h-3 w-3 mr-1" />
                    View
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredJourneys.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchTerm || statusFilter !== 'all'
              ? 'No journeys found'
              : 'No journeys yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first client journey to get started'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <Link href="/journeys/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Journey
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
