/**
 * CRM Integration Service
 * Provides unified interface for CRM system integrations
 */

export interface CrmContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  weddingDate?: string;
  tags: string[];
  customFields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CrmLead {
  id: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  contactId: string;
  value?: number;
  probability?: number;
  expectedCloseDate?: string;
  notes: string;
  assignedTo?: string;
  tags: string[];
}

export interface CrmDeal {
  id: string;
  name: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseDate?: string;
  contactId: string;
  companyId?: string;
  ownerId: string;
  customFields: Record<string, any>;
}

export interface CrmActivity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'task' | 'note';
  subject: string;
  description?: string;
  contactId?: string;
  dealId?: string;
  dueDate?: string;
  completed: boolean;
  ownerId: string;
}

export interface CrmIntegrationConfig {
  provider: 'hubspot' | 'salesforce' | 'pipedrive' | 'zoho' | 'custom';
  apiKey?: string;
  apiUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  webhookUrl?: string;
  fieldMappings?: Record<string, string>;
}

/**
 * Base CRM Integration Service
 */
export abstract class BaseCrmIntegrationService {
  protected config: CrmIntegrationConfig;

  constructor(config: CrmIntegrationConfig) {
    this.config = config;
  }

  // Contact methods
  abstract getContacts(filters?: Record<string, any>): Promise<CrmContact[]>;
  abstract getContact(id: string): Promise<CrmContact | null>;
  abstract createContact(contact: Partial<CrmContact>): Promise<CrmContact>;
  abstract updateContact(
    id: string,
    updates: Partial<CrmContact>,
  ): Promise<CrmContact>;
  abstract deleteContact(id: string): Promise<void>;

  // Lead methods
  abstract getLeads(filters?: Record<string, any>): Promise<CrmLead[]>;
  abstract getLead(id: string): Promise<CrmLead | null>;
  abstract createLead(lead: Partial<CrmLead>): Promise<CrmLead>;
  abstract updateLead(id: string, updates: Partial<CrmLead>): Promise<CrmLead>;

  // Deal methods
  abstract getDeals(filters?: Record<string, any>): Promise<CrmDeal[]>;
  abstract getDeal(id: string): Promise<CrmDeal | null>;
  abstract createDeal(deal: Partial<CrmDeal>): Promise<CrmDeal>;
  abstract updateDeal(id: string, updates: Partial<CrmDeal>): Promise<CrmDeal>;

  // Activity methods
  abstract getActivities(filters?: Record<string, any>): Promise<CrmActivity[]>;
  abstract createActivity(activity: Partial<CrmActivity>): Promise<CrmActivity>;
  abstract updateActivity(
    id: string,
    updates: Partial<CrmActivity>,
  ): Promise<CrmActivity>;

  // Sync methods
  abstract syncFromCrm(): Promise<{
    contacts: number;
    leads: number;
    deals: number;
  }>;
  abstract syncToCrm(data: any): Promise<void>;

  // Webhook handling
  abstract handleWebhook(payload: any): Promise<void>;
}

/**
 * Mock CRM Integration Service for development/testing
 */
export class MockCrmIntegrationService extends BaseCrmIntegrationService {
  private contacts: CrmContact[] = [];
  private leads: CrmLead[] = [];
  private deals: CrmDeal[] = [];
  private activities: CrmActivity[] = [];

  async getContacts(filters?: Record<string, any>): Promise<CrmContact[]> {
    return this.contacts;
  }

  async getContact(id: string): Promise<CrmContact | null> {
    return this.contacts.find((c) => c.id === id) || null;
  }

