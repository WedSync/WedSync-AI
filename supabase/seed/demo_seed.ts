#!/usr/bin/env tsx

/**
 * WedSync Demo Mode Seed Script
 * 
 * This script creates comprehensive demo data for all personas and couples.
 * It can be run independently and is idempotent (safe to run multiple times).
 * 
 * Usage:
 *   npm run demo:seed          # Create demo data
 *   npm run demo:seed --reset  # Reset and recreate demo data
 *   npm run demo:clean         # Remove all demo data
 */

import { createClient } from '@supabase/supabase-js';
import { DEMO_PERSONAS, DEMO_COUPLES } from '../../src/lib/demo/config';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Please check your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Command line arguments
const args = process.argv.slice(2);
const isReset = args.includes('--reset');
const isClean = args.includes('--clean') || args.includes('--reset');

// Demo organization data
const DEMO_ORGANIZATIONS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Everlight Photography',
    slug: 'everlight-photography',
    domain: 'everlightphoto.demo',
    pricing_tier: 'PROFESSIONAL',
    max_users: 5,
    max_forms: 50,
    max_submissions: 10000,
    logo_url: '/demo/logos/everlight-photography.png',
    primary_color: '#FF6B9A',
    secondary_color: '#FFC46B',
    settings: { demo_mode: true, demo_persona: 'photographer-everlight' },
    features: { timeline: true, galleries: true, contracts: true }
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Silver Lining Films',
    slug: 'silver-lining-films',
    domain: 'silverliningfilms.demo',
    pricing_tier: 'PROFESSIONAL',
    max_users: 3,
    max_forms: 25,
    max_submissions: 5000,
    logo_url: '/demo/logos/silver-lining-films.png',
    primary_color: '#C0C0C0',
    secondary_color: '#1E2A38',
    settings: { demo_mode: true, demo_persona: 'videographer-silver-lining' },
    features: { video_hosting: true, highlight_reels: true }
  },
  // Add more organizations for other suppliers...
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    name: 'WedSync Demo Couples',
    slug: 'wedsync-demo-couples',
    domain: 'couples.demo',
    pricing_tier: 'PROFESSIONAL',
    max_users: 100,
    max_forms: 500,
    max_submissions: 100000,
    logo_url: '/demo/logos/wedsync-couples.png',
    primary_color: '#F472B6',
    secondary_color: '#FDE2E7',
    settings: { demo_mode: true, demo_persona: 'couples-org' },
    features: { guest_management: true, timeline_builder: true, vendor_communication: true }
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    name: 'WedSync Platform',
    slug: 'wedsync-platform',
    domain: 'admin.wedsync.demo',
    pricing_tier: 'ENTERPRISE',
    max_users: 1000,
    max_forms: 10000,
    max_submissions: 1000000,
    logo_url: '/demo/logos/wedsync-admin.png',
    primary_color: '#3B82F6',
    secondary_color: '#EFF6FF',
    settings: { demo_mode: true, demo_persona: 'admin-wedsync' },
    features: { all_features: true, analytics: true, user_management: true }
  }
];

