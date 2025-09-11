// BrowserStack integration for cross-platform testing automation
// Supports all major browsers, devices, and operating systems

export const BROWSERSTACK_CONFIG = {
  // Authentication
  username: process.env.BROWSERSTACK_USERNAME || 'wedsync_testing',
  accessKey: process.env.BROWSERSTACK_ACCESS_KEY || '',
  
  // Build configuration
  build: `WedSync-CrossPlatform-${process.env.CI_BUILD_ID || Date.now()}`,
  project: 'WedSync Wedding Platform',
  
  // Wedding-specific test matrix
  capabilities: [
    // Desktop Browsers - Primary wedding planning devices
    {
      browserName: 'chrome',
      browserVersion: 'latest',
      os: 'Windows',
      osVersion: '11',
      resolution: '1920x1080',
      name: 'Wedding Planning - Chrome Windows',
      'bstack:options': {
        sessionName: 'Desktop Wedding Planning Flow',
        projectName: 'WedSync Cross-Platform',
        buildName: 'Desktop Browser Matrix',
      }
    },
    {
      browserName: 'firefox', 
      browserVersion: 'latest',
      os: 'Windows',
      osVersion: '11',
      resolution: '1920x1080',
      name: 'Wedding Planning - Firefox Windows',
      'bstack:options': {
        sessionName: 'Desktop Vendor Management',
        projectName: 'WedSync Cross-Platform',
        buildName: 'Desktop Browser Matrix',
      }
    },
    {
      browserName: 'safari',
      browserVersion: 'latest',
      os: 'OS X',
      osVersion: 'Big Sur',
      resolution: '1920x1080',
      name: 'Wedding Planning - Safari macOS',
      'bstack:options': {
        sessionName: 'Desktop Timeline Creation',
        projectName: 'WedSync Cross-Platform',
        buildName: 'Desktop Browser Matrix',
      }
    },
    {
      browserName: 'edge',
      browserVersion: 'latest',
      os: 'Windows',
      osVersion: '11',
      resolution: '1920x1080',
      name: 'Wedding Planning - Edge Windows',
      'bstack:options': {
        sessionName: 'Desktop Budget Tracking',
        projectName: 'WedSync Cross-Platform',
        buildName: 'Desktop Browser Matrix',
      }
    },

    // Mobile Devices - On-the-go wedding management
    {
      deviceName: 'iPhone 14 Pro',
      osVersion: '16',
      browserName: 'safari',
      name: 'Mobile Wedding RSVP - iPhone 14 Pro',
      'bstack:options': {
        sessionName: 'Mobile RSVP Management',
        projectName: 'WedSync Cross-Platform',
        buildName: 'Mobile Device Matrix',
      }
    },
    {
      deviceName: 'iPhone 13',
      osVersion: '15',
      browserName: 'safari',
      name: 'Mobile Vendor Communication - iPhone 13',
      'bstack:options': {
        sessionName: 'Mobile Vendor Chat',
        projectName: 'WedSync Cross-Platform',
        buildName: 'Mobile Device Matrix',
      }
    },
    {
      deviceName: 'Samsung Galaxy S23',
      osVersion: '13.0',
      browserName: 'chrome',
      name: 'Mobile Timeline Updates - Galaxy S23',
      'bstack:options': {
        sessionName: 'Mobile Timeline Management',
        projectName: 'WedSync Cross-Platform',
        buildName: 'Mobile Device Matrix',
      }
    },
    {
      deviceName: 'Google Pixel 7',
      osVersion: '13.0', 
      browserName: 'chrome',
      name: 'Mobile Photo Upload - Pixel 7',
      'bstack:options': {
        sessionName: 'Mobile Photo Gallery',
        projectName: 'WedSync Cross-Platform',
        buildName: 'Mobile Device Matrix',
      }
    },
    {
      deviceName: 'OnePlus 9',
      osVersion: '11.0',
      browserName: 'chrome',
      name: 'Mobile Budget Tracking - OnePlus 9',
      'bstack:options': {
        sessionName: 'Mobile Budget Management',
        projectName: 'WedSync Cross-Platform',
        buildName: 'Mobile Device Matrix',
      }
    },

    // Tablet Devices - Planning sessions and vendor meetings
    {
      deviceName: 'iPad Pro 12.9 2022',
      osVersion: '16',
      browserName: 'safari',
      name: 'Tablet Wedding Planning - iPad Pro',
      'bstack:options': {
        sessionName: 'Tablet Planning Dashboard',
        projectName: 'WedSync Cross-Platform',
        buildName: 'Tablet Device Matrix',
      }
    },
    {
      deviceName: 'iPad Air 4',
      osVersion: '15',
      browserName: 'safari',
      name: 'Tablet Vendor Reviews - iPad Air',
      'bstack:options': {
        sessionName: 'Tablet Vendor Discovery',
        projectName: 'WedSync Cross-Platform',
        buildName: 'Tablet Device Matrix',
      }
    },
    {
      deviceName: 'Samsung Galaxy Tab S8',
      osVersion: '12.0',
      browserName: 'chrome',
      name: 'Tablet Seating Chart - Galaxy Tab S8',
      'bstack:options': {
        sessionName: 'Tablet Seating Management',
        projectName: 'WedSync Cross-Platform',
        buildName: 'Tablet Device Matrix',
      }
    },
  ],

  // Common settings for all capabilities
  commonCapabilities: {
    'bstack:options': {
      debug: true,
      video: true,
      networkLogs: true,
      consoleLogs: 'info',
      local: false,
      localIdentifier: process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
    }
  },

  // Hub URL
  hubUrl: 'https://hub-cloud.browserstack.com/wd/hub',
  
  // Test execution settings
  maxInstances: 5, // Limit concurrent executions
  waitforTimeout: 30000, // 30s for wedding form loads
  connectionRetryTimeout: 120000, // 2min for BrowserStack connection
  connectionRetryCount: 3,
  
  // Wedding-specific timeouts
  timeouts: {
    photoUpload: 60000, // 1 minute for wedding photo uploads
    vendorSearch: 15000, // 15 seconds for vendor directory
    rsvpSubmission: 10000, // 10 seconds for RSVP forms
    timelineLoad: 20000, // 20 seconds for timeline with many events
    budgetCalculation: 5000, // 5 seconds for budget updates
  }
};

