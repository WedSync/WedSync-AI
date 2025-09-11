# WedSync Branding Customization System - User Guide

## Overview

The WedSync Branding Customization System allows wedding suppliers to create and customize their brand appearance across the entire platform. This powerful feature helps maintain brand consistency and provides a personalized experience for your clients.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Brand Elements](#brand-elements)
3. [Creating Your Brand](#creating-your-brand)
4. [Uploading Brand Assets](#uploading-brand-assets)
5. [Live Preview](#live-preview)
6. [Advanced Customization](#advanced-customization)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- Active WedSync Professional or Scale subscription
- Admin or Owner permissions for your organization
- Brand assets (logo, colors) ready for upload

### Accessing Branding Customization

1. Log into your WedSync dashboard
2. Navigate to **Settings** → **Branding**
3. Click **Customize Brand** to begin

## Brand Elements

### Primary Elements

#### 1. Brand Name
- **Purpose**: Displays across your client portal and communications
- **Requirements**: 2-50 characters, alphanumeric and spaces only
- **Best Practice**: Use your official business name

#### 2. Logo Upload
- **Supported Formats**: PNG, JPEG, SVG, WebP
- **Maximum Size**: 5MB
- **Recommended Dimensions**: 300x300px minimum, 2048x2048px maximum
- **Optimal Format**: PNG with transparent background

#### 3. Color Palette

**Primary Color**
- Main brand color used for buttons, headers, and key elements
- Used for call-to-action buttons and primary navigation
- Should meet accessibility contrast requirements

**Secondary Color**
- Supporting color for accents and secondary elements
- Used for borders, backgrounds, and subtle highlights
- Complements your primary color

**Accent Color**
- Highlighting color for notifications and special elements
- Used sparingly for emphasis and notifications
- Should contrast well with primary and secondary colors

#### 4. Typography
- Choose from professionally curated font families
- Available fonts: Inter, Roboto, Poppins, Montserrat, Playfair Display, Lato, Open Sans, Nunito, Source Sans Pro, Merriweather
- Applies to all text across your brand experience

## Creating Your Brand

### Step 1: Basic Information

```
1. Enter your brand name in the "Brand Name" field
2. Ensure it matches your business name exactly
3. This name will appear in your client portal header
```

### Step 2: Color Selection

**Using Color Picker:**
1. Click the color square next to each color field
2. Use the visual picker to select your brand colors
3. Or enter hex codes directly (e.g., #3B82F6)

**Color Guidelines:**
- Primary: Your main brand color
- Secondary: A complementary or neutral color
- Accent: A contrasting color for highlights

**Accessibility Note:** 
Colors are automatically tested for sufficient contrast to ensure readability for all users.

### Step 3: Typography Selection

1. Open the "Font Family" dropdown
2. Preview each font option
3. Select the font that best represents your brand style
4. Consider readability across different devices

### Step 4: Logo Upload

**Preparation:**
- Ensure your logo meets size requirements
- Use transparent background PNG for best results
- Test logo at different sizes before uploading

**Upload Process:**
1. Click "Upload Logo" button
2. Select your logo file from your device
3. Wait for upload confirmation
4. Review logo appearance in live preview

## Uploading Brand Assets

### Logo Upload Process

#### Step 1: Prepare Your Logo
```bash
# Optimal logo specifications
Format: PNG with transparent background
Dimensions: 300x300px minimum
File Size: Under 5MB
Resolution: 300 DPI for print quality
```

#### Step 2: Upload
1. Click **Upload Logo** button
2. Select file from your computer
3. Monitor upload progress
4. Confirm successful upload

#### Step 3: Verification
- Check logo appearance in preview
- Verify logo displays correctly at different sizes
- Test logo visibility on both light and dark backgrounds

### Supported File Types

| Format | Use Case | Pros | Cons |
|--------|----------|------|------|
| PNG | Logos with transparency | High quality, transparency support | Larger file size |
| JPEG | Photos, complex images | Smaller file size | No transparency |
| SVG | Vector logos | Scalable, small file size | Limited support for complex effects |
| WebP | Modern web optimized | Best compression, quality | Newer format |

### File Size Guidelines

- **Small (Under 100KB)**: Ideal for fast loading
- **Medium (100KB - 1MB)**: Good balance of quality and speed
- **Large (1MB - 5MB)**: High quality but slower loading

**Recommendation**: Aim for under 500KB for optimal performance.

## Live Preview

### Understanding the Preview

The live preview shows how your branding will appear across WedSync:

#### Preview Elements

1. **Header Section**: Shows your logo and brand name
2. **Primary Button**: Displays primary color styling
3. **Secondary Button**: Shows secondary/accent color usage
4. **Content Cards**: Demonstrates how your brand appears in content
5. **Color Palette**: Visual representation of your color scheme

#### What You'll See

**Header Preview:**
- Your brand name with selected typography
- Logo placement and sizing
- Primary color as header background

**Button Styles:**
- Primary button with your main brand color
- Secondary button with accent color
- Hover states and interactions

**Content Layout:**
- Cards and sections styled with your colors
- Text rendered in your selected font
- Border and background color applications

### Real-Time Updates

Changes made to brand elements update instantly in the preview:
- Color changes reflect immediately
- Font changes apply to all text elements
- Logo updates appear as soon as upload completes

## Advanced Customization

### Custom CSS

For power users who want additional styling control:

#### Accessing Custom CSS
1. Scroll to "Custom CSS (Advanced)" section
2. Enter valid CSS rules
3. Use CSS custom properties for consistency

#### Available CSS Variables
```css
/* Color Variables */
--brand-primary: #3B82F6;
--brand-secondary: #64748B;
--brand-accent: #F59E0B;

/* Typography Variables */
--brand-font-family: 'Inter';
--brand-font-weight-normal: 400;
--brand-font-weight-semibold: 600;
--brand-font-weight-bold: 700;

/* Spacing Variables */
--brand-spacing-xs: 0.25rem;
--brand-spacing-sm: 0.5rem;
--brand-spacing-md: 1rem;
--brand-spacing-lg: 1.5rem;
--brand-spacing-xl: 3rem;
```

#### Example Custom CSS
```css
/* Custom button styling */
.brand-button-primary {
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent));
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Custom header styling */
.brand-header {
  border-bottom: 2px solid var(--brand-accent);
}

/* Custom card styling */
.brand-card {
  border-left: 4px solid var(--brand-primary);
  background: rgba(var(--brand-secondary), 0.05);
}
```

### Brand Guidelines

Document your brand usage with internal guidelines:

#### What to Include:
- Color usage rules
- Logo placement guidelines
- Typography hierarchy
- Do's and don'ts for brand usage

#### Example Guidelines:
```
Brand Guidelines for [Your Business]

Colors:
- Primary (#3B82F6): Use for main actions and headers
- Secondary (#64748B): Use for supporting text and borders
- Accent (#F59E0B): Use sparingly for highlights and calls-to-action

Logo Usage:
- Maintain clear space equal to logo height around logo
- Never stretch or skew logo proportions
- Use on light backgrounds primarily

Typography:
- Headers: Playfair Display, Bold
- Body text: Inter, Regular
- Captions: Inter, Light
```

## Best Practices

### Color Selection

#### Accessibility Guidelines
- Ensure 4.5:1 contrast ratio for normal text
- Ensure 3:1 contrast ratio for large text
- Test colors with colorblind simulation tools

#### Brand Cohesion
- Select colors that align with your existing brand
- Consider psychological impact of colors:
  - Blue: Trust, reliability
  - Green: Growth, harmony
  - Red: Energy, urgency
  - Purple: Luxury, creativity

### Logo Guidelines

#### Design Principles
- **Simplicity**: Clean, uncluttered design
- **Scalability**: Readable at all sizes
- **Versatility**: Works on various backgrounds
- **Timelessness**: Avoid trendy elements that quickly date

#### Technical Best Practices
- Use vector formats (SVG) when possible
- Provide high-resolution versions
- Include transparent background versions
- Test at minimum size (32x32px)

### Typography

#### Readability Factors
- **Font Size**: Minimum 16px for body text
- **Line Height**: 1.4-1.6 for optimal readability
- **Character Spacing**: Default spacing usually works best
- **Contrast**: High contrast between text and background

#### Font Pairing Guidelines
- **Classic Pairs**:
  - Playfair Display (headers) + Inter (body)
  - Montserrat (headers) + Open Sans (body)
  - Poppins (headers) + Lato (body)

### Performance Optimization

#### Image Optimization
```bash
# Recommended image optimization workflow
1. Start with high-quality source image
2. Resize to maximum needed dimensions
3. Compress using tools like TinyPNG
4. Convert to WebP for modern browsers
5. Provide fallback PNG/JPEG
```

#### Loading Performance
- Keep logo files under 500KB
- Use appropriate image formats
- Consider lazy loading for non-critical images

## Mobile Optimization

### Mobile-First Design

Your brand customizations automatically adapt to mobile devices:

#### Responsive Behavior
- Logo scales appropriately for small screens
- Colors maintain contrast on mobile displays
- Typography adjusts for touch interfaces

#### Mobile-Specific Considerations
- Test logo visibility on small screens
- Ensure touch targets meet minimum size requirements (44px)
- Verify color contrast on various mobile devices

### Testing Your Mobile Brand

1. Use browser developer tools to simulate mobile devices
2. Test on actual mobile devices when possible
3. Check brand appearance in both portrait and landscape orientations

## Quality Assurance

### Pre-Launch Checklist

Before activating your brand customization:

#### Visual Review
- [ ] Logo displays clearly at all sizes
- [ ] Colors provide sufficient contrast
- [ ] Typography is readable across devices
- [ ] Brand elements align with company guidelines

#### Technical Validation
- [ ] All assets uploaded successfully
- [ ] No console errors in preview
- [ ] Custom CSS validates without errors
- [ ] Performance meets standards (< 3 second load time)

#### Cross-Device Testing
- [ ] Desktop browsers (Chrome, Firefox, Safari, Edge)
- [ ] Mobile devices (iOS Safari, Android Chrome)
- [ ] Tablet devices
- [ ] Various screen resolutions

### Approval Workflow

For organizations with brand approval processes:

1. **Designer Creates**: Initial brand setup and customization
2. **Review Stage**: Internal team reviews brand implementation
3. **Approval**: Brand manager or owner approves final design
4. **Activation**: Brand goes live across all client touchpoints

## Troubleshooting

### Common Issues

#### Logo Upload Problems

**Issue**: "File too large" error
**Solution**: 
- Compress image using tools like TinyPNG
- Resize image to recommended dimensions
- Convert to optimized format (WebP or PNG)

**Issue**: Logo appears blurry
**Solution**:
- Upload higher resolution image (minimum 300x300px)
- Use PNG format for crisp edges
- Ensure logo is designed for web use

#### Color Display Issues

**Issue**: Colors look different than expected
**Solution**:
- Check color profile of your monitor
- Use hex codes for exact color matching
- Test on multiple devices and browsers

**Issue**: Poor contrast warnings
**Solution**:
- Use online contrast checkers
- Adjust colors to meet WCAG guidelines
- Consider alternative color combinations

#### Performance Issues

**Issue**: Slow loading preview
**Solution**:
- Optimize image file sizes
- Reduce custom CSS complexity
- Clear browser cache and reload

**Issue**: Preview not updating
**Solution**:
- Refresh the browser
- Check for JavaScript errors in console
- Try in an incognito/private browser window

### Getting Help

#### Support Channels
- **Help Center**: Access built-in help documentation
- **Support Ticket**: Submit detailed issue reports
- **Live Chat**: Real-time assistance during business hours
- **Video Tutorials**: Step-by-step visual guides

#### When to Contact Support
- Technical errors that prevent brand customization
- Issues with file uploads that persist after troubleshooting
- Questions about subscription-level branding features
- Assistance with complex custom CSS implementations

### Frequently Asked Questions

**Q: Can I use my own fonts?**
A: Currently, you can select from our curated font library. Custom font uploads may be available in future updates.

**Q: How long does it take for changes to appear?**
A: Brand changes are typically live within 5 minutes of saving.

**Q: Can I have different brands for different services?**
A: Each organization can have one primary brand. Contact support about multi-brand solutions for enterprise accounts.

**Q: What happens to my branding if I downgrade my subscription?**
A: Basic brand elements (colors, fonts) are maintained, but advanced features like custom CSS may be disabled.

**Q: Can I export my brand guidelines?**
A: Yes, use the "Export Brand Guidelines" feature to generate a PDF of your brand specifications.

## Next Steps

After completing your brand customization:

1. **Test Thoroughly**: Review your brand across all platform features
2. **Train Your Team**: Ensure team members understand brand guidelines
3. **Monitor Performance**: Check loading times and user feedback
4. **Iterate**: Refine your brand based on user response and business needs
5. **Stay Updated**: Keep brand assets current with business changes

---

*For additional support or advanced branding needs, contact the WedSync support team at support@wedsync.com*