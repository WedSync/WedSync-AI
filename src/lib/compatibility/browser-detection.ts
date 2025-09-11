/**
 * Cross-Browser Detection and Capability Service
 * Optimized for wedding vendor CMS workflows
 */

export interface BrowserCapabilities {
  name: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';
  version: number;
  platform: 'mac' | 'windows' | 'ios' | 'android' | 'linux' | 'unknown';
  isMobile: boolean;
  isTablet: boolean;
  engine: 'webkit' | 'gecko' | 'blink' | 'unknown';

  // Feature support flags
  features: {
    clipboardAPI: boolean;
    dragAndDrop: boolean;
    touch: boolean;
    webp: boolean;
    modernPaste: boolean;
    fileAPI: boolean;
    textSelection: boolean;
    customElements: boolean;
  };

  // Editor-specific capabilities
  editor: {
    keyboardShortcuts: boolean;
    undoRedo: boolean;
    richPaste: boolean;
    imageResize: boolean;
    tableEditing: boolean;
    spellCheck: boolean;
  };
}

export class BrowserDetectionService {
  private static instance: BrowserDetectionService;
  private capabilities: BrowserCapabilities;

  private constructor() {
    this.capabilities = this.detectCapabilities();
  }

  static getInstance(): BrowserDetectionService {
    if (!BrowserDetectionService.instance) {
      BrowserDetectionService.instance = new BrowserDetectionService();
    }
    return BrowserDetectionService.instance;
  }

  getCapabilities(): BrowserCapabilities {
    return this.capabilities;
  }

  private detectCapabilities(): BrowserCapabilities {
    const userAgent = navigator.userAgent;
    const platform = this.detectPlatform();
    const browser = this.detectBrowser(userAgent);
    const isMobile = this.detectMobile();
    const isTablet = this.detectTablet();

    return {
      name: browser.name,
      version: browser.version,
      platform,
      isMobile,
      isTablet,
      engine: this.detectEngine(),
      features: this.detectFeatures(),
      editor: this.detectEditorCapabilities(),
    };
  }

  private detectBrowser(userAgent: string): {
    name: BrowserCapabilities['name'];
    version: number;
  } {
    // Chrome/Chromium (check before Safari as Chrome includes Safari in UA)
    if (userAgent.includes('Chrome/') && !userAgent.includes('Edg')) {
      const match = userAgent.match(/Chrome\/(\d+)/);
      return { name: 'chrome', version: match ? parseInt(match[1]) : 0 };
    }

    // Edge (new Chromium-based)
    if (userAgent.includes('Edg/')) {
      const match = userAgent.match(/Edg\/(\d+)/);
      return { name: 'edge', version: match ? parseInt(match[1]) : 0 };
    }

    // Safari
    if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
      const match = userAgent.match(/Version\/(\d+)/);
      return { name: 'safari', version: match ? parseInt(match[1]) : 0 };
    }

    // Firefox
    if (userAgent.includes('Firefox/')) {
      const match = userAgent.match(/Firefox\/(\d+)/);
      return { name: 'firefox', version: match ? parseInt(match[1]) : 0 };
    }