  async createContact(contact: Partial<CrmContact>): Promise<CrmContact> {
    const newContact: CrmContact = {
      id: `contact_${Date.now()}`,
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone,
      company: contact.company,
      weddingDate: contact.weddingDate,
      tags: contact.tags || [],
      customFields: contact.customFields || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.contacts.push(newContact);
    return newContact;
  }

  async updateContact(
    id: string,
    updates: Partial<CrmContact>,
  ): Promise<CrmContact> {
    const contact = this.contacts.find((c) => c.id === id);
    if (!contact) throw new Error(`Contact ${id} not found`);

    Object.assign(contact, updates, { updatedAt: new Date().toISOString() });
    return contact;
  }

  async deleteContact(id: string): Promise<void> {
    const index = this.contacts.findIndex((c) => c.id === id);
    if (index >= 0) {
      this.contacts.splice(index, 1);
    }
  }

  async getLeads(filters?: Record<string, any>): Promise<CrmLead[]> {
    return this.leads;
  }

  async getLead(id: string): Promise<CrmLead | null> {
    return this.leads.find((l) => l.id === id) || null;
  }

  async createLead(lead: Partial<CrmLead>): Promise<CrmLead> {
    const newLead: CrmLead = {
      id: `lead_${Date.now()}`,
      source: lead.source || 'website',
      status: lead.status || 'new',
      contactId: lead.contactId || '',
      value: lead.value,
      probability: lead.probability,
      expectedCloseDate: lead.expectedCloseDate,
      notes: lead.notes || '',
      assignedTo: lead.assignedTo,
      tags: lead.tags || [],
    };
    this.leads.push(newLead);
    return newLead;
  }

  async updateLead(id: string, updates: Partial<CrmLead>): Promise<CrmLead> {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) throw new Error(`Lead ${id} not found`);

    Object.assign(lead, updates);
    return lead;
  }

  async getDeals(filters?: Record<string, any>): Promise<CrmDeal[]> {
    return this.deals;
  }

  async getDeal(id: string): Promise<CrmDeal | null> {
    return this.deals.find((d) => d.id === id) || null;
  }

  async createDeal(deal: Partial<CrmDeal>): Promise<CrmDeal> {
    const newDeal: CrmDeal = {
      id: `deal_${Date.now()}`,
      name: deal.name || 'New Deal',
      value: deal.value || 0,
      stage: deal.stage || 'qualification',
      probability: deal.probability || 0,
      expectedCloseDate: deal.expectedCloseDate,
      contactId: deal.contactId || '',
      companyId: deal.companyId,
      ownerId: deal.ownerId || '',
      customFields: deal.customFields || {},
    };
    this.deals.push(newDeal);
    return newDeal;
  }

  async updateDeal(id: string, updates: Partial<CrmDeal>): Promise<CrmDeal> {
    const deal = this.deals.find((d) => d.id === id);
    if (!deal) throw new Error(`Deal ${id} not found`);

    Object.assign(deal, updates);
    return deal;
  }

  async getActivities(filters?: Record<string, any>): Promise<CrmActivity[]> {
    return this.activities;
  }

  async createActivity(activity: Partial<CrmActivity>): Promise<CrmActivity> {
    const newActivity: CrmActivity = {
      id: `activity_${Date.now()}`,
      type: activity.type || 'task',
      subject: activity.subject || '',
      description: activity.description,
      contactId: activity.contactId,
      dealId: activity.dealId,
      dueDate: activity.dueDate,
      completed: activity.completed || false,
      ownerId: activity.ownerId || '',
    };
    this.activities.push(newActivity);
    return newActivity;
  }

  async updateActivity(
    id: string,
    updates: Partial<CrmActivity>,
  ): Promise<CrmActivity> {
    const activity = this.activities.find((a) => a.id === id);
    if (!activity) throw new Error(`Activity ${id} not found`);

    Object.assign(activity, updates);
    return activity;
  }

  async syncFromCrm(): Promise<{
    contacts: number;
    leads: number;
    deals: number;
  }> {
    // Mock sync operation
    return {
      contacts: this.contacts.length,
      leads: this.leads.length,
      deals: this.deals.length,
    };
  }

  async syncToCrm(data: any): Promise<void> {
    // Mock sync to CRM
    console.log('Syncing to CRM:', data);
  }

  async handleWebhook(payload: any): Promise<void> {
    // Mock webhook handling
    console.log('Handling CRM webhook:', payload);
  }
}

/**
 * CRM Integration Service Factory
 */
export class CrmIntegrationService {
  private static instance: BaseCrmIntegrationService | null = null;

  static getInstance(config?: CrmIntegrationConfig): BaseCrmIntegrationService {
    if (!CrmIntegrationService.instance && config) {
      // For now, always use mock service in development
      CrmIntegrationService.instance = new MockCrmIntegrationService(config);
    }

    if (!CrmIntegrationService.instance) {
      throw new Error('CRM integration service not initialized');
    }

    return CrmIntegrationService.instance;
  }

  static resetInstance(): void {
    CrmIntegrationService.instance = null;
  }
}

export default CrmIntegrationService;
