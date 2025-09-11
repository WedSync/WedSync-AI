#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

console.log('🔍 Verifying Payment Tables...\n');
console.log(`📍 Supabase URL: ${supabaseUrl}`);
console.log(`🔑 Using key: ${supabaseKey.substring(0, 20)}...`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
  const tables = [
    'payment_history',
    'webhook_events',
    'subscription_history',
    'payment_methods',
    'invoices',
    'organizations'
  ];

  console.log('\n📊 Checking table existence:\n');
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Exists and accessible`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err}`);
    }
  }

  // Check for sample data
  console.log('\n📈 Checking for existing data:\n');
  
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .limit(5);
  
  if (orgs && orgs.length > 0) {
    console.log(`✅ Found ${orgs.length} organizations`);
    console.log('Sample org:', JSON.stringify(orgs[0], null, 2));
  } else {
    console.log('⚠️  No organizations found');
  }

  const { data: payments, error: paymentError } = await supabase
    .from('payment_history')
    .select('*')
    .limit(5);
  
  if (payments && payments.length > 0) {
    console.log(`✅ Found ${payments.length} payment records`);
  } else {
    console.log('⚠️  No payment history found');
  }

  // Test insert capability
  console.log('\n🧪 Testing write permissions:\n');
  
  const testWebhookEvent = {
    stripe_event_id: `test_${Date.now()}`,
    event_type: 'test.verification',
    payload: { test: true },
    status: 'processed'
  };

  const { data: insertData, error: insertError } = await supabase
    .from('webhook_events')
    .insert(testWebhookEvent)
    .select()
    .single();

  if (insertError) {
    console.log(`❌ Cannot insert test webhook event: ${insertError.message}`);
  } else {
    console.log('✅ Successfully inserted test webhook event');
    
    // Clean up test data
    const { error: deleteError } = await supabase
      .from('webhook_events')
      .delete()
      .eq('stripe_event_id', testWebhookEvent.stripe_event_id);
    
    if (!deleteError) {
      console.log('✅ Successfully cleaned up test data');
    }
  }

  console.log('\n✨ Verification complete!\n');
}

verifyTables().catch(console.error);