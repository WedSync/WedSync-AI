/**
 * Content Sanitizer
 * Comprehensive content sanitization and validation for wedding industry content
 */

import DOMPurify from 'isomorphic-dompurify';

export interface SanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  stripTags?: boolean;
  maxLength?: number;
  preserveFormatting?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedContent: string;
  issues: string[];
  originalLength: number;
  sanitizedLength: number;
}

/**
 * Comprehensive content sanitizer for wedding industry content
 */
export class ContentSanitizer {
  private purify: any;

  // Wedding industry specific patterns
  private readonly weddingProfanityList = [
    // Keep this list minimal and wedding-appropriate
    'bridezilla',
    'groomzilla',
  ];

  // Common wedding terms that should be preserved
  private readonly weddingTerms = [
    'bride',
    'groom',
    'wedding',
    'ceremony',
    'reception',
    'vows',
    'aisle',
    'bouquet',
    'boutonniere',
    'centerpiece',
    'venue',
    'vendor',
    'photographer',
    'videographer',
    'caterer',
    'florist',
    'band',
    'dj',
    'planner',
  ];

  // XSS patterns to detect
  private readonly xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<link\b[^>]*>/gi,
    /<meta\b[^>]*>/gi,
  ];

  constructor() {
    // Use isomorphic-dompurify which handles both server and client side
    this.purify = DOMPurify;

    // Configure DOMPurify with wedding-appropriate settings
    this.configurePurify();
  }

  /**
   * Sanitize text content with wedding industry considerations
   */
  async sanitizeText(
    content: string,
    options: SanitizationOptions = {},
  ): Promise<string> {
    if (!content || typeof content !== 'string') {
      return '';
    }

    const {
      maxLength = 10000,
      stripTags = true,
      preserveFormatting = false,
    } = options;

    try {
      let sanitized = content;

      // Trim whitespace
      sanitized = sanitized.trim();

      // Truncate if too long
      if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength).trim();
      }

      // Remove or escape HTML if stripTags is true
      if (stripTags) {
        sanitized = this.stripHtmlTags(sanitized, preserveFormatting);
      } else {
        sanitized = this.sanitizeHtml(sanitized);
      }

      // Remove potential XSS content
      sanitized = this.removeXSSContent(sanitized);

      // Normalize whitespace
      sanitized = this.normalizeWhitespace(sanitized);

      // Remove inappropriate content for wedding context
      sanitized = this.sanitizeWeddingContent(sanitized);

      // Final safety check
      sanitized = this.finalSanitizationCheck(sanitized);

      return sanitized;
    } catch (error) {
      console.error('Content sanitization failed:', error);
      // Return safe fallback
      return this.createSafeFallback(content);
    }
  }

  /**
   * Validate and sanitize HTML content
   */
  async sanitizeHtml(
    html: string,
    options: SanitizationOptions = {},
  ): Promise<string> {
    if (!html || typeof html !== 'string') {
      return '';
    }

    const {
      allowedTags = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote'],
      allowedAttributes = { a: ['href'], img: ['src', 'alt'] },
    } = options;

    try {
      // Configure purify options
      const purifyOptions = {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: Object.values(allowedAttributes).flat(),
        FORBID_SCRIPT: true,
        FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
        FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
        ALLOW_DATA_ATTR: false,
        SANITIZE_DOM: true,
        WHOLE_DOCUMENT: false,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
      };

      // Sanitize HTML
      let sanitized = this.purify.sanitize(html, purifyOptions);

      // Additional wedding industry specific sanitization
      sanitized = this.sanitizeWeddingContent(sanitized);

      return sanitized;
    } catch (error) {
      console.error('HTML sanitization failed:', error);
      // Strip all HTML as fallback
      return this.stripHtmlTags(html);
    }
  }

  /**
   * Comprehensive validation with detailed results
   */
  async validateContent(
    content: string,
    options: SanitizationOptions = {},
  ): Promise<ValidationResult> {
    const originalLength = content?.length || 0;
    const issues: string[] = [];

    if (!content || typeof content !== 'string') {
      return {
        isValid: false,
        sanitizedContent: '',
        issues: ['Content is empty or not a string'],
        originalLength: 0,
        sanitizedLength: 0,
      };
    }

    // Check for XSS patterns
    for (const pattern of this.xssPatterns) {
      if (pattern.test(content)) {
        issues.push('Potential XSS content detected');
        break;
      }
    }

    // Check for profanity
    const hasProfanity = this.weddingProfanityList.some((word) =>
      content.toLowerCase().includes(word.toLowerCase()),
    );

    if (hasProfanity) {
      issues.push('Inappropriate language detected');
    }

    // Check length constraints
    const maxLength = options.maxLength || 10000;
    if (content.length > maxLength) {
      issues.push(`Content exceeds maximum length of ${maxLength} characters`);
    }

    // Check for suspicious patterns
    if (content.includes('<?php') || content.includes('<%')) {
      issues.push('Server-side script content detected');
    }

    if (content.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/)) {
      issues.push('Potential credit card number detected');
    }

    if (content.match(/\b\d{3}-\d{2}-\d{4}\b/)) {
      issues.push('Potential SSN detected');
    }

    // Sanitize the content
    const sanitizedContent = await this.sanitizeText(content, options);
    const sanitizedLength = sanitizedContent.length;

    return {
      isValid: issues.length === 0,
      sanitizedContent,
      issues,
      originalLength,
      sanitizedLength,
    };
  }

  /**
   * Remove HTML tags while preserving content
   */
  private stripHtmlTags(content: string, preserveFormatting = false): string {
    if (preserveFormatting) {
      // Convert common formatting tags to text equivalents
      return content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
    } else {
      // Simple tag removal
      return content.replace(/<[^>]*>/g, '');
    }
  }

  /**
   * Sanitize HTML using DOMPurify
   */
  private sanitizeHtml(content: string): string {
    try {
      return this.purify.sanitize(content);
    } catch (error) {
      console.error('DOMPurify sanitization failed:', error);
      return this.stripHtmlTags(content);
    }
  }

  /**
   * Remove XSS content patterns
   */
  private removeXSSContent(content: string): string {
    let sanitized = content;

    // Remove XSS patterns
    for (const pattern of this.xssPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Remove data: URLs
    sanitized = sanitized.replace(/data:\s*[^;]*;[^,]*,/gi, '');

    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript:\s*[^'"]*["']?/gi, '');

    // Remove vbscript: URLs
    sanitized = sanitized.replace(/vbscript:\s*[^'"]*["']?/gi, '');

    return sanitized;
  }

  /**
   * Normalize whitespace and line breaks
   */
  private normalizeWhitespace(content: string): string {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n') // Convert CR to LF
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks
      .replace(/[ \t]{2,}/g, ' ') // Normalize spaces and tabs
      .replace(/^\s+|\s+$/gm, '') // Trim lines
      .trim(); // Trim overall
  }

  /**
   * Wedding industry specific content sanitization
   */
  private sanitizeWeddingContent(content: string): string {
    let sanitized = content;

    // Remove or replace inappropriate wedding terms
    for (const profanity of this.weddingProfanityList) {
      const regex = new RegExp(`\\b${profanity}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '[inappropriate term]');
    }

    // Ensure professional language
    sanitized = sanitized
      .replace(/\bsucks?\b/gi, 'is not ideal')
      .replace(/\bcrappy?\b/gi, 'subpar')
      .replace(/\bstupid\b/gi, 'unclear');

    return sanitized;
  }

  /**
   * Final sanitization check
   */
  private finalSanitizationCheck(content: string): string {
    // Ensure no malicious patterns remain
    if (this.xssPatterns.some((pattern) => pattern.test(content))) {
      console.warn(
        'Content failed final XSS check, applying aggressive sanitization',
      );
      return content.replace(/[<>'"&]/g, '');
    }

    // Ensure reasonable length
    if (content.length > 50000) {
      console.warn('Content exceeds safe length limit');
      return content.substring(0, 50000) + '...';
    }

    return content;
  }

  /**
   * Create safe fallback content
   */
  private createSafeFallback(originalContent: string): string {
    const safeContent = originalContent
      .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
      .substring(0, 1000) // Limit length
      .trim();

    return safeContent || '[Content removed for safety]';
  }

  /**
   * Configure DOMPurify with secure settings
   */
  private configurePurify(): void {
    // Add custom hooks for wedding industry content
    this.purify.addHook('beforeSanitizeElements', (node: any) => {
      // Remove any suspicious attributes
      if (node.hasAttributes && node.hasAttributes()) {
        const attributes = node.attributes;
        for (let i = attributes.length - 1; i >= 0; i--) {
          const attr = attributes[i];
          if (attr.name.startsWith('on') || attr.name.includes('javascript')) {
            node.removeAttribute(attr.name);
          }
        }
      }
    });

    this.purify.addHook('afterSanitizeAttributes', (node: any) => {
      // Ensure href attributes are safe
      if (node.hasAttribute('href')) {
        const href = node.getAttribute('href');
        if (
          href &&
          (href.startsWith('javascript:') || href.startsWith('data:'))
        ) {
          node.removeAttribute('href');
        }
      }

      // Ensure src attributes are safe
      if (node.hasAttribute('src')) {
        const src = node.getAttribute('src');
        if (src && (src.startsWith('javascript:') || src.startsWith('data:'))) {
          node.removeAttribute('src');
        }
      }
    });
  }

  /**
   * Validate wedding vendor content
   */
  async validateWeddingContent(content: string): Promise<{
    isAppropriate: boolean;
    hasWeddingContext: boolean;
    professionalTone: boolean;
    suggestions: string[];
  }> {
    const sanitized = await this.sanitizeText(content);
    const lowerContent = sanitized.toLowerCase();

    // Check for wedding context
    const hasWeddingContext = this.weddingTerms.some((term) =>
      lowerContent.includes(term.toLowerCase()),
    );

    // Check for professional tone indicators
    const professionalIndicators = [
      'we offer',
      'our services',
      'please contact',
      'we provide',
      'our experience',
      'we specialize',
      'our team',
    ];

    const professionalTone =
      professionalIndicators.some((indicator) =>
        lowerContent.includes(indicator),
      ) &&
      !lowerContent.includes('awesome') &&
      !lowerContent.includes('cool');

    // Check for inappropriate content
    const isAppropriate = !this.weddingProfanityList.some((term) =>
      lowerContent.includes(term.toLowerCase()),
    );

    const suggestions: string[] = [];

    if (!hasWeddingContext) {
      suggestions.push(
        'Consider adding wedding-specific terminology to better connect with couples',
      );
    }

    if (!professionalTone) {
      suggestions.push(
        'Use more professional language suitable for wedding vendors',
      );
    }

    if (sanitized.length < 50) {
      suggestions.push(
        'Content might be too brief - consider adding more detail',
      );
    }

    return {
      isAppropriate,
      hasWeddingContext,
      professionalTone,
      suggestions,
    };
  }
}

/**
 * Singleton instance
 */
let sanitizerInstance: ContentSanitizer | null = null;

/**
 * Get or create content sanitizer singleton
 */
export function getContentSanitizer(): ContentSanitizer {
  if (!sanitizerInstance) {
    sanitizerInstance = new ContentSanitizer();
  }
  return sanitizerInstance;
}

/**
 * Quick sanitization function for convenience
 */
export async function sanitizeContent(
  content: string,
  options?: SanitizationOptions,
): Promise<string> {
  const sanitizer = getContentSanitizer();
  return await sanitizer.sanitizeText(content, options);
}

/**
 * Quick HTML sanitization function
 */
export async function sanitizeHtml(
  html: string,
  options?: SanitizationOptions,
): Promise<string> {
  const sanitizer = getContentSanitizer();
  return await sanitizer.sanitizeHtml(html, options);
}
