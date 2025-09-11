'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button-untitled';
import { Card } from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Plus,
  Edit,
  Save,
  X,
  Trash2,
  Clock,
  User,
  Lock,
  Eye,
  EyeOff,
  Search,
  Filter,
  Tag,
} from 'lucide-react';
import { format } from 'date-fns';
import { useRBAC } from '@/lib/security/rbac-system';
import { PERMISSIONS } from '@/lib/security/rbac-system';

interface Note {
  id: string;
  content: string;
  note_type: 'client' | 'internal' | 'follow_up' | 'meeting' | 'important';
  visibility: 'public' | 'internal' | 'private';
  tags?: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_name: string;
  updated_by?: string;
  updated_by_name?: string;
  is_pinned?: boolean;
  follow_up_date?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

interface NotesSectionProps {
  clientId: string;
  notes: Note[];
  onNoteAdd?: (note: Note) => void;
  onNoteUpdate?: (note: Note) => void;
  onNoteDelete?: (noteId: string) => void;
  currentUserId?: string;
  currentUserName?: string;
}

const noteTypeConfig = {
  client: {
    label: 'Client Note',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: MessageCircle,
  },
  internal: {
    label: 'Internal Note',
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: Lock,
  },
  follow_up: {
    label: 'Follow-up',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
  },
  meeting: {
    label: 'Meeting Note',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: User,
  },
  important: {
    label: 'Important',
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: Tag,
  },
};

const priorityConfig = {
  low: { label: 'Low', color: 'text-gray-500 bg-gray-100 border-gray-200' },
  medium: {
    label: 'Medium',
    color: 'text-blue-600 bg-blue-100 border-blue-200',
  },
  high: {
    label: 'High',
    color: 'text-amber-600 bg-amber-100 border-amber-200',
  },
  urgent: { label: 'Urgent', color: 'text-red-600 bg-red-100 border-red-200' },
};

export default function NotesSection({
  clientId,
  notes,
  onNoteAdd,
  onNoteUpdate,
  onNoteDelete,
  currentUserId,
  currentUserName,
}: NotesSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<Note['note_type']>('client');
  const [newNoteVisibility, setNewNoteVisibility] =
    useState<Note['visibility']>('public');
  const [newNotePriority, setNewNotePriority] =
    useState<Note['priority']>('medium');
  const [newNoteTags, setNewNoteTags] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterVisibility, setFilterVisibility] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { hasPermission } = useRBAC();
  const [canAddNote, setCanAddNote] = useState(false);
  const [canEditNote, setCanEditNote] = useState(false);
  const [canDeleteNote, setCanDeleteNote] = useState(false);
  const [canViewInternal, setCanViewInternal] = useState(false);

