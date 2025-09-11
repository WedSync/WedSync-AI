# WS-253 Florist Intelligence System - Team C Integration Prompt

## EVIDENCE OF REALITY REQUIREMENTS (CRITICAL)
**MANDATORY: This task is incomplete until ALL evidence below is provided:**

### OpenAI API Integration Testing (MANDATORY)
```bash
# MUST show successful OpenAI API calls with proper responses:
cd wedsync
node -e "
const openai = new (require('openai')).default({apiKey: process.env.OPENAI_API_KEY});
openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{role: 'user', content: 'Generate a wedding color palette for roses in spring'}],
  response_format: { type: 'json_object' },
  max_tokens: 500
}).then(r => console.log('OpenAI Success:', JSON.parse(r.choices[0].message.content)));
"
```

### External API Circuit Breaker Testing (MANDATORY)
```bash
# MUST demonstrate circuit breaker functionality:
curl -X POST http://localhost:3000/api/florist/external/test-circuit-breaker \
  -H "Content-Type: application/json" \
  -d '{"service": "openai", "simulate_failure": true}'
# Should show circuit breaker opening after failures

curl -X GET http://localhost:3000/api/florist/external/circuit-status
# Should show current circuit breaker states
```

### Rate Limiting Verification (MANDATORY)
```bash
# MUST show rate limiting working:
for i in {1..15}; do 
  curl -X POST http://localhost:3000/api/florist/palette/generate \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer TOKEN" \
    -d '{"baseColors":["#FF0000"],"style":"romantic","season":"spring"}'
  echo "Request $i completed"
done
# Should show 429 Too Many Requests after limit exceeded
```

### Color API Integration Testing (MANDATORY)
```bash
# MUST show successful color conversion and analysis:
curl -X POST http://localhost:3000/api/florist/colors/analyze \
  -H "Content-Type: application/json" \
  -d '{"colors": ["#FF69B4", "#FFFFFF", "#32CD32"], "harmony_type": "complementary"}'
# Should return detailed color analysis with LAB values, harmony scores
```

### External Flower Data Integration (MANDATORY)
```bash
# MUST show successful flower database synchronization:
curl -X POST http://localhost:3000/api/florist/data/sync \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Should sync flower data from external sources
```

## TEAM C SPECIALIZATION - INTEGRATION FOCUS

### Primary Responsibilities
1. **OpenAI API Client**: Robust integration with prompt engineering, error handling, response parsing
2. **Color Theory APIs**: External color palette APIs, color harmony calculations, LAB color space conversions
3. **Flower Data Synchronization**: Integration with external flower databases and pricing APIs
4. **Circuit Breaker Implementation**: Resilient external service integration with fallback mechanisms
5. **Caching Layer**: Redis-based caching for AI responses, color calculations, and flower data

### Core Integration Services to Build

