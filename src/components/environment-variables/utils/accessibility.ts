/**
 * Accessibility Utilities for Environment Variables Management
 * WCAG 2.1 AA compliance utilities and helpers
 */

// Keyboard navigation constants
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

// ARIA roles and properties
export const ARIA_ROLES = {
  BUTTON: 'button',
  TAB: 'tab',
  TABPANEL: 'tabpanel',
  TABLIST: 'tablist',
  MENU: 'menu',
  MENUITEM: 'menuitem',
  DIALOG: 'dialog',
  ALERT: 'alert',
  ALERTDIALOG: 'alertdialog',
  REGION: 'region',
  BANNER: 'banner',
  MAIN: 'main',
  NAVIGATION: 'navigation',
  COMPLEMENTARY: 'complementary',
  CONTENTINFO: 'contentinfo',
  FORM: 'form',
  SEARCH: 'search',
  APPLICATION: 'application',
  GRID: 'grid',
  GRIDCELL: 'gridcell',
  ROW: 'row',
  COLUMNHEADER: 'columnheader',
  ROWHEADER: 'rowheader',
} as const;

// Screen reader utilities
export class ScreenReaderAnnouncer {
  private static liveRegion: HTMLElement | null = null;

  static announce(
    message: string,
    priority: 'polite' | 'assertive' = 'polite',
  ) {
    if (!this.liveRegion) {
      this.createLiveRegion();
    }

    if (this.liveRegion) {
      this.liveRegion.setAttribute('aria-live', priority);
      this.liveRegion.textContent = message;

      // Clear the message after a short delay to avoid repetition
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = '';
        }
      }, 1000);
    }
  }

  private static createLiveRegion() {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.setAttribute('class', 'sr-only');
    this.liveRegion.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    document.body.appendChild(this.liveRegion);
  }
}

// Focus management
export class FocusManager {
  private static focusStack: HTMLElement[] = [];

  static trapFocus(containerElement: HTMLElement) {
    const focusableElements = this.getFocusableElements(containerElement);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === KEYBOARD_KEYS.TAB) {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    containerElement.addEventListener('keydown', handleTabKey);
    firstElement.focus();

    return () => {
      containerElement.removeEventListener('keydown', handleTabKey);
    };
  }

  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors)).filter(
      (element) => this.isVisible(element as HTMLElement),
    ) as HTMLElement[];
  }

  static saveFocus(element: HTMLElement) {
    this.focusStack.push(element);
  }

  static restoreFocus() {
    const element = this.focusStack.pop();
    if (element && this.isVisible(element)) {
      element.focus();
    }
  }

  private static isVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      element.getAttribute('aria-hidden') !== 'true'
    );
  }
}

// Color contrast utilities
export class ColorContrastChecker {
  static getContrastRatio(foreground: string, background: string): number {
    const foregroundLuminance = this.getLuminance(foreground);
    const backgroundLuminance = this.getLuminance(background);

    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);

    return (lighter + 0.05) / (darker + 0.05);
  }

  static meetsWCAGAA(
    foreground: string,
    background: string,
    fontSize: number = 16,
  ): boolean {
    const contrastRatio = this.getContrastRatio(foreground, background);
    const isLargeText = fontSize >= 18 || fontSize >= 14; // 18px normal or 14px bold

    return isLargeText ? contrastRatio >= 3.0 : contrastRatio >= 4.5;
  }

  private static getLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private static hexToRgb(
    hex: string,
  ): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }
}

// Keyboard navigation helpers
export function handleArrowNavigation(
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  options: {
    wrap?: boolean;
    orientation?: 'horizontal' | 'vertical' | 'both';
  } = {},
): number {
  const { wrap = true, orientation = 'vertical' } = options;
  let newIndex = currentIndex;

  switch (event.key) {
    case KEYBOARD_KEYS.ARROW_DOWN:
      if (orientation === 'vertical' || orientation === 'both') {
        newIndex = wrap
          ? (currentIndex + 1) % items.length
          : Math.min(currentIndex + 1, items.length - 1);
        event.preventDefault();
      }
      break;
    case KEYBOARD_KEYS.ARROW_UP:
      if (orientation === 'vertical' || orientation === 'both') {
        newIndex = wrap
          ? (currentIndex - 1 + items.length) % items.length
          : Math.max(currentIndex - 1, 0);
        event.preventDefault();
      }
      break;
    case KEYBOARD_KEYS.ARROW_RIGHT:
      if (orientation === 'horizontal' || orientation === 'both') {
        newIndex = wrap
          ? (currentIndex + 1) % items.length
          : Math.min(currentIndex + 1, items.length - 1);
        event.preventDefault();
      }
      break;
    case KEYBOARD_KEYS.ARROW_LEFT:
      if (orientation === 'horizontal' || orientation === 'both') {
        newIndex = wrap
          ? (currentIndex - 1 + items.length) % items.length
          : Math.max(currentIndex - 1, 0);
        event.preventDefault();
      }
      break;
    case KEYBOARD_KEYS.HOME:
      newIndex = 0;
      event.preventDefault();
      break;
    case KEYBOARD_KEYS.END:
      newIndex = items.length - 1;
      event.preventDefault();
      break;
  }

  if (newIndex !== currentIndex && items[newIndex]) {
    items[newIndex].focus();
    return newIndex;
  }

  return currentIndex;
}

