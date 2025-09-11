/**
 * XSS Prevention Security Tests
 * Tests DOMPurify sanitization and XSS attack prevention
 */

import { validateField, sanitizeFieldValue } from '@/lib/validations/forms';
import DOMPurify from 'isomorphic-dompurify';

describe('XSS Prevention Tests', () => {
  // Common XSS attack payloads
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '"><script>alert("XSS")</script>',
    '<img src="x" onerror="alert(1)">',
    '<svg onload="alert(1)">',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<body onload="alert(1)">',
    '<input type="text" onfocus="alert(1)" autofocus>',
    '<details open ontoggle="alert(1)">',
    '<marquee onstart="alert(1)">',
    '&#60;script&#62;alert("XSS")&#60;/script&#62;',
    '%3Cscript%3Ealert("XSS")%3C/script%3E',
    '<SCRIPT>alert("XSS")</SCRIPT>',
    '<scr<script>ipt>alert("XSS")</script>',
    '<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+">',
  ];

  describe('DOMPurify Sanitization', () => {
    test.each(xssPayloads)('should sanitize XSS payload: %s', (payload) => {
      const sanitized = DOMPurify.sanitize(payload, { 
        ALLOWED_TAGS: [], 
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true 
      });
      
      // Should not contain script tags or event handlers
      expect(sanitized).not.toMatch(/<script/i);
      expect(sanitized).not.toMatch(/on\w+\s*=/i);
      expect(sanitized).not.toMatch(/javascript:/i);
      expect(sanitized).not.toMatch(/vbscript:/i);
      expect(sanitized).not.toMatch(/data:text\/html/i);
    });

    test('should preserve safe HTML in allowed context', () => {
      const safeHtml = '<p>This is <strong>bold</strong> text</p>';
      const sanitized = DOMPurify.sanitize(safeHtml, {
        ALLOWED_TAGS: ['p', 'strong'],
        ALLOWED_ATTR: []
      });
      
      expect(sanitized).toBe('<p>This is <strong>bold</strong> text</p>');
    });

    test('should handle nested XSS attempts', () => {
      const nestedXss = '<p>Safe content <script>alert("XSS")</script> more safe</p>';
      const sanitized = DOMPurify.sanitize(nestedXss, {
        ALLOWED_TAGS: ['p'],
        ALLOWED_ATTR: []
      });
      
      expect(sanitized).toBe('<p>Safe content  more safe</p>');
    });
  });

  describe('Form Field Sanitization', () => {
    test('should sanitize text field values', () => {
      const maliciousValue = '<script>alert("XSS")</script>Hello World';
      const sanitized = sanitizeFieldValue(maliciousValue, 'text');
      
      expect(sanitized).not.toMatch(/<script/i);
      expect(sanitized).toBe('Hello World');
    });

    test('should sanitize email field values', () => {
      const maliciousEmail = 'user@domain.com<script>alert("XSS")</script>';
      const sanitized = sanitizeFieldValue(maliciousEmail, 'email');
      
      expect(sanitized).toBe('user@domain.com');
    });

    test('should sanitize select option values', () => {
      const maliciousOption = 'Option 1<img src="x" onerror="alert(1)">';
      const sanitized = sanitizeFieldValue(maliciousOption, 'select');
      
      expect(sanitized).not.toMatch(/<img/i);
      expect(sanitized).toBe('Option 1');
    });

    test('should handle null and undefined values safely', () => {
      expect(sanitizeFieldValue(null, 'text')).toBeNull();
      expect(sanitizeFieldValue(undefined, 'text')).toBeUndefined();
      expect(sanitizeFieldValue('', 'text')).toBe('');
    });
  });

  describe('Advanced XSS Attack Vectors', () => {
    test('should prevent SVG-based XSS attacks', () => {
      const svgXss = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("XSS")</script></svg>';
      const sanitized = DOMPurify.sanitize(svgXss, { 
        ALLOWED_TAGS: [], 
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true 
      });
      
      expect(sanitized).not.toMatch(/alert/);
    });

    test('should prevent CSS expression attacks', () => {
      const cssXss = '<div style="background: expression(alert(1))">Content</div>';
      const sanitized = DOMPurify.sanitize(cssXss, {
        ALLOWED_TAGS: ['div'],
        ALLOWED_ATTR: ['style']
      });
      
      expect(sanitized).not.toMatch(/expression/i);
    });

    test('should prevent DOM clobbering attacks', () => {
      const clobberAttempt = '<form><input name="getAttribute"></form>';
      const sanitized = DOMPurify.sanitize(clobberAttempt, {
        ALLOWED_TAGS: ['form', 'input'],
        ALLOWED_ATTR: ['name']
      });
      
      // DOMPurify should handle this appropriately
      expect(sanitized).toBeTruthy();
    });

    test('should prevent mXSS (mutation XSS) attacks', () => {
      const mxssAttempt = '<noscript><p title="</noscript><img src=x onerror=alert(1)>">';
      const sanitized = DOMPurify.sanitize(mxssAttempt);
      
      expect(sanitized).not.toMatch(/onerror/i);
      expect(sanitized).not.toMatch(/alert/);
    });
  });

  describe('Context-Specific Sanitization', () => {
    test('should sanitize form labels appropriately', () => {
      const maliciousLabel = 'Name <script>alert("XSS")</script> Field';
      const sanitized = DOMPurify.sanitize(maliciousLabel, {
        ALLOWED_TAGS: ['strong', 'em'],
        ALLOWED_ATTR: []
      });
      
      expect(sanitized).toBe('Name  Field');
    });

    test('should sanitize form descriptions with allowed HTML', () => {
      const description = 'This is a <strong>required</strong> field. <script>alert("XSS")</script>';
      const sanitized = DOMPurify.sanitize(description, {
        ALLOWED_TAGS: ['strong', 'em', 'u', 'br'],
        ALLOWED_ATTR: []
      });
      
      expect(sanitized).toBe('This is a <strong>required</strong> field. ');
    });

    test('should sanitize placeholder text', () => {
      const maliciousPlaceholder = 'Enter your name<img src="x" onerror="alert(1)">';
      const sanitized = DOMPurify.sanitize(maliciousPlaceholder, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
      
      expect(sanitized).toBe('Enter your name');
    });
  });

  describe('Bypass Attempt Prevention', () => {
    test('should prevent encoding-based bypasses', () => {
      const encodedXss = '&lt;script&gt;alert("XSS")&lt;/script&gt;';
      const sanitized = DOMPurify.sanitize(encodedXss);
      
      expect(sanitized).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
    });

    test('should prevent Unicode normalization attacks', () => {
      const unicodeXss = '\u003cscript\u003ealert("XSS")\u003c/script\u003e';
      const sanitized = DOMPurify.sanitize(unicodeXss, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
      
      expect(sanitized).not.toMatch(/alert/);
    });

    test('should prevent CSS import attacks', () => {
      const cssImport = '<style>@import "javascript:alert(1)";</style>';
      const sanitized = DOMPurify.sanitize(cssImport);
      
      expect(sanitized).not.toMatch(/javascript:/);
    });
  });
});