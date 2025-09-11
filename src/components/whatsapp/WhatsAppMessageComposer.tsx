'use client';

import { useState } from 'react';
import { Send, Image, FileText, Users, Template } from 'lucide-react';

interface WhatsAppMessageComposerProps {
  onSendMessage: (message: any) => Promise<void>;
  templates?: any[];
  groups?: any[];
  className?: string;
}

export function WhatsAppMessageComposer({
  onSendMessage,
  templates = [],
  groups = [],
  className = '',
}: WhatsAppMessageComposerProps) {
  const [messageType, setMessageType] = useState<'template' | 'text' | 'media'>(
    'text',
  );
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [textMessage, setTextMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'document'>('image');
  const [caption, setCaption] = useState('');
  const [filename, setFilename] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);

    try {
      const messageData: any = {
        type: messageType,
      };

      // Determine recipient
      if (selectedGroup) {
        messageData.groupId = selectedGroup;
      } else {
        messageData.to = phoneNumber;
      }

      switch (messageType) {
        case 'template':
          messageData.templateName = selectedTemplate;
          messageData.languageCode = 'en_US';
          break;

        case 'text':
          messageData.text = textMessage;
          break;

        case 'media':
          messageData.mediaType = mediaType;
          messageData.mediaUrl = mediaUrl;
          if (caption) messageData.caption = caption;
          if (filename && mediaType === 'document')
            messageData.filename = filename;
          break;
      }

      await onSendMessage(messageData);

      // Reset form
      setTextMessage('');
      setMediaUrl('');
      setCaption('');
      setFilename('');
      setPhoneNumber('');
      setSelectedTemplate('');
      setSelectedGroup('');
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}
    >
      {/* Message Type Selector */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setMessageType('text')}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
            ${
              messageType === 'text'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          <Send className="w-4 h-4" />
          Text Message
        </button>
        <button
          type="button"
          onClick={() => setMessageType('template')}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
            ${
              messageType === 'template'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          <Template className="w-4 h-4" />
          Template
        </button>
        <button
          type="button"
          onClick={() => setMessageType('media')}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
            ${
              messageType === 'media'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          <Image className="w-4 h-4" />
          Media
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipient Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Phone Number
            </label>
            <input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              disabled={!!selectedGroup}
              className="
                w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                text-gray-900 placeholder-gray-500 shadow-xs
                focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                disabled:bg-gray-50 disabled:text-gray-500
                transition-all duration-200
              "
            />
          </div>

          <div>
            <label
              htmlFor="group"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Or Select Group
            </label>
            <select
              id="group"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              disabled={!!phoneNumber}
              className="
                w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                text-gray-900 shadow-xs
                focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                disabled:bg-gray-50 disabled:text-gray-500
                transition-all duration-200
              "
            >
              <option value="">Select a group...</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.memberCount || 0} members)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Message Content Based on Type */}
        {messageType === 'text' && (
          <div>
            <label
              htmlFor="textMessage"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Message
            </label>
            <textarea
              id="textMessage"
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              required
              className="
                w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                text-gray-900 placeholder-gray-500 shadow-xs resize-none
                focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                transition-all duration-200
              "
            />
          </div>
        )}

        {messageType === 'template' && (
          <div>
            <label
              htmlFor="template"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select Template
            </label>
            <select
              id="template"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              required
              className="
                w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                text-gray-900 shadow-xs
                focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                transition-all duration-200
              "
            >
              <option value="">Select a template...</option>
              {templates
                .filter((t) => t.status === 'APPROVED')
                .map((template) => (
                  <option key={template.id} value={template.name}>
                    {template.name} ({template.category})
                  </option>
                ))}
            </select>
          </div>
        )}

        {messageType === 'media' && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mediaType"
                  value="image"
                  checked={mediaType === 'image'}
                  onChange={(e) => setMediaType(e.target.value as 'image')}
                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-100"
                />
                <Image className="w-4 h-4" />
                Image
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mediaType"
                  value="document"
                  checked={mediaType === 'document'}
                  onChange={(e) => setMediaType(e.target.value as 'document')}
                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-100"
                />
                <FileText className="w-4 h-4" />
                Document
              </label>
            </div>

            <div>
              <label
                htmlFor="mediaUrl"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Media URL
              </label>
              <input
                id="mediaUrl"
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                required
                className="
                  w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                  text-gray-900 placeholder-gray-500 shadow-xs
                  focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                  transition-all duration-200
                "
              />
            </div>

            <div>
              <label
                htmlFor="caption"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Caption (Optional)
              </label>
              <input
                id="caption"
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="
                  w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                  text-gray-900 placeholder-gray-500 shadow-xs
                  focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                  transition-all duration-200
                "
              />
            </div>

            {mediaType === 'document' && (
              <div>
                <label
                  htmlFor="filename"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Filename (Optional)
                </label>
                <input
                  id="filename"
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="document.pdf"
                  className="
                    w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                    text-gray-900 placeholder-gray-500 shadow-xs
                    focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                    transition-all duration-200
                  "
                />
              </div>
            )}
          </div>
        )}

        {/* Send Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || (!phoneNumber && !selectedGroup)}
            className="
              flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700
              text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              focus:outline-none focus:ring-4 focus:ring-primary-100
            "
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {selectedGroup ? 'Send to Group' : 'Send Message'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
