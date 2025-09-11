import { OpenAI } from 'openai';

// Types
export interface ClientContext {
  name: string;
  weddingDate?: string;
  venue?: string;
  inquiryType: 'booking' | 'follow-up' | 'confirmation' | 'general';
  personalNotes?: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface MobileEmailTemplate {
  id: string;
  subject: string;
  content: string;
  tone: 'professional' | 'friendly' | 'warm' | 'urgent';
  stage: 'inquiry' | 'booking' | 'pre-wedding' | 'post-wedding';
  confidence: number;
  wordCount: number;
  estimatedReadTime: string;
  mobileOptimized: boolean;
  touchFriendly: boolean;
}

export interface MobileEmailGenerationRequest {
  clientContext: ClientContext;
  maxVariants?: number;
  maxTokens?: number;
  mobileOptimized?: boolean;
  touchFriendly?: boolean;
  offlineMode?: boolean;
}

export interface NetworkState {
  isOnline: boolean;
  connectionSpeed: 'slow-2g' | '2g' | '3g' | '4g' | 'fast';
  saveData: boolean;
}

export interface BatteryState {
  level: number;
  charging: boolean;
  dischargingTime: number;
}

// Mobile performance optimizer class
export class MobileAIEmailOptimizer {
  private openai: OpenAI | null = null;
  private cache: Map<string, MobileEmailTemplate[]> = new Map();
  private networkState: NetworkState = {
    isOnline: navigator.onLine,
    connectionSpeed: '4g',
    saveData: false,
  };
  private batteryState: BatteryState | null = null;
  private requestQueue: MobileEmailGenerationRequest[] = [];
  private isProcessing = false;

  constructor() {
    this.initializeNetworkMonitoring();
    this.initializeBatteryMonitoring();
    this.initializeOpenAI();
  }

