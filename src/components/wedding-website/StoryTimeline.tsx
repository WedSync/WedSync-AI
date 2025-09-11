'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Heart,
  Image as ImageIcon,
  GripVertical,
} from 'lucide-react';
import { WeddingStory } from '@/types/wedding-website';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface StoryItemProps {
  story: WeddingStory;
  onEdit: (story: WeddingStory) => void;
  onDelete: (id: string) => void;
}

function SortableStoryItem({ story, onEdit, onDelete }: StoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: story.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-2 hover:bg-gray-100 rounded cursor-move"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </button>
      </div>
      <div className="ml-8 flex items-start space-x-4">
        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Heart className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-lg">{story.title}</h3>
              {story.date && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(story.date), 'MMMM d, yyyy')}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => onEdit(story)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(story.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-gray-600 whitespace-pre-wrap">{story.content}</p>
          {story.image_url && (
            <div className="mt-3">
              <img
                src={story.image_url}
                alt={story.title}
                className="rounded-lg max-h-48 object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StoryTimeline() {
  const [stories, setStories] = useState<WeddingStory[]>([
    {
      id: '1',
      website_id: 'demo',
      title: 'How We Met',
      content:
        'We first met at a coffee shop in downtown. It was a rainy Tuesday morning, and we both reached for the last blueberry muffin...',
      date: new Date('2020-06-15'),
      order_index: 0,
    },
    {
      id: '2',
      website_id: 'demo',
      title: 'First Date',
      content:
        'Our first official date was at the local Italian restaurant. We talked for hours and closed down the place...',
      date: new Date('2020-07-01'),
      order_index: 1,
    },
    {
      id: '3',
      website_id: 'demo',
      title: 'The Proposal',
      content:
        'On a beautiful sunset at our favorite beach, surrounded by rose petals and candles, the question was popped...',
      date: new Date('2023-12-24'),
      order_index: 2,
    },
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<WeddingStory | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    date: '',
    image_url: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setStories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({
          ...item,
          order_index: index,
        }));
      });
    }
  };

  const handleAdd = () => {
    setFormData({
      title: '',
      content: '',
      date: '',
      image_url: '',
    });
    setEditingStory(null);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (story: WeddingStory) => {
    setFormData({
      title: story.title,
      content: story.content,
      date: story.date ? format(new Date(story.date), 'yyyy-MM-dd') : '',
      image_url: story.image_url || '',
    });
    setEditingStory(story);
    setIsAddDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingStory) {
        setStories(
          stories.map((s) =>
            s.id === editingStory.id
              ? {
                  ...s,
                  title: formData.title,
                  content: formData.content,
                  date: formData.date ? new Date(formData.date) : undefined,
                  image_url: formData.image_url || undefined,
                }
              : s,
          ),
        );
        toast.success('Story updated successfully');
      } else {
        const newStory: WeddingStory = {
          id: Date.now().toString(),
          website_id: 'demo',
          title: formData.title,
          content: formData.content,
          date: formData.date ? new Date(formData.date) : undefined,
          image_url: formData.image_url || undefined,
          order_index: stories.length,
        };
        setStories([...stories, newStory]);
        toast.success('Story added successfully');
      }
      setIsAddDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save story');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setStories(stories.filter((s) => s.id !== id));
      toast.success('Story deleted successfully');
    } catch (error) {
      toast.error('Failed to delete story');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Our Love Story Timeline
          <Button onClick={handleAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Story
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={stories.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-6">
              {stories.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No stories added yet</p>
                  <Button onClick={handleAdd} variant="outline">
                    Add Your First Story
                  </Button>
                </div>
              ) : (
                stories.map((story) => (
                  <SortableStoryItem
                    key={story.id}
                    story={story}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingStory ? 'Edit Story' : 'Add New Story'}
              </DialogTitle>
              <DialogDescription>
                Share a special moment from your journey together
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="story-title">Title</Label>
                <Input
                  id="story-title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., How We Met"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="story-date">Date (Optional)</Label>
                <Input
                  id="story-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="story-content">Story</Label>
                <Textarea
                  id="story-content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Tell your story..."
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="story-image">Image URL (Optional)</Label>
                <Input
                  id="story-image"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingStory ? 'Update' : 'Add'} Story
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
