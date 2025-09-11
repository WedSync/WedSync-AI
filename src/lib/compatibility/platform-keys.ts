/**
 * Platform-Specific Key Binding Manager
 * Handles Ctrl/Cmd differences between Mac and Windows/Linux
 */

export interface KeyBinding {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export interface PlatformKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export type KeyHandler = (event: PlatformKeyEvent) => boolean | void;

export class PlatformKeyManager {
  private static instance: PlatformKeyManager;
  private keyBindings: Map<string, KeyHandler> = new Map();
  private isMac: boolean;
  private isTouch: boolean;

  private constructor() {
    this.isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
    this.isTouch = 'ontouchstart' in window;
  }

  static getInstance(): PlatformKeyManager {
    if (!PlatformKeyManager.instance) {
      PlatformKeyManager.instance = new PlatformKeyManager();
    }
    return PlatformKeyManager.instance;
  }

  // Register key binding with automatic platform detection
  register(binding: KeyBinding, handler: KeyHandler): void {
    const key = this.createKeyString(binding);
    this.keyBindings.set(key, handler);
  }

  // Handle keyboard event with platform-specific logic
  handleKeyEvent(event: KeyboardEvent): boolean {
    const keyString = this.eventToKeyString(event);
    const handler = this.keyBindings.get(keyString);

    if (handler) {
      const platformEvent: PlatformKeyEvent = {
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      };

      const result = handler(platformEvent);
      if (result !== false) {
        event.preventDefault();
        return true;
      }
    }

    return false;
  }

  // Wedding CMS specific key bindings
  registerWeddingCMSBindings(handlers: {
    bold?: KeyHandler;
    italic?: KeyHandler;
    underline?: KeyHandler;
    save?: KeyHandler;
    undo?: KeyHandler;
    redo?: KeyHandler;
    link?: KeyHandler;
    image?: KeyHandler;
    bulletList?: KeyHandler;
    numberedList?: KeyHandler;
    heading1?: KeyHandler;
    heading2?: KeyHandler;
    heading3?: KeyHandler;
    copy?: KeyHandler;
    paste?: KeyHandler;
    cut?: KeyHandler;
    selectAll?: KeyHandler;
    find?: KeyHandler;
    publish?: KeyHandler;
    preview?: KeyHandler;
  }): void {
    // Text formatting shortcuts
    if (handlers.bold) {
      this.register(
        { key: 'b', ctrlKey: !this.isMac, metaKey: this.isMac },
        handlers.bold,
      );
    }

    if (handlers.italic) {
      this.register(
        { key: 'i', ctrlKey: !this.isMac, metaKey: this.isMac },
        handlers.italic,
      );
    }

    if (handlers.underline) {
      this.register(
        { key: 'u', ctrlKey: !this.isMac, metaKey: this.isMac },
        handlers.underline,
      );
    }

    // Document operations
    if (handlers.save) {
      this.register(
        { key: 's', ctrlKey: !this.isMac, metaKey: this.isMac },
        handlers.save,
      );
    }

    if (handlers.undo) {
      this.register(
        { key: 'z', ctrlKey: !this.isMac, metaKey: this.isMac },
        handlers.undo,
      );
    }

    if (handlers.redo) {
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      this.register(
        { key: 'z', ctrlKey: !this.isMac, metaKey: this.isMac, shiftKey: true },
        handlers.redo,
      );
      this.register(
        { key: 'y', ctrlKey: !this.isMac, metaKey: this.isMac },
        handlers.redo,
      );
    }

    // Content insertion
    if (handlers.link) {
      this.register(
        { key: 'k', ctrlKey: !this.isMac, metaKey: this.isMac },
        handlers.link,
      );
    }

    // Lists
    if (handlers.bulletList) {
      this.register(
        { key: '8', ctrlKey: !this.isMac, metaKey: this.isMac, shiftKey: true },
        handlers.bulletList,
      );
    }

    if (handlers.numberedList) {
      this.register(
        { key: '7', ctrlKey: !this.isMac, metaKey: this.isMac, shiftKey: true },
        handlers.numberedList,
      );
    }

    // Headings
    if (handlers.heading1) {
      this.register(
        { key: '1', ctrlKey: !this.isMac, metaKey: this.isMac, altKey: true },
        handlers.heading1,
      );
    }

    if (handlers.heading2) {
      this.register(
        { key: '2', ctrlKey: !this.isMac, metaKey: this.isMac, altKey: true },
        handlers.heading2,
      );
    }

    if (handlers.heading3) {
      this.register(
        { key: '3', ctrlKey: !this.isMac, metaKey: this.isMac, altKey: true },
        handlers.heading3,
      );
    }

    // Clipboard operations (browser handles most, but we can override)
    if (handlers.copy) {
      this.register(
        { key: 'c', ctrlKey: !this.isMac, metaKey: this.isMac },
        handlers.copy,
      );
    }

    if (handlers.paste) {
      this.register(
        { key: 'v', ctrlKey: !this.isMac, metaKey: this.isMac },
        handlers.paste,
      );
    }

    if (handlers.cut) {
      this.register(
        { key: 'x', ctrlKey: !this.isMac, metaKey: this.isMac },
        handlers.cut,
      );
    }

    // Selection and search
    if (handlers.selectAll) {
      this.register(
        { key: 'a', ctrlKey: !this.isMac, metaKey: this.isMac },
        handlers.selectAll,
      );
    }

    if (handlers.find) {
      this.register(
        { key: 'f', ctrlKey: !this.isMac, metaKey: this.isMac },
        handlers.find,
      );
    }

    // Wedding CMS specific shortcuts
    if (handlers.publish) {
      this.register(
        {
          key: 'Enter',
          ctrlKey: !this.isMac,
          metaKey: this.isMac,
          shiftKey: true,
        },
        handlers.publish,
      );
    }

    if (handlers.preview) {
      this.register(
        { key: 'p', ctrlKey: !this.isMac, metaKey: this.isMac, shiftKey: true },
        handlers.preview,
      );
    }
  }

