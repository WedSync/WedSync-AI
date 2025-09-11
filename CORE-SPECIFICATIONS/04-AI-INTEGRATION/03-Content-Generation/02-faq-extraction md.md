# 02-faq-extraction.md

## What to Build

Website scraper that extracts and structures FAQs from supplier websites.

## Key Technical Requirements

### Website Scraper

```
import { chromium } from 'playwright'

class FAQExtractor {
  async scrapeWebsite(url: string) {
    const browser = await chromium.launch()
    const page = await browser.newPage()
    await page.goto(url)
    
    // Find FAQ sections
    const faqSelectors = [
      '[class*="faq"]',
      '[id*="faq"]',
      'h2:has-text("FAQ")',
      'h2:has-text("Questions")'
    ]
    
    let content = ''
    for (const selector of faqSelectors) {
      const elements = await page.$$(selector)
      for (const el of elements) {
        content += await el.textContent() + '\n'
      }
    }
    
    return this.extractQA(content)
  }
  
  async extractQA(content: string) {
    const extracted = await openai.complete({
      prompt: `Extract Q&A pairs from this website content:
${content}

Return as JSON array with 'question' and 'answer' fields`,
      model: 'gpt-3.5-turbo',
      response_format: { type: 'json_object' }
    })
    
    return JSON.parse(extracted)
  }
}
```

### FAQ Categorization

```
const categorizeFAQs = (faqs: FAQ[]) => {
  const categories = {
    pricing: /price|cost|payment|deposit/i,
    booking: /book|available|schedule|date/i,
    service: /include|provide|offer|deliver/i,
    logistics: /time|location|travel|setup/i
  }
  
  return [faqs.map](http://faqs.map)(faq => {
    let category = 'general'
    
    for (const [cat, pattern] of Object.entries(categories)) {
      if (pattern.test(faq.question) || pattern.test(faq.answer)) {
        category = cat
        break
      }
    }
    
    return { ...faq, category }
  })
}
```

### Wedding-Specific FAQ Enhancement

```
class WeddingFAQEnhancer {
  async enhanceForWeddings(faqs: FAQ[], vendorType: string): Promise<FAQ[]> {
    return [faqs.map](http://faqs.map)(faq => {
      // Add wedding context to generic FAQs
      if (!faq.question.toLowerCase().includes('wedding')) {
        faq.question = this.addWeddingContext(faq.question, vendorType)
      }
      
      return faq
    })
  }
  
  private addWeddingContext(question: string, vendorType: string): string {
    const contexts = {
      photographer: 'for my wedding',
      dj: 'for my wedding reception',
      caterer: 'for my wedding'
    }
    
    return `${question} ${contexts[vendorType] || 'for my wedding'}?`
  }
}
```

### API Endpoints

```
// Extract FAQs from website
POST /api/faqs/extract
{
  url: string,
  vendorType: string
}

// Review extracted FAQs  
POST /api/faqs/:id/review
{
  approved: boolean,
  edits?: any
}
```

```

```

## Critical Implementation Notes

- Respect robots.txt and rate limits
- Cache scraped content for 30 days
- Manual review queue for extracted FAQs

## FAQ Storage

```
CREATE TABLE extracted_faqs (
  id UUID PRIMARY KEY,
  supplier_id UUID,
  question TEXT,
  answer TEXT,
  category TEXT,
  source_url TEXT,
  approved BOOLEAN DEFAULT false
);
```