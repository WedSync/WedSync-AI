// Test setup file for Form Builder components
import '@testing-library/jest-dom';

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock DragEvent for drag and drop tests
global.DragEvent = class DragEvent extends Event {
  dataTransfer: DataTransfer;
  
  constructor(type: string, eventInitDict?: DragEventInit) {
    super(type, eventInitDict);
    this.dataTransfer = {
      dropEffect: 'none',
      effectAllowed: 'uninitialized',
      files: [] as any,
      items: [] as any,
      types: [],
      clearData: jest.fn(),
      getData: jest.fn(),
      setData: jest.fn(),
      setDragImage: jest.fn(),
    } as DataTransfer;
  }
};

// Mock DataTransferItem and DataTransferItemList
global.DataTransferItem = class DataTransferItem {
  kind: string = 'string';
  type: string = 'text/plain';
  getAsFile = jest.fn();
  getAsString = jest.fn();
  webkitGetAsEntry = jest.fn();
};

global.DataTransferItemList = class DataTransferItemList {
  length: number = 0;
  add = jest.fn();
  remove = jest.fn();
  clear = jest.fn();
  [Symbol.iterator] = jest.fn();
};

// Mock FileReader for file upload tests
global.FileReader = class FileReader extends EventTarget {
  result: any = null;
  error: any = null;
  readyState: number = 0;
  
  abort = jest.fn();
  readAsArrayBuffer = jest.fn();
  readAsBinaryString = jest.fn();
  readAsDataURL = jest.fn();
  readAsText = jest.fn();
  
  EMPTY = 0;
  LOADING = 1;
  DONE = 2;
};

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    ...performance,
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByName: jest.fn().mockReturnValue([]),
    getEntriesByType: jest.fn().mockReturnValue([]),
    now: jest.fn().mockReturnValue(Date.now()),
  },
});

// Mock Clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(void 0),
    readText: jest.fn().mockResolvedValue(''),
  },
});

// Mock Touch Events for mobile testing
global.TouchEvent = class TouchEvent extends Event {
  touches: TouchList;
  targetTouches: TouchList;
  changedTouches: TouchList;
  
  constructor(type: string, eventInitDict?: TouchEventInit) {
    super(type, eventInitDict);
    this.touches = [] as any;
    this.targetTouches = [] as any;
    this.changedTouches = [] as any;
  }
};

global.Touch = class Touch {
  identifier: number = 0;
  target: EventTarget = document.body;
  screenX: number = 0;
  screenY: number = 0;
  clientX: number = 0;
  clientY: number = 0;
  pageX: number = 0;
  pageY: number = 0;
  radiusX: number = 0;
  radiusY: number = 0;
  rotationAngle: number = 0;
  force: number = 1;
  
  constructor(touchInitDict: TouchInit) {
    Object.assign(this, touchInitDict);
  }
};

// Mock getComputedStyle for styling tests
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = jest.fn().mockImplementation((element) => {
  return {
    ...originalGetComputedStyle(element),
    getPropertyValue: jest.fn().mockReturnValue(''),
    height: '48px', // Touch-friendly minimum
    width: '48px',
    minHeight: '48px',
    minWidth: '48px',
    display: 'block',
    position: 'relative',
  };
});

// Mock getBoundingClientRect for positioning tests
Element.prototype.getBoundingClientRect = jest.fn().mockReturnValue({
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  toJSON: jest.fn(),
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock focus and blur methods
HTMLElement.prototype.focus = jest.fn();
HTMLElement.prototype.blur = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// Mock console methods to reduce noise in tests
const originalConsole = console;
global.console = {
  ...originalConsole,
  // Keep error and warn for debugging
  error: originalConsole.error,
  warn: originalConsole.warn,
  // Silence info, log, debug in tests
  info: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
};

// Mock window.requestAnimationFrame
global.requestAnimationFrame = jest.fn().mockImplementation((cb) => {
  return setTimeout(cb, 16); // ~60fps
});

global.cancelAnimationFrame = jest.fn().mockImplementation((id) => {
  clearTimeout(id);
});

// Mock crypto for ID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn().mockReturnValue('mock-uuid-1234-5678-9abc'),
    getRandomValues: jest.fn().mockReturnValue(new Uint32Array([1, 2, 3, 4])),
  },
});

// Set default timezone for consistent date testing
process.env.TZ = 'UTC';

// Mock next/router if needed
jest.mock('next/router', () => ({
  useRouter: jest.fn().mockReturnValue({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    pop: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

// Global test utilities
export const createMockFormField = (overrides: Partial<any> = {}): any => ({
  id: 'mock-field-id',
  type: 'text',
  label: 'Mock Field',
  category: 'basic',
  isWeddingSpecific: false,
  validation: {},
  ...overrides,
});

export const createMockTierLimitations = (overrides: Partial<any> = {}): any => ({
  availableFieldTypes: ['text', 'email', 'wedding-date'],
  maxFields: 10,
  advancedFields: ['photo-preferences'],
  canUseLogic: true,
  canUseTemplates: true,
  canExportData: true,
  canUseIntegrations: false,
  ...overrides,
});

// Custom render helper for testing with providers
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    // Add any providers your components need
    <div>{children}</div>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  // Reset any global state if needed
});

// Add any additional setup needed for wedding-specific features
export const setupWeddingContext = () => {
  // Mock wedding-specific APIs or services
  return {
    mockVendorApi: jest.fn(),
    mockWeddingDateCalculator: jest.fn(),
    mockPhotographyScheduler: jest.fn(),
  };
};

console.log('✅ Form Builder test setup complete');