import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// Types
export interface MergeField {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'email' | 'phone' | 'url' | 'date' | 'currency';
  required?: boolean;
  category?: string;
}

export interface EmailTemplateContent {
  name: string;
  description?: string;
  category:
    | 'welcome'
    | 'payment_reminder'
    | 'meeting_confirmation'
    | 'thank_you'
    | 'client_communication'
    | 'custom';
  subject_template: string;
  html_content: string;
  text_content?: string;
  merge_fields?: MergeField[];
}

// DOMPurify configuration for email content
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'span',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'blockquote',
  'pre',
  'code',
];

const ALLOWED_ATTRIBUTES = [
  'style',
  'class',
  'href',
  'title',
  'target',
  'src',
  'alt',
  'width',
  'height',
  'border',
  'cellpadding',
  'cellspacing',
  'colspan',
  'rowspan',
  'align',
  'valign',
];

const ALLOWED_PROTOCOLS = ['http', 'https', 'mailto'];

// Validation schemas
const mergeFieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/i, 'Invalid merge field key format'),
  label: z.string().min(1),
  description: z.string(),
  type: z.enum(['text', 'email', 'phone', 'url', 'date', 'currency']),
  required: z.boolean().optional().default(false),
  category: z.string().optional(),
});

const emailTemplateContentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  category: z.enum([
    'welcome',
    'payment_reminder',
    'meeting_confirmation',
    'thank_you',
    'client_communication',
    'custom',
  ]),
  subject_template: z.string().min(1, 'Subject is required').max(500),
  html_content: z.string().min(1, 'Content is required'),
  text_content: z.string().optional(),
  merge_fields: z.array(mergeFieldSchema).optional().default([]),
});

/**
 * Sanitizes HTML content for email templates
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    throw new Error('Invalid HTML content provided');
  }

  // Configure DOMPurify
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    SANITIZE_DOM: true,
    SANITIZE_NAMED_PROPS: true,
    KEEP_CONTENT: true,
    // Remove dangerous CSS expressions
    FORBID_CONTENTS: ['script'],
  });

  return sanitized;
}

/**
 * Sanitizes subject line content
 */
export function sanitizeSubjectLine(subject: string): string {
  if (!subject || typeof subject !== 'string') {
    throw new Error('Invalid subject line provided');
  }

  // Remove HTML tags (including script content)
  let sanitized = subject.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    '',
  );
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove dangerous protocols
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Replace line breaks and tabs with spaces
  sanitized = sanitized.replace(/[\n\r\t]/g, ' ');

  // Trim and normalize whitespace
  sanitized = sanitized.trim().replace(/\s+/g, ' ');

  // Truncate if too long
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 497) + '...';
  }

  return sanitized;
}

/**
 * Validates merge fields array
 */
export function validateMergeFields(mergeFields: MergeField[]): MergeField[] {
  if (!Array.isArray(mergeFields)) {
    throw new Error('Merge fields must be an array');
  }

  const validatedFields = mergeFields.map((field) => {
    const result = mergeFieldSchema.safeParse(field);
    if (!result.success) {
      throw new Error(`Invalid merge field key: ${field.key}`);
    }
    return result.data;
  });

  // Check for duplicate keys
  const keys = validatedFields.map((field) => field.key);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);

  if (duplicates.length > 0) {
    throw new Error(`Duplicate merge field key: ${duplicates[0]}`);
  }

  return validatedFields;
}

/**
 * Processes merge fields in template content
 */
export function processMergeFields(
  template: string,
  mergeData: Record<string, any>,
  allowedFields: MergeField[],
): string {
  if (!template || typeof template !== 'string') {
    return '';
  }

  const allowedKeys = new Set(allowedFields.map((field) => field.key));

  return template.replace(/\{\{([^}]+)\}\}/g, (match, fieldKey) => {
    const trimmedKey = fieldKey.trim();

    // Only process allowed fields
    if (!allowedKeys.has(trimmedKey)) {
      return match; // Return original if not allowed
    }

    const value = mergeData[trimmedKey];
    if (value == null) {
      return ''; // Empty string for missing values
    }

    // Find field definition to get type
    const fieldDef = allowedFields.find((field) => field.key === trimmedKey);
    if (!fieldDef) {
      return match;
    }

    // Type-specific sanitization
    switch (fieldDef.type) {
      case 'text':
        return DOMPurify.sanitize(String(value), { ALLOWED_TAGS: [] });

      case 'email':
        const emailValue = String(value);
        // Basic email validation and sanitization
        if (emailValue.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          return DOMPurify.sanitize(emailValue, { ALLOWED_TAGS: [] });
        }
        return '';

      case 'phone':
        // Sanitize phone numbers
        return DOMPurify.sanitize(String(value), { ALLOWED_TAGS: [] });

      case 'url':
        const urlValue = String(value);
        try {
          const url = new URL(urlValue);
          if (ALLOWED_PROTOCOLS.includes(url.protocol.replace(':', ''))) {
            return DOMPurify.sanitize(urlValue, { ALLOWED_TAGS: [] });
          }
        } catch {
          // Invalid URL
        }
        return '';

      case 'date':
        return DOMPurify.sanitize(String(value), { ALLOWED_TAGS: [] });

      case 'currency':
        return DOMPurify.sanitize(String(value), { ALLOWED_TAGS: [] });

      default:
        return DOMPurify.sanitize(String(value), { ALLOWED_TAGS: [] });
    }
  });
}

/**
 * Validates email template content structure
 */
export function validateEmailTemplateContent(
  content: EmailTemplateContent,
): EmailTemplateContent {
  const result = emailTemplateContentSchema.safeParse(content);

  if (!result.success) {
    const errorMessages = result.error?.errors?.map((e) => e.message) || [
      'Validation failed',
    ];
    throw new Error(
      `Email template validation failed: ${errorMessages.join(', ')}`,
    );
  }

  return result.data;
}

/**
 * Converts HTML to plain text
 */
function htmlToText(html: string): string {
  // Remove HTML tags and decode entities
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&dollar;/g, '$')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Main sanitization function for complete email templates
 */
export function sanitizeEmailTemplate(
  template: EmailTemplateContent,
): EmailTemplateContent {
  // Validate structure first
  const validatedTemplate = validateEmailTemplateContent(template);

  // Sanitize all text fields
  const sanitized: EmailTemplateContent = {
    name: validatedTemplate.name.trim(),
    description: validatedTemplate.description?.trim(),
    category: validatedTemplate.category,
    subject_template: sanitizeSubjectLine(validatedTemplate.subject_template),
    html_content: sanitizeEmailHtml(validatedTemplate.html_content),
    text_content: validatedTemplate.text_content?.trim(),
    merge_fields: validateMergeFields(validatedTemplate.merge_fields || []),
  };

  // Generate plain text version if not provided
  if (!sanitized.text_content) {
    sanitized.text_content = htmlToText(sanitized.html_content);
  }

  return sanitized;
}
