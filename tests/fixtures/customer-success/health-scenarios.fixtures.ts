// Test fixtures for customer success health scenarios
import { faker } from '@faker-js/faker';

export interface SupplierMetrics {
  supplierId: string;
  name: string;
  category: string;
  subscription: 'trial' | 'starter' | 'professional' | 'enterprise';
  onboardingDate: Date;
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  metrics: {
    loginFrequency: number;
    formCompletionRate: number;
    clientInteractions: number;
    responseTime: number;
    featureAdoption: number;
    supportTickets: number;
    billingStatus: 'current' | 'overdue' | 'cancelled';
    nps: number;
  };
}

// High-performing suppliers fixture
export const highPerformingSuppliers: SupplierMetrics[] = [
  {
    supplierId: 'sup_hp_001',
    name: 'Premier Wedding Photography',
    category: 'photography',
    subscription: 'enterprise',
    onboardingDate: new Date('2023-01-15'),
    healthScore: 92,
    riskLevel: 'low',
    metrics: {
      loginFrequency: 12, // logins per week
      formCompletionRate: 95,
      clientInteractions: 45,
      responseTime: 0.5, // hours
      featureAdoption: 85,
      supportTickets: 1,
      billingStatus: 'current',
      nps: 9
    }
  },
  {
    supplierId: 'sup_hp_002',
    name: 'Elite Event Planning',
    category: 'planning',
    subscription: 'professional',
    onboardingDate: new Date('2023-03-20'),
    healthScore: 88,
    riskLevel: 'low',
    metrics: {
      loginFrequency: 10,
      formCompletionRate: 90,
      clientInteractions: 38,
      responseTime: 0.8,
      featureAdoption: 78,
      supportTickets: 2,
      billingStatus: 'current',
      nps: 8
    }
  }
];

// At-risk suppliers fixture
export const atRiskSuppliers: SupplierMetrics[] = [
  {
    supplierId: 'sup_ar_001',
    name: 'Vintage Florals',
    category: 'florist',
    subscription: 'starter',
    onboardingDate: new Date('2023-06-01'),
    healthScore: 45,
    riskLevel: 'high',
    metrics: {
      loginFrequency: 2,
      formCompletionRate: 60,
      clientInteractions: 8,
      responseTime: 24,
      featureAdoption: 30,
      supportTickets: 8,
      billingStatus: 'overdue',
      nps: 5
    }
  },
  {
    supplierId: 'sup_ar_002',
    name: 'DJ Soundwave',
    category: 'entertainment',
    subscription: 'professional',
    onboardingDate: new Date('2023-04-15'),
    healthScore: 52,
    riskLevel: 'medium',
    metrics: {
      loginFrequency: 3,
      formCompletionRate: 65,
      clientInteractions: 12,
      responseTime: 12,
      featureAdoption: 40,
      supportTickets: 5,
      billingStatus: 'current',
      nps: 6
    }
  }
];

// Critical churn risk suppliers
export const criticalChurnSuppliers: SupplierMetrics[] = [
  {
    supplierId: 'sup_cc_001',
    name: 'Forgotten Venues',
    category: 'venue',
    subscription: 'trial',
    onboardingDate: new Date('2023-11-01'),
    healthScore: 25,
    riskLevel: 'critical',
    metrics: {
      loginFrequency: 0.5,
      formCompletionRate: 20,
      clientInteractions: 2,
      responseTime: 72,
      featureAdoption: 10,
      supportTickets: 15,
      billingStatus: 'cancelled',
      nps: 3
    }
  }
];

// New onboarding suppliers
export const newOnboardingSuppliers: SupplierMetrics[] = [
  {
    supplierId: 'sup_no_001',
    name: 'Fresh Catering Co',
    category: 'catering',
    subscription: 'trial',
    onboardingDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    healthScore: 65,
    riskLevel: 'medium',
    metrics: {
      loginFrequency: 8,
      formCompletionRate: 70,
      clientInteractions: 3,
      responseTime: 2,
      featureAdoption: 25,
      supportTickets: 3,
      billingStatus: 'current',
      nps: 7
    }
  }
];

// Seasonal suppliers
export const seasonalSuppliers: SupplierMetrics[] = [
  {
    supplierId: 'sup_ss_001',
    name: 'Summer Gardens Venue',
    category: 'venue',
    subscription: 'professional',
    onboardingDate: new Date('2022-05-01'),
    healthScore: 70,
    riskLevel: 'medium',
    metrics: {
      loginFrequency: 15, // High during summer
      formCompletionRate: 85,
      clientInteractions: 50,
      responseTime: 1,
      featureAdoption: 70,
      supportTickets: 2,
      billingStatus: 'current',
      nps: 8
    }
  }
];

