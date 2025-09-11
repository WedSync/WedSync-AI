'use client';

import React, { useState } from 'react';
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
} from '@/components/ui/dialog';
import {
  Plus,
  Edit,
  Trash2,
  Gift,
  ExternalLink,
  Link2,
  GripVertical,
} from 'lucide-react';
import { RegistryLink } from '@/types/wedding-website';
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

interface SortableRegistryItemProps {
  registry: RegistryLink;
  onEdit: (registry: RegistryLink) => void;
  onDelete: (id: string) => void;
}

function SortableRegistryItem({
  registry,
  onEdit,
  onDelete,
}: SortableRegistryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: registry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all"
    >
      <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-2 hover:bg-gray-100 rounded cursor-move"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </button>
      </div>
      <div className="flex items-center gap-4 ml-8">
        {registry.logo_url ? (
          <img
            src={registry.logo_url}
            alt={registry.name}
            className="w-12 h-12 object-contain"
          />
        ) : (
          <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
            <Gift className="h-6 w-6 text-gray-400" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-medium text-lg">{registry.name}</h3>
          {registry.description && (
            <p className="text-sm text-muted-foreground">
              {registry.description}
            </p>
          )}
          <a
            href={registry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
          >
            View Registry
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => onEdit(registry)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(registry.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function RegistryLinks() {
  const [registries, setRegistries] = useState<RegistryLink[]>([
    {
      id: '1',
      website_id: 'demo',
      name: 'Amazon',
      url: 'https://www.amazon.com/wedding-registry',
      description: 'Our main registry for home essentials',
      logo_url:
        'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
      order_index: 0,
    },
    {
      id: '2',
      website_id: 'demo',
      name: 'Target',
      url: 'https://www.target.com/gift-registry',
      description: 'Kitchen and bedroom items',
      logo_url:
        'https://upload.wikimedia.org/wikipedia/commons/c/c5/Target_Corporation_logo.svg',
      order_index: 1,
    },
    {
      id: '3',
      website_id: 'demo',
      name: 'Honeymoon Fund',
      url: 'https://www.honeyfund.com',
      description: 'Help us create memories on our honeymoon',
      order_index: 2,
    },
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRegistry, setEditingRegistry] = useState<RegistryLink | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    logo_url: '',
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
      setRegistries((items) => {
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
      name: '',
      url: '',
      description: '',
      logo_url: '',
    });
    setEditingRegistry(null);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (registry: RegistryLink) => {
    setFormData({
      name: registry.name,
      url: registry.url,
      description: registry.description || '',
      logo_url: registry.logo_url || '',
    });
    setEditingRegistry(registry);
    setIsAddDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.url) {
        toast.error('Please provide a name and URL');
        return;
      }

      if (editingRegistry) {
        setRegistries(
          registries.map((r) =>
            r.id === editingRegistry.id
              ? {
                  ...r,
                  name: formData.name,
                  url: formData.url,
                  description: formData.description || undefined,
                  logo_url: formData.logo_url || undefined,
                }
              : r,
          ),
        );
        toast.success('Registry updated successfully');
      } else {
        const newRegistry: RegistryLink = {
          id: Date.now().toString(),
          website_id: 'demo',
          name: formData.name,
          url: formData.url,
          description: formData.description || undefined,
          logo_url: formData.logo_url || undefined,
          order_index: registries.length,
        };
        setRegistries([...registries, newRegistry]);
        toast.success('Registry added successfully');
      }
      setIsAddDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save registry');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setRegistries(registries.filter((r) => r.id !== id));
      toast.success('Registry removed successfully');
    } catch (error) {
      toast.error('Failed to remove registry');
    }
  };

  const popularRegistries = [
    {
      name: 'Amazon',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
    },
    {
      name: 'Target',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Target_Corporation_logo.svg',
    },
    { name: 'Bed Bath & Beyond', logo: '' },
    { name: 'Williams Sonoma', logo: '' },
    { name: 'Crate & Barrel', logo: '' },
    { name: 'Zola', logo: '' },
    { name: 'The Knot', logo: '' },
    { name: 'Honeyfund', logo: '' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Gift Registry
          </span>
          <Button onClick={handleAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Registry
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Your presence is the greatest gift, but if you wish to honor us with
            a gift, we have registered at the following stores:
          </p>
        </div>

        {registries.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No registries added yet</p>
            <Button onClick={handleAdd} variant="outline">
              Add Your First Registry
            </Button>
            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-3">
                Popular Registries:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {popularRegistries.map((reg) => (
                  <Button
                    key={reg.name}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        name: reg.name,
                        url: '',
                        description: '',
                        logo_url: reg.logo,
                      });
                      setEditingRegistry(null);
                      setIsAddDialogOpen(true);
                    }}
                  >
                    {reg.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={registries.map((r) => r.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {registries.map((registry) => (
                  <SortableRegistryItem
                    key={registry.id}
                    registry={registry}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingRegistry ? 'Edit Registry' : 'Add Gift Registry'}
              </DialogTitle>
              <DialogDescription>
                Add details about your gift registry
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="registry-name">Store Name *</Label>
                <Input
                  id="registry-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Amazon, Target, Zola"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registry-url">Registry URL *</Label>
                <Input
                  id="registry-url"
                  type="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder="https://www.example.com/registry"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registry-description">
                  Description (Optional)
                </Label>
                <Textarea
                  id="registry-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="e.g., Home essentials and kitchen items"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registry-logo">Logo URL (Optional)</Label>
                <Input
                  id="registry-logo"
                  value={formData.logo_url}
                  onChange={(e) =>
                    setFormData({ ...formData, logo_url: e.target.value })
                  }
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">
                  Add a logo to make your registry more recognizable
                </p>
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
                {editingRegistry ? 'Update' : 'Add'} Registry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