  // Initialize OpenAI client with mobile-optimized settings
  private initializeOpenAI() {
    try {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        dangerouslyAllowBrowser: true, // Only for client-side usage
      });
    } catch (error) {
      console.warn(
        'OpenAI initialization failed - falling back to cached templates',
      );
    }
  }

  // Network state monitoring for mobile optimization
  private initializeNetworkMonitoring() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.networkState.isOnline = true;
      this.processPendingRequests();
    });

    window.addEventListener('offline', () => {
      this.networkState.isOnline = false;
    });

    // Network Information API (when available)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      const updateConnectionInfo = () => {
        this.networkState.connectionSpeed = connection.effectiveType || '4g';
        this.networkState.saveData = connection.saveData || false;
      };

      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);
    }
  }

  // Battery API monitoring for performance optimization
  private async initializeBatteryMonitoring() {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();

        const updateBatteryInfo = () => {
          this.batteryState = {
            level: battery.level,
            charging: battery.charging,
            dischargingTime: battery.dischargingTime,
          };
        };

        updateBatteryInfo();
        battery.addEventListener('levelchange', updateBatteryInfo);
        battery.addEventListener('chargingchange', updateBatteryInfo);
      }
    } catch (error) {
      console.warn('Battery API not available');
    }
  }

  // Main mobile-optimized template generation
  async generateMobileOptimizedTemplates(
    request: MobileEmailGenerationRequest,
  ): Promise<MobileEmailTemplate[]> {
    // Check for cached results first
    const cacheKey = this.generateCacheKey(request);
    const cachedResult = this.cache.get(cacheKey);

    if (cachedResult) {
      return cachedResult;
    }

    // If offline, return cached alternatives or fallback templates
    if (!this.networkState.isOnline) {
      return this.generateOfflineTemplates(request);
    }

    // Optimize request based on mobile conditions
    const optimizedRequest = this.optimizeForMobileConditions(request);

    try {
      const templates = await this.generateWithAI(optimizedRequest);

      // Cache the results
      this.cache.set(cacheKey, templates);

      // Limit cache size for mobile memory management
      if (this.cache.size > 50) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      return templates;
    } catch (error) {
      console.error('AI generation failed:', error);

      // Fallback to offline templates
      return this.generateOfflineTemplates(request);
    }
  }

  // Optimize request parameters based on mobile conditions
  private optimizeForMobileConditions(
    request: MobileEmailGenerationRequest,
  ): MobileEmailGenerationRequest {
    const optimized = { ...request };

    // Reduce variants on slow connections or low battery
    if (
      this.networkState.connectionSpeed === 'slow-2g' ||
      this.networkState.connectionSpeed === '2g'
    ) {
      optimized.maxVariants = Math.min(optimized.maxVariants || 3, 2);
    }

    if (
      this.batteryState &&
      this.batteryState.level < 0.2 &&
      !this.batteryState.charging
    ) {
      optimized.maxVariants = Math.min(optimized.maxVariants || 3, 1);
      optimized.maxTokens = Math.min(optimized.maxTokens || 300, 150);
    }

    // Enable data saving mode if requested
    if (this.networkState.saveData) {
      optimized.maxTokens = Math.min(optimized.maxTokens || 300, 200);
      optimized.maxVariants = Math.min(optimized.maxVariants || 3, 2);
    }

    return optimized;
  }

  // AI-powered template generation with mobile-specific prompts
  private async generateWithAI(
    request: MobileEmailGenerationRequest,
  ): Promise<MobileEmailTemplate[]> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    const { clientContext, maxVariants = 3, maxTokens = 300 } = request;
    const mobilePrompt = this.buildMobileOptimizedPrompt(clientContext);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Faster and cheaper for mobile
      messages: [
        {
          role: 'system',
          content: `You are a wedding photographer's email assistant. Generate ${maxVariants} email templates optimized for mobile viewing. Each email should be:
          - Concise (under ${maxTokens / maxVariants} words each)
          - Easy to read on small screens
          - Professional but personal
          - Include clear calls-to-action
          - Suitable for the wedding industry
          
          Return ONLY a JSON array of objects with this structure:
          {
            "subject": "Email subject line",
            "content": "Email body content",
            "tone": "professional|friendly|warm|urgent",
            "stage": "inquiry|booking|pre-wedding|post-wedding",
            "confidence": 0.0-1.0
          }`,
        },
        {
          role: 'user',
          content: mobilePrompt,
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const rawTemplates = JSON.parse(
      completion.choices[0]?.message?.content || '[]',
    );

    return rawTemplates.map(
      (template: any, index: number): MobileEmailTemplate => ({
        id: `mobile-ai-${Date.now()}-${index}`,
        subject: template.subject,
        content: template.content,
        tone: template.tone || 'professional',
        stage: template.stage || 'inquiry',
        confidence: template.confidence || 0.8,
        wordCount: template.content.split(' ').length,
        estimatedReadTime: this.calculateReadTime(template.content),
        mobileOptimized: true,
        touchFriendly: true,
      }),
    );
  }

  // Mobile-optimized prompt builder
  private buildMobileOptimizedPrompt(context: ClientContext): string {
    const urgencyLevel =
      context.urgency === 'high'
        ? 'urgent'
        : context.urgency === 'low'
          ? 'casual'
          : 'professional';

    return `
    Create email templates for a wedding photographer responding to a client inquiry:
    
    Client Details:
    - Name: ${context.name}
    ${context.weddingDate ? `- Wedding Date: ${context.weddingDate}` : ''}
    ${context.venue ? `- Venue: ${context.venue}` : ''}
    - Inquiry Type: ${context.inquiryType}
    - Priority: ${urgencyLevel}
    ${context.personalNotes ? `- Notes: ${context.personalNotes}` : ''}
    
    Mobile Optimization Requirements:
    - Keep paragraphs short (2-3 sentences max)
    - Use bullet points when listing services
    - Include clear next steps
    - Mobile-friendly formatting
    - Engaging subject lines under 50 characters
    - Professional yet personal tone appropriate for ${context.inquiryType}
    
    Generate templates with varying approaches: formal, friendly, and warm tones.
    `;
  }

  // Offline template generation using pre-cached patterns
  private generateOfflineTemplates(
    request: MobileEmailGenerationRequest,
  ): MobileEmailTemplate[] {
    const { clientContext } = request;
    const templates: MobileEmailTemplate[] = [];

    // Template patterns for different inquiry types
    const patterns = {
      booking: {
        subjects: [
          `Hi ${clientContext.name}! Let's capture your special day ✨`,
          `${clientContext.name}, I'd love to photograph your wedding!`,
          `Your wedding photography - Let's chat!`,
        ],
        content: [
          `Hi ${clientContext.name}!\n\nThank you for reaching out about your wedding photography! I'm thrilled you're considering me to capture your special day.\n\n${clientContext.weddingDate ? `Your ${clientContext.weddingDate} wedding` : 'Your wedding'} sounds absolutely beautiful${clientContext.venue ? ` at ${clientContext.venue}` : ''}.\n\nI'd love to set up a time to chat about your vision and how I can help make your day unforgettable.\n\nWould you be available for a quick call this week?\n\nBest regards,\n[Your Name]`,

          `Hello ${clientContext.name},\n\nI just received your inquiry and I'm so excited about the possibility of working together!\n\nAs a wedding photographer, I understand how important it is to find someone who truly gets your vision. I'd love to learn more about your story and what you're dreaming of for your big day.\n\nCould we schedule a brief consultation? I find it's the best way to see if we're a perfect match.\n\nLooking forward to hearing from you!\n\nWarmly,\n[Your Name]`,
        ],
      },
      followUp: {
        subjects: [
          `${clientContext.name}, just checking in! 📸`,
          `Following up on your wedding photography`,
          `Hi ${clientContext.name}! Any questions for me?`,
        ],
        content: [
          `Hi ${clientContext.name},\n\nI wanted to follow up on our previous conversation about your wedding photography.\n\nI know planning a wedding can be overwhelming with so many decisions to make. If you have any questions about my services or would like to schedule a consultation, I'm here to help!\n\nNo pressure at all - just wanted you to know I'm thinking of you and your special day.\n\nBest,\n[Your Name]`,
        ],
      },
      confirmation: {
        subjects: [
          `${clientContext.name}, it's official! 🎉`,
          `Welcome to the [Studio Name] family!`,
          `Your wedding photography is confirmed!`,
        ],
        content: [
          `Dear ${clientContext.name},\n\nI'm absolutely thrilled to officially welcome you to the [Studio Name] family!\n\n${clientContext.weddingDate ? `I can't wait to capture every magical moment of your ${clientContext.weddingDate} wedding` : "I can't wait to capture every magical moment of your wedding"}${clientContext.venue ? ` at ${clientContext.venue}` : ''}.\n\nWhat's next:\n• I'll send your welcome packet within 24 hours\n• We'll schedule your engagement session\n• I'll be in touch as your wedding day approaches\n\nThank you for trusting me with your memories!\n\n[Your Name]`,
        ],
      },
      general: {
        subjects: [
          `Hi ${clientContext.name}! Thanks for your message`,
          `${clientContext.name}, I'd love to help!`,
          `Thanks for reaching out!`,
        ],
        content: [
          `Hi ${clientContext.name},\n\nThank you for your message! I appreciate you taking the time to reach out.\n\nI'd be happy to help answer any questions you have about wedding photography or discuss how I can be part of your special day.\n\nFeel free to give me a call or reply to this email with any questions.\n\nLooking forward to hearing from you!\n\nBest,\n[Your Name]`,
        ],
      },
    };

    const pattern = patterns[clientContext.inquiryType] || patterns.general;

    // Generate templates based on available patterns
    pattern.subjects.forEach((subject, index) => {
      if (index < (request.maxVariants || 3)) {
        const content = pattern.content[index] || pattern.content[0];
        const tone =
          index === 0 ? 'professional' : index === 1 ? 'friendly' : 'warm';

        templates.push({
          id: `offline-${clientContext.inquiryType}-${index}`,
          subject,
          content,
          tone: tone as any,
          stage: clientContext.inquiryType as any,
          confidence: 0.75, // Lower confidence for offline templates
          wordCount: content.split(' ').length,
          estimatedReadTime: this.calculateReadTime(content),
          mobileOptimized: true,
          touchFriendly: true,
        });
      }
    });

    return templates;
  }

  // Calculate estimated reading time
  private calculateReadTime(content: string): string {
    const wordsPerMinute = 200; // Average reading speed
    const words = content.split(' ').length;
    const minutes = Math.ceil(words / wordsPerMinute);

    if (minutes < 1) {
      return '< 1 min read';
    } else if (minutes === 1) {
      return '1 min read';
    } else {
      return `${minutes} min read`;
    }
  }

  // Generate cache key for request
  private generateCacheKey(request: MobileEmailGenerationRequest): string {
    const { clientContext, maxVariants, mobileOptimized } = request;
    const keyData = {
      name: clientContext.name,
      inquiryType: clientContext.inquiryType,
      urgency: clientContext.urgency,
      maxVariants,
      mobileOptimized,
    };

    return btoa(JSON.stringify(keyData));
  }

  // Process pending requests when back online
  private async processPendingRequests() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await this.generateMobileOptimizedTemplates(request);
        } catch (error) {
          console.error('Failed to process queued request:', error);
        }
      }
    }

    this.isProcessing = false;
  }

  // Queue request for later processing when offline
  public queueForLater(request: MobileEmailGenerationRequest) {
    this.requestQueue.push(request);
  }

  // Clear cache (useful for memory management)
  public clearCache() {
    this.cache.clear();
  }

  // Get current network and performance state
  public getPerformanceState() {
    return {
      networkState: this.networkState,
      batteryState: this.batteryState,
      cacheSize: this.cache.size,
      queueSize: this.requestQueue.length,
    };
  }

  // Progressive loading for large template sets
  public async generateTemplatesProgressively(
    request: MobileEmailGenerationRequest,
    onProgress?: (templates: MobileEmailTemplate[], progress: number) => void,
  ): Promise<MobileEmailTemplate[]> {
    const maxVariants = request.maxVariants || 3;
    const templates: MobileEmailTemplate[] = [];

    for (let i = 0; i < maxVariants; i++) {
      const singleRequest = {
        ...request,
        maxVariants: 1,
      };

      try {
        const singleTemplate =
          await this.generateMobileOptimizedTemplates(singleRequest);
        templates.push(...singleTemplate);

        if (onProgress) {
          onProgress(templates, (i + 1) / maxVariants);
        }
      } catch (error) {
        console.error(`Failed to generate template ${i + 1}:`, error);
        break;
      }
    }

    return templates;
  }
}