// Multi-location suppliers
export const multiLocationSuppliers: SupplierMetrics[] = [
  {
    supplierId: 'sup_ml_001',
    name: 'National Wedding Chain',
    category: 'photography',
    subscription: 'enterprise',
    onboardingDate: new Date('2022-01-01'),
    healthScore: 82,
    riskLevel: 'low',
    metrics: {
      loginFrequency: 25, // Multiple team members
      formCompletionRate: 88,
      clientInteractions: 120,
      responseTime: 1.5,
      featureAdoption: 75,
      supportTickets: 5,
      billingStatus: 'current',
      nps: 8
    }
  }
];

// Generate random supplier fixtures
export function generateRandomSupplier(overrides?: Partial<SupplierMetrics>): SupplierMetrics {
  const healthScore = faker.number.int({ min: 0, max: 100 });
  
  return {
    supplierId: `sup_${faker.string.alphanumeric(8)}`,
    name: faker.company.name(),
    category: faker.helpers.arrayElement(['photography', 'venue', 'catering', 'florist', 'entertainment', 'planning']),
    subscription: faker.helpers.arrayElement(['trial', 'starter', 'professional', 'enterprise']),
    onboardingDate: faker.date.past({ years: 2 }),
    healthScore,
    riskLevel: healthScore >= 80 ? 'low' : healthScore >= 60 ? 'medium' : healthScore >= 40 ? 'high' : 'critical',
    metrics: {
      loginFrequency: faker.number.int({ min: 0, max: 20 }),
      formCompletionRate: faker.number.int({ min: 0, max: 100 }),
      clientInteractions: faker.number.int({ min: 0, max: 100 }),
      responseTime: faker.number.float({ min: 0.5, max: 72 }),
      featureAdoption: faker.number.int({ min: 0, max: 100 }),
      supportTickets: faker.number.int({ min: 0, max: 20 }),
      billingStatus: faker.helpers.arrayElement(['current', 'overdue', 'cancelled']),
      nps: faker.number.int({ min: 0, max: 10 })
    },
    ...overrides
  };
}

// Generate bulk test data
export function generateBulkSuppliers(count: number, scenario?: 'healthy' | 'at-risk' | 'mixed'): SupplierMetrics[] {
  const suppliers: SupplierMetrics[] = [];
  
  for (let i = 0; i < count; i++) {
    let overrides: Partial<SupplierMetrics> = {};
    
    if (scenario === 'healthy') {
      const healthScore = faker.number.int({ min: 75, max: 100 });
      overrides = {
        healthScore,
        riskLevel: 'low',
        metrics: {
          loginFrequency: faker.number.int({ min: 8, max: 20 }),
          formCompletionRate: faker.number.int({ min: 80, max: 100 }),
          clientInteractions: faker.number.int({ min: 30, max: 100 }),
          responseTime: faker.number.float({ min: 0.5, max: 4 }),
          featureAdoption: faker.number.int({ min: 70, max: 100 }),
          supportTickets: faker.number.int({ min: 0, max: 3 }),
          billingStatus: 'current',
          nps: faker.number.int({ min: 7, max: 10 })
        }
      };
    } else if (scenario === 'at-risk') {
      const healthScore = faker.number.int({ min: 20, max: 50 });
      overrides = {
        healthScore,
        riskLevel: healthScore >= 40 ? 'high' : 'critical',
        metrics: {
          loginFrequency: faker.number.int({ min: 0, max: 3 }),
          formCompletionRate: faker.number.int({ min: 20, max: 60 }),
          clientInteractions: faker.number.int({ min: 0, max: 10 }),
          responseTime: faker.number.float({ min: 24, max: 72 }),
          featureAdoption: faker.number.int({ min: 10, max: 40 }),
          supportTickets: faker.number.int({ min: 8, max: 20 }),
          billingStatus: faker.helpers.arrayElement(['overdue', 'cancelled']),
          nps: faker.number.int({ min: 0, max: 5 })
        }
      };
    }
    
    suppliers.push(generateRandomSupplier(overrides));
  }
  
  return suppliers;
}

// Edge cases and anomalies
export const edgeCaseSuppliers: SupplierMetrics[] = [
  // Perfect score supplier
  {
    supplierId: 'sup_edge_perfect',
    name: 'Perfect Wedding Co',
    category: 'planning',
    subscription: 'enterprise',
    onboardingDate: new Date('2022-01-01'),
    healthScore: 100,
    riskLevel: 'low',
    metrics: {
      loginFrequency: 30,
      formCompletionRate: 100,
      clientInteractions: 200,
      responseTime: 0.1,
      featureAdoption: 100,
      supportTickets: 0,
      billingStatus: 'current',
      nps: 10
    }
  },
  // Zero activity supplier
  {
    supplierId: 'sup_edge_zero',
    name: 'Ghost Supplier',
    category: 'venue',
    subscription: 'trial',
    onboardingDate: new Date('2023-12-01'),
    healthScore: 0,
    riskLevel: 'critical',
    metrics: {
      loginFrequency: 0,
      formCompletionRate: 0,
      clientInteractions: 0,
      responseTime: 999,
      featureAdoption: 0,
      supportTickets: 0,
      billingStatus: 'cancelled',
      nps: 0
    }
  },
  // High support but good engagement
  {
    supplierId: 'sup_edge_support',
    name: 'Needs Help Photography',
    category: 'photography',
    subscription: 'starter',
    onboardingDate: new Date('2023-08-01'),
    healthScore: 60,
    riskLevel: 'medium',
    metrics: {
      loginFrequency: 15,
      formCompletionRate: 85,
      clientInteractions: 40,
      responseTime: 2,
      featureAdoption: 65,
      supportTickets: 25, // Very high
      billingStatus: 'current',
      nps: 7
    }
  }
];

