'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  List,
  Camera,
  Image,
  Save,
  RotateCcw,
  Clock,
  Users,
  MapPin,
  Lightbulb,
  History,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';

// Types
import { PhotoGroup } from '@/types/photo-groups';

interface NoteTemplate {
  id: string;
  name: string;
  category: 'poses' | 'lighting' | 'equipment' | 'timing' | 'location';
  content: string;
  variables?: Record<string, string>;
}

interface NotesVersion {
  id: string;
  content: string;
  timestamp: string;
  user_name: string;
  changes_summary: string;
}

interface PhotographerNotesEditorProps {
  photoGroup: PhotoGroup;
  onSave: (groupId: string, notes: string) => Promise<void>;
  onAutoSave?: (groupId: string, notes: string) => void;
  className?: string;
  readonly?: boolean;
  showTemplates?: boolean;
  collaborativeMode?: boolean;
}

const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'family-formal',
    name: 'Family Formal Poses',
    category: 'poses',
    content:
      '• Traditional family portrait with everyone facing camera\n• Generational groupings (grandparents, parents, children)\n• Consider height arrangements and natural interactions\n• Capture both formal and candid moments between poses',
  },
  {
    id: 'bridal-party',
    name: 'Bridal Party Dynamics',
    category: 'poses',
    content:
      '• Mix of serious and fun shots\n• Include walking shots and candid laughter\n• Bouquet toss practice shots\n• Individual portraits of each member\n• Group dynamics and friendships',
  },
  {
    id: 'children-tips',
    name: 'Working with Children',
    category: 'timing',
    content:
      '• Schedule during their best time of day\n• Keep sessions short (5-10 minutes max)\n• Have backup activities/toys ready\n• Capture natural play and interactions\n• Be ready for spontaneous moments',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour Lighting',
    category: 'lighting',
    content:
      '• Utilize soft, warm natural light\n• Position subjects with light source behind or to the side\n• Watch for harsh shadows on faces\n• Consider reflector for fill light\n• Take advantage of backlighting opportunities',
  },
  {
    id: 'venue-specific',
    name: 'Venue Considerations',
    category: 'location',
    content:
      '• Scout location beforehand for best spots\n• Note any lighting challenges\n• Consider background elements and distractions\n• Plan for weather contingencies\n• Respect venue rules and restrictions',
  },
  {
    id: 'equipment-list',
    name: 'Equipment Checklist',
    category: 'equipment',
    content:
      '• Primary lens recommendations: {{lens_recommendations}}\n• Backup equipment needed\n• Lighting equipment if indoor/low light\n• Extra batteries and memory cards\n• Props or accessories specific to this group',
  },
];