#### 1. OpenAI Service Client with Circuit Breaker
```typescript
// File: /src/lib/integrations/openai-florist-client.ts
import { OpenAI } from 'openai';
import { CircuitBreaker } from '@/lib/integrations/circuit-breaker';
import { Redis } from '@/lib/cache/redis';
import { rateLimiter } from '@/lib/rate-limit';
import crypto from 'crypto';

export interface ColorPaletteRequest {
  baseColors: string[];
  style: string;
  season: string;
  preferences?: {
    include_neutrals?: boolean;
    accent_count?: number;
    harmony_type?: string;
  };
}

export interface ColorPaletteResponse {
  primary_colors: Array<{ hex: string; name: string; description: string }>;
  accent_colors: Array<{ hex: string; name: string; description: string }>;
  neutral_colors: Array<{ hex: string; name: string; description: string }>;
  palette_name: string;
  style_reasoning: string;
  seasonal_appropriateness: string;
}

export interface FlowerRecommendationRequest {
  criteria: {
    colors?: string[];
    season?: string;
    style?: string;
    wedding_uses?: string[];
    budget_range?: { min: number; max: number };
  };
  context: {
    wedding_date?: string;
    venue_type?: string;
    guest_count?: number;
  };
}

export class OpenAIFloristClient {
  private openai: OpenAI;
  private circuitBreaker: CircuitBreaker;
  private redis: Redis;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000, // 30 second timeout
      maxRetries: 2
    });

    // Circuit breaker configuration for OpenAI API
    this.circuitBreaker = new CircuitBreaker({
      name: 'openai-florist',
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 30000, // 30 seconds
      fallbackResponse: this.getFallbackResponse.bind(this)
    });

    this.redis = new Redis();
  }

  async generateColorPalette(request: ColorPaletteRequest, userId?: string): Promise<ColorPaletteResponse> {
    try {
      // Rate limiting per user
      if (userId) {
        await rateLimiter.check(`openai:color_palette:${userId}`, 10, '1h');
      }

      // Check cache first
      const cacheKey = this.generateCacheKey('color_palette', request);
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Execute through circuit breaker
      const result = await this.circuitBreaker.execute(async () => {
        return await this.callOpenAIForColorPalette(request);
      });

      // Cache successful results for 24 hours
      await this.redis.setex(cacheKey, 86400, JSON.stringify(result));

      return result;

    } catch (error) {
      console.error('OpenAI color palette generation failed:', error);
      
      if (error.message?.includes('rate_limit_exceeded')) {
        throw new Error('AI service rate limit exceeded. Please try again in a few minutes.');
      }
      
      if (error.message?.includes('insufficient_quota')) {
        throw new Error('AI service quota exceeded. Please contact support.');
      }

      // Return fallback if circuit is open
      if (this.circuitBreaker.isOpen()) {
        return this.getFallbackColorPalette(request);
      }

      throw new Error(`AI color palette generation failed: ${error.message}`);
    }
  }

  private async callOpenAIForColorPalette(request: ColorPaletteRequest): Promise<ColorPaletteResponse> {
    const prompt = this.buildColorPalettePrompt(request);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: this.getColorPaletteSystemPrompt()
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 800,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response received from OpenAI');
    }

    try {
      const parsed = JSON.parse(responseText);
      this.validateColorPaletteResponse(parsed);
      return parsed;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error('Invalid response format from AI service');
    }
  }

  private getColorPaletteSystemPrompt(): string {
    return `You are a professional wedding color consultant with expertise in color theory, floral design, and seasonal appropriateness. 

Your responsibilities:
1. Create sophisticated, harmonious color palettes for weddings
2. Consider seasonal flower availability and appropriateness
3. Ensure colors work well together using color theory principles
4. Provide practical reasoning for color choices
5. Always respond with valid JSON in the exact format requested

Color theory guidelines:
- Use complementary colors for high contrast and visual interest
- Use analogous colors for harmony and cohesion
- Consider color temperature (warm vs cool) for seasonal appropriateness
- Ensure sufficient contrast for accessibility
- Account for how colors appear in different lighting conditions

Seasonal considerations:
- Spring: Fresh, light colors that evoke renewal and growth
- Summer: Vibrant, bold colors that work in bright sunlight
- Fall: Warm, rich colors that complement autumn foliage
- Winter: Cool, elegant colors or warm, cozy tones

Wedding style considerations:
- Romantic: Soft, flowing, dreamy colors with subtle variations
- Modern: Clean, bold, contemporary colors with strong contrasts  
- Rustic: Earthy, natural, organic colors inspired by nature
- Classic: Timeless, sophisticated colors that never go out of style
- Bohemian: Rich, eclectic, artistic colors with unique combinations

Always provide valid JSON only. No additional text or explanations outside the JSON structure.`;
  }

  private buildColorPalettePrompt(request: ColorPaletteRequest): string {
    const { baseColors, style, season, preferences = {} } = request;
    
    return `Create a sophisticated wedding color palette based on these requirements:

Base Colors: ${baseColors.join(', ')}
Wedding Style: ${style}
Season: ${season}
Include Neutrals: ${preferences.include_neutrals !== false}
Accent Count: ${preferences.accent_count || 2}
${preferences.harmony_type ? `Preferred Harmony: ${preferences.harmony_type}` : ''}