// Demo user profiles data
const DEMO_USER_PROFILES = [
  // Couples
  {
    id: 'd1111111-1111-1111-1111-111111111111',
    user_id: 'd1111111-1111-1111-1111-111111111111',
    organization_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    role: 'OWNER',
    first_name: 'Sarah & Michael',
    last_name: null,
    avatar_url: '/demo/avatars/couple-sarah-michael.png',
    phone: '+44 7700 900001',
    timezone: 'Europe/London',
    preferences: { 
      demo_mode: true, 
      wedding_date: '2025-06-15', 
      venue: 'The Old Barn',
      persona_id: 'couple-sarah-michael'
    },
    notification_settings: { email: true, push: true, sms: true }
  },
  {
    id: 'd2222222-2222-2222-2222-222222222222',
    user_id: 'd2222222-2222-2222-2222-222222222222',
    organization_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    role: 'MEMBER',
    first_name: 'Emma & James',
    last_name: null,
    avatar_url: '/demo/avatars/couple-emma-james.png',
    phone: '+44 7700 900002',
    timezone: 'Europe/London',
    preferences: { 
      demo_mode: true, 
      wedding_date: '2025-08-20', 
      venue: 'Garden Manor',
      persona_id: 'couple-emma-james'
    },
    notification_settings: { email: true, push: true, sms: false }
  },
  // Suppliers
  {
    id: 'd4444444-4444-4444-4444-444444444444',
    user_id: 'd4444444-4444-4444-4444-444444444444',
    organization_id: '11111111-1111-1111-1111-111111111111',
    role: 'OWNER',
    first_name: 'Maya',
    last_name: 'Chen',
    avatar_url: '/demo/avatars/photographer.png',
    phone: '+44 7700 900004',
    timezone: 'Europe/London',
    preferences: { 
      demo_mode: true, 
      vendor_type: 'photographer', 
      specialties: ['romantic', 'candid', 'outdoor'],
      persona_id: 'photographer-everlight'
    },
    notification_settings: { email: true, push: true, sms: false }
  },
  // Admin
  {
    id: 'da555555-5555-5555-5555-555555555555',
    user_id: 'da555555-5555-5555-5555-555555555555',
    organization_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    role: 'OWNER',
    first_name: 'WedSync',
    last_name: 'Admin',
    avatar_url: '/demo/avatars/admin.png',
    phone: '+44 7700 900000',
    timezone: 'Europe/London',
    preferences: { demo_mode: true, role: 'super_admin', persona_id: 'admin-wedsync' },
    notification_settings: { email: true, push: true, sms: false }
  }
];

// Demo suppliers data
const DEMO_SUPPLIERS = [
  {
    id: 'e1111111-1111-1111-1111-111111111111',
    organization_id: '11111111-1111-1111-1111-111111111111',
    business_name: 'Everlight Photography',
    slug: 'everlight-photography',
    business_type: 'Photography',
    primary_category: 'Wedding Photography',
    secondary_categories: ['Portrait Photography', 'Engagement Sessions'],
    email: 'hello@everlightphoto.demo',
    phone: '+44 7700 900004',
    website: 'https://everlightphoto.demo',
    address_line1: '123 Photography Lane',
    city: 'London',
    county: 'Greater London',
    country: 'UK',
    postcode: 'SW1A 1AA',
    latitude: 51.5074,
    longitude: -0.1278,
    service_radius_miles: 100,
    description: 'Storytelling wedding photography with a glowing, romantic touch.',
    about_us: 'We capture the magic moments of your special day with our signature romantic style.',
    years_in_business: 8,
    team_size: 3,
    price_range: '£££',
    starting_price: 1500.00,
    payment_methods: ['Bank Transfer', 'Card Payment'],
    instagram_handle: '@everlightphoto',
    portfolio_images: [
      { url: '/demo/portfolio/everlight-1.jpg', caption: 'Romantic sunset ceremony' },
      { url: '/demo/portfolio/everlight-2.jpg', caption: 'Candid celebration moments' }
    ],
    featured_image: '/demo/portfolio/everlight-featured.jpg',
    specializations: ['Romantic Style', 'Candid Photography', 'Outdoor Ceremonies'],
    certifications: ['Guild of Photographers'],
    awards: ['Wedding Photography Awards 2023'],
    business_hours: {
      monday: '9:00-17:00',
      tuesday: '9:00-17:00',
      wednesday: '9:00-17:00',
      thursday: '9:00-17:00',
      friday: '9:00-17:00',
      saturday: '8:00-20:00',
      sunday: '10:00-18:00'
    },
    settings: { demo_mode: true, persona_id: 'photographer-everlight' }
  }
  // Add more suppliers...
];

