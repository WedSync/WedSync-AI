/**
 * Demo Data Provider
 * 
 * This module provides demo data that can be consumed by existing dashboard components.
 * It simulates API responses and database queries for demo mode.
 */

import { 
  DEMO_PERSONAS, 
  DEMO_COUPLES, 
  getPersonaById, 
  getCoupleById, 
  getCouplesForSupplier,
  isDemoMode 
} from './config';
import { getCurrentPersona, getDemoUserContext } from './auth-provider';

// Demo data types
export interface DemoClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  weddingDate: string;
  venue: string;
  guestCount: number;
  status: 'inquiry' | 'booked' | 'pre-wedding' | 'delivered';
  budget: number;
  suppliers: DemoSupplierRelationship[];
  timeline: DemoTimelineItem[];
  forms: DemoForm[];
  files: DemoFile[];
  messages: DemoMessage[];
  notes: string;
}

export interface DemoSupplierRelationship {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierType: string;
  supplierLogo?: string;
  status: 'inquiry' | 'booked' | 'pre-wedding' | 'delivered';
  bookingDate?: string;
  budgetAllocated: number;
  contacts: {
    email: string;
    phone?: string;
    website?: string;
    instagram?: string;
  };
  timeline: DemoTimelineItem[];
  forms: DemoForm[];
  files: DemoFile[];
  lastContact: string;
}

export interface DemoTimelineItem {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  type: 'task' | 'meeting' | 'deadline' | 'note';
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  assignedTo?: string;
  relatedSupplier?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface DemoForm {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: 'draft' | 'sent' | 'completed' | 'overdue';
  dueDate?: string;
  completedDate?: string;
  responseData?: Record<string, any>;
  createdBy: string;
  sentTo?: string[];
}

export interface DemoFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  category: 'contract' | 'photo' | 'document' | 'invoice' | 'other';
  relatedSupplier?: string;
}

export interface DemoMessage {
  id: string;
  content: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  timestamp: string;
  read: boolean;
  type: 'message' | 'system' | 'notification';
  relatedSupplier?: string;
}

// Generate demo data based on current persona
export class DemoDataProvider {
  
  // Get demo clients for suppliers
  static getClientsForCurrentSupplier(): DemoClient[] {
    if (!isDemoMode()) return [];
    
    const currentPersona = getCurrentPersona();
    if (!currentPersona || currentPersona.type !== 'supplier') return [];
    
    const couples = getCouplesForSupplier(currentPersona.id);
    
    return couples.map(couple => this.generateDemoClient(couple.id, currentPersona.id));
  }
  
  // Get demo suppliers for couples
  static getSuppliersForCurrentCouple(): DemoSupplierRelationship[] {
    if (!isDemoMode()) return [];
    
    const currentPersona = getCurrentPersona();
    if (!currentPersona || currentPersona.type !== 'client') return [];
    
    const couple = DEMO_COUPLES.find(c => c.id.includes(currentPersona.id.split('-')[1]));
    if (!couple) return [];
    
    return couple.suppliers.map(supplierId => {
      const supplier = getPersonaById(supplierId);
      if (!supplier) return null;
      
      return this.generateSupplierRelationship(supplier, couple.id);
    }).filter(Boolean) as DemoSupplierRelationship[];
  }
  
  // Generate demo client data
  static generateDemoClient(coupleId: string, supplierId: string): DemoClient {
    const couple = getCoupleById(coupleId);
    const supplier = getPersonaById(supplierId);
    
    if (!couple || !supplier) {
      throw new Error('Invalid couple or supplier ID for demo data');
    }
    
    // Generate status based on hash
    const statuses: Array<'inquiry' | 'booked' | 'pre-wedding' | 'delivered'> = 
      ['inquiry', 'booked', 'pre-wedding', 'delivered'];
    const status = statuses[(coupleId.length + supplierId.length) % 4];
    
    return {
      id: `demo-client-${coupleId}`,
      name: couple.names,
      email: `${couple.names.toLowerCase().replace(/\s+/g, '.')}@demo.wedme.app`,
      phone: '+44 7700 900001',
      avatar: couple.avatar,
      weddingDate: couple.weddingDate,
      venue: couple.venue,
      guestCount: couple.guestCount,
      status,
      budget: this.generateBudget(supplier.metadata?.vendorType || 'supplier'),
      suppliers: [], // Will be populated if needed
      timeline: this.generateTimelineItems(coupleId, supplierId, 5),
      forms: this.generateForms(coupleId, supplierId, 3),
      files: this.generateFiles(coupleId, supplierId, 4),
      messages: this.generateMessages(coupleId, supplierId, 8),
      notes: `${couple.names} - ${couple.status} wedding at ${couple.venue}. ${couple.guestCount} guests expected.`
    };
  }
  
