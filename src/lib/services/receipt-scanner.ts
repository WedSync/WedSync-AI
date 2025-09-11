import { GoogleVisionClient } from '@/lib/ocr/google-vision';

export interface ReceiptData {
  vendor: string;
  date: Date | null;
  totalAmount: number;
  items: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>;
  taxAmount?: number;
  tipAmount?: number;
  paymentMethod?: string;
  receiptNumber?: string;
  category?: string;
  confidence: number;
}

export interface ScanResult {
  success: boolean;
  data?: ReceiptData;
  error?: string;
  rawText?: string;
}

export class ReceiptScannerService {
  private visionClient: GoogleVisionClient;

  constructor() {
    this.visionClient = new GoogleVisionClient();
  }

  async scanReceipt(imageFile: File | Blob): Promise<ScanResult> {
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(imageFile);

      // Use Google Vision API to extract text
      const extractedText = await this.visionClient.extractText(base64);

      if (!extractedText) {
        return {
          success: false,
          error: 'No text found in image',
        };
      }

      // Parse the extracted text
      const receiptData = this.parseReceiptText(extractedText);

      return {
        success: true,
        data: receiptData,
        rawText: extractedText,
      };
    } catch (error) {
      console.error('Receipt scanning error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to scan receipt',
      };
    }
  }

  async scanReceiptFromUrl(imageUrl: string): Promise<ScanResult> {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return this.scanReceipt(blob);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch image from URL',
      };
    }
  }

  private async fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get pure base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private parseReceiptText(text: string): ReceiptData {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line);

    const receiptData: ReceiptData = {
      vendor: this.extractVendor(lines),
      date: this.extractDate(lines),
      totalAmount: this.extractTotal(lines),
      items: this.extractItems(lines),
      taxAmount: this.extractTax(lines),
      tipAmount: this.extractTip(lines),
      paymentMethod: this.extractPaymentMethod(lines),
      receiptNumber: this.extractReceiptNumber(lines),
      category: this.categorizeReceipt(lines),
      confidence: 0,
    };

    // Calculate confidence based on extracted data
    receiptData.confidence = this.calculateConfidence(receiptData);

    return receiptData;
  }

  private extractVendor(lines: string[]): string {
    // Usually vendor name is in the first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      // Skip common receipt headers
      if (!this.isCommonHeader(line) && line.length > 3) {
        return line;
      }
    }
    return 'Unknown Vendor';
  }

  private extractDate(lines: string[]): Date | null {
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{2,4}/, // MM/DD/YYYY or M/D/YY
      /\d{1,2}-\d{1,2}-\d{2,4}/, // MM-DD-YYYY
      /\d{4}-\d{1,2}-\d{1,2}/, // YYYY-MM-DD
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i,
      /\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i,
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          const date = new Date(match[0]);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    }

    return null;
  }

  private extractTotal(lines: string[]): number {
    const totalPatterns = [
      /total[:\s]+\$?([\d,]+\.?\d*)/i,
      /amount[:\s]+\$?([\d,]+\.?\d*)/i,
      /grand\s+total[:\s]+\$?([\d,]+\.?\d*)/i,
      /balance[:\s]+\$?([\d,]+\.?\d*)/i,
      /\$?([\d,]+\.\d{2})$/, // Look for currency amounts at end of lines
    ];

    // Start from bottom as total is usually at the end
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      for (const pattern of totalPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(amount) && amount > 0) {
            return amount;
          }
        }
      }
    }

    // Fallback: find the largest amount
    let maxAmount = 0;
    for (const line of lines) {
      const amounts = line.match(/\$?([\d,]+\.\d{2})/g) || [];
      for (const amountStr of amounts) {
        const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
        if (amount > maxAmount) {
          maxAmount = amount;
        }
      }
    }

    return maxAmount;
  }

  private extractItems(
    lines: string[],
  ): Array<{ description: string; amount: number }> {
    const items: Array<{
      description: string;
      amount: number;
      quantity?: number;
    }> = [];
    const itemPattern = /^(.+?)\s+\$?([\d,]+\.?\d*)$/;
    const quantityPattern = /^(\d+)\s+(.+?)\s+\$?([\d,]+\.?\d*)$/;

    for (const line of lines) {
      // Skip totals, tax, etc.
      if (this.isMetaLine(line)) continue;

      const quantityMatch = line.match(quantityPattern);
      if (quantityMatch) {
        items.push({
          quantity: parseInt(quantityMatch[1]),
          description: quantityMatch[2].trim(),
          amount: parseFloat(quantityMatch[3].replace(/,/g, '')),
        });
      } else {
        const match = line.match(itemPattern);
        if (match) {
          const amount = parseFloat(match[2].replace(/,/g, ''));
          if (!isNaN(amount) && amount > 0 && amount < 10000) {
            items.push({
              description: match[1].trim(),
              amount,
            });
          }
        }
      }
    }

    return items;
  }

  private extractTax(lines: string[]): number | undefined {
    const taxPatterns = [
      /tax[:\s]+\$?([\d,]+\.?\d*)/i,
      /sales\s+tax[:\s]+\$?([\d,]+\.?\d*)/i,
      /vat[:\s]+\$?([\d,]+\.?\d*)/i,
      /gst[:\s]+\$?([\d,]+\.?\d*)/i,
    ];

    for (const line of lines) {
      for (const pattern of taxPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(amount) && amount > 0) {
            return amount;
          }
        }
      }
    }

    return undefined;
  }

  private extractTip(lines: string[]): number | undefined {
    const tipPatterns = [
      /tip[:\s]+\$?([\d,]+\.?\d*)/i,
      /gratuity[:\s]+\$?([\d,]+\.?\d*)/i,
      /service[:\s]+\$?([\d,]+\.?\d*)/i,
    ];

    for (const line of lines) {
      for (const pattern of tipPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(amount) && amount > 0) {
            return amount;
          }
        }
      }
    }

    return undefined;
  }

  private extractPaymentMethod(lines: string[]): string | undefined {
    const paymentPatterns = [
      /visa/i,
      /mastercard/i,
      /amex/i,
      /american express/i,
      /discover/i,
      /cash/i,
      /debit/i,
      /credit/i,
      /check/i,
      /paypal/i,
      /venmo/i,
      /zelle/i,
    ];

    for (const line of lines) {
      for (const pattern of paymentPatterns) {
        if (pattern.test(line)) {
          const match = line.match(pattern);
          if (match) {
            return match[0].toUpperCase();
          }
        }
      }
    }

    // Look for card ending
    const cardEndingPattern = /\*{3,}\d{4}/;
    for (const line of lines) {
      if (cardEndingPattern.test(line)) {
        return 'CARD';
      }
    }

    return undefined;
  }

  private extractReceiptNumber(lines: string[]): string | undefined {
    const receiptPatterns = [
      /receipt[#:\s]+([A-Z0-9-]+)/i,
      /invoice[#:\s]+([A-Z0-9-]+)/i,
      /order[#:\s]+([A-Z0-9-]+)/i,
      /transaction[#:\s]+([A-Z0-9-]+)/i,
      /ref[#:\s]+([A-Z0-9-]+)/i,
    ];

    for (const line of lines) {
      for (const pattern of receiptPatterns) {
        const match = line.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }

    return undefined;
  }

  private categorizeReceipt(lines: string[]): string {
    const text = lines.join(' ').toLowerCase();

    const categories = {
      venue: ['venue', 'hall', 'ballroom', 'resort', 'hotel', 'country club'],
      catering: [
        'catering',
        'food',
        'beverage',
        'restaurant',
        'cuisine',
        'menu',
      ],
      photography: ['photo', 'camera', 'portrait', 'album', 'prints'],
      videography: ['video', 'film', 'cinematography', 'dvd'],
      flowers: ['flower', 'floral', 'bouquet', 'arrangement', 'centerpiece'],
      music: ['dj', 'band', 'music', 'entertainment', 'sound'],
      decoration: ['decor', 'decoration', 'lighting', 'draping', 'rental'],
      attire: ['dress', 'gown', 'tux', 'suit', 'alteration', 'bridal'],
      beauty: ['makeup', 'hair', 'salon', 'spa', 'beauty'],
      transportation: ['limo', 'car', 'transport', 'shuttle', 'vehicle'],
      jewelry: ['ring', 'jewelry', 'diamond', 'gold', 'jeweler'],
      stationery: ['invitation', 'card', 'print', 'stationery', 'envelope'],
      favors: ['favor', 'gift', 'souvenir', 'thank you'],
      cake: ['cake', 'bakery', 'dessert', 'sweet'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return category;
        }
      }
    }

    return 'other';
  }

  private isCommonHeader(line: string): boolean {
    const headers = [
      'receipt',
      'invoice',
      'bill',
      'thank you',
      'customer copy',
    ];
    const lowercaseLine = line.toLowerCase();
    return headers.some((header) => lowercaseLine.includes(header));
  }

  private isMetaLine(line: string): boolean {
    const metaKeywords = [
      'total',
      'subtotal',
      'tax',
      'tip',
      'gratuity',
      'balance',
      'amount due',
      'change',
      'cash',
      'card',
      'thank you',
      'receipt',
      'invoice',
    ];
    const lowercaseLine = line.toLowerCase();
    return metaKeywords.some((keyword) => lowercaseLine.includes(keyword));
  }

  private calculateConfidence(data: ReceiptData): number {
    let confidence = 0;
    let factors = 0;

    // Check vendor
    if (data.vendor && data.vendor !== 'Unknown Vendor') {
      confidence += 0.2;
      factors++;
    }

    // Check date
    if (data.date) {
      confidence += 0.2;
      factors++;
    }

    // Check total
    if (data.totalAmount > 0) {
      confidence += 0.3;
      factors++;
    }

    // Check items
    if (data.items.length > 0) {
      confidence += 0.2;
      factors++;
    }

    // Check if items sum is close to total
    if (data.items.length > 0 && data.totalAmount > 0) {
      const itemsSum = data.items.reduce((sum, item) => sum + item.amount, 0);
      const taxAndTip = (data.taxAmount || 0) + (data.tipAmount || 0);
      const calculatedTotal = itemsSum + taxAndTip;
      const difference = Math.abs(calculatedTotal - data.totalAmount);
      const percentDiff = difference / data.totalAmount;

      if (percentDiff < 0.1) {
        confidence += 0.1;
        factors++;
      }
    }

    return factors > 0 ? confidence : 0;
  }

  // Manual correction methods
  correctVendor(data: ReceiptData, vendor: string): ReceiptData {
    return { ...data, vendor };
  }

  correctTotal(data: ReceiptData, totalAmount: number): ReceiptData {
    return { ...data, totalAmount };
  }

  correctDate(data: ReceiptData, date: Date): ReceiptData {
    return { ...data, date };
  }

  correctCategory(data: ReceiptData, category: string): ReceiptData {
    return { ...data, category };
  }
}
