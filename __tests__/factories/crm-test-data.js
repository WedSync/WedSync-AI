/**
 * CRM Test Data Factory - WS-343 Team E
 * Realistic wedding industry test data for comprehensive CRM integration testing
 */

import { faker } from '@faker-js/faker';

// Wedding industry specific data generators
export class WeddingIndustryDataFactory {
  
  // Generate realistic wedding client data
  static createWeddingClient(overrides = {}) {
    const weddingDate = faker.date.future({ years: 2 });
    const engagementDate = faker.date.past({ years: 1 });
    
    return {
      id: faker.string.uuid(),
      firstName: this.generateWeddingName('first'),
      lastName: this.generateWeddingName('last'),
      email: faker.internet.email().toLowerCase(),
      phone: this.generatePhoneNumber(),
      partnerFirstName: this.generateWeddingName('first'),
      partnerLastName: faker.helpers.maybe(() => this.generateWeddingName('last'), { probability: 0.7 }) || null,
      weddingDate: weddingDate.toISOString().split('T')[0],
      engagementDate: engagementDate.toISOString().split('T')[0],
      venue: this.generateVenueName(),
      guestCount: faker.number.int({ min: 30, max: 300 }),
      budget: faker.number.int({ min: 5000, max: 50000 }),
      status: faker.helpers.arrayElement(['inquiry', 'booked', 'completed', 'cancelled']),
      source: faker.helpers.arrayElement(['referral', 'website', 'social', 'wedding_show', 'google']),
      notes: faker.lorem.paragraph(2),
      ceremony_time: faker.date.recent({ days: 1 }).toTimeString().slice(0, 5),
      reception_time: faker.date.recent({ days: 1 }).toTimeString().slice(0, 5),
      photography_package: faker.helpers.arrayElement(['basic', 'premium', 'luxury', 'custom']),
      created_at: faker.date.past({ years: 3 }).toISOString(),
      updated_at: faker.date.recent({ days: 30 }).toISOString(),
      ...overrides
    };
  }

  // Generate wedding names with industry-specific patterns
  static generateWeddingName(type = 'first') {
    const commonWeddingNames = {
      first: [
        'Sarah', 'Emily', 'Jessica', 'Ashley', 'Amanda', 'Jennifer', 'Nicole', 'Samantha', 'Elizabeth', 'Megan',
        'Michael', 'Christopher', 'Matthew', 'Joshua', 'David', 'Andrew', 'Daniel', 'Ryan', 'John', 'James',
        // Names with special characters (common in wedding industry)
        "O'Connor", "D'Angelo", "McKenzie", "O'Brien", "De La Cruz"
      ],
      last: [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
        'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
        // Wedding industry specific surnames
        "O'Sullivan", "D'Amato", "Von Schmidt", "MacPherson", "St. James", "De Santos"
      ]
    };
    
    return faker.helpers.arrayElement(commonWeddingNames[type]);
  }

  // Generate realistic venue names
  static generateVenueName() {
    const venueTypes = [
      'Manor', 'Estate', 'Gardens', 'Hall', 'Club', 'Resort', 'Barn', 'Vineyard', 
      'Hotel', 'Museum', 'Chapel', 'Castle', 'Beach Club', 'Country Club'
    ];
    const venueNames = [
      'Rosewood', 'Willowbrook', 'Grandview', 'Riverside', 'Hillcrest', 'Oakwood',
      'Fairmont', 'Belmont', 'Westfield', 'Eastgate', 'Northbrook', 'Southpoint'
    ];
    
    return `${faker.helpers.arrayElement(venueNames)} ${faker.helpers.arrayElement(venueTypes)}`;
  }

  // Generate realistic phone numbers
  static generatePhoneNumber() {
    const formats = [
      '(###) ###-####',
      '###-###-####',
      '###.###.####',
      '+1 ### ### ####'
    ];
    
    const format = faker.helpers.arrayElement(formats);
    return faker.phone.number(format);
  }

  // Generate bulk client data for performance testing
  static createBulkClientData(count = 200, options = {}) {
    const clients = [];
    const { duplicateProbability = 0.05, incompleteProbability = 0.1 } = options;
    
    for (let i = 0; i < count; i++) {
      let client = this.createWeddingClient();
      
      // Add some duplicate entries (common in CRM imports)
      if (Math.random() < duplicateProbability && clients.length > 0) {
        const existingClient = faker.helpers.arrayElement(clients);
        client = {
          ...client,
          firstName: existingClient.firstName,
          lastName: existingClient.lastName,
          email: existingClient.email,
        };
      }
      
      // Add some incomplete records (realistic CRM data)
      if (Math.random() < incompleteProbability) {
        client = this.createIncompleteClient(client);
      }
      
      clients.push(client);
    }
    
    return clients;
  }

  // Create incomplete client data (realistic for CRM imports)
  static createIncompleteClient(baseClient = null) {
    const client = baseClient || this.createWeddingClient();
    
    const fieldsToRemove = faker.helpers.arrayElements([
      'partnerLastName', 'venue', 'guestCount', 'budget', 'notes', 
      'ceremony_time', 'reception_time', 'photography_package'
    ], { min: 1, max: 3 });
    
    fieldsToRemove.forEach(field => {
      client[field] = null;
    });
    
    return client;
  }
}