Generate a complete color palette including:

1. PRIMARY COLORS (2-3 colors):
   - Main wedding colors that will be most prominent
   - Should include or build upon the provided base colors
   - Ensure these work well in ${season} lighting conditions

2. ACCENT COLORS (${preferences.accent_count || 2} colors):
   - Supporting colors that complement the primary palette
   - Can be bolder or more dramatic for visual interest
   - Should enhance the ${style} aesthetic

3. NEUTRAL COLORS (1-2 colors):
   - Balancing colors like creams, whites, or soft grays
   - Should ground the palette and provide rest for the eye
   - Must work with ${style} wedding style

Consider ${season} seasonal characteristics:
${this.getSeasonalGuidelines(season)}

For ${style} style weddings:
${this.getStyleGuidelines(style)}

Ensure all colors:
- Work harmoniously together using proper color theory
- Are achievable with real flowers in ${season}
- Provide appropriate contrast for accessibility
- Look sophisticated in wedding photography

Return as JSON with this exact structure:
{
  "primary_colors": [{"hex": "#hexcode", "name": "Color Name", "description": "Why this color works for this wedding"}],
  "accent_colors": [{"hex": "#hexcode", "name": "Color Name", "description": "Role and impact in the palette"}],
  "neutral_colors": [{"hex": "#hexcode", "name": "Color Name", "description": "Balancing purpose and effect"}],
  "palette_name": "Descriptive and evocative palette name",
  "style_reasoning": "Detailed explanation of why this palette suits the ${style} style",
  "seasonal_appropriateness": "How this palette perfectly fits ${season} weddings and flower availability"
}`;
  }

  private getSeasonalGuidelines(season: string): string {
    const guidelines = {
      spring: '- Fresh, light colors that evoke renewal, growth, and new beginnings\n- Soft pastels and bright, clear colors\n- Consider cherry blossom pinks, fresh greens, sky blues\n- Avoid heavy, dark colors that feel too wintery',
      summer: '- Vibrant, bold colors that work beautifully in bright sunlight\n- Rich, saturated hues and warm colors\n- Consider coral, bright yellows, ocean blues, sunset oranges\n- Colors should photograph well in strong outdoor lighting',
      fall: '- Warm, rich colors that complement autumn foliage\n- Deep, complex colors inspired by harvest themes\n- Consider burgundy, burnt orange, golden yellows, deep purples\n- Should feel cozy and intimate for shorter days',
      winter: '- Cool, elegant colors or warm, cozy tones for contrast\n- Deep, sophisticated colors or crisp, clean palettes\n- Consider deep blues, silver, white, rich reds, forest greens\n- Should work well in indoor lighting and create warmth'
    };
    return guidelines[season.toLowerCase()] || guidelines.spring;
  }

  private getStyleGuidelines(style: string): string {
    const guidelines = {
      romantic: '- Soft, flowing, dreamy colors with subtle variations\n- Gentle transitions between colors\n- Avoid harsh contrasts, prefer blended harmonies\n- Think garden roses, soft candlelight, flowing fabrics',
      modern: '- Clean, bold, contemporary colors with strong, intentional contrasts\n- Geometric color relationships\n- Prefer pure, saturated colors over muted tones\n- Think architectural elements, clean lines, sophisticated simplicity',
      rustic: '- Earthy, natural, organic colors inspired by nature\n- Colors that feel grounded and authentic\n- Prefer muted, weathered tones over bright colors\n- Think barn wood, wildflowers, natural textures, countryside',
      classic: '- Timeless, sophisticated colors that never go out of style\n- Traditional color combinations with proven appeal\n- Elegant without being trendy\n- Think timeless elegance, refined taste, enduring beauty',
      bohemian: '- Rich, eclectic, artistic colors with unique, creative combinations\n- Unexpected color pairings that create visual interest\n- Prefer complex, layered palettes over simple ones\n- Think artistic expression, cultural richness, creative freedom'
    };
    return guidelines[style.toLowerCase()] || guidelines.classic;
  }

  private validateColorPaletteResponse(response: any): void {
    const required = ['primary_colors', 'accent_colors', 'neutral_colors', 'palette_name', 'style_reasoning', 'seasonal_appropriateness'];
    
    for (const field of required) {
      if (!response[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate color arrays
    const colorArrays = ['primary_colors', 'accent_colors', 'neutral_colors'];
    for (const arrayField of colorArrays) {
      if (!Array.isArray(response[arrayField])) {
        throw new Error(`${arrayField} must be an array`);
      }

      for (const color of response[arrayField]) {
        if (!color.hex || !color.name || !color.description) {
          throw new Error(`Invalid color object in ${arrayField}`);
        }
        if (!/^#[0-9A-F]{6}$/i.test(color.hex)) {
          throw new Error(`Invalid hex color: ${color.hex}`);
        }
      }
    }
  }

  async generateFlowerRecommendations(request: FlowerRecommendationRequest, userId?: string): Promise<any> {
    try {
      if (userId) {
        await rateLimiter.check(`openai:flower_recommendations:${userId}`, 20, '1h');
      }

      const cacheKey = this.generateCacheKey('flower_recommendations', request);
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const result = await this.circuitBreaker.execute(async () => {
        return await this.callOpenAIForFlowerRecommendations(request);
      });

      await this.redis.setex(cacheKey, 3600, JSON.stringify(result)); // 1 hour cache

      return result;

    } catch (error) {
      console.error('OpenAI flower recommendations failed:', error);
      if (this.circuitBreaker.isOpen()) {
        return this.getFallbackFlowerRecommendations(request);
      }
      throw error;
    }
  }

  private async callOpenAIForFlowerRecommendations(request: FlowerRecommendationRequest): Promise<any> {
    const prompt = `As a professional florist, recommend flowers for a wedding with these requirements:

Colors: ${request.criteria.colors?.join(', ') || 'flexible'}
Season: ${request.criteria.season || 'flexible'}  
Style: ${request.criteria.style || 'classic'}
Wedding Uses: ${request.criteria.wedding_uses?.join(', ') || 'all arrangements'}
Budget per stem: $${request.criteria.budget_range?.min || 1}-${request.criteria.budget_range?.max || 10}

Wedding Context:
Date: ${request.context.wedding_date || 'not specified'}
Venue: ${request.context.venue_type || 'not specified'}
Guest Count: ${request.context.guest_count || 'not specified'}

Provide specific flower recommendations with reasoning for each choice. Consider:
- Seasonal availability and quality
- Color matching and harmony
- Budget appropriateness  
- Suitability for intended wedding uses
- Overall aesthetic compatibility

Return as JSON with flower names, reasoning, seasonal scores, and alternatives.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert florist with deep knowledge of flowers, seasonality, colors, and wedding design. Provide practical, actionable flower recommendations based on real flower characteristics and availability.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 1000
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No flower recommendations received');
    }

    return JSON.parse(responseText);
  }

  private getFallbackResponse(): any {
    return {
      error: 'AI service temporarily unavailable',
      fallback: true,
      message: 'Please try again in a few minutes, or contact support if the issue persists.'
    };
  }

  private getFallbackColorPalette(request: ColorPaletteRequest): ColorPaletteResponse {
    // Provide basic color theory-based fallback
    const baseColor = request.baseColors[0] || '#FF69B4';
    
    return {
      primary_colors: [
        { hex: baseColor, name: 'Primary Color', description: 'Your selected base color' },
        { hex: '#FFFFFF', name: 'White', description: 'Classic wedding white for balance' }
      ],
      accent_colors: [
        { hex: this.getComplementaryColor(baseColor), name: 'Accent Color', description: 'Complementary accent for visual interest' }
      ],
      neutral_colors: [
        { hex: '#F5F5F5', name: 'Soft Gray', description: 'Neutral grounding color' }
      ],
      palette_name: 'Classic Wedding Palette',
      style_reasoning: 'A timeless color combination that works for any wedding style.',
      seasonal_appropriateness: 'This palette works well in any season with appropriate flower selections.'
    };
  }

  private getFallbackFlowerRecommendations(request: FlowerRecommendationRequest): any {
    return {
      flowers: [
        { name: 'Roses', reasoning: 'Always available, classic wedding choice, works with any color scheme' },
        { name: 'Baby\'s Breath', reasoning: 'Affordable filler flower, adds texture and volume' },
        { name: 'Greenery', reasoning: 'Eucalyptus or similar foliage for natural background' }
      ],
      seasonal_score: 0.7,
      fallback: true,
      message: 'Basic recommendations provided due to AI service unavailability'
    };
  }

  private getComplementaryColor(hex: string): string {
    // Simple complementary color calculation
    const color = parseInt(hex.slice(1), 16);
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    
    // Complement by inverting
    const compR = 255 - r;
    const compG = 255 - g;
    const compB = 255 - b;
    
    return `#${((compR << 16) | (compG << 8) | compB).toString(16).padStart(6, '0').toUpperCase()}`;
  }

  private generateCacheKey(type: string, data: any): string {
    const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    return `florist:${type}:${hash}`;
  }

  // Circuit breaker status methods
  async getCircuitBreakerStatus(): Promise<any> {
    return {
      name: this.circuitBreaker.name,
      state: this.circuitBreaker.getState(),
      failure_count: this.circuitBreaker.getFailureCount(),
      last_failure: this.circuitBreaker.getLastFailureTime(),
      next_attempt: this.circuitBreaker.getNextAttemptTime()
    };
  }

  async resetCircuitBreaker(): Promise<void> {
    this.circuitBreaker.reset();
  }
}
```

#### 2. Color Theory Integration Service
```typescript
// File: /src/lib/integrations/color-theory-service.ts
import { Redis } from '@/lib/cache/redis';

