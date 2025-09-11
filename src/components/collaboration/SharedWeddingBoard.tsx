'use client';

/**
 * WS-342 Shared Wedding Board - Collaborative Planning Board
 * Team A - Frontend/UI Development - Planning Board Interface
 *
 * Collaborative kanban-style board for wedding planning ideas,
 * inspiration, and task organization
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  PlanningBoard,
  BoardSection,
  BoardItem,
  BoardType,
  Collaborator,
} from '@/types/collaboration';

// Icons
import { Plus, MoreHorizontal, Grid3X3, Calendar, Heart } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface SharedWeddingBoardProps {
  weddingId: string;
  collaborators: Collaborator[];
  onBoardUpdate: (update: any) => void;
  boardType: 'kanban' | 'timeline' | 'mood_board';
  className?: string;
}

export function SharedWeddingBoard({
  weddingId,
  collaborators,
  onBoardUpdate,
  boardType,
  className,
}: SharedWeddingBoardProps) {
  const [board, setBoard] = useState<PlanningBoard>({
    id: weddingId,
    name: 'Wedding Planning Board',
    type: BoardType.KANBAN,
    sections: [
      {
        id: 'ideas',
        name: 'Ideas',
        color: '#3B82F6',
        position: 0,
        itemIds: [],
        settings: {},
      },
      {
        id: 'planning',
        name: 'Planning',
        color: '#F59E0B',
        position: 1,
        itemIds: [],
        settings: {},
      },
      {
        id: 'booked',
        name: 'Booked',
        color: '#10B981',
        position: 2,
        itemIds: [],
        settings: {},
      },
    ],
    items: [],
    collaborators: collaborators.map((c) => c.id),
    settings: {
      allowComments: true,
      allowVoting: true,
      allowDueDates: true,
      customFields: [],
      permissions: {
        view: ['all'],
        edit: ['couple', 'planner'],
        admin: ['couple'],
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return (
    <div
      className={cn('shared-wedding-board', className)}
      data-testid="shared-wedding-board"
    >
      {/* Board Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Wedding Planning Board
        </h2>
        <p className="text-gray-600">
          Organize ideas, inspiration, and tasks collaboratively
        </p>
      </div>

      {/* Board Content */}
      {boardType === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {board.sections.map((section) => (
            <Card key={section.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle
                    className="text-lg"
                    style={{ color: section.color }}
                  >
                    {section.name}
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 min-h-[200px]">
                  {/* Board items would be rendered here */}
                  <div className="text-center text-gray-400 py-8">
                    <Heart className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No items yet</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {boardType === 'mood_board' && (
        <div className="text-center py-12">
          <Grid3X3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Mood board view coming soon</p>
        </div>
      )}
    </div>
  );
}

export default SharedWeddingBoard;