// CRM Provider-Specific Data Factories
export class TaveDataFactory {
  static createTaveClient(overrides = {}) {
    const baseClient = WeddingIndustryDataFactory.createWeddingClient();
    return {
      ...baseClient,
      tave_id: faker.number.int({ min: 1000, max: 99999 }),
      tave_created_date: faker.date.past({ years: 3 }).toISOString(),
      tave_status: faker.helpers.arrayElement(['lead', 'client', 'complete']),
      job_type: faker.helpers.arrayElement(['wedding', 'engagement', 'portrait']),
      shoot_date: baseClient.weddingDate,
      client_name: `${baseClient.firstName} ${baseClient.lastName}`,
      ...overrides
    };
  }

  static createTaveResponse(clients = []) {
    return {
      success: true,
      data: {
        clients: clients.length ? clients : [this.createTaveClient()],
        pagination: {
          current_page: 1,
          total_pages: Math.ceil(clients.length / 50),
          per_page: 50,
          total_count: clients.length
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '2.0'
      }
    };
  }
}

export class HoneyBookDataFactory {
  static createHoneyBookContact(overrides = {}) {
    const baseClient = WeddingIndustryDataFactory.createWeddingClient();
    return {
      ...baseClient,
      contact_id: faker.string.uuid(),
      project_id: faker.string.uuid(),
      contact_type: 'primary',
      project_name: `${baseClient.firstName} & ${baseClient.partnerFirstName} Wedding`,
      event_date: baseClient.weddingDate,
      created_date: faker.date.past({ years: 2 }).toISOString(),
      ...overrides
    };
  }

  static createHoneyBookResponse(contacts = []) {
    return {
      contacts: contacts.length ? contacts : [this.createHoneyBookContact()],
      total: contacts.length,
      page: 1,
      limit: 100
    };
  }
}

// OAuth and Authentication Test Data
export class AuthTestDataFactory {
  static createOAuthState() {
    return {
      state: faker.string.alphanumeric(32),
      code_verifier: faker.string.alphanumeric(128),
      code_challenge: faker.string.alphanumeric(43),
      redirect_uri: 'http://localhost:3000/api/crm/callback',
      provider: faker.helpers.arrayElement(['tave', 'honeybook', 'lightblue'])
    };
  }

  static createOAuthTokens() {
    return {
      access_token: faker.string.alphanumeric(64),
      refresh_token: faker.string.alphanumeric(64),
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'read:clients write:clients',
      created_at: new Date().toISOString()
    };
  }

  static createAPIKey() {
    return {
      api_key: faker.string.alphanumeric(32),
      api_secret: faker.string.alphanumeric(64),
      environment: faker.helpers.arrayElement(['sandbox', 'production']),
      created_at: new Date().toISOString()
    };
  }
}

// Error Scenario Test Data
export class ErrorScenarioFactory {
  static createNetworkError() {
    const error = new Error('Network request failed');
    error.code = 'NETWORK_ERROR';
    error.status = null;
    return error;
  }

  static createRateLimitError() {
    const error = new Error('Rate limit exceeded');
    error.code = 'RATE_LIMITED';
    error.status = 429;
    error.retryAfter = 60;
    return error;
  }

  static createAuthenticationError() {
    const error = new Error('Invalid authentication credentials');
    error.code = 'AUTH_ERROR';
    error.status = 401;
    return error;
  }

  static createValidationError(field = 'email') {
    const error = new Error(`Invalid ${field} format`);
    error.code = 'VALIDATION_ERROR';
    error.status = 400;
    error.field = field;
    return error;
  }
}

// Test Scenario Builders
export class TestScenarioBuilder {
  static largeDatasetImport() {
    return {
      description: 'Import 1000+ clients from Tave (Performance Test)',
      clients: WeddingIndustryDataFactory.createBulkClientData(1000),
      expectedDuration: 30000, // 30 seconds max
      provider: 'tave'
    };
  }

  static duplicateDetectionScenario() {
    const clients = WeddingIndustryDataFactory.createBulkClientData(50, { 
      duplicateProbability: 0.2 
    });
    return {
      description: 'Duplicate client detection during import',
      clients,
      expectedDuplicates: Math.floor(clients.length * 0.2),
      provider: 'honeybook'
    };
  }

  static incompleteDataScenario() {
    return {
      description: 'Import clients with missing fields',
      clients: WeddingIndustryDataFactory.createBulkClientData(100, { 
        incompleteProbability: 0.3 
      }),
      provider: 'tave'
    };
  }

  static concurrentSyncScenario() {
    return {
      description: 'Multiple CRM providers syncing simultaneously',
      providers: [
        { name: 'tave', clients: WeddingIndustryDataFactory.createBulkClientData(100) },
        { name: 'honeybook', clients: WeddingIndustryDataFactory.createBulkClientData(150) },
        { name: 'lightblue', clients: WeddingIndustryDataFactory.createBulkClientData(75) }
      ]
    };
  }
}

// Export all factories
export default {
  WeddingIndustryDataFactory,
  TaveDataFactory,
  HoneyBookDataFactory,
  AuthTestDataFactory,
  ErrorScenarioFactory,
  TestScenarioBuilder
};