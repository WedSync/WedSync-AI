/**
 * Wedding Factory
 * WS-192 Team B - Backend/API Focus
 * 
 * Factory for generating complete wedding scenarios and test data
 */

import { WeddingTestData, WeddingTimelineData, WeddingBudgetData, JourneyTestData } from './types';
import { FactoryConfig } from './index';

export class WeddingFactory {
  /**
   * Create a complete wedding scenario with timeline and budget
   */
  static async createCompleteWedding(config: FactoryConfig): Promise<WeddingTestData> {
    const weddingDate = this.generateFutureWeddingDate();
    const guestCount = 75 + Math.floor(Math.random() * 175); // 75-250 guests
    const totalBudget = 25000 + Math.floor(Math.random() * 75000); // $25k-$100k

    return {
      id: config.generateIds ? `wedding_${config.testId}_${Date.now()}` : undefined,
      couple: {
        id: config.generateIds ? `couple_${config.testId}` : undefined,
        organization_id: config.organizationId,
        first_name: 'John',
        last_name: 'Smith',
        email: `john.smith-${config.testId}@email.com`,
        partner_first_name: 'Sarah',
        partner_last_name: 'Johnson',
        wedding_date: weddingDate,
        venue: 'Grand Ballroom at Sunset Manor',
        guest_count: guestCount,
        budget: totalBudget,
        wedding_style: ['traditional', 'modern', 'rustic', 'luxury', 'bohemian', 'minimalist'][Math.floor(Math.random() * 6)] as any,
        contact_preferences: {
          preferred_method: 'email',
          best_time_to_contact: 'Evening'
        }
      },
      photographers: [],
      venues: [],
      other_vendors: [],
      timeline: this.createWeddingTimeline(weddingDate),
      budget_breakdown: this.createBudgetBreakdown(totalBudget),
      created_at: config.realisticData ? new Date().toISOString() : undefined,
      updated_at: config.realisticData ? new Date().toISOString() : undefined
    };
  }

  /**
   * Create a luxury wedding scenario
   */
  static async createLuxuryWedding(config: FactoryConfig): Promise<WeddingTestData> {
    const wedding = await this.createCompleteWedding(config);
    
    // Upgrade to luxury specifications
    wedding.couple.guest_count = 150 + Math.floor(Math.random() * 100); // 150-250 guests
    wedding.couple.budget = 75000 + Math.floor(Math.random() * 125000); // $75k-$200k
    wedding.couple.wedding_style = 'luxury';
    wedding.couple.venue = 'The Ritz-Carlton Ballroom';
    
    // Update budget for luxury pricing
    wedding.budget_breakdown = this.createBudgetBreakdown(wedding.couple.budget);
    
    return wedding;
  }

  /**
   * Create wedding timeline with detailed schedule
   */
  private static createWeddingTimeline(weddingDate: string): WeddingTimelineData {
    return {
      wedding_date: weddingDate,
      events: [
        {
          id: 'ceremony',
          name: 'Wedding Ceremony',
          start_time: '16:00',
          end_time: '16:30',
          location: 'Garden Pavilion',
          vendors_involved: ['photographer', 'florist', 'officiant'],
          notes: 'Outdoor ceremony with garden backdrop'
        },
        {
          id: 'cocktail_hour',
          name: 'Cocktail Hour',
          start_time: '16:30',
          end_time: '17:30',
          location: 'Terrace Bar',
          vendors_involved: ['photographer', 'caterer', 'dj'],
          notes: 'Mingling and appetizers'
        },
        {
          id: 'reception',
          name: 'Reception Dinner',
          start_time: '17:30',
          end_time: '21:00',
          location: 'Grand Ballroom',
          vendors_involved: ['photographer', 'caterer', 'dj', 'florist'],
          notes: 'Dinner service and speeches'
        },
        {
          id: 'dancing',
          name: 'Dancing & Celebration',
          start_time: '21:00',
          end_time: '24:00',
          location: 'Grand Ballroom',
          vendors_involved: ['photographer', 'dj'],
          notes: 'First dance and party'
        }
      ],
      milestones: [
        {
          id: 'venue_booking',
          name: 'Venue Booking Confirmed',
          due_date: this.getDateBefore(weddingDate, 365), // 1 year before
          responsible_vendor: 'venue',
          completed: true,
          notes: 'Venue contract signed and deposit paid'
        },
        {
          id: 'photographer_booking',
          name: 'Photography Contract Signed',
          due_date: this.getDateBefore(weddingDate, 300), // 10 months before
          responsible_vendor: 'photographer',
          completed: true,
          notes: 'Photography package confirmed'
        },
        {
          id: 'final_guest_count',
          name: 'Final Guest Count Confirmation',
          due_date: this.getDateBefore(weddingDate, 30), // 1 month before
          completed: false,
          notes: 'Confirm final headcount for catering'
        },
        {
          id: 'rehearsal_dinner',
          name: 'Rehearsal Dinner',
          due_date: this.getDateBefore(weddingDate, 1), // Day before
          completed: false,
          notes: 'Practice ceremony and dinner with wedding party'
        }
      ]
    };
  }