    return { name: 'unknown', version: 0 };
  }

  private detectPlatform(): BrowserCapabilities['platform'] {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform.toLowerCase();

    if (/iphone|ipad|ipod/.test(userAgent.toLowerCase())) return 'ios';
    if (/android/.test(userAgent.toLowerCase())) return 'android';
    if (platform.includes('mac')) return 'mac';
    if (platform.includes('win')) return 'windows';
    if (platform.includes('linux')) return 'linux';

    return 'unknown';
  }

  private detectMobile(): boolean {
    return (
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) || window.innerWidth <= 768
    );
  }

  private detectTablet(): boolean {
    return (
      /iPad|Android.*Tablet|Surface/i.test(navigator.userAgent) ||
      (window.innerWidth > 768 &&
        window.innerWidth <= 1024 &&
        'ontouchstart' in window)
    );
  }

  private detectEngine(): BrowserCapabilities['engine'] {
    const userAgent = navigator.userAgent;

    if (userAgent.includes('WebKit/')) {
      if (userAgent.includes('Chrome/') || userAgent.includes('Edg/')) {
        return 'blink';
      }
      return 'webkit';
    }

    if (userAgent.includes('Gecko/') && userAgent.includes('Firefox/')) {
      return 'gecko';
    }

    return 'unknown';
  }

  private detectFeatures(): BrowserCapabilities['features'] {
    return {
      clipboardAPI: 'clipboard' in navigator && 'read' in navigator.clipboard,
      dragAndDrop: 'ondragstart' in document.createElement('div'),
      touch: 'ontouchstart' in window,
      webp: this.supportsWebP(),
      modernPaste: this.supportsModernPaste(),
      fileAPI: 'File' in window && 'FileReader' in window,
      textSelection: 'getSelection' in window,
      customElements: 'customElements' in window,
    };
  }

  private detectEditorCapabilities(): BrowserCapabilities['editor'] {
    const isWebKit = this.capabilities?.engine === 'webkit';
    const isFirefox = this.capabilities?.name === 'firefox';
    const isSafari = this.capabilities?.name === 'safari';

    return {
      keyboardShortcuts: true, // All modern browsers support this
      undoRedo: 'execCommand' in document,
      richPaste: this.supportsRichPaste(),
      imageResize: !isSafari, // Safari has issues with image resize handles
      tableEditing: !isWebKit || this.capabilities?.version >= 15,
      spellCheck: 'spellcheck' in document.createElement('div'),
    };
  }

  private supportsWebP(): boolean {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('webp') > 0;
    } catch {
      return false;
    }
  }

  private supportsModernPaste(): boolean {
    try {
      return 'clipboardData' in window.ClipboardEvent.prototype;
    } catch {
      return false;
    }
  }

  private supportsRichPaste(): boolean {
    // Check if browser can handle rich content in paste events
    try {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      return 'onpaste' in div && this.supportsModernPaste();
    } catch {
      return false;
    }
  }

  // Wedding vendor specific checks
  isWeddingVendorOptimal(): boolean {
    const caps = this.capabilities;

    // Check for optimal wedding vendor experience
    return (
      caps.features.dragAndDrop &&
      caps.features.fileAPI &&
      caps.editor.richPaste &&
      (caps.name !== 'safari' || caps.version >= 15) && // Safari 15+ for better editor support
      (caps.name !== 'firefox' || caps.version >= 100)
    ); // Firefox 100+ for better image handling
  }

  getWeddingVendorRecommendations(): string[] {
    const recommendations: string[] = [];
    const caps = this.capabilities;

    if (caps.name === 'safari' && caps.version < 15) {
      recommendations.push(
        'Please update Safari to version 15 or later for the best editing experience',
      );
    }

    if (caps.name === 'firefox' && caps.version < 100) {
      recommendations.push(
        'Consider updating Firefox for improved image upload performance',
      );
    }

    if (!caps.features.dragAndDrop) {
      recommendations.push(
        'Your browser has limited drag-and-drop support. Use the upload button instead',
      );
    }

    if (!caps.features.clipboardAPI) {
      recommendations.push(
        'Copy-paste functionality may be limited. Use Ctrl+C/Ctrl+V instead',
      );
    }

    if (caps.isMobile && !caps.isTablet) {
      recommendations.push(
        'For extensive editing, consider using a tablet or desktop for better experience',
      );
    }

    return recommendations;
  }

  // Performance optimization based on browser
  getPerformanceHints(): { [key: string]: any } {
    const caps = this.capabilities;

    return {
      // Image optimization settings
      imageQuality: caps.name === 'safari' ? 0.9 : 0.85, // Safari needs higher quality
      imageFormat: caps.features.webp ? 'webp' : 'jpeg',

      // Editor performance
      throttleKeyboard: caps.name === 'firefox' ? 100 : 50, // Firefox needs more throttling
      deferredLoading: caps.isMobile,

      // Auto-save frequency
      autoSaveInterval: caps.isMobile ? 10000 : 5000, // Longer intervals on mobile

      // Memory management
      clearHistoryAfter: caps.isMobile ? 50 : 100, // Clear undo history more frequently on mobile

      // Network optimization
      uploadChunkSize: caps.isMobile ? 1024 * 1024 : 2 * 1024 * 1024, // 1MB vs 2MB chunks
    };
  }

  // Log capabilities for debugging
  logCapabilities(): void {
    console.group('🌐 Browser Capabilities for WedSync CMS');
    console.log(
      'Browser:',
      `${this.capabilities.name} ${this.capabilities.version}`,
    );
    console.log('Platform:', this.capabilities.platform);
    console.log('Device:', this.capabilities.isMobile ? 'Mobile' : 'Desktop');
    console.log('Engine:', this.capabilities.engine);
    console.log('Wedding Vendor Optimal:', this.isWeddingVendorOptimal());

    console.group('📋 Features');
    Object.entries(this.capabilities.features).forEach(([key, value]) => {
      console.log(`${key}:`, value ? '✅' : '❌');
    });
    console.groupEnd();

    console.group('📝 Editor Capabilities');
    Object.entries(this.capabilities.editor).forEach(([key, value]) => {
      console.log(`${key}:`, value ? '✅' : '❌');
    });
    console.groupEnd();

    const recommendations = this.getWeddingVendorRecommendations();
    if (recommendations.length > 0) {
      console.group('💡 Recommendations');
      recommendations.forEach((rec) => console.log('•', rec));
      console.groupEnd();
    }

    console.groupEnd();
  }
}