// Demo jobs (relationships between couples and suppliers)
const DEMO_JOBS = [
  {
    id: 'j1111111-1111-1111-1111-111111111111',
    couple_id: 'd1111111-1111-1111-1111-111111111111',
    supplier_id: 'e1111111-1111-1111-1111-111111111111',
    status: 'booked',
    booking_date: '2024-12-01',
    wedding_date: '2025-06-15',
    budget_allocated: 1800.00,
    notes: 'Booked for full day coverage with engagement session',
    timeline_items: [
      { time: '14:00', task: 'Bridal prep photos' },
      { time: '15:30', task: 'Ceremony coverage' }
    ],
    forms_completed: [
      { form: 'Wedding Day Timeline', completed: true },
      { form: 'Shot List Preferences', completed: true }
    ]
  }
  // Add more demo jobs...
];

// Utility functions
async function cleanDemoData() {
  console.log('🧹 Cleaning existing demo data...');
  
  try {
    // Delete in correct order to avoid foreign key constraints
    await supabase.from('demo_jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('suppliers').delete().eq('settings->>demo_mode', 'true');
    await supabase.from('user_profiles').delete().eq('preferences->>demo_mode', 'true');
    await supabase.from('organizations').delete().eq('settings->>demo_mode', 'true');
    
    console.log('✅ Demo data cleaned successfully');
  } catch (error) {
    console.error('❌ Error cleaning demo data:', error);
    throw error;
  }
}

async function seedOrganizations() {
  console.log('📊 Seeding demo organizations...');
  
  const { error } = await supabase
    .from('organizations')
    .upsert(DEMO_ORGANIZATIONS.map(org => ({
      ...org,
      settings: JSON.stringify(org.settings),
      features: JSON.stringify(org.features),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })), { 
      onConflict: 'id',
      ignoreDuplicates: false 
    });

  if (error) {
    console.error('❌ Error seeding organizations:', error);
    throw error;
  }
  
  console.log(`✅ Seeded ${DEMO_ORGANIZATIONS.length} demo organizations`);
}

async function seedUserProfiles() {
  console.log('👥 Seeding demo user profiles...');
  
  const { error } = await supabase
    .from('user_profiles')
    .upsert(DEMO_USER_PROFILES.map(profile => ({
      ...profile,
      preferences: JSON.stringify(profile.preferences),
      notification_settings: JSON.stringify(profile.notification_settings),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })), { 
      onConflict: 'id',
      ignoreDuplicates: false 
    });

  if (error) {
    console.error('❌ Error seeding user profiles:', error);
    throw error;
  }
  
  console.log(`✅ Seeded ${DEMO_USER_PROFILES.length} demo user profiles`);
}

async function seedSuppliers() {
  console.log('🏢 Seeding demo suppliers...');
  
  const { error } = await supabase
    .from('suppliers')
    .upsert(DEMO_SUPPLIERS.map(supplier => ({
      ...supplier,
      portfolio_images: JSON.stringify(supplier.portfolio_images),
      business_hours: JSON.stringify(supplier.business_hours),
      settings: JSON.stringify(supplier.settings),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })), { 
      onConflict: 'id',
      ignoreDuplicates: false 
    });

  if (error) {
    console.error('❌ Error seeding suppliers:', error);
    throw error;
  }
  
  console.log(`✅ Seeded ${DEMO_SUPPLIERS.length} demo suppliers`);
}

async function seedJobs() {
  console.log('💼 Seeding demo jobs...');
  
  // Create demo_jobs table if it doesn't exist
  const { error: createTableError } = await supabase.rpc('create_demo_jobs_table');
  
  if (createTableError && !createTableError.message.includes('already exists')) {
    console.error('❌ Error creating demo_jobs table:', createTableError);
  }
  
  const { error } = await supabase
    .from('demo_jobs')
    .upsert(DEMO_JOBS.map(job => ({
      ...job,
      timeline_items: JSON.stringify(job.timeline_items),
      forms_completed: JSON.stringify(job.forms_completed),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })), { 
      onConflict: 'couple_id,supplier_id',
      ignoreDuplicates: false 
    });

  if (error) {
    console.error('❌ Error seeding demo jobs:', error);
    throw error;
  }
  
  console.log(`✅ Seeded ${DEMO_JOBS.length} demo jobs`);
}

async function createDemoJobsTable() {
  console.log('🗄️ Creating demo_jobs table...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS demo_jobs (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      couple_id UUID NOT NULL,
      supplier_id UUID NOT NULL,
      status VARCHAR(50) DEFAULT 'inquiry' CHECK (status IN ('inquiry', 'booked', 'pre-wedding', 'delivered')),
      booking_date DATE,
      wedding_date DATE,
      budget_allocated DECIMAL(10, 2),
      notes TEXT,
      timeline_items JSONB DEFAULT '[]'::jsonb,
      forms_completed JSONB DEFAULT '[]'::jsonb,
      files_shared JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(couple_id, supplier_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_demo_jobs_couple_supplier ON demo_jobs(couple_id, supplier_id);
    CREATE INDEX IF NOT EXISTS idx_demo_jobs_status ON demo_jobs(status);
  `;

  const { error } = await supabase.rpc('exec', { sql: createTableSQL });
  
  if (error && !error.message.includes('already exists')) {
    console.error('❌ Error creating demo_jobs table:', error);
    throw error;
  }
  
  console.log('✅ Demo jobs table ready');
}

async function validateDemoData() {
  console.log('✔️ Validating demo data...');
  
  // Check organizations
  const { count: orgCount, error: orgError } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('settings->>demo_mode', 'true');
    
  if (orgError) {
    console.error('❌ Error validating organizations:', orgError);
    return false;
  }
  
  // Check user profiles  
  const { count: profileCount, error: profileError } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('preferences->>demo_mode', 'true');
    
  if (profileError) {
    console.error('❌ Error validating user profiles:', profileError);
    return false;
  }
  
  // Check suppliers
  const { count: supplierCount, error: supplierError } = await supabase
    .from('suppliers')
    .select('*', { count: 'exact', head: true })
    .eq('settings->>demo_mode', 'true');
    
  if (supplierError) {
    console.error('❌ Error validating suppliers:', supplierError);
    return false;
  }
  
  console.log(`✅ Validation complete:
  - Organizations: ${orgCount}
  - User Profiles: ${profileCount}  
  - Suppliers: ${supplierCount}`);
  
  return true;
}

// Main execution function
async function main() {
  console.log('🚀 WedSync Demo Mode Seed Script');
  console.log('================================');
  
  try {
    if (isClean) {
      await cleanDemoData();
      
      if (!isReset) {
        console.log('✅ Demo data cleaned successfully');
        return;
      }
    }
    
    console.log('📡 Connecting to Supabase...');
    const { data, error } = await supabase.from('organizations').select('count').limit(1);
    if (error) {
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }
    console.log('✅ Connected to Supabase');
    
    // Create tables if needed
    await createDemoJobsTable();
    
    // Seed all data
    await seedOrganizations();
    await seedUserProfiles();
    await seedSuppliers();
    await seedJobs();
    
    // Validate the seeded data
    const isValid = await validateDemoData();
    
    if (isValid) {
      console.log('\n🎉 Demo data seeding completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Set NEXT_PUBLIC_DEMO_MODE=true in your .env.local');
      console.log('2. Start your development server: npm run dev');
      console.log('3. Visit /demo to explore the personas');
      console.log('\n💡 Tip: Use npm run demo:on to start with demo mode enabled');
    } else {
      console.log('⚠️ Demo data seeding completed with warnings. Please check the validation results.');
    }
    
  } catch (error) {
    console.error('\n❌ Demo seeding failed:', error);
    process.exit(1);
  }
}

// Execute the script
if (require.main === module) {
  main();
}

export { main as seedDemoData, cleanDemoData, validateDemoData };