  /**
   * Create realistic budget breakdown
   */
  private static createBudgetBreakdown(totalBudget: number): WeddingBudgetData {
    return {
      total_budget: totalBudget,
      allocated: {
        photography: Math.floor(totalBudget * 0.12), // 12%
        venue: Math.floor(totalBudget * 0.45),       // 45%
        catering: Math.floor(totalBudget * 0.28),    // 28%
        floristry: Math.floor(totalBudget * 0.08),   // 8%
        music: Math.floor(totalBudget * 0.05),       // 5%
        other: Math.floor(totalBudget * 0.02)        // 2%
      },
      actual_spent: {
        photography: Math.floor(totalBudget * 0.12),
        venue: Math.floor(totalBudget * 0.45),
        catering: 0, // Not yet spent
        floristry: 0, // Not yet spent
        music: 0, // Not yet spent
        other: 0 // Not yet spent
      },
      payment_schedule: [
        {
          vendor_id: 'venue_001',
          amount: Math.floor(totalBudget * 0.225), // 50% of venue cost
          due_date: this.getDateBefore(new Date().toISOString(), -90), // 90 days ago (paid)
          status: 'paid'
        },
        {
          vendor_id: 'photographer_001',
          amount: Math.floor(totalBudget * 0.12), // Full photography cost
          due_date: this.getDateBefore(new Date().toISOString(), 30), // Due in 30 days
          status: 'pending'
        },
        {
          vendor_id: 'venue_001',
          amount: Math.floor(totalBudget * 0.225), // Remaining 50% of venue
          due_date: this.getDateBefore(new Date().toISOString(), 30), // Due 30 days before wedding
          status: 'pending'
        }
      ]
    };
  }

  /**
   * Create customer journey for wedding workflow automation
   */
  static async createLuxuryJourney(config: FactoryConfig, coupleId: string): Promise<JourneyTestData> {
    return {
      id: config.generateIds ? `journey_luxury_${config.testId}_${Date.now()}` : undefined,
      organization_id: config.organizationId,
      name: 'Luxury Wedding Experience Journey',
      description: 'Premium customer journey for luxury wedding clients',
      trigger_conditions: {
        type: 'form_submission',
        form_id: 'luxury_inquiry_form'
      },
      steps: [
        {
          id: 'welcome_luxury',
          name: 'Luxury Welcome Package',
          type: 'email',
          delay_hours: 0,
          content: {
            subject: 'Welcome to Our Exclusive Wedding Experience',
            body: 'Thank you for considering our luxury wedding services. We are honored to be part of your special day planning.',
            template_id: 'luxury_welcome'
          }
        },
        {
          id: 'personal_consultation',
          name: 'Schedule Personal Consultation',
          type: 'task',
          delay_hours: 2,
          content: {
            body: 'Schedule in-person consultation within 48 hours for luxury client'
          }
        },
        {
          id: 'portfolio_presentation',
          name: 'Custom Portfolio Presentation',
          type: 'email',
          delay_hours: 24,
          content: {
            subject: 'Your Exclusive Wedding Portfolio',
            body: 'We have curated a selection of our finest work tailored to your style preferences.',
            template_id: 'luxury_portfolio'
          }
        },
        {
          id: 'vip_follow_up',
          name: 'VIP Follow-up Call',
          type: 'task',
          delay_hours: 72,
          content: {
            body: 'Personal follow-up call to discuss proposal and answer any questions'
          }
        },
        {
          id: 'contract_preparation',
          name: 'Luxury Contract Preparation',
          type: 'task',
          delay_hours: 120,
          content: {
            body: 'Prepare custom luxury package contract with premium services'
          },
          conditions: [
            {
              field: 'consultation_completed',
              operator: 'equals',
              value: true
            }
          ]
        }
      ],
      status: 'active',
      enrollment_count: config.realisticData ? Math.floor(Math.random() * 10) : 1,
      completion_rate: config.realisticData ? (0.6 + Math.random() * 0.3) : 0.75, // 60-90%
      created_at: config.realisticData ? new Date().toISOString() : undefined,
      updated_at: config.realisticData ? new Date().toISOString() : undefined
    };
  }

  /**
   * Generate a future wedding date based on season
   */
  static getSeasonalWeddingDate(season: 'spring' | 'summer' | 'fall' | 'winter'): string {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    const seasonDates = {
      spring: [`${nextYear}-04-15`, `${nextYear}-05-20`, `${nextYear}-06-10`],
      summer: [`${nextYear}-06-15`, `${nextYear}-07-15`, `${nextYear}-08-15`],
      fall: [`${nextYear}-09-15`, `${nextYear}-10-15`, `${nextYear}-11-01`],
      winter: [`${nextYear}-12-15`, `${nextYear + 1}-01-15`, `${nextYear + 1}-02-14`]
    };
    
    const dates = seasonDates[season];
    return dates[Math.floor(Math.random() * dates.length)];
  }

  /**
   * Generate future wedding date (3-18 months out)
   */
  private static generateFutureWeddingDate(): string {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (90 + Math.floor(Math.random() * 450)) * 24 * 60 * 60 * 1000);
    return futureDate.toISOString().split('T')[0];
  }

  /**
   * Get date before a given date by specified days
   */
  private static getDateBefore(dateString: string, days: number): string {
    const date = new Date(dateString);
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }
}