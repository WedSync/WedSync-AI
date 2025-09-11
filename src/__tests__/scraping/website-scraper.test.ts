/**
 * WS-207 FAQ Extraction AI - Website Scraper Unit Tests
 * Team E - Round 1 - Comprehensive Testing Infrastructure
 *
 * CRITICAL: >90% test coverage required for all FAQ scraping functionality
 * Tests wedding vendor scenarios: photographers, venues, planners
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  beforeAll,
  afterAll,
} from 'vitest';
import { WebsiteScraper } from '@/lib/extractors/website-scraper';
import { FAQItem } from '@/types/faq';
import { createMockPage, createMockBrowser } from '../mocks/browser-mocks';
import { WEDDING_FAQ_EXAMPLES } from '../fixtures/wedding-faq-data';

// Mock dependencies
vi.mock('puppeteer', () => ({
  launch: vi.fn(),
  Browser: vi.fn(),
  Page: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html: string) =>
      html.replace(/<script[^>]*>.*?<\/script>/gi, ''),
    ),
  },
}));

describe('WebsiteScraper', () => {
  let scraper: WebsiteScraper;
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    scraper = new WebsiteScraper({
      timeout: 30000,
      maxRetries: 3,
      rateLimitDelay: 1000,
    });

    mockBrowser = createMockBrowser();
    mockPage = createMockPage();
    mockBrowser.newPage.mockResolvedValue(mockPage);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultScraper = new WebsiteScraper();
      expect(defaultScraper).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customScraper = new WebsiteScraper({
        timeout: 60000,
        maxRetries: 5,
        rateLimitDelay: 2000,
      });
      expect(customScraper).toBeDefined();
    });
  });

  describe('FAQ Extraction - WordPress Structures', () => {
    it('should extract FAQs from WordPress FAQ plugin structure', async () => {
      const mockContent = `
        <div class="wp-faq-container">
          <div class="faq-item">
            <h3 class="faq-question">What is your pricing for wedding photography?</h3>
            <div class="faq-answer">Our packages start at $2,500 and include 8 hours of coverage, online gallery, and 500+ edited photos. We offer three packages: Essential ($2,500), Premium ($3,500), and Luxury ($5,000).</div>
          </div>
          <div class="faq-item">
            <h3 class="faq-question">How many photos do you deliver?</h3>
            <div class="faq-answer">We typically deliver 500-800 edited photos, depending on your package and the length of coverage. All photos are professionally edited and delivered within 6-8 weeks.</div>
          </div>
          <div class="faq-item">
            <h3 class="faq-question">Do you travel for destination weddings?</h3>
            <div class="faq-answer">Yes! We love destination weddings. Travel fees apply for locations over 50 miles from our studio. We've photographed weddings in Tuscany, Hawaii, and throughout the US.</div>
          </div>
        </div>
      `;

      mockPage.content.mockResolvedValue(mockContent);
      mockPage.evaluate.mockResolvedValue([
        {
          question: 'What is your pricing for wedding photography?',
          answer:
            'Our packages start at $2,500 and include 8 hours of coverage, online gallery, and 500+ edited photos. We offer three packages: Essential ($2,500), Premium ($3,500), and Luxury ($5,000).',
          selector: '.wp-faq-container .faq-item',
        },
        {
          question: 'How many photos do you deliver?',
          answer:
            'We typically deliver 500-800 edited photos, depending on your package and the length of coverage. All photos are professionally edited and delivered within 6-8 weeks.',
          selector: '.wp-faq-container .faq-item',
        },
        {
          question: 'Do you travel for destination weddings?',
          answer:
            "Yes! We love destination weddings. Travel fees apply for locations over 50 miles from our studio. We've photographed weddings in Tuscany, Hawaii, and throughout the US.",
          selector: '.wp-faq-container .faq-item',
        },
      ]);

      const faqs = await scraper.extractFAQs(
        'https://photographer.com/faq',
        'user-123',
      );

      expect(faqs).toHaveLength(3);
      expect(faqs[0].question).toBe(
        'What is your pricing for wedding photography?',
      );
      expect(faqs[0].answer).toContain('Our packages start at $2,500');
      expect(faqs[0].source_url).toBe('https://photographer.com/faq');
      expect(faqs[0].extracted_at).toBeDefined();
      expect(faqs[1].question).toBe('How many photos do you deliver?');
      expect(faqs[1].answer).toContain('500-800 edited photos');
      expect(faqs[2].question).toBe('Do you travel for destination weddings?');
      expect(faqs[2].answer).toContain('Yes! We love destination weddings');
    });

    it('should handle WordPress Accordion FAQ Plugin', async () => {
      const mockContent = `
        <div class="wp-accordion-faq">
          <div class="accordion-item" data-faq-id="1">
            <button class="accordion-trigger">What's included in your wedding venue package?</button>
            <div class="accordion-content">
              Our venue package includes: exclusive use for 12 hours, tables and chairs for up to 150 guests, 
              bridal suite access, complimentary parking, basic sound system, and dedicated venue coordinator.
            </div>
          </div>
          <div class="accordion-item" data-faq-id="2">
            <button class="accordion-trigger">What is your cancellation policy?</button>
            <div class="accordion-content">
              Cancellations made 365+ days before: full refund minus $500 processing fee. 
              180-364 days: 75% refund. 90-179 days: 50% refund. Less than 90 days: no refund.
            </div>
          </div>
        </div>
      `;

      mockPage.content.mockResolvedValue(mockContent);
      mockPage.evaluate.mockResolvedValue([
        {
          question: "What's included in your wedding venue package?",
          answer:
            'Our venue package includes: exclusive use for 12 hours, tables and chairs for up to 150 guests, bridal suite access, complimentary parking, basic sound system, and dedicated venue coordinator.',
          selector: '.wp-accordion-faq .accordion-item',
        },
        {
          question: 'What is your cancellation policy?',
          answer:
            'Cancellations made 365+ days before: full refund minus $500 processing fee. 180-364 days: 75% refund. 90-179 days: 50% refund. Less than 90 days: no refund.',
          selector: '.wp-accordion-faq .accordion-item',
        },
      ]);

      const faqs = await scraper.extractFAQs(
        'https://venue.com/faq',
        'user-456',
      );

      expect(faqs).toHaveLength(2);
      expect(faqs[0].question).toBe(
        "What's included in your wedding venue package?",
      );
      expect(faqs[0].answer).toContain('exclusive use for 12 hours');
      expect(faqs[1].question).toBe('What is your cancellation policy?');
      expect(faqs[1].answer).toContain('365+ days before');
    });
  });

  describe('FAQ Extraction - Squarespace Structures', () => {
    it('should handle Squarespace accordion FAQ structure', async () => {
      const mockContent = `
        <div class="accordion-block">
          <div class="accordion-item">
            <button class="accordion-header" aria-expanded="false">
              <span class="accordion-title">Do you provide day-of wedding coordination?</span>
            </button>
            <div class="accordion-content" style="display: none;">
              <p>Yes! Our day-of coordination service includes timeline creation, vendor management, 
              ceremony rehearsal guidance, and 10 hours of coordination on your wedding day. 
              This service is $1,200 and ensures everything runs smoothly.</p>
            </div>
          </div>
          <div class="accordion-item">
            <button class="accordion-header" aria-expanded="false">
              <span class="accordion-title">How far in advance should we book your services?</span>
            </button>
            <div class="accordion-content" style="display: none;">
              <p>We recommend booking 12-18 months in advance, especially for peak wedding season 
              (May-October). However, we do accept bookings with shorter notice if our schedule allows.</p>
            </div>
          </div>
        </div>
      `;

      mockPage.content.mockResolvedValue(mockContent);
      mockPage.evaluate.mockResolvedValue([
        {
          question: 'Do you provide day-of wedding coordination?',
          answer:
            'Yes! Our day-of coordination service includes timeline creation, vendor management, ceremony rehearsal guidance, and 10 hours of coordination on your wedding day. This service is $1,200 and ensures everything runs smoothly.',
          selector: '.accordion-block .accordion-item',
        },
        {
          question: 'How far in advance should we book your services?',
          answer:
            'We recommend booking 12-18 months in advance, especially for peak wedding season (May-October). However, we do accept bookings with shorter notice if our schedule allows.',
          selector: '.accordion-block .accordion-item',
        },
      ]);

      const faqs = await scraper.extractFAQs(
        'https://weddingplanner.com/services',
        'user-789',
      );

      expect(faqs).toHaveLength(2);
      expect(faqs[0].question).toBe(
        'Do you provide day-of wedding coordination?',
      );
      expect(faqs[0].answer).toContain('Yes! Our day-of coordination service');
      expect(faqs[1].question).toBe(
        'How far in advance should we book your services?',
      );
      expect(faqs[1].answer).toContain('12-18 months in advance');
    });

    it('should handle Squarespace summary block FAQ structure', async () => {
      const mockContent = `
        <div class="summary-block-container">
          <div class="summary-item" data-item-id="faq-1">
            <h3 class="summary-title">
              <a href="#faq-1">What flowers do you recommend for outdoor weddings?</a>
            </h3>
            <div class="summary-excerpt">
              For outdoor weddings, we recommend hardy flowers like roses, sunflowers, and eucalyptus. 
              These hold up well in various weather conditions and photograph beautifully in natural light.
            </div>
          </div>
          <div class="summary-item" data-item-id="faq-2">
            <h3 class="summary-title">
              <a href="#faq-2">Do you offer bridal bouquet preservation?</a>
            </h3>
            <div class="summary-excerpt">
              Yes! We partner with a local preservation artist who can freeze-dry your bouquet or 
              create resin keepsakes. Prices start at $150 and take 6-8 weeks to complete.
            </div>
          </div>
        </div>
      `;

      mockPage.evaluate.mockResolvedValue([
        {
          question: 'What flowers do you recommend for outdoor weddings?',
          answer:
            'For outdoor weddings, we recommend hardy flowers like roses, sunflowers, and eucalyptus. These hold up well in various weather conditions and photograph beautifully in natural light.',
          selector: '.summary-block-container .summary-item',
        },
        {
          question: 'Do you offer bridal bouquet preservation?',
          answer:
            'Yes! We partner with a local preservation artist who can freeze-dry your bouquet or create resin keepsakes. Prices start at $150 and take 6-8 weeks to complete.',
          selector: '.summary-block-container .summary-item',
        },
      ]);

      const faqs = await scraper.extractFAQs(
        'https://florist.com/faq',
        'user-101',
      );

      expect(faqs).toHaveLength(2);
      expect(faqs[0].question).toBe(
        'What flowers do you recommend for outdoor weddings?',
      );
      expect(faqs[1].question).toBe(
        'Do you offer bridal bouquet preservation?',
      );
    });
  });

  describe('FAQ Extraction - Wix Structures', () => {
    it('should extract FAQs from Wix FAQ widget', async () => {
      const mockContent = `
        <div class="wix-faq-widget">
          <div class="faq-list">
            <div class="faq-item" data-comp="FAQ1">
              <div class="faq-question-container">
                <h3 class="faq-question">What makes your wedding cakes unique?</h3>
              </div>
              <div class="faq-answer-container">
                <p class="faq-answer">
                  All our wedding cakes are made from scratch using premium ingredients. 
                  We offer custom designs, multiple flavor options, and can accommodate 
                  dietary restrictions including gluten-free and vegan options.
                </p>
              </div>
            </div>
            <div class="faq-item" data-comp="FAQ2">
              <div class="faq-question-container">
                <h3 class="faq-question">How far in advance should we order our wedding cake?</h3>
              </div>
              <div class="faq-answer-container">
                <p class="faq-answer">
                  We recommend ordering 3-6 months in advance to ensure availability, 
                  especially during peak wedding season. A tasting appointment can 
                  be scheduled 2-4 months before your wedding date.
                </p>
              </div>
            </div>
          </div>
        </div>
      `;

      mockPage.evaluate.mockResolvedValue([
        {
          question: 'What makes your wedding cakes unique?',
          answer:
            'All our wedding cakes are made from scratch using premium ingredients. We offer custom designs, multiple flavor options, and can accommodate dietary restrictions including gluten-free and vegan options.',
          selector: '.wix-faq-widget .faq-item',
        },
        {
          question: 'How far in advance should we order our wedding cake?',
          answer:
            'We recommend ordering 3-6 months in advance to ensure availability, especially during peak wedding season. A tasting appointment can be scheduled 2-4 months before your wedding date.',
          selector: '.wix-faq-widget .faq-item',
        },
      ]);

      const faqs = await scraper.extractFAQs(
        'https://cakeshop.com/wedding-cakes',
        'user-202',
      );

      expect(faqs).toHaveLength(2);
      expect(faqs[0].question).toBe('What makes your wedding cakes unique?');
      expect(faqs[0].answer).toContain(
        'made from scratch using premium ingredients',
      );
      expect(faqs[1].question).toBe(
        'How far in advance should we order our wedding cake?',
      );
      expect(faqs[1].answer).toContain('3-6 months in advance');
    });
  });

  describe('FAQ Extraction - Custom HTML Structures', () => {
    it('should extract FAQs from custom HTML with data attributes', async () => {
      const mockContent = `
        <section class="faq-section">
          <div class="faq-container">
            <article class="faq-entry" data-faq-id="music-1">
              <header class="question-header">
                <h4>What equipment do you provide for wedding receptions?</h4>
              </header>
              <div class="answer-content">
                <p>We provide a complete sound system including wireless microphones, 
                speakers, mixing board, and uplighting. All equipment is professional-grade 
                and includes backup systems to ensure uninterrupted music throughout your event.</p>
              </div>
            </article>
            <article class="faq-entry" data-faq-id="music-2">
              <header class="question-header">
                <h4>Can we request specific songs for our wedding?</h4>
              </header>
              <div class="answer-content">
                <p>Absolutely! We encourage couples to provide a list of must-play songs, 
                as well as any songs they prefer not to hear. We'll work with you to 
                create the perfect playlist for your special day.</p>
              </div>
            </article>
          </div>
        </section>
      `;

      mockPage.evaluate.mockResolvedValue([
        {
          question: 'What equipment do you provide for wedding receptions?',
          answer:
            'We provide a complete sound system including wireless microphones, speakers, mixing board, and uplighting. All equipment is professional-grade and includes backup systems to ensure uninterrupted music throughout your event.',
          selector: '.faq-section .faq-entry',
        },
        {
          question: 'Can we request specific songs for our wedding?',
          answer:
            "Absolutely! We encourage couples to provide a list of must-play songs, as well as any songs they prefer not to hear. We'll work with you to create the perfect playlist for your special day.",
          selector: '.faq-section .faq-entry',
        },
      ]);

      const faqs = await scraper.extractFAQs(
        'https://weddingdj.com/services',
        'user-303',
      );

      expect(faqs).toHaveLength(2);
      expect(faqs[0].question).toBe(
        'What equipment do you provide for wedding receptions?',
      );
      expect(faqs[0].answer).toContain(
        'complete sound system including wireless microphones',
      );
      expect(faqs[1].question).toBe(
        'Can we request specific songs for our wedding?',
      );
      expect(faqs[1].answer).toContain('Absolutely! We encourage couples');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle scraping timeouts gracefully', async () => {
      const timeoutError = new Error('Navigation timeout');
      timeoutError.name = 'TimeoutError';
      mockPage.goto.mockRejectedValue(timeoutError);

      await expect(
        scraper.extractFAQs('https://slow-website.com', 'user-404'),
      ).rejects.toThrow('Navigation timeout');
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('net::ERR_NAME_NOT_RESOLVED');
      mockPage.goto.mockRejectedValue(networkError);

      await expect(
        scraper.extractFAQs('https://nonexistent-website.com', 'user-404'),
      ).rejects.toThrow('net::ERR_NAME_NOT_RESOLVED');
    });

    it('should handle empty websites with no FAQs', async () => {
      const mockContent =
        '<html><body><h1>About Us</h1><p>We are a great company!</p></body></html>';

      mockPage.content.mockResolvedValue(mockContent);
      mockPage.evaluate.mockResolvedValue([]);

      const faqs = await scraper.extractFAQs(
        'https://no-faq-website.com',
        'user-505',
      );

      expect(faqs).toHaveLength(0);
    });

    it('should sanitize malicious HTML content', async () => {
      const maliciousContent = `
        <div class="faq">
          <h3>Question with <script>alert('xss')</script> script</h3>
          <p>Answer with <img src="x" onerror="alert('xss')"> malicious image and <iframe src="javascript:alert('xss')"></iframe></p>
        </div>
      `;

      mockPage.evaluate.mockResolvedValue([
        {
          question: "Question with <script>alert('xss')</script> script",
          answer:
            'Answer with <img src="x" onerror="alert(\'xss\')"> malicious image and <iframe src="javascript:alert(\'xss\')"></iframe>',
          selector: '.faq',
        },
      ]);

      const faqs = await scraper.extractFAQs(
        'https://malicious.com',
        'user-666',
      );

      expect(faqs[0].question).not.toContain('<script>');
      expect(faqs[0].answer).not.toContain('onerror=');
      expect(faqs[0].answer).not.toContain('<iframe');
      expect(faqs[0].question).toBe('Question with  script');
    });

    it('should handle websites with broken HTML structure', async () => {
      const brokenHTML = `
        <div class="faq">
          <h3>Valid question?</h3>
          <p>Valid answer</p>
          <h3>Question without closing tag
          <p>Answer without opening tag</p>
          <div>Nested without proper structure
            <span>More broken nesting
          </div>
        </div>
      `;

      mockPage.evaluate.mockResolvedValue([
        {
          question: 'Valid question?',
          answer: 'Valid answer',
          selector: '.faq',
        },
      ]);

      const faqs = await scraper.extractFAQs(
        'https://broken-html.com',
        'user-707',
      );

      expect(faqs).toHaveLength(1);
      expect(faqs[0].question).toBe('Valid question?');
      expect(faqs[0].answer).toBe('Valid answer');
    });

    it('should respect rate limiting', async () => {
      const fastScraper = new WebsiteScraper({ rateLimitDelay: 100 });

      mockPage.evaluate.mockResolvedValue([
        {
          question: 'Test question 1?',
          answer: 'Test answer 1',
          selector: '.faq',
        },
      ]);

      const startTime = Date.now();

      await Promise.all([
        fastScraper.extractFAQs('https://site1.com', 'user-1'),
        fastScraper.extractFAQs('https://site2.com', 'user-1'),
        fastScraper.extractFAQs('https://site3.com', 'user-1'),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least 200ms due to rate limiting (100ms * 2 delays)
      expect(duration).toBeGreaterThan(200);
    });
  });

  describe('Security and Validation', () => {
    it('should validate URLs before scraping', async () => {
      const invalidUrls = [
        'javascript:alert("xss")',
        'file:///etc/passwd',
        'ftp://internal.server.com',
        'data:text/html,<script>alert("xss")</script>',
        'not-a-url',
        '',
      ];

      for (const url of invalidUrls) {
        await expect(scraper.extractFAQs(url, 'user-808')).rejects.toThrow(
          /Invalid URL/,
        );
      }
    });

    it('should prevent SSRF attacks on internal IPs', async () => {
      const internalUrls = [
        'http://127.0.0.1:8080/admin',
        'http://localhost/secret',
        'http://192.168.1.1/router',
        'http://10.0.0.1/internal',
      ];

      for (const url of internalUrls) {
        await expect(scraper.extractFAQs(url, 'user-909')).rejects.toThrow(
          /Internal URL access denied/,
        );
      }
    });

    it('should enforce maximum content length', async () => {
      const hugeFAQ = 'A'.repeat(10000); // 10KB answer

      mockPage.evaluate.mockResolvedValue([
        {
          question: 'Normal question?',
          answer: hugeFAQ,
          selector: '.faq',
        },
      ]);

      const faqs = await scraper.extractFAQs(
        'https://huge-content.com',
        'user-1010',
      );

      expect(faqs[0].answer.length).toBeLessThan(5000); // Should be truncated
    });

    it('should limit maximum number of FAQs per page', async () => {
      const manyFAQs = Array.from({ length: 200 }, (_, i) => ({
        question: `Question ${i + 1}?`,
        answer: `Answer ${i + 1}`,
        selector: '.faq',
      }));

      mockPage.evaluate.mockResolvedValue(manyFAQs);

      const faqs = await scraper.extractFAQs(
        'https://many-faqs.com',
        'user-1111',
      );

      expect(faqs.length).toBeLessThanOrEqual(100); // Should be limited to 100 FAQs
    });
  });

  describe('Wedding Vendor Specific Patterns', () => {
    it('should detect photographer pricing FAQs correctly', async () => {
      const photographerFAQs = [
        {
          question: 'What are your wedding photography packages?',
          answer:
            'We offer three packages: Essential ($2,500), Premium ($3,500), and Luxury ($5,000). All include online gallery and edited photos.',
          selector: '.photographer-faq',
        },
        {
          question: 'Do you offer engagement sessions?',
          answer:
            'Yes! Engagement sessions are included free with Premium and Luxury packages, or can be added to Essential for $400.',
          selector: '.photographer-faq',
        },
      ];

      mockPage.evaluate.mockResolvedValue(photographerFAQs);

      const faqs = await scraper.extractFAQs(
        'https://photographer.com/pricing',
        'photographer-user',
      );

      expect(faqs).toHaveLength(2);
      expect(faqs[0].question).toContain('photography packages');
      expect(faqs[0].answer).toContain('$2,500');
      expect(faqs[1].question).toContain('engagement sessions');
    });

    it('should detect venue booking FAQs correctly', async () => {
      const venueFAQs = [
        {
          question: 'What is your venue rental fee?',
          answer:
            'Our venue rental is $3,500 for 8 hours, including tables, chairs, and basic lighting. Additional hours are $400 each.',
          selector: '.venue-faq',
        },
        {
          question: 'Do you allow outside catering?',
          answer:
            'We have a list of preferred caterers, but you may use outside catering with a $500 fee and proof of insurance.',
          selector: '.venue-faq',
        },
      ];

      mockPage.evaluate.mockResolvedValue(venueFAQs);

      const faqs = await scraper.extractFAQs(
        'https://venue.com/rental-info',
        'venue-user',
      );

      expect(faqs).toHaveLength(2);
      expect(faqs[0].question).toContain('rental fee');
      expect(faqs[0].answer).toContain('$3,500');
      expect(faqs[1].question).toContain('outside catering');
    });

    it('should detect wedding planner service FAQs correctly', async () => {
      const plannerFAQs = [
        {
          question: 'What does your full planning service include?',
          answer:
            'Full planning includes: venue selection, vendor coordination, timeline creation, budget management, and day-of coordination. Investment starts at $4,500.',
          selector: '.planner-faq',
        },
        {
          question: 'How many meetings are included in your planning service?',
          answer:
            'Full planning includes unlimited meetings and communication. We typically have 8-10 formal planning meetings leading up to your wedding.',
          selector: '.planner-faq',
        },
      ];

      mockPage.evaluate.mockResolvedValue(plannerFAQs);

      const faqs = await scraper.extractFAQs(
        'https://planner.com/services',
        'planner-user',
      );

      expect(faqs).toHaveLength(2);
      expect(faqs[0].question).toContain('full planning service');
      expect(faqs[0].answer).toContain('$4,500');
      expect(faqs[1].question).toContain('meetings');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent scraping requests', async () => {
      mockPage.evaluate.mockResolvedValue([
        {
          question: 'Test question?',
          answer: 'Test answer',
          selector: '.faq',
        },
      ]);

      const urls = [
        'https://site1.com/faq',
        'https://site2.com/faq',
        'https://site3.com/faq',
        'https://site4.com/faq',
        'https://site5.com/faq',
      ];

      const results = await Promise.allSettled(
        urls.map((url) => scraper.extractFAQs(url, 'concurrent-user')),
      );

      const successfulResults = results.filter((r) => r.status === 'fulfilled');
      expect(successfulResults.length).toBe(5);
    });

    it('should complete scraping within performance threshold', async () => {
      const largeFAQSet = Array.from({ length: 50 }, (_, i) => ({
        question: `Question ${i + 1}?`,
        answer: `This is answer ${i + 1} with sufficient detail to make it realistic for wedding vendor FAQ content.`,
        selector: '.faq',
      }));

      mockPage.evaluate.mockResolvedValue(largeFAQSet);

      const startTime = Date.now();
      const faqs = await scraper.extractFAQs(
        'https://large-site.com/faq',
        'perf-user',
      );
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(duration).toBeLessThan(30000); // Must complete within 30 seconds
      expect(faqs.length).toBe(50);
    });

    it('should retry failed requests up to maximum attempts', async () => {
      let attemptCount = 0;
      mockPage.goto.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Connection failed');
        }
        return Promise.resolve();
      });

      mockPage.evaluate.mockResolvedValue([
        {
          question: 'Success after retries?',
          answer: 'Yes, this worked on the third try!',
          selector: '.faq',
        },
      ]);

      const faqs = await scraper.extractFAQs(
        'https://unreliable-site.com',
        'retry-user',
      );

      expect(attemptCount).toBe(3);
      expect(faqs).toHaveLength(1);
      expect(faqs[0].question).toBe('Success after retries?');
    });
  });
});
