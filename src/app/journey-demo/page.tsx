'use client';

import React from 'react';
import { JourneyCanvas } from '@/components/journey-builder';

export default function JourneyDemoPage() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="bg-card border-b px-6 py-4">
        <h1 className="text-2xl font-bold">
          Journey Builder Demo - No Auth Required
        </h1>
        <p className="text-muted-foreground">
          Test the Journey Builder with drag-and-drop functionality
        </p>
      </header>

      <div className="flex-1 overflow-hidden">
        <JourneyCanvas
          onSave={(nodes, edges) => {
            console.log('Canvas saved:', { nodes, edges });
          }}
          className="h-full"
        />
      </div>
    </div>
  );
}