// Test data generators for specific scenarios
export const healthScenarios = {
  generateOnboardingSequence: (supplierId: string, days: number = 30): SupplierMetrics[] => {
    const sequence: SupplierMetrics[] = [];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    for (let day = 0; day <= days; day++) {
      const progress = day / days;
      const healthScore = Math.min(100, 30 + (progress * 60));
      
      sequence.push({
        supplierId,
        name: 'Onboarding Supplier',
        category: 'venue',
        subscription: 'trial',
        onboardingDate: startDate,
        healthScore,
        riskLevel: healthScore >= 70 ? 'low' : healthScore >= 50 ? 'medium' : 'high',
        metrics: {
          loginFrequency: Math.floor(progress * 10),
          formCompletionRate: Math.floor(progress * 100),
          clientInteractions: Math.floor(progress * 20),
          responseTime: Math.max(0.5, 10 - (progress * 9)),
          featureAdoption: Math.floor(progress * 80),
          supportTickets: Math.max(0, 5 - Math.floor(progress * 5)),
          billingStatus: day > 14 ? 'current' : 'current',
          nps: Math.min(10, 5 + Math.floor(progress * 5))
        }
      });
    }
    
    return sequence;
  },
  
  generateChurnSequence: (supplierId: string, days: number = 90): SupplierMetrics[] => {
    const sequence: SupplierMetrics[] = [];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    for (let day = 0; day <= days; day += 7) {
      const decay = 1 - (day / days);
      const healthScore = Math.max(0, 85 * decay);
      
      sequence.push({
        supplierId,
        name: 'Churning Supplier',
        category: 'catering',
        subscription: 'professional',
        onboardingDate: new Date('2023-01-01'),
        healthScore,
        riskLevel: healthScore >= 60 ? 'medium' : healthScore >= 40 ? 'high' : 'critical',
        metrics: {
          loginFrequency: Math.max(0, Math.floor(15 * decay)),
          formCompletionRate: Math.max(20, Math.floor(90 * decay)),
          clientInteractions: Math.max(0, Math.floor(50 * decay)),
          responseTime: Math.min(72, 2 + ((1 - decay) * 70)),
          featureAdoption: Math.max(10, Math.floor(75 * decay)),
          supportTickets: Math.min(20, Math.floor((1 - decay) * 20)),
          billingStatus: day > 60 ? 'overdue' : 'current',
          nps: Math.max(0, Math.floor(8 * decay))
        }
      });
    }
    
    return sequence;
  },
  
  generateRecoverySequence: (supplierId: string, days: number = 60): SupplierMetrics[] => {
    const sequence: SupplierMetrics[] = [];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    for (let day = 0; day <= days; day += 5) {
      const recovery = day / days;
      const healthScore = Math.min(95, 35 + (recovery * 60));
      
      sequence.push({
        supplierId,
        name: 'Recovering Supplier',
        category: 'photography',
        subscription: 'professional',
        onboardingDate: new Date('2023-02-01'),
        healthScore,
        riskLevel: healthScore >= 70 ? 'low' : healthScore >= 50 ? 'medium' : 'high',
        metrics: {
          loginFrequency: Math.floor(2 + (recovery * 12)),
          formCompletionRate: Math.floor(40 + (recovery * 50)),
          clientInteractions: Math.floor(5 + (recovery * 35)),
          responseTime: Math.max(0.5, 20 - (recovery * 19)),
          featureAdoption: Math.floor(25 + (recovery * 55)),
          supportTickets: Math.max(0, 10 - Math.floor(recovery * 9)),
          billingStatus: 'current',
          nps: Math.min(9, 4 + Math.floor(recovery * 5))
        }
      });
    }
    
    return sequence;
  }
};

export default {
  highPerformingSuppliers,
  atRiskSuppliers,
  criticalChurnSuppliers,
  newOnboardingSuppliers,
  seasonalSuppliers,
  multiLocationSuppliers,
  edgeCaseSuppliers,
  generateRandomSupplier,
  generateBulkSuppliers,
  healthScenarios
};