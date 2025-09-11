/**
 * WS-221: Branding Customization - Brand Validation System
 * Team C - Cross-system brand consistency validation
 */

import {
  BrandTheme,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  BrandConsistencyRules,
  BrandValidatorInterface,
} from './types';

// Interfaces now imported from types.ts

export class BrandValidator implements BrandValidatorInterface {
  private rules: BrandConsistencyRules;
  private colorCache: Map<
    string,
    { luminance: number; rgb: [number, number, number] }
  > = new Map();

  constructor(customRules?: Partial<BrandConsistencyRules>) {
    this.rules = {
      minContrastRatio: 4.5, // WCAG AA standard
      maxColors: 6, // Primary, secondary, accent, background, text, error
      allowedFontSizes: [12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64],
      requiredFields: ['name', 'primaryColor', 'backgroundColor', 'textColor'],
      customCSSMaxLength: 10000, // 10KB limit
      allowedFileFormats: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml',
      ],
      maxAssetSize: 5 * 1024 * 1024, // 5MB
      ...customRules,
    };
  }

  /**
   * Validate complete brand theme
   */
  async validateTheme(theme: BrandTheme): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field validation
    this.validateRequiredFields(theme, errors);

    // Color validation
    await this.validateColors(theme, errors, warnings);

    // Typography validation
    this.validateTypography(theme, errors, warnings);

    // Asset validation
    await this.validateAssets(theme, errors, warnings);

    // Custom CSS validation
    this.validateCustomCSS(theme, errors, warnings);

    // Accessibility validation
    await this.validateAccessibility(theme, errors, warnings);

    // Brand consistency validation
    this.validateBrandConsistency(theme, errors, warnings);

    // Calculate overall score
    const score = this.calculateValidationScore(errors, warnings);

    return {
      isValid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
      warnings,
      score,
    };
  }

  /**
   * Validate partial theme data (for saving)
   */
  async validateThemeData(
    themeData: Partial<BrandTheme>,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic field validation
    if (themeData.name && themeData.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Theme name cannot be empty',
        severity: 'error',
        code: 'EMPTY_NAME',
      });
    }

    // Color format validation
    if (themeData.primaryColor && !this.isValidColor(themeData.primaryColor)) {
      errors.push({
        field: 'primaryColor',
        message: 'Invalid color format for primary color',
        severity: 'error',
        code: 'INVALID_COLOR_FORMAT',
      });
    }

    if (
      themeData.secondaryColor &&
      !this.isValidColor(themeData.secondaryColor)
    ) {
      errors.push({
        field: 'secondaryColor',
        message: 'Invalid color format for secondary color',
        severity: 'error',
        code: 'INVALID_COLOR_FORMAT',
      });
    }

    if (themeData.accentColor && !this.isValidColor(themeData.accentColor)) {
      errors.push({
        field: 'accentColor',
        message: 'Invalid color format for accent color',
        severity: 'error',
        code: 'INVALID_COLOR_FORMAT',
      });
    }

    if (
      themeData.backgroundColor &&
      !this.isValidColor(themeData.backgroundColor)
    ) {
      errors.push({
        field: 'backgroundColor',
        message: 'Invalid color format for background color',
        severity: 'error',
        code: 'INVALID_COLOR_FORMAT',
      });
    }

    if (themeData.textColor && !this.isValidColor(themeData.textColor)) {
      errors.push({
        field: 'textColor',
        message: 'Invalid color format for text color',
        severity: 'error',
        code: 'INVALID_COLOR_FORMAT',
      });
    }

    // Font family validation
    if (themeData.fontFamily && !this.isValidFontFamily(themeData.fontFamily)) {
      warnings.push({
        field: 'fontFamily',
        message: 'Font family may not be available on all systems',
        code: 'FONT_AVAILABILITY',
        suggestion: 'Consider adding fallback fonts',
      });
    }

    // Border radius validation
    if (
      themeData.borderRadius !== undefined &&
      (themeData.borderRadius < 0 || themeData.borderRadius > 50)
    ) {
      warnings.push({
        field: 'borderRadius',
        message: 'Border radius should be between 0 and 50 pixels',
        code: 'BORDER_RADIUS_RANGE',
      });
    }

    // URL validation
    if (themeData.logoUrl && !this.isValidUrl(themeData.logoUrl)) {
      errors.push({
        field: 'logoUrl',
        message: 'Invalid logo URL format',
        severity: 'error',
        code: 'INVALID_URL',
      });
    }

    if (themeData.faviconUrl && !this.isValidUrl(themeData.faviconUrl)) {
      errors.push({
        field: 'faviconUrl',
        message: 'Invalid favicon URL format',
        severity: 'error',
        code: 'INVALID_URL',
      });
    }

    // Custom CSS validation
    if (themeData.customCSS) {
      this.validateCustomCSSContent(themeData.customCSS, errors, warnings);
    }

    const score = this.calculateValidationScore(errors, warnings);

    return {
      isValid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
      warnings,
      score,
    };
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(
    theme: BrandTheme,
    errors: ValidationError[],
  ): void {
    this.rules.requiredFields.forEach((field) => {
      if (!theme[field as keyof BrandTheme]) {
        errors.push({
          field,
          message: `${field} is required`,
          severity: 'error',
          code: 'REQUIRED_FIELD',
        });
      }
    });
  }

  /**
   * Validate color scheme and contrast
   */
  private async validateColors(
    theme: BrandTheme,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): Promise<void> {
    const colors = [
      { name: 'primaryColor', value: theme.primaryColor },
      { name: 'secondaryColor', value: theme.secondaryColor },
      { name: 'accentColor', value: theme.accentColor },
      { name: 'backgroundColor', value: theme.backgroundColor },
      { name: 'textColor', value: theme.textColor },
    ];

    // Validate color formats
    colors.forEach((color) => {
      if (color.value && !this.isValidColor(color.value)) {
        errors.push({
          field: color.name,
          message: `Invalid color format: ${color.value}`,
          severity: 'error',
          code: 'INVALID_COLOR',
        });
      }
    });

    // Validate contrast ratios
    if (theme.backgroundColor && theme.textColor) {
      const contrastRatio = await this.calculateContrastRatio(
        theme.backgroundColor,
        theme.textColor,
      );
      if (contrastRatio < this.rules.minContrastRatio) {
        errors.push({
          field: 'textColor',
          message: `Text contrast ratio (${contrastRatio.toFixed(2)}) is below minimum requirement (${this.rules.minContrastRatio})`,
          severity: 'error',
          code: 'LOW_CONTRAST',
        });
      }
    }

    // Validate color harmony
    const distinctColors = colors.filter((c) => c.value).map((c) => c.value);
    if (distinctColors.length > this.rules.maxColors) {
      warnings.push({
        field: 'colors',
        message: `Using ${distinctColors.length} colors may create visual inconsistency`,
        code: 'TOO_MANY_COLORS',
        suggestion: `Consider limiting to ${this.rules.maxColors} colors`,
      });
    }

    // Check for similar colors
    this.checkColorSimilarity(colors, warnings);
  }

  /**
   * Validate typography settings
   */
  private validateTypography(
    theme: BrandTheme,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    if (!theme.fontFamily) {
      warnings.push({
        field: 'fontFamily',
        message: 'No font family specified, will use system default',
        code: 'NO_FONT_FAMILY',
      });
    } else {
      if (!this.isValidFontFamily(theme.fontFamily)) {
        warnings.push({
          field: 'fontFamily',
          message: 'Font family may not be web-safe',
          code: 'NON_WEB_SAFE_FONT',
          suggestion: 'Consider adding fallback fonts like "Arial, sans-serif"',
        });
      }
    }

    // Validate border radius for consistency
    if (theme.borderRadius < 0 || theme.borderRadius > 50) {
      warnings.push({
        field: 'borderRadius',
        message: 'Border radius outside recommended range (0-50px)',
        code: 'BORDER_RADIUS_EXTREME',
      });
    }
  }

  /**
   * Validate brand assets
   */
  private async validateAssets(
    theme: BrandTheme,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): Promise<void> {
    if (theme.logoUrl) {
      try {
        const response = await fetch(theme.logoUrl, { method: 'HEAD' });
        if (!response.ok) {
          errors.push({
            field: 'logoUrl',
            message: 'Logo URL is not accessible',
            severity: 'error',
            code: 'ASSET_NOT_ACCESSIBLE',
          });
        } else {
          const contentType = response.headers.get('content-type');
          if (
            contentType &&
            !this.rules.allowedFileFormats.includes(contentType)
          ) {
            warnings.push({
              field: 'logoUrl',
              message: `Logo format (${contentType}) may not be optimal`,
              code: 'SUBOPTIMAL_FORMAT',
              suggestion: 'Consider using WebP or SVG for better performance',
            });
          }

          const contentLength = response.headers.get('content-length');
          if (
            contentLength &&
            parseInt(contentLength) > this.rules.maxAssetSize
          ) {
            warnings.push({
              field: 'logoUrl',
              message: 'Logo file size is large and may affect performance',
              code: 'LARGE_ASSET_SIZE',
              suggestion: 'Consider optimizing the image',
            });
          }
        }
      } catch (error) {
        errors.push({
          field: 'logoUrl',
          message: 'Unable to validate logo URL',
          severity: 'warning',
          code: 'ASSET_VALIDATION_FAILED',
        });
      }
    }

    if (theme.faviconUrl) {
      try {
        const response = await fetch(theme.faviconUrl, { method: 'HEAD' });
        if (!response.ok) {
          errors.push({
            field: 'faviconUrl',
            message: 'Favicon URL is not accessible',
            severity: 'error',
            code: 'ASSET_NOT_ACCESSIBLE',
          });
        }
      } catch (error) {
        errors.push({
          field: 'faviconUrl',
          message: 'Unable to validate favicon URL',
          severity: 'warning',
          code: 'ASSET_VALIDATION_FAILED',
        });
      }
    }
  }

  /**
   * Validate custom CSS
   */
  private validateCustomCSS(
    theme: BrandTheme,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    if (theme.customCSS) {
      this.validateCustomCSSContent(theme.customCSS, errors, warnings);
    }
  }

  /**
   * Validate custom CSS content
   */
  private validateCustomCSSContent(
    css: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    if (css.length > this.rules.customCSSMaxLength) {
      warnings.push({
        field: 'customCSS',
        message: `Custom CSS is ${css.length} characters, consider optimizing`,
        code: 'LARGE_CSS',
        suggestion: 'Minify CSS or move complex styles to external file',
      });
    }

    // Check for potentially dangerous CSS
    const dangerousPatterns = [
      {
        pattern: /@import\s+url\(/gi,
        message: 'External imports may affect performance',
      },
      { pattern: /javascript:/gi, message: 'JavaScript URLs are not allowed' },
      { pattern: /expression\(/gi, message: 'CSS expressions are not secure' },
      { pattern: /behavior:/gi, message: 'CSS behaviors are not supported' },
    ];

    dangerousPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(css)) {
        errors.push({
          field: 'customCSS',
          message,
          severity: 'error',
          code: 'UNSAFE_CSS',
        });
      }
    });

    // Check for overly specific selectors
    const specificSelectors = css.match(
      /[#.][a-zA-Z0-9_-]+(?:\s+[#.][a-zA-Z0-9_-]+){3,}/g,
    );
    if (specificSelectors && specificSelectors.length > 0) {
      warnings.push({
        field: 'customCSS',
        message: 'Overly specific CSS selectors detected',
        code: 'HIGH_SPECIFICITY',
        suggestion: 'Use simpler selectors for better maintainability',
      });
    }
  }

  /**
   * Validate accessibility compliance
   */
  private async validateAccessibility(
    theme: BrandTheme,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): Promise<void> {
    // Color contrast validation (already done in validateColors)

    // Font size recommendations
    const baseFontSize = 16; // Assume 16px base
    if (theme.fontFamily) {
      warnings.push({
        field: 'fontFamily',
        message: 'Ensure font size is at least 16px for better readability',
        code: 'FONT_SIZE_RECOMMENDATION',
      });
    }

    // Check for sufficient color differences
    if (theme.primaryColor && theme.backgroundColor) {
      const contrastRatio = await this.calculateContrastRatio(
        theme.primaryColor,
        theme.backgroundColor,
      );
      if (contrastRatio < 3.0) {
        warnings.push({
          field: 'primaryColor',
          message:
            'Primary color may not be distinguishable enough from background',
          code: 'POOR_COLOR_DISTINCTION',
          suggestion: 'Increase color contrast for better accessibility',
        });
      }
    }
  }

  /**
   * Validate brand consistency
   */
  private validateBrandConsistency(
    theme: BrandTheme,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Check for consistent naming
    if (!theme.name || theme.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Theme name is required for brand consistency',
        severity: 'error',
        code: 'MISSING_THEME_NAME',
      });
    }

    // Validate color relationships
    if (theme.primaryColor === theme.backgroundColor) {
      errors.push({
        field: 'primaryColor',
        message: 'Primary color should be different from background color',
        severity: 'error',
        code: 'IDENTICAL_COLORS',
      });
    }

    // Check for balanced color palette
    const hasLightColors = this.hasLightColor([
      theme.primaryColor,
      theme.secondaryColor,
      theme.backgroundColor,
    ]);
    const hasDarkColors = this.hasDarkColor([
      theme.primaryColor,
      theme.secondaryColor,
      theme.textColor,
    ]);

    if (!hasLightColors || !hasDarkColors) {
      warnings.push({
        field: 'colors',
        message: 'Color palette may lack balance between light and dark colors',
        code: 'UNBALANCED_PALETTE',
        suggestion: 'Consider adding both light and dark color variations',
      });
    }
  }

  /**
   * Calculate validation score
   */
  private calculateValidationScore(
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): number {
    const errorPenalty =
      errors.filter((e) => e.severity === 'error').length * 15;
    const warningPenalty = warnings.length * 5;
    return Math.max(0, 100 - errorPenalty - warningPenalty);
  }

  /**
   * Check if color format is valid
   */
  private isValidColor(color: string): boolean {
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const rgbPattern = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
    const rgbaPattern = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;
    const hslPattern = /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/;
    const hslaPattern =
      /^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)$/;

    return (
      hexPattern.test(color) ||
      rgbPattern.test(color) ||
      rgbaPattern.test(color) ||
      hslPattern.test(color) ||
      hslaPattern.test(color)
    );
  }

  /**
   * Check if font family is valid
   */
  private isValidFontFamily(fontFamily: string): boolean {
    const webSafeFonts = [
      'Arial',
      'Helvetica',
      'Times New Roman',
      'Times',
      'Courier New',
      'Courier',
      'Verdana',
      'Georgia',
      'Palatino',
      'Garamond',
      'Bookman',
      'Comic Sans MS',
      'Trebuchet MS',
      'Arial Black',
      'Impact',
      'sans-serif',
      'serif',
      'monospace',
    ];

    return webSafeFonts.some((font) =>
      fontFamily.toLowerCase().includes(font.toLowerCase()),
    );
  }

  /**
   * Check if URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calculate contrast ratio between two colors
   */
  private async calculateContrastRatio(
    color1: string,
    color2: string,
  ): Promise<number> {
    const luminance1 = this.getLuminance(color1);
    const luminance2 = this.getLuminance(color2);

    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get luminance of a color
   */
  private getLuminance(color: string): number {
    if (this.colorCache.has(color)) {
      return this.colorCache.get(color)!.luminance;
    }

    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    this.colorCache.set(color, { luminance, rgb });

    return luminance;
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : null;
  }

  /**
   * Check color similarity
   */
  private checkColorSimilarity(
    colors: Array<{ name: string; value: string }>,
    warnings: ValidationWarning[],
  ): void {
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const color1 = colors[i];
        const color2 = colors[j];

        if (
          color1.value &&
          color2.value &&
          this.areColorsSimilar(color1.value, color2.value)
        ) {
          warnings.push({
            field: color2.name,
            message: `${color2.name} is very similar to ${color1.name}`,
            code: 'SIMILAR_COLORS',
            suggestion: 'Consider using more distinct colors',
          });
        }
      }
    }
  }

  /**
   * Check if two colors are similar
   */
  private areColorsSimilar(color1: string, color2: string): boolean {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);

    if (!rgb1 || !rgb2) return false;

    // Calculate Euclidean distance in RGB space
    const distance = Math.sqrt(
      Math.pow(rgb1[0] - rgb2[0], 2) +
        Math.pow(rgb1[1] - rgb2[1], 2) +
        Math.pow(rgb1[2] - rgb2[2], 2),
    );

    // Colors are similar if distance is less than 30 (out of ~441 max distance)
    return distance < 30;
  }

  /**
   * Check if palette has light colors
   */
  private hasLightColor(colors: (string | undefined)[]): boolean {
    return colors.some((color) => {
      if (!color) return false;
      return this.getLuminance(color) > 0.5;
    });
  }

  /**
   * Check if palette has dark colors
   */
  private hasDarkColor(colors: (string | undefined)[]): boolean {
    return colors.some((color) => {
      if (!color) return false;
      return this.getLuminance(color) < 0.5;
    });
  }
}

export default BrandValidator;