// ARIA attributes helpers
export function generateAriaAttributes(options: {
  role?: string;
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  expanded?: boolean;
  selected?: boolean;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  hidden?: boolean;
  level?: number;
  setSize?: number;
  posInSet?: number;
  hasPopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  controls?: string;
  owns?: string;
  live?: 'off' | 'polite' | 'assertive';
  atomic?: boolean;
  busy?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
}): Record<string, string | boolean | number | undefined> {
  const attributes: Record<string, any> = {};

  if (options.role) attributes.role = options.role;
  if (options.label) attributes['aria-label'] = options.label;
  if (options.labelledBy) attributes['aria-labelledby'] = options.labelledBy;
  if (options.describedBy) attributes['aria-describedby'] = options.describedBy;
  if (options.expanded !== undefined)
    attributes['aria-expanded'] = options.expanded;
  if (options.selected !== undefined)
    attributes['aria-selected'] = options.selected;
  if (options.disabled !== undefined)
    attributes['aria-disabled'] = options.disabled;
  if (options.required !== undefined)
    attributes['aria-required'] = options.required;
  if (options.invalid !== undefined)
    attributes['aria-invalid'] = options.invalid;
  if (options.hidden !== undefined) attributes['aria-hidden'] = options.hidden;
  if (options.level !== undefined) attributes['aria-level'] = options.level;
  if (options.setSize !== undefined)
    attributes['aria-setsize'] = options.setSize;
  if (options.posInSet !== undefined)
    attributes['aria-posinset'] = options.posInSet;
  if (options.hasPopup !== undefined)
    attributes['aria-haspopup'] = options.hasPopup;
  if (options.controls) attributes['aria-controls'] = options.controls;
  if (options.owns) attributes['aria-owns'] = options.owns;
  if (options.live) attributes['aria-live'] = options.live;
  if (options.atomic !== undefined) attributes['aria-atomic'] = options.atomic;
  if (options.busy !== undefined) attributes['aria-busy'] = options.busy;
  if (options.relevant) attributes['aria-relevant'] = options.relevant;

  return attributes;
}

// Skip link component for keyboard navigation
export function createSkipLink(target: string, text: string): HTMLElement {
  const skipLink = document.createElement('a');
  skipLink.href = `#${target}`;
  skipLink.className = 'skip-link';
  skipLink.textContent = text;
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 6px;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 9999;
    border-radius: 4px;
    font-weight: bold;
    transition: top 0.3s;
  `;

  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '6px';
  });

  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });

  return skipLink;
}

// Reduced motion detection
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// High contrast detection
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

// Font size preferences
export function getPreferredFontSize(): 'small' | 'medium' | 'large' {
  const fontSize = parseInt(
    getComputedStyle(document.documentElement).fontSize,
  );

  if (fontSize >= 20) return 'large';
  if (fontSize >= 16) return 'medium';
  return 'small';
}

// Touch target size checker
export function checkTouchTargetSize(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const minSize = 44; // WCAG minimum touch target size in pixels

  return rect.width >= minSize && rect.height >= minSize;
}

// Form validation accessibility helpers
export function announceFormError(fieldId: string, message: string) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  // Create or update error message element
  let errorElement = document.getElementById(`${fieldId}-error`);
  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.id = `${fieldId}-error`;
    errorElement.className = 'field-error';
    errorElement.setAttribute('role', 'alert');
    errorElement.setAttribute('aria-live', 'assertive');
    field.parentNode?.insertBefore(errorElement, field.nextSibling);
  }

  errorElement.textContent = message;
  field.setAttribute('aria-describedby', `${fieldId}-error`);
  field.setAttribute('aria-invalid', 'true');

  // Announce to screen readers
  ScreenReaderAnnouncer.announce(
    `Error in ${field.getAttribute('aria-label') || fieldId}: ${message}`,
    'assertive',
  );
}

export function clearFormError(fieldId: string) {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(`${fieldId}-error`);

  if (field) {
    field.removeAttribute('aria-describedby');
    field.setAttribute('aria-invalid', 'false');
  }

  if (errorElement) {
    errorElement.remove();
  }
}

// Table accessibility helpers
export function makeTableAccessible(table: HTMLTableElement) {
  // Add table role if not present
  if (!table.getAttribute('role')) {
    table.setAttribute('role', 'table');
  }

  // Add caption if missing
  if (!table.caption) {
    const caption = document.createElement('caption');
    caption.textContent = 'Environment Variables Table';
    caption.className = 'sr-only';
    table.insertBefore(caption, table.firstChild);
  }

  // Mark headers
  const headers = table.querySelectorAll('th');
  headers.forEach((header, index) => {
    header.setAttribute('scope', 'col');
    header.setAttribute('role', 'columnheader');
    if (!header.id) {
      header.id = `header-${index}`;
    }
  });

  // Mark data cells
  const cells = table.querySelectorAll('td');
  cells.forEach((cell) => {
    cell.setAttribute('role', 'gridcell');
  });

  // Add row roles
  const rows = table.querySelectorAll('tr');
  rows.forEach((row) => {
    row.setAttribute('role', 'row');
  });
}

// Export utility functions for components
export { KEYBOARD_KEYS as keys, ARIA_ROLES as roles };