// Browser capability builder for dynamic test matrix
export function buildCapabilities(testType: string): any[] {
  const baseCapabilities = BROWSERSTACK_CONFIG.capabilities;
  
  switch (testType) {
    case 'mobile-only':
      return baseCapabilities.filter(cap => 
        cap.deviceName && (cap.deviceName.includes('iPhone') || cap.deviceName.includes('Galaxy') || cap.deviceName.includes('Pixel'))
      );
    
    case 'desktop-only':
      return baseCapabilities.filter(cap => 
        !cap.deviceName && cap.browserName
      );
    
    case 'tablet-only':
      return baseCapabilities.filter(cap => 
        cap.deviceName && cap.deviceName.includes('iPad') || cap.deviceName?.includes('Tab')
      );
    
    case 'safari-only':
      return baseCapabilities.filter(cap => 
        cap.browserName === 'safari'
      );
    
    case 'android-only':
      return baseCapabilities.filter(cap => 
        cap.deviceName && (cap.deviceName.includes('Galaxy') || cap.deviceName.includes('Pixel') || cap.deviceName.includes('OnePlus'))
      );
    
    case 'ios-only':
      return baseCapabilities.filter(cap => 
        cap.deviceName && (cap.deviceName.includes('iPhone') || cap.deviceName.includes('iPad'))
      );
    
    default:
      return baseCapabilities;
  }
}

// Test environment detection
export function getTestEnvironment(): 'local' | 'browserstack' | 'ci' {
  if (process.env.CI) return 'ci';
  if (process.env.BROWSERSTACK_USERNAME) return 'browserstack';
  return 'local';
}

// Wedding-specific test data for cross-platform consistency
export const CROSS_PLATFORM_TEST_DATA = {
  couples: [
    {
      bride: 'Emma Thompson',
      groom: 'James Rodriguez',
      weddingDate: '2024-09-15',
      guestCount: 125,
      budget: 28000,
      venue: 'Garden Manor Estate'
    },
    {
      bride: 'Aisha Patel',
      groom: 'David Kim',
      weddingDate: '2024-11-22',
      guestCount: 200,
      budget: 45000,
      venue: 'Metropolitan Ballroom'
    }
  ],
  vendors: [
    { type: 'photographer', name: 'Sunset Studios', rating: 4.8, price: 3500 },
    { type: 'caterer', name: 'Gourmet Occasions', rating: 4.9, price: 8500 },
    { type: 'florist', name: 'Bloom & Blossom', rating: 4.7, price: 2200 },
    { type: 'dj', name: 'Rhythm Entertainment', rating: 4.8, price: 1500 }
  ],
  guests: [
    { name: 'Sarah Johnson', email: 'sarah@email.com', role: 'maid-of-honor', rsvp: 'yes' },
    { name: 'Michael Chen', email: 'mike@email.com', role: 'best-man', rsvp: 'yes' },
    { name: 'Lisa Williams', email: 'lisa@email.com', role: 'bridesmaid', rsvp: 'pending' }
  ]
};