  // Generate supplier relationship
  static generateSupplierRelationship(supplier: DemoPersona, coupleId: string): DemoSupplierRelationship {
    const statuses: Array<'inquiry' | 'booked' | 'pre-wedding' | 'delivered'> = 
      ['inquiry', 'booked', 'pre-wedding', 'delivered'];
    const status = statuses[(supplier.id.length + coupleId.length) % 4];
    
    return {
      id: `demo-relationship-${supplier.id}-${coupleId}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierType: supplier.metadata?.vendorType || supplier.role,
      supplierLogo: supplier.logo,
      status,
      bookingDate: status !== 'inquiry' ? '2024-12-01' : undefined,
      budgetAllocated: this.generateBudget(supplier.metadata?.vendorType || 'supplier'),
      contacts: {
        email: `hello@${supplier.company?.toLowerCase().replace(/\s+/g, '')}.demo`,
        phone: '+44 7700 900000',
        website: `https://${supplier.company?.toLowerCase().replace(/\s+/g, '')}.demo`,
        instagram: `@${supplier.company?.toLowerCase().replace(/\s+/g, '')}`
      },
      timeline: this.generateTimelineItems(coupleId, supplier.id, 3),
      forms: this.generateForms(coupleId, supplier.id, 2),
      files: this.generateFiles(coupleId, supplier.id, 3),
      lastContact: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }
  
  // Generate budget based on supplier type
  static generateBudget(vendorType: string): number {
    const budgets: Record<string, number> = {
      photographer: 1800,
      videographer: 2200,
      dj: 950,
      florist: 650,
      caterer: 3500,
      musician: 400,
      venue: 5000,
      hair: 350,
      makeup: 300,
      planner: 2000,
      supplier: 1000
    };
    
    return budgets[vendorType] || 1000;
  }
  
  // Generate timeline items
  static generateTimelineItems(coupleId: string, supplierId: string, count: number): DemoTimelineItem[] {
    const supplier = getPersonaById(supplierId);
    const vendorType = supplier?.metadata?.vendorType || 'supplier';
    
    const templates: Record<string, Partial<DemoTimelineItem>[]> = {
      photographer: [
        { title: 'Engagement Session', type: 'task', priority: 'medium' },
        { title: 'Wedding Day Prep Photos', type: 'task', priority: 'high' },
        { title: 'Ceremony Photography', type: 'task', priority: 'high' },
        { title: 'Reception Coverage', type: 'task', priority: 'high' },
        { title: 'Photo Gallery Delivery', type: 'deadline', priority: 'medium' }
      ],
      videographer: [
        { title: 'Pre-wedding Interview', type: 'meeting', priority: 'low' },
        { title: 'Ceremony Videography', type: 'task', priority: 'high' },
        { title: 'Reception Filming', type: 'task', priority: 'high' },
        { title: 'Highlight Reel Editing', type: 'task', priority: 'medium' },
        { title: 'Final Video Delivery', type: 'deadline', priority: 'high' }
      ],
      dj: [
        { title: 'Music Preferences Meeting', type: 'meeting', priority: 'medium' },
        { title: 'Sound System Setup', type: 'task', priority: 'high' },
        { title: 'Reception Entertainment', type: 'task', priority: 'high' },
        { title: 'Equipment Breakdown', type: 'task', priority: 'medium' }
      ]
    };
    
    const items = templates[vendorType] || [
      { title: 'Initial Consultation', type: 'meeting', priority: 'medium' },
      { title: 'Service Planning', type: 'task', priority: 'high' },
      { title: 'Wedding Day Service', type: 'task', priority: 'high' }
    ];
    
    return items.slice(0, count).map((item, index) => ({
      id: `timeline-${coupleId}-${supplierId}-${index}`,
      title: item.title || 'Task',
      description: `${item.title} for ${supplier?.name || 'supplier'}`,
      date: new Date(2025, 5, 15 + index).toISOString().split('T')[0],
      time: `${10 + index}:00`,
      type: item.type || 'task',
      status: index === 0 ? 'completed' : index === 1 ? 'in-progress' : 'pending',
      assignedTo: supplier?.name || 'Supplier',
      relatedSupplier: supplierId,
      priority: item.priority || 'medium'
    }));
  }
  
  // Generate forms
  static generateForms(coupleId: string, supplierId: string, count: number): DemoForm[] {
    const supplier = getPersonaById(supplierId);
    const vendorType = supplier?.metadata?.vendorType || 'supplier';
    
    const formTemplates: Record<string, string[]> = {
      photographer: ['Wedding Day Timeline', 'Shot List Preferences', 'Location Details'],
      videographer: ['Video Style Preferences', 'Music Licensing', 'Special Moments List'],
      dj: ['Music Preferences', 'Do Not Play List', 'Special Announcements'],
      florist: ['Flower Preferences', 'Color Scheme', 'Delivery Schedule'],
      caterer: ['Menu Selection', 'Dietary Requirements', 'Service Details']
    };
    
    const forms = formTemplates[vendorType] || ['Service Details', 'Preferences', 'Requirements'];
    
    return forms.slice(0, count).map((title, index) => ({
      id: `form-${coupleId}-${supplierId}-${index}`,
      title,
      description: `${title} form for ${supplier?.name || 'supplier'}`,
      type: vendorType,
      status: index === 0 ? 'completed' : index === 1 ? 'sent' : 'draft',
      dueDate: new Date(2025, 4, 1 + index * 7).toISOString().split('T')[0],
      completedDate: index === 0 ? new Date(2025, 3, 15).toISOString().split('T')[0] : undefined,
      responseData: index === 0 ? { submitted: true, responses: {} } : undefined,
      createdBy: supplier?.name || 'Supplier',
      sentTo: [coupleId]
    }));
  }
  
