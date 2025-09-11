'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { JourneyCanvas } from '@/components/journey-builder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function NewJourneyPage() {
  const router = useRouter();
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(true);
  const [journeyName, setJourneyName] = useState('');
  const [journeyDescription, setJourneyDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [canvasData, setCanvasData] = useState<{
    nodes: any[];
    edges: any[];
  } | null>(null);

  const handleSaveCanvas = async (nodes: any[], edges: any[]) => {
    setCanvasData({ nodes, edges });

    if (!journeyName) {
      setIsNameDialogOpen(true);
      return;
    }

    await createJourney(nodes, edges);
  };

  const createJourney = async (nodes?: any[], edges?: any[]) => {
    const finalNodes = nodes ||
      canvasData?.nodes || [
        {
          id: 'start-1',
          type: 'start',
          position: { x: 100, y: 200 },
          data: { label: 'Journey Start' },
        },
      ];

    const finalEdges = edges || canvasData?.edges || [];

    setIsSaving(true);
    try {
      const response = await fetch('/api/journeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: journeyName,
          description: journeyDescription,
          canvas_data: {
            nodes: finalNodes,
            edges: finalEdges,
            viewport: { x: 0, y: 0, zoom: 1 },
            metadata: {},
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to create journey');

      const data = await response.json();
      router.push(`/journeys/${data.canvas.id}`);
    } catch (error) {
      console.error('Error creating journey:', error);
      setIsSaving(false);
    }
  };

  const handleNameSubmit = async () => {
    if (!journeyName.trim()) return;
    setIsNameDialogOpen(false);

    if (canvasData) {
      await createJourney(canvasData.nodes, canvasData.edges);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/journeys">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                {journeyName || 'New Journey'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Design your customer journey workflow
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <JourneyCanvas onSave={handleSaveCanvas} className="h-full" />
      </div>

      <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name Your Journey</DialogTitle>
            <DialogDescription>
              Give your journey a descriptive name to help identify it later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Journey Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Wedding Photography Onboarding"
                value={journeyName}
                onChange={(e) => setJourneyName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose of this journey..."
                value={journeyDescription}
                onChange={(e) => setJourneyDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNameDialogOpen(false);
                router.push('/journeys');
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleNameSubmit}
              disabled={!journeyName.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Journey
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