  // Check permissions
  useEffect(() => {
    const checkPermissions = async () => {
      if (currentUserId) {
        const hasAddPermission = await hasPermission(
          currentUserId,
          PERMISSIONS.WEDDING_EDIT,
        );
        const hasEditPermission = await hasPermission(
          currentUserId,
          PERMISSIONS.WEDDING_EDIT,
        );
        const hasDeletePermission = await hasPermission(
          currentUserId,
          PERMISSIONS.WEDDING_DELETE,
        );
        const hasInternalAccess = await hasPermission(
          currentUserId,
          PERMISSIONS.SETTINGS_VIEW,
        );

        setCanAddNote(hasAddPermission);
        setCanEditNote(hasEditPermission);
        setCanDeleteNote(hasDeletePermission);
        setCanViewInternal(hasInternalAccess);
      }
    };
    checkPermissions();
  }, [currentUserId, hasPermission]);

  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !canAddNote) return;

    try {
      const noteData = {
        client_id: clientId,
        content: newNoteContent.trim(),
        note_type: newNoteType,
        visibility: newNoteVisibility,
        priority: newNotePriority,
        tags: newNoteTags
          ? newNoteTags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        follow_up_date: followUpDate || null,
      };

      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token':
            document.cookie
              .split('; ')
              .find((row) => row.startsWith('csrf-token='))
              ?.split('=')[1] || '',
        },
        body: JSON.stringify(noteData),
      });

      if (!response.ok) {
        throw new Error('Failed to add note');
      }

      const newNote = await response.json();
      onNoteAdd?.(newNote);

      // Reset form
      setNewNoteContent('');
      setNewNoteType('client');
      setNewNoteVisibility('public');
      setNewNotePriority('medium');
      setNewNoteTags('');
      setFollowUpDate('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note. Please try again.');
    }
  };

  const handleUpdateNote = async (noteId: string, content: string) => {
    if (!canEditNote) return;

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token':
            document.cookie
              .split('; ')
              .find((row) => row.startsWith('csrf-token='))
              ?.split('=')[1] || '',
        },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to update note');
      }

      const updatedNote = await response.json();
      onNoteUpdate?.(updatedNote);
      setEditingNote(null);
    } catch (error) {
      console.error('Error updating note:', error);
      alert('Failed to update note. Please try again.');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!canDeleteNote) return;

    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token':
            document.cookie
              .split('; ')
              .find((row) => row.startsWith('csrf-token='))
              ?.split('=')[1] || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      onNoteDelete?.(noteId);
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const toggleNotePinned = async (noteId: string, isPinned: boolean) => {
    if (!canEditNote) return;

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token':
            document.cookie
              .split('; ')
              .find((row) => row.startsWith('csrf-token='))
              ?.split('=')[1] || '',
        },
        body: JSON.stringify({ is_pinned: !isPinned }),
      });

      if (!response.ok) {
        throw new Error('Failed to update note');
      }

      const updatedNote = await response.json();
      onNoteUpdate?.(updatedNote);
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  // Filter notes based on search and filters
  const filteredNotes = notes.filter((note) => {
    // Filter out internal notes if user doesn't have permission
    if (note.visibility === 'internal' && !canViewInternal) return false;
    if (note.visibility === 'private' && note.created_by !== currentUserId)
      return false;

    const matchesSearch =
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.created_by_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.tags &&
        note.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        ));

    const matchesType = filterType === 'all' || note.note_type === filterType;
    const matchesVisibility =
      filterVisibility === 'all' || note.visibility === filterVisibility;

    return matchesSearch && matchesType && matchesVisibility;
  });

  // Sort notes: pinned first, then by date
  const sortedNotes = filteredNotes.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-4" data-testid="notes-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
          <p className="text-sm text-gray-500">
            {notes.length} note{notes.length !== 1 ? 's' : ''}
          </p>
        </div>

        {canAddNote && (
          <Button
            onClick={() => setShowAddForm(true)}
            className="gap-2"
            disabled={showAddForm}
          >
            <Plus className="w-4 h-4" />
            Add Note
          </Button>
        )}
      </div>

      {/* Add Note Form */}
      {showAddForm && (
        <Card className="p-4 border border-blue-200 bg-blue-50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-blue-900">Add New Note</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="text-blue-700 border-blue-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={newNoteType}
                  onChange={(e) =>
                    setNewNoteType(e.target.value as Note['note_type'])
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {Object.entries(noteTypeConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visibility
                </label>
                <select
                  value={newNoteVisibility}
                  onChange={(e) =>
                    setNewNoteVisibility(e.target.value as Note['visibility'])
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="public">Public</option>
                  {canViewInternal && (
                    <option value="internal">Internal Only</option>
                  )}
                  <option value="private">Private</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={newNotePriority}
                  onChange={(e) =>
                    setNewNotePriority(e.target.value as Note['priority'])
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newNoteTags}
                  onChange={(e) => setNewNoteTags(e.target.value)}
                  placeholder="e.g., urgent, venue, catering"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {newNoteType === 'follow_up' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note Content
              </label>
              <textarea
                ref={textareaRef}
                value={newNoteContent}
                onChange={(e) => {
                  setNewNoteContent(e.target.value);
                  autoResizeTextarea(e.target);
                }}
                placeholder="Enter your note here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[100px] resize-none"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="text-gray-700 border-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddNote}
                disabled={!newNoteContent.trim()}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                Save Note
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      {showFilters && (
        <Card className="p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Types</option>
                {Object.entries(noteTypeConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <select
                value={filterVisibility}
                onChange={(e) => setFilterVisibility(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Visibility</option>
                <option value="public">Public</option>
                {canViewInternal && <option value="internal">Internal</option>}
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Notes List */}
      <div className="space-y-3">
        {sortedNotes.length === 0 ? (
          <Card className="p-8 text-center border border-gray-200">
            <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No notes found
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || filterType !== 'all' || filterVisibility !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Add your first note to get started'}
            </p>
            {canAddNote && !showAddForm && (
              <Button onClick={() => setShowAddForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add First Note
              </Button>
            )}
          </Card>
        ) : (
          sortedNotes.map((note) => {
            const typeConfig = noteTypeConfig[note.note_type];
            const TypeIcon = typeConfig.icon;
            const isEditing = editingNote === note.id;

            return (
              <Card
                key={note.id}
                className={`p-4 border transition-all duration-200 ${
                  note.is_pinned
                    ? 'border-amber-200 bg-amber-50/30 ring-2 ring-amber-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Note Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="w-4 h-4 text-gray-500" />
                      <Badge className={`text-xs ${typeConfig.color} border`}>
                        {typeConfig.label}
                      </Badge>

                      {note.visibility === 'internal' && (
                        <Badge className="text-xs bg-gray-100 text-gray-600 border-gray-200">
                          <Lock className="w-3 h-3 mr-1" />
                          Internal
                        </Badge>
                      )}

                      {note.visibility === 'private' && (
                        <Badge className="text-xs bg-yellow-100 text-yellow-600 border-yellow-200">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Private
                        </Badge>
                      )}

                      {note.priority && note.priority !== 'medium' && (
                        <Badge
                          className={`text-xs border ${priorityConfig[note.priority].color}`}
                        >
                          {priorityConfig[note.priority].label}
                        </Badge>
                      )}

                      {note.is_pinned && (
                        <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                          📌 Pinned
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {canEditNote && note.created_by === currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toggleNotePinned(note.id, note.is_pinned || false)
                          }
                          className="text-amber-600 hover:text-amber-700"
                          title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                        >
                          📌
                        </Button>
                      )}

                      {canEditNote && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingNote(note.id)}
                          disabled={isEditing}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}

                      {canDeleteNote && note.created_by === currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Note Content */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        defaultValue={note.content}
                        onInput={(e) => autoResizeTextarea(e.target)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[100px] resize-none"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingNote(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement
                              ?.previousElementSibling as HTMLTextAreaElement;
                            if (textarea) {
                              handleUpdateNote(note.id, textarea.value);
                            }
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </div>
                  )}

                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Follow-up Date */}
                  {note.follow_up_date && (
                    <div className="flex items-center gap-1 text-sm text-amber-600">
                      <Clock className="w-4 h-4" />
                      Follow-up:{' '}
                      {format(new Date(note.follow_up_date), 'MMM d, yyyy')}
                    </div>
                  )}

                  {/* Note Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <span>
                        {format(
                          new Date(note.created_at),
                          'MMM d, yyyy h:mm a',
                        )}
                      </span>
                      <span>by {note.created_by_name}</span>
                      {note.updated_at !== note.created_at && (
                        <span className="text-gray-400">
                          (edited{' '}
                          {format(new Date(note.updated_at), 'MMM d, h:mm a')})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
