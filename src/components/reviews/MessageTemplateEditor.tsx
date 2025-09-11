'use client';

import { useState, useRef, useEffect } from 'react';
import { UserIcon, CalendarIcon, MapPinIcon, SparklesIcon } from 'lucide-react';

interface MessageTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  clientName?: string;
  weddingDate?: string;
  venue?: string;
}

interface MergeField {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  placeholder: string;
}

export function MessageTemplateEditor({
  value,
  onChange,
  clientName = 'Emma & Mike',
  weddingDate = 'June 15th',
  venue = 'Sunset Manor',
}: MessageTemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMergeFields, setShowMergeFields] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const MERGE_FIELDS: MergeField[] = [
    {
      key: '{{client_name}}',
      label: 'Client Names',
      icon: UserIcon,
      placeholder: clientName,
    },
    {
      key: '{{wedding_date}}',
      label: 'Wedding Date',
      icon: CalendarIcon,
      placeholder: weddingDate,
    },
    {
      key: '{{venue_name}}',
      label: 'Venue Name',
      icon: MapPinIcon,
      placeholder: venue,
    },
    {
      key: '{{supplier_name}}',
      label: 'Your Business Name',
      icon: SparklesIcon,
      placeholder: 'Your Business',
    },
  ];

  const DEFAULT_TEMPLATE = `Hi {{client_name}}!

Hope you're still glowing from your beautiful wedding at {{venue_name}} on {{wedding_date}}! 🎉

Your photos/services turned out amazing, and I'd love to share your joy with future couples. Would you mind taking a moment to share your experience?

Your review helps other couples find the perfect vendor for their special day!

Thank you so much!
{{supplier_name}}`;

  useEffect(() => {
    if (!value && onChange) {
      onChange(DEFAULT_TEMPLATE);
    }
  }, [value, onChange]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setCursorPosition(e.target.selectionStart);
    onChange(newValue);
  };

  const insertMergeField = (field: MergeField) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);
    const newValue = beforeCursor + field.key + afterCursor;

    onChange(newValue);

    // Set cursor position after the inserted field
    const newCursorPosition = cursorPosition + field.key.length;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      setCursorPosition(newCursorPosition);
    }, 0);

    setShowMergeFields(false);
  };

  const getPreviewText = () => {
    return value
      .replace(/\{\{client_name\}\}/g, clientName)
      .replace(/\{\{wedding_date\}\}/g, weddingDate)
      .replace(/\{\{venue_name\}\}/g, venue)
      .replace(/\{\{supplier_name\}\}/g, 'Your Business');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const beforeCursor = value.substring(0, start);
      const afterCursor = value.substring(end);
      const newValue = beforeCursor + '  ' + afterCursor; // 2 spaces for tab

      onChange(newValue);

      setTimeout(() => {
        target.setSelectionRange(start + 2, start + 2);
        setCursorPosition(start + 2);
      }, 0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Message Template
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMergeFields(!showMergeFields)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all duration-200"
            >
              <SparklesIcon className="h-3 w-3 mr-1" />
              Insert Field
            </button>

            {showMergeFields && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-10">
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Merge Fields
                  </p>
                  {MERGE_FIELDS.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => insertMergeField(field)}
                      className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-150"
                    >
                      <field.icon className="h-4 w-4 mr-3 text-gray-400" />
                      <div className="text-left">
                        <div className="font-medium">{field.label}</div>
                        <div className="text-xs text-gray-500">
                          {field.placeholder}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onSelect={(e) =>
            setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)
          }
          placeholder="Write your personalized review request message..."
          rows={8}
          className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200 font-mono text-sm resize-none"
        />

        <div className="absolute bottom-3 right-3">
          <span className="inline-flex items-center px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded-md">
            {value.length} chars
          </span>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-sm font-medium text-blue-900 mb-1">
          💡 Quick Tips
        </h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>
            • Keep it personal and warm - mention specific details from their
            wedding
          </li>
          <li>• Ask for the review within 1-2 weeks when memories are fresh</li>
          <li>• Explain how reviews help future couples find great vendors</li>
          <li>• Use merge fields to automatically personalize each message</li>
        </ul>
      </div>

      {/* Live Preview */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Preview</h4>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
            {getPreviewText()}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          This is how your message will appear to clients (merge fields replaced
          with actual data)
        </p>
      </div>
    </div>
  );
}