  // Get platform-appropriate key display string for UI
  getKeyDisplayString(binding: KeyBinding): string {
    let display = '';

    if (binding.ctrlKey && !this.isMac) display += 'Ctrl+';
    if (binding.metaKey && this.isMac) display += '⌘+';
    if (binding.altKey) display += this.isMac ? '⌥+' : 'Alt+';
    if (binding.shiftKey) display += this.isMac ? '⇧+' : 'Shift+';

    // Format key name
    let keyName = binding.key;
    if (keyName === ' ') keyName = 'Space';
    if (keyName === 'Enter') keyName = this.isMac ? '↵' : 'Enter';
    if (keyName === 'Backspace') keyName = this.isMac ? '⌫' : 'Backspace';
    if (keyName === 'Delete') keyName = this.isMac ? '⌦' : 'Delete';
    if (keyName === 'Escape') keyName = this.isMac ? 'esc' : 'Esc';

    display += keyName.toUpperCase();
    return display;
  }

  // Create key string for internal storage
  private createKeyString(binding: KeyBinding): string {
    const parts: string[] = [];

    if (binding.ctrlKey) parts.push('ctrl');
    if (binding.metaKey) parts.push('meta');
    if (binding.shiftKey) parts.push('shift');
    if (binding.altKey) parts.push('alt');
    parts.push(binding.key.toLowerCase());

    return parts.join('+');
  }

  // Convert keyboard event to key string
  private eventToKeyString(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.ctrlKey) parts.push('ctrl');
    if (event.metaKey) parts.push('meta');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    parts.push(event.key.toLowerCase());

    return parts.join('+');
  }

  // Platform-specific key code mappings for older browsers
  getKeyFromCode(code: string): string {
    const keyMap: { [key: string]: string } = {
      KeyA: 'a',
      KeyB: 'b',
      KeyC: 'c',
      KeyD: 'd',
      KeyE: 'e',
      KeyF: 'f',
      KeyG: 'g',
      KeyH: 'h',
      KeyI: 'i',
      KeyJ: 'j',
      KeyK: 'k',
      KeyL: 'l',
      KeyM: 'm',
      KeyN: 'n',
      KeyO: 'o',
      KeyP: 'p',
      KeyQ: 'q',
      KeyR: 'r',
      KeyS: 's',
      KeyT: 't',
      KeyU: 'u',
      KeyV: 'v',
      KeyW: 'w',
      KeyX: 'x',
      KeyY: 'y',
      KeyZ: 'z',
      Digit1: '1',
      Digit2: '2',
      Digit3: '3',
      Digit4: '4',
      Digit5: '5',
      Digit6: '6',
      Digit7: '7',
      Digit8: '8',
      Digit9: '9',
      Digit0: '0',
      Space: ' ',
      Enter: 'Enter',
      Backspace: 'Backspace',
      Delete: 'Delete',
      Escape: 'Escape',
    };

    return keyMap[code] || code.toLowerCase();
  }

  // Check if current platform uses Meta key (Cmd on Mac)
  usesMetaKey(): boolean {
    return this.isMac;
  }

  // Check if device has touch capability
  isTouchDevice(): boolean {
    return this.isTouch;
  }

  // Get all registered bindings for display
  getAllBindings(): { binding: KeyBinding; display: string }[] {
    const bindings: { binding: KeyBinding; display: string }[] = [];

    this.keyBindings.forEach((handler, keyString) => {
      const binding = this.parseKeyString(keyString);
      bindings.push({
        binding,
        display: this.getKeyDisplayString(binding),
      });
    });

    return bindings;
  }

  // Parse internal key string back to binding
  private parseKeyString(keyString: string): KeyBinding {
    const parts = keyString.split('+');
    const key = parts.pop() || '';

    return {
      key,
      ctrlKey: parts.includes('ctrl'),
      metaKey: parts.includes('meta'),
      shiftKey: parts.includes('shift'),
      altKey: parts.includes('alt'),
    };
  }

  // Clear all registered bindings
  clear(): void {
    this.keyBindings.clear();
  }

  // Platform-specific tips for wedding vendors
  getWeddingVendorKeyboardTips(): string[] {
    const tips: string[] = [];

    if (this.isMac) {
      tips.push('Use ⌘ (Cmd) key for shortcuts instead of Ctrl');
      tips.push('⌘+S to save your wedding content');
      tips.push('⌘+B for bold text in descriptions');
      tips.push('⌘+Shift+Enter to publish immediately');
    } else {
      tips.push('Use Ctrl key for all editor shortcuts');
      tips.push('Ctrl+S to save your wedding content');
      tips.push('Ctrl+B for bold text in descriptions');
      tips.push('Ctrl+Shift+Enter to publish immediately');
    }

    if (this.isTouch) {
      tips.push('Tap and hold for context menus');
      tips.push('Double-tap to select words quickly');
      tips.push('Use the toolbar buttons for formatting on touch devices');
    }

    return tips;
  }
}