export function PhotographerNotesEditor({
  photoGroup,
  onSave,
  onAutoSave,
  className = '',
  readonly = false,
  showTemplates = true,
  collaborativeMode = false,
}: PhotographerNotesEditorProps) {
  // State
  const [notes, setNotes] = useState(photoGroup.photographer_notes || '');
  const [savedNotes, setSavedNotes] = useState(
    photoGroup.photographer_notes || '',
  );
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [versions, setVersions] = useState<NotesVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save functionality
  useEffect(() => {
    if (isEditing && notes !== savedNotes && onAutoSave) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        onAutoSave(photoGroup.id, notes);
        setLastSaved(new Date());
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [notes, savedNotes, isEditing, onAutoSave, photoGroup.id]);

  // Handle text formatting
  const formatText = useCallback(
    (formatType: 'bold' | 'italic' | 'list') => {
      if (!editorRef.current) return;

      const textarea = editorRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = notes.substring(start, end);

      let newText = '';
      let cursorOffset = 0;

      switch (formatType) {
        case 'bold':
          if (selectedText) {
            newText =
              notes.substring(0, start) +
              `**${selectedText}**` +
              notes.substring(end);
            cursorOffset = 2;
          } else {
            newText =
              notes.substring(0, start) + '**text**' + notes.substring(start);
            cursorOffset = 2;
          }
          break;

        case 'italic':
          if (selectedText) {
            newText =
              notes.substring(0, start) +
              `*${selectedText}*` +
              notes.substring(end);
            cursorOffset = 1;
          } else {
            newText =
              notes.substring(0, start) + '*text*' + notes.substring(start);
            cursorOffset = 1;
          }
          break;

        case 'list':
          const lines = selectedText.split('\n');
          const listItems = lines.map((line) =>
            line.trim() ? `• ${line.replace(/^[•\-*]\s*/, '')}` : line,
          );
          newText =
            notes.substring(0, start) +
            listItems.join('\n') +
            notes.substring(end);
          cursorOffset = 0;
          break;
      }

      setNotes(newText);

      // Restore cursor position
      setTimeout(() => {
        if (editorRef.current) {
          const newPosition = selectedText
            ? start + selectedText.length + cursorOffset * 2
            : start + cursorOffset;
          editorRef.current.setSelectionRange(newPosition, newPosition);
          editorRef.current.focus();
        }
      }, 0);
    },
    [notes],
  );

  // Apply template
  const applyTemplate = useCallback(
    (templateId: string) => {
      const template = NOTE_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return;

      let templateContent = template.content;

      // Replace template variables with photo group data
      if (template.variables) {
        Object.entries(template.variables).forEach(([key, defaultValue]) => {
          const placeholder = `{{${key}}}`;
          let replacement = defaultValue;

          // Custom replacements based on photo group data
          switch (key) {
            case 'lens_recommendations':
              replacement =
                photoGroup.photo_type === 'children'
                  ? '50mm f/1.8 for shallow depth of field'
                  : '24-70mm f/2.8 for versatility';
              break;
            case 'group_size':
              replacement = `${photoGroup.assignments?.length || 0} people`;
              break;
            case 'location':
              replacement = photoGroup.location || 'venue location';
              break;
          }

          templateContent = templateContent.replace(placeholder, replacement);
        });
      }

      // Add template content to existing notes
      const existingNotes = notes.trim();
      const separator = existingNotes ? '\n\n' : '';
      const newNotes = existingNotes + separator + templateContent;

      setNotes(newNotes);
      setSelectedTemplate('');
    },
    [notes, photoGroup],
  );

  // Save notes
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(photoGroup.id, notes);
      setSavedNotes(notes);
      setLastSaved(new Date());
      setIsEditing(false);

      // Add to version history
      const newVersion: NotesVersion = {
        id: Date.now().toString(),
        content: notes,
        timestamp: new Date().toISOString(),
        user_name: 'Current User', // Would come from auth context
        changes_summary: savedNotes
          ? 'Updated photographer notes'
          : 'Added initial photographer notes',
      };
      setVersions((prev) => [newVersion, ...prev]);
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setSaving(false);
    }
  }, [photoGroup.id, notes, savedNotes, onSave]);

  // Revert to saved version
  const handleRevert = useCallback(() => {
    setNotes(savedNotes);
    setIsEditing(false);
  }, [savedNotes]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(notes);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy notes:', error);
    }
  }, [notes]);

  // Load version
  const loadVersion = useCallback((version: NotesVersion) => {
    setNotes(version.content);
    setIsEditing(true);
    setShowVersions(false);
  }, []);

  // Group photo context for suggestions
  const getContextSuggestions = useCallback(() => {
    const suggestions = [];

    if (photoGroup.photo_type === 'children') {
      suggestions.push('Consider naptime and meal schedules when planning');
    }

    if (photoGroup.estimated_time_minutes > 20) {
      suggestions.push('Long session - plan breaks and variety in poses');
    }

    if (photoGroup.location) {
      suggestions.push(
        `Location-specific: Account for ${photoGroup.location} lighting and space`,
      );
    }

    if (photoGroup.assignments && photoGroup.assignments.length > 8) {
      suggestions.push(
        'Large group - consider subgroup arrangements and logistics',
      );
    }

    return suggestions;
  }, [photoGroup]);

  const contextSuggestions = getContextSuggestions();
  const hasUnsavedChanges = notes !== savedNotes;
  const wordCount = notes
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Camera className="w-5 h-5 mr-2 text-primary-600" />
              Photographer Notes: {photoGroup.name}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {photoGroup.estimated_time_minutes}min session
              </span>
              <span className="flex items-center">
                <Users className="w-3 h-3 mr-1" />
                {photoGroup.assignments?.length || 0} guests
              </span>
              {photoGroup.location && (
                <span className="flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {photoGroup.location}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-gray-500">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-600 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                Unsaved changes
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Context Suggestions */}
      {contextSuggestions.length > 0 && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
          <div className="flex items-start">
            <Lightbulb className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Smart Suggestions
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                {contextSuggestions.map((suggestion, index) => (
                  <li key={index}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        {/* Templates Sidebar */}
        {showTemplates && !readonly && (
          <div className="lg:w-80 border-b lg:border-b-0 lg:border-r border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-3">Quick Templates</h4>
            <div className="space-y-2">
              {NOTE_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template.id)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900 text-sm">
                    {template.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 capitalize">
                    {template.category}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          {!readonly && (
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => formatText('bold')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => formatText('italic')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => formatText('list')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Bullet List"
                >
                  <List className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-gray-300 mx-2" />

                <button
                  onClick={handleCopy}
                  disabled={!notes.trim()}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>

                {versions.length > 0 && (
                  <button
                    onClick={() => setShowVersions(!showVersions)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    title="Version history"
                  >
                    <History className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="text-xs text-gray-500">
                {wordCount} word{wordCount !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Text Area */}
          <div className="flex-1 p-4">
            <textarea
              ref={editorRef}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (!isEditing) setIsEditing(true);
              }}
              disabled={readonly}
              placeholder={
                readonly
                  ? 'No photographer notes yet...'
                  : 'Add detailed notes for the photographer about this photo session...\n\nTip: Include specific poses, lighting preferences, timing requirements, and any special considerations for this group.'
              }
              className="w-full h-64 resize-none border-0 focus:outline-none text-gray-900 placeholder-gray-400 leading-relaxed"
            />
          </div>

          {/* Version History */}
          {showVersions && versions.length > 0 && (
            <div className="border-t border-gray-200 p-4">
              <h5 className="font-medium text-gray-900 mb-3">
                Version History
              </h5>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => loadVersion(version)}
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {version.changes_summary}
                      </div>
                      <div className="text-xs text-gray-500">
                        {version.user_name} •{' '}
                        {new Date(version.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <History className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          {!readonly && (
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {hasUnsavedChanges && (
                  <button
                    onClick={handleRevert}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Revert
                  </button>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PhotographerNotesEditor;
