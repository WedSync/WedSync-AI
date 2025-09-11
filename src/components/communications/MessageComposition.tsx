'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  MessageCompositionProps,
  MessageContent,
  PersonalizationToken,
  MessageTemplate,
} from '@/types/communications';
import { PersonalizationTokens } from './PersonalizationTokens';
import {
  PenIcon,
  EyeIcon,
  TemplateIcon,
  SaveIcon,
  TypeIcon,
  SmartphoneIcon,
  MailIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListIcon,
  LinkIcon,
  ImageIcon,
} from 'lucide-react';

interface MessageCompositionState {
  showPreview: boolean;
  activeTab: 'compose' | 'preview';
  templateSearch: string;
  showTemplates: boolean;
  selectedRange: { start: number; end: number } | null;
}

// Mock templates for demonstration - in real app these would come from API
const MOCK_TEMPLATES: MessageTemplate[] = [
  {
    id: '1',
    couple_id: 'mock',
    name: 'RSVP Reminder',
    description: 'Gentle reminder for guests to RSVP',
    category: 'rsvp',
    subject: 'RSVP Reminder - {wedding_date} Wedding',
    html_content:
      "<p>Hi {first_name},</p><p>We hope you received our wedding invitation! We're so excited to celebrate with you on {wedding_date}.</p><p>Please let us know if you'll be able to join us by visiting our wedding website.</p><p>Looking forward to hearing from you!</p><p>Love,<br>The Happy Couple</p>",
    text_content:
      "Hi {first_name},\n\nWe hope you received our wedding invitation! We're so excited to celebrate with you on {wedding_date}.\n\nPlease let us know if you'll be able to join us by visiting our wedding website.\n\nLooking forward to hearing from you!\n\nLove,\nThe Happy Couple",
    personalization_tokens: ['{first_name}', '{wedding_date}'],
    is_system: true,
    usage_count: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    couple_id: 'mock',
    name: 'Dietary Requirements',
    description: 'Ask guests about dietary restrictions',
    category: 'dietary',
    subject: 'Menu Planning - Dietary Requirements',
    html_content:
      '<p>Dear {guest_name},</p><p>As we finalize our wedding menu, we want to ensure everyone has a wonderful dining experience!</p><p>{dietary_info}</p><p>Please let us know about any dietary restrictions or food allergies by replying to this email.</p><p>Thank you for helping us plan the perfect celebration!</p>',
    text_content:
      'Dear {guest_name},\n\nAs we finalize our wedding menu, we want to ensure everyone has a wonderful dining experience!\n\n{dietary_info}\n\nPlease let us know about any dietary restrictions or food allergies by replying to this email.\n\nThank you for helping us plan the perfect celebration!',
    personalization_tokens: ['{guest_name}', '{dietary_info}'],
    is_system: true,
    usage_count: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    couple_id: 'mock',
    name: 'Logistics Information',
    description: 'Share venue details and timing',
    category: 'logistics',
    subject: 'Wedding Day Details & Logistics',
    html_content:
      "<p>Hello {first_name},</p><p>We're getting so close to the big day! Here are the important details for our wedding:</p><p><strong>Date:</strong> {wedding_date}<br><strong>Venue:</strong> [Venue Name]<br><strong>Address:</strong> [Venue Address]</p><p>{table_number}</p><p>Ceremony begins at [Time], followed by cocktails and dinner.</p><p>Can't wait to celebrate with you!</p>",
    text_content:
      "Hello {first_name},\n\nWe're getting so close to the big day! Here are the important details for our wedding:\n\nDate: {wedding_date}\nVenue: [Venue Name]\nAddress: [Venue Address]\n\n{table_number}\n\nCeremony begins at [Time], followed by cocktails and dinner.\n\nCan't wait to celebrate with you!",
    personalization_tokens: [
      '{first_name}',
      '{wedding_date}',
      '{table_number}',
    ],
    is_system: true,
    usage_count: 15,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function MessageComposition({
  content,
  onContentChange,
  availableTokens,
  selectedTemplate,
  onTemplateChange,
  className,
}: MessageCompositionProps) {
  const [state, setState] = useState<MessageCompositionState>({
    showPreview: false,
    activeTab: 'compose',
    templateSearch: '',
    showTemplates: false,
    selectedRange: null,
  });

  const subjectInputRef = useRef<HTMLInputElement>(null);
  const htmlEditorRef = useRef<HTMLTextAreaElement>(null);
  const textEditorRef = useRef<HTMLTextAreaElement>(null);

  const filteredTemplates = useMemo(() => {
    if (!state.templateSearch.trim()) return MOCK_TEMPLATES;
    const search = state.templateSearch.toLowerCase();
    return MOCK_TEMPLATES.filter(
      (template) =>
        template.name.toLowerCase().includes(search) ||
        template.description?.toLowerCase().includes(search) ||
        template.category.toLowerCase().includes(search),
    );
  }, [state.templateSearch]);

  const handleSubjectChange = useCallback(
    (subject: string) => {
      onContentChange({ ...content, subject });
    },
    [content, onContentChange],
  );

  const handleHtmlContentChange = useCallback(
    (htmlContent: string) => {
      onContentChange({ ...content, html_content: htmlContent });
      // Auto-generate text content from HTML (simplified)
      const textContent = htmlContent
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

      onContentChange({
        ...content,
        html_content: htmlContent,
        text_content: textContent,
      });
    },
    [content, onContentChange],
  );

  const handleTextContentChange = useCallback(
    (textContent: string) => {
      onContentChange({ ...content, text_content: textContent });
    },
    [content, onContentChange],
  );

  const handleTemplateSelect = useCallback(
    (template: MessageTemplate) => {
      onTemplateChange(template);
      setState((prev) => ({ ...prev, showTemplates: false }));
    },
    [onTemplateChange],
  );

  const insertToken = useCallback(
    (token: PersonalizationToken) => {
      const activeElement = document.activeElement;
      let targetRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
      let field: 'subject' | 'html_content';

      if (activeElement === subjectInputRef.current) {
        targetRef = subjectInputRef;
        field = 'subject';
      } else if (activeElement === htmlEditorRef.current) {
        targetRef = htmlEditorRef;
        field = 'html_content';
      } else {
        // Default to HTML editor
        targetRef = htmlEditorRef;
        field = 'html_content';
      }

      if (targetRef.current) {
        const element = targetRef.current;
        const start = element.selectionStart || 0;
        const end = element.selectionEnd || 0;
        const currentValue =
          field === 'subject' ? content.subject || '' : content[field];
        const newValue =
          currentValue.substring(0, start) +
          token.token +
          currentValue.substring(end);

        if (field === 'subject') {
          handleSubjectChange(newValue);
        } else {
          handleHtmlContentChange(newValue);
        }

        // Restore cursor position
        setTimeout(() => {
          element.selectionStart = element.selectionEnd =
            start + token.token.length;
          element.focus();
        }, 0);
      }
    },
    [content, handleSubjectChange, handleHtmlContentChange],
  );

  const generatePreviewContent = useCallback(() => {
    // Generate preview by replacing tokens with example values
    let previewHtml = content.html_content;
    let previewText = content.text_content;
    let previewSubject = content.subject || '';

    availableTokens.forEach((token) => {
      const regex = new RegExp(token.token.replace(/[{}]/g, '\\$&'), 'g');
      previewHtml = previewHtml.replace(
        regex,
        `<span class="bg-yellow-100 px-1 rounded">${token.example_value}</span>`,
      );
      previewText = previewText.replace(regex, token.example_value);
      previewSubject = previewSubject.replace(regex, token.example_value);
    });

    return { previewHtml, previewText, previewSubject };
  }, [content, availableTokens]);

  const { previewHtml, previewText, previewSubject } = generatePreviewContent();

  const handleFormatting = useCallback(
    (command: string, value?: string) => {
      if (htmlEditorRef.current) {
        const element = htmlEditorRef.current;
        const start = element.selectionStart || 0;
        const end = element.selectionEnd || 0;
        const selectedText = content.html_content.substring(start, end);

        let newText = '';
        switch (command) {
          case 'bold':
            newText = `<strong>${selectedText}</strong>`;
            break;
          case 'italic':
            newText = `<em>${selectedText}</em>`;
            break;
          case 'underline':
            newText = `<u>${selectedText}</u>`;
            break;
          case 'link':
            const url = prompt('Enter URL:');
            if (url) {
              newText = `<a href="${url}">${selectedText || url}</a>`;
            } else return;
            break;
          default:
            return;
        }

        const newContent =
          content.html_content.substring(0, start) +
          newText +
          content.html_content.substring(end);
        handleHtmlContentChange(newContent);
      }
    },
    [content.html_content, handleHtmlContentChange],
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-100 p-2 rounded-lg">
            <PenIcon className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Write Your Message
            </h2>
            <p className="text-sm text-gray-600">
              Compose personalized messages for your guests
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() =>
              setState((prev) => ({
                ...prev,
                showTemplates: !prev.showTemplates,
              }))
            }
            className="flex items-center px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100"
          >
            <TemplateIcon className="w-4 h-4 mr-2" />
            Templates
          </button>

          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() =>
                setState((prev) => ({ ...prev, activeTab: 'compose' }))
              }
              className={cn(
                'flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
                state.activeTab === 'compose'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              <TypeIcon className="w-4 h-4 mr-2" />
              Compose
            </button>
            <button
              onClick={() =>
                setState((prev) => ({ ...prev, activeTab: 'preview' }))
              }
              className={cn(
                'flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
                state.activeTab === 'preview'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* Template Selection */}
      {state.showTemplates && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Choose a Template
            </h3>
            <input
              type="text"
              placeholder="Search templates..."
              value={state.templateSearch}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  templateSearch: e.target.value,
                }))
              }
              className="w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={cn(
                  'p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md',
                  selectedTemplate?.id === template.id
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <span
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      template.category === 'rsvp' &&
                        'bg-blue-100 text-blue-800',
                      template.category === 'dietary' &&
                        'bg-green-100 text-green-800',
                      template.category === 'logistics' &&
                        'bg-purple-100 text-purple-800',
                      template.category === 'thank_you' &&
                        'bg-pink-100 text-pink-800',
                      template.category === 'reminder' &&
                        'bg-yellow-100 text-yellow-800',
                      template.category === 'custom' &&
                        'bg-gray-100 text-gray-800',
                    )}
                  >
                    {template.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {template.description}
                </p>
                <div className="text-xs text-gray-500">
                  Used {template.usage_count} times
                </div>
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No templates found matching your search.
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Composition Area */}
        <div className="xl:col-span-3 space-y-6">
          {/* Selected Template Info */}
          {selectedTemplate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TemplateIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Using template: {selectedTemplate.name}
                  </span>
                </div>
                <button
                  onClick={() => onTemplateChange(undefined)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {state.activeTab === 'compose' ? (
            <div className="space-y-6">
              {/* Subject Line */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Subject Line
                </label>
                <input
                  ref={subjectInputRef}
                  type="text"
                  value={content.subject || ''}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  placeholder="Enter your email subject line..."
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                />
              </div>

              {/* Message Content */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Message Content
                  </label>

                  {/* Formatting Toolbar */}
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => handleFormatting('bold')}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
                        title="Bold"
                      >
                        <BoldIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFormatting('italic')}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
                        title="Italic"
                      >
                        <ItalicIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFormatting('underline')}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
                        title="Underline"
                      >
                        <UnderlineIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFormatting('link')}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
                        title="Add Link"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* HTML Editor */}
                  <div>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MailIcon className="w-4 h-4 mr-2" />
                      Email Version (HTML)
                    </div>
                    <textarea
                      ref={htmlEditorRef}
                      value={content.html_content}
                      onChange={(e) => handleHtmlContentChange(e.target.value)}
                      placeholder="Write your message here... You can use HTML tags for formatting and personalization tokens like {first_name}."
                      rows={12}
                      className="w-full px-3.5 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200 font-mono text-sm resize-none"
                    />
                  </div>

                  {/* Text Editor */}
                  <div>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <SmartphoneIcon className="w-4 h-4 mr-2" />
                      SMS/Plain Text Version
                    </div>
                    <textarea
                      ref={textEditorRef}
                      value={content.text_content}
                      onChange={(e) => handleTextContentChange(e.target.value)}
                      placeholder="Plain text version for SMS and accessibility..."
                      rows={8}
                      className="w-full px-3.5 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Preview Mode */
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Email Preview
                </h3>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  {/* Email Header */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        Subject: {previewSubject || 'No subject'}
                      </div>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div className="p-6 bg-white">
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html:
                          previewHtml ||
                          '<p class="text-gray-500">No content</p>',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  SMS Preview
                </h3>
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="bg-blue-500 text-white rounded-2xl rounded-bl-sm p-3 max-w-xs ml-auto">
                    <div className="whitespace-pre-wrap text-sm">
                      {previewText || 'No content'}
                    </div>
                    <div className="text-xs text-blue-100 mt-2">
                      {new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Personalization Tokens Sidebar */}
        <div className="xl:col-span-1">
          <PersonalizationTokens
            availableTokens={availableTokens}
            onTokenSelect={insertToken}
            className="sticky top-4"
          />
        </div>
      </div>
    </div>
  );
}