export interface ColorAnalysis {
  hex: string;
  name: string;
  lab: { L: number; a: number; b: number };
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  color_temperature: 'warm' | 'cool' | 'neutral';
  accessibility: {
    contrast_white: number;
    contrast_black: number;
    wcag_aa_large: boolean;
    wcag_aa_small: boolean;
  };
}

export interface ColorHarmonyAnalysis {
  input_colors: string[];
  harmony_type: string;
  harmony_score: number;
  complementary_colors: string[];
  analogous_colors: string[];
  triadic_colors: string[];
  split_complementary: string[];
  color_accessibility: {
    overall_contrast: number;
    readable_combinations: Array<{color1: string; color2: string; contrast: number}>;
    warnings: string[];
  };
}

export class ColorTheoryService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis();
  }

  async analyzeColor(hex: string): Promise<ColorAnalysis> {
    try {
      const cacheKey = `color_analysis:${hex}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const analysis = this.computeColorAnalysis(hex);
      
      // Cache for 7 days (color analysis doesn't change)
      await this.redis.setex(cacheKey, 604800, JSON.stringify(analysis));
      
      return analysis;

    } catch (error) {
      console.error('Color analysis failed:', error);
      throw new Error(`Failed to analyze color ${hex}: ${error.message}`);
    }
  }

  private computeColorAnalysis(hex: string): ColorAnalysis {
    if (!/^#[0-9A-F]{6}$/i.test(hex)) {
      throw new Error('Invalid hex color format');
    }

    const rgb = this.hexToRgb(hex);
    const lab = this.rgbToLab(rgb);
    const hsl = this.rgbToHsl(rgb);
    
    return {
      hex,
      name: this.getColorName(hex),
      lab,
      rgb,
      hsl,
      color_temperature: this.getColorTemperature(hex),
      accessibility: this.calculateAccessibility(rgb)
    };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  private rgbToLab(rgb: { r: number; g: number; b: number }): { L: number; a: number; b: number } {
    // Convert RGB to XYZ
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    // Apply gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Convert to XYZ (D65 illuminant)
    const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100;
    const y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) * 100;
    const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) * 100;

    // Convert XYZ to LAB
    const xn = 95.047;  // D65 illuminant
    const yn = 100.0;
    const zn = 108.883;

    const fx = x / xn > 0.008856 ? Math.pow(x / xn, 1/3) : (903.3 * x / xn + 16) / 116;
    const fy = y / yn > 0.008856 ? Math.pow(y / yn, 1/3) : (903.3 * y / yn + 16) / 116;
    const fz = z / zn > 0.008856 ? Math.pow(z / zn, 1/3) : (903.3 * z / zn + 16) / 116;

    return {
      L: 116 * fy - 16,
      a: 500 * (fx - fy),
      b: 200 * (fy - fz)
    };
  }

  private rgbToHsl(rgb: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;
    const l = sum / 2;

    let h = 0;
    let s = 0;

    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - sum) : diff / sum;

      switch (max) {
        case r:
          h = ((g - b) / diff) + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / diff + 2;
          break;
        case b:
          h = (r - g) / diff + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  private getColorTemperature(hex: string): 'warm' | 'cool' | 'neutral' {
    const rgb = this.hexToRgb(hex);
    
    // Calculate color temperature based on red/blue balance
    const warmth = (rgb.r + (rgb.g * 0.5)) / (rgb.b + 1);
    
    if (warmth > 1.3) return 'warm';
    if (warmth < 0.8) return 'cool';
    return 'neutral';
  }

  private calculateAccessibility(rgb: { r: number; g: number; b: number }): any {
    const getLuminance = (r: number, g: number, b: number): number => {
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const getContrastRatio = (l1: number, l2: number): number => {
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
    const contrastWhite = getContrastRatio(luminance, 1);
    const contrastBlack = getContrastRatio(luminance, 0);

    return {
      contrast_white: Math.round(contrastWhite * 100) / 100,
      contrast_black: Math.round(contrastBlack * 100) / 100,
      wcag_aa_large: contrastWhite >= 3 || contrastBlack >= 3,
      wcag_aa_small: contrastWhite >= 4.5 || contrastBlack >= 4.5
    };
  }

  private getColorName(hex: string): string {
    // Simplified color naming - in production, use a comprehensive color name database
    const colorNames: Record<string, string> = {
      '#FFFFFF': 'White',
      '#000000': 'Black',
      '#FF0000': 'Red',
      '#00FF00': 'Green',
      '#0000FF': 'Blue',
      '#FFFF00': 'Yellow',
      '#FF00FF': 'Magenta',
      '#00FFFF': 'Cyan',
      '#FFC0CB': 'Pink',
      '#800080': 'Purple',
      '#FFA500': 'Orange',
      '#A52A2A': 'Brown',
      '#808080': 'Gray',
      '#FFB6C1': 'Light Pink',
      '#DDA0DD': 'Plum',
      '#98FB98': 'Pale Green'
    };

    const upperHex = hex.toUpperCase();
    if (colorNames[upperHex]) {
      return colorNames[upperHex];
    }

    // Approximate color name based on RGB values
    const rgb = this.hexToRgb(hex);
    const { h, s, l } = this.rgbToHsl(rgb);

    if (s < 10) return l > 80 ? 'Light Gray' : l < 20 ? 'Dark Gray' : 'Gray';
    
    if (h < 30) return s > 70 ? 'Red' : 'Pink';
    if (h < 60) return 'Orange';
    if (h < 90) return 'Yellow';
    if (h < 150) return 'Green';
    if (h < 210) return 'Cyan';
    if (h < 270) return 'Blue';
    if (h < 330) return 'Purple';
    return 'Red';
  }

  async analyzeColorHarmony(colors: string[], harmonyType?: string): Promise<ColorHarmonyAnalysis> {
    try {
      const cacheKey = `color_harmony:${colors.join(',')}:${harmonyType || 'auto'}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const analysis = this.computeColorHarmony(colors, harmonyType);
      
      // Cache for 24 hours
      await this.redis.setex(cacheKey, 86400, JSON.stringify(analysis));
      
      return analysis;

    } catch (error) {
      console.error('Color harmony analysis failed:', error);
      throw new Error(`Failed to analyze color harmony: ${error.message}`);
    }
  }

  private computeColorHarmony(colors: string[], harmonyType?: string): ColorHarmonyAnalysis {
    const baseColor = colors[0];
    if (!baseColor) {
      throw new Error('At least one color is required for harmony analysis');
    }

    const hsl = this.rgbToHsl(this.hexToRgb(baseColor));
    const baseHue = hsl.h;

    const complementary = [this.hslToHex({ h: (baseHue + 180) % 360, s: hsl.s, l: hsl.l })];
    const analogous = [
      this.hslToHex({ h: (baseHue + 30) % 360, s: hsl.s, l: hsl.l }),
      this.hslToHex({ h: (baseHue - 30 + 360) % 360, s: hsl.s, l: hsl.l })
    ];
    const triadic = [
      this.hslToHex({ h: (baseHue + 120) % 360, s: hsl.s, l: hsl.l }),
      this.hslToHex({ h: (baseHue + 240) % 360, s: hsl.s, l: hsl.l })
    ];
    const splitComplementary = [
      this.hslToHex({ h: (baseHue + 150) % 360, s: hsl.s, l: hsl.l }),
      this.hslToHex({ h: (baseHue + 210) % 360, s: hsl.s, l: hsl.l })
    ];

    const harmonyScore = this.calculateHarmonyScore(colors, harmonyType);
    const accessibility = this.analyzeColorAccessibility(colors);

    return {
      input_colors: colors,
      harmony_type: harmonyType || this.detectHarmonyType(colors),
      harmony_score: harmonyScore,
      complementary_colors: complementary,
      analogous_colors: analogous,
      triadic_colors: triadic,
      split_complementary: splitComplementary,
      color_accessibility: accessibility
    };
  }

  private hslToHex(hsl: { h: number; s: number; l: number }): string {
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = hsl.l / 100;

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (c: number): string => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  private calculateHarmonyScore(colors: string[], harmonyType?: string): number {
    if (colors.length < 2) return 1;

    // Calculate harmony score based on color relationships
    let totalScore = 0;
    let comparisons = 0;

    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const hsl1 = this.rgbToHsl(this.hexToRgb(colors[i]));
        const hsl2 = this.rgbToHsl(this.hexToRgb(colors[j]));

        // Calculate hue difference
        const hueDiff = Math.abs(hsl1.h - hsl2.h);
        const adjustedHueDiff = Math.min(hueDiff, 360 - hueDiff);

        // Score based on color theory relationships
        let pairScore = 0;
        if (adjustedHueDiff <= 30) pairScore = 0.9; // Analogous
        else if (adjustedHueDiff >= 150 && adjustedHueDiff <= 210) pairScore = 0.95; // Complementary
        else if (adjustedHueDiff >= 110 && adjustedHueDiff <= 130) pairScore = 0.85; // Triadic
        else pairScore = 0.6; // Other relationships

        // Adjust for saturation and lightness similarity
        const satDiff = Math.abs(hsl1.s - hsl2.s) / 100;
        const lightDiff = Math.abs(hsl1.l - hsl2.l) / 100;
        
        // Reward moderate differences in saturation and lightness
        const satScore = 1 - Math.abs(satDiff - 0.2);
        const lightScore = 1 - Math.abs(lightDiff - 0.15);

        pairScore = (pairScore + satScore + lightScore) / 3;
        totalScore += pairScore;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalScore / comparisons : 1;
  }

  private detectHarmonyType(colors: string[]): string {
    if (colors.length < 2) return 'monochromatic';

    const hues = colors.map(color => this.rgbToHsl(this.hexToRgb(color)).h);
    
    // Calculate average hue difference
    let totalDiff = 0;
    for (let i = 0; i < hues.length - 1; i++) {
      const diff = Math.abs(hues[i] - hues[i + 1]);
      totalDiff += Math.min(diff, 360 - diff);
    }
    const avgDiff = totalDiff / (hues.length - 1);

    if (avgDiff <= 30) return 'analogous';
    if (avgDiff >= 150 && avgDiff <= 210) return 'complementary';
    if (avgDiff >= 100 && avgDiff <= 140) return 'triadic';
    return 'custom';
  }

  private analyzeColorAccessibility(colors: string[]): any {
    const readableCombinations = [];
    const warnings = [];
    let totalContrast = 0;
    let comparisons = 0;

    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const rgb1 = this.hexToRgb(colors[i]);
        const rgb2 = this.hexToRgb(colors[j]);
        
        const lum1 = this.calculateLuminance(rgb1);
        const lum2 = this.calculateLuminance(rgb2);
        
        const contrast = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
        totalContrast += contrast;
        comparisons++;

        if (contrast >= 4.5) {
          readableCombinations.push({
            color1: colors[i],
            color2: colors[j],
            contrast: Math.round(contrast * 100) / 100
          });
        } else if (contrast < 3) {
          warnings.push(`Low contrast between ${colors[i]} and ${colors[j]} (${Math.round(contrast * 100) / 100}:1)`);
        }
      }
    }

    return {
      overall_contrast: comparisons > 0 ? Math.round((totalContrast / comparisons) * 100) / 100 : 0,
      readable_combinations: readableCombinations,
      warnings
    };
  }

  private calculateLuminance(rgb: { r: number; g: number; b: number }): number {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // Flower color matching helper
  async findSimilarColors(targetColor: string, colorDatabase: string[]): Promise<Array<{color: string, similarity: number}>> {
    const targetLab = this.rgbToLab(this.hexToRgb(targetColor));
    
    const similarities = colorDatabase.map(color => {
      const colorLab = this.rgbToLab(this.hexToRgb(color));
      const deltaE = this.calculateDeltaE(targetLab, colorLab);
      const similarity = Math.max(0, 1 - (deltaE / 100)); // Convert to 0-1 scale
      
      return { color, similarity };
    });

    return similarities
      .filter(item => item.similarity > 0.3) // Only reasonably similar colors
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10); // Top 10 matches
  }

  private calculateDeltaE(lab1: any, lab2: any): number {
    // CIE76 Delta E calculation
    return Math.sqrt(
      Math.pow(lab1.L - lab2.L, 2) +
      Math.pow(lab1.a - lab2.a, 2) +
      Math.pow(lab1.b - lab2.b, 2)
    );
  }
}
```

### DELIVERABLES CHECKLIST
- [ ] OpenAI Service Client with circuit breaker and rate limiting
- [ ] Color Theory Service with LAB color space conversions and harmony analysis
- [ ] External API integration with proper error handling and fallbacks  
- [ ] Redis caching layer for AI responses and color calculations
- [ ] Circuit breaker implementation for resilient external service calls
- [ ] Rate limiting per user for AI API calls (10 palette generations/hour)
- [ ] Comprehensive error handling with fallback responses
- [ ] Color accessibility analysis with WCAG compliance checking
- [ ] External flower data synchronization capabilities
- [ ] API endpoints for testing circuit breakers and rate limits

### URGENT COMPLETION CRITERIA
**This task is INCOMPLETE until:**
1. OpenAI API integration successfully generates color palettes with proper JSON responses
2. Circuit breaker functionality demonstrated (opens on failures, provides fallbacks)
3. Rate limiting working correctly (429 responses after limit exceeded)
4. Color theory calculations accurate (LAB color space, Delta E, accessibility)
5. Redis caching operational (responses cached and retrieved correctly)
6. Error handling comprehensive (graceful degradation, meaningful error messages)
7. All TypeScript compilation successful with proper type safety
8. Evidence of reality provided (API test responses, circuit breaker demonstrations)