  // Generate files
  static generateFiles(coupleId: string, supplierId: string, count: number): DemoFile[] {
    const supplier = getPersonaById(supplierId);
    
    const fileTypes = [
      { name: 'Contract_Agreement.pdf', category: 'contract', type: 'application/pdf' },
      { name: 'Service_Details.docx', category: 'document', type: 'application/docx' },
      { name: 'Invoice_001.pdf', category: 'invoice', type: 'application/pdf' },
      { name: 'Portfolio_Sample.jpg', category: 'photo', type: 'image/jpeg' }
    ];
    
    return fileTypes.slice(0, count).map((file, index) => ({
      id: `file-${coupleId}-${supplierId}-${index}`,
      name: file.name,
      type: file.type,
      size: Math.floor(Math.random() * 1000000) + 100000, // 100KB - 1MB
      url: `/demo/files/${file.name.toLowerCase()}`,
      uploadedBy: supplier?.name || 'Supplier',
      uploadedAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(),
      category: file.category as any,
      relatedSupplier: supplierId
    }));
  }
  
  // Generate messages
  static generateMessages(coupleId: string, supplierId: string, count: number): DemoMessage[] {
    const supplier = getPersonaById(supplierId);
    const couple = getCoupleById(coupleId);
    
    const messageTemplates = [
      { content: 'Hi! Looking forward to working with you on your special day.', from: 'supplier' },
      { content: 'Thank you! We\'re so excited. When can we schedule our consultation?', from: 'couple' },
      { content: 'How about next Tuesday at 2 PM? I can come to your venue if that works.', from: 'supplier' },
      { content: 'Perfect! That works great for us. See you then!', from: 'couple' },
      { content: 'Just wanted to confirm we\'re all set for the consultation tomorrow.', from: 'supplier' },
      { content: 'Yes, looking forward to it!', from: 'couple' },
      { content: 'Great meeting with you both! I\'ll send over the contract shortly.', from: 'supplier' },
      { content: 'Thank you! The contract looks good. We\'ll review and send back soon.', from: 'couple' }
    ];
    
    return messageTemplates.slice(0, count).map((msg, index) => ({
      id: `message-${coupleId}-${supplierId}-${index}`,
      content: msg.content,
      fromId: msg.from === 'supplier' ? supplierId : coupleId,
      fromName: msg.from === 'supplier' ? (supplier?.name || 'Supplier') : (couple?.names || 'Couple'),
      toId: msg.from === 'supplier' ? coupleId : supplierId,
      toName: msg.from === 'supplier' ? (couple?.names || 'Couple') : (supplier?.name || 'Supplier'),
      timestamp: new Date(Date.now() - ((count - index) * 24 * 60 * 60 * 1000)).toISOString(),
      read: index < count - 2, // Last 2 messages unread
      type: 'message',
      relatedSupplier: supplierId
    }));
  }
  
  // Get analytics data for admin
  static getAnalyticsData() {
    if (!isDemoMode()) return null;
    
    return {
      totalUsers: 1247,
      totalSuppliers: 342,
      totalCouples: 905,
      activeBookings: 156,
      monthlyRevenue: 45672,
      recentSignups: 23,
      popularCategories: [
        { name: 'Photography', count: 89 },
        { name: 'Venues', count: 67 },
        { name: 'Catering', count: 56 },
        { name: 'Floristry', count: 45 }
      ],
      recentActivity: [
        { action: 'New booking', user: 'Sarah & Michael', time: '2 hours ago' },
        { action: 'Form completed', user: 'Emma & James', time: '4 hours ago' },
        { action: 'Payment received', user: 'Alex & Jordan', time: '1 day ago' }
      ]
    };
  }
}

// Hooks for demo data
export const useDemoClients = () => {
  if (!isDemoMode()) return [];
  return DemoDataProvider.getClientsForCurrentSupplier();
};

export const useDemoSuppliers = () => {
  if (!isDemoMode()) return [];
  return DemoDataProvider.getSuppliersForCurrentCouple();
};

export const useDemoAnalytics = () => {
  if (!isDemoMode()) return null;
  return DemoDataProvider.getAnalyticsData();
};