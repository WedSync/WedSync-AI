const { PostHog } = require('posthog-node');

async function testPostHogIntegration() {
  console.log('🧪 Testing PostHog Integration for WedSync...');
  console.log('=' .repeat(50));
  
  // Check environment variables
  console.log('\n📋 Environment Variables:');
  const apiKey = process.env.POSTHOG_API_KEY;
  const publicKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  
  if (!apiKey) {
    console.log('❌ POSTHOG_API_KEY not found');
    return;
  }
  
  if (!publicKey) {
    console.log('❌ NEXT_PUBLIC_POSTHOG_KEY not found');
    return;
  }
  
  console.log('✅ PostHog API Key:', apiKey.substring(0, 15) + '...');
  console.log('✅ PostHog Public Key:', publicKey.substring(0, 15) + '...');
  
  // Test PostHog Node.js client
  console.log('\n🎯 Testing PostHog Node.js Client:');
  
  try {
    const client = new PostHog(apiKey, {
      host: 'https://app.posthog.com',
    });
    
    // Test wedding vendor event
    console.log('📊 Sending test wedding vendor event...');
    client.capture({
      distinctId: 'test-wedding-vendor-' + Date.now(),
      event: 'wedding_vendor_analytics_test',
      properties: {
        vendor_type: 'photographer',
        business_name: 'Test Wedding Photography',
        subscription_tier: 'professional',
        test_environment: true,
        timestamp: new Date().toISOString(),
        platform: 'wedsync',
        event_source: 'integration_test'
      }
    });
    
    // Test wedding event tracking
    console.log('📝 Sending test form creation event...');
    client.capture({
      distinctId: 'test-wedding-vendor-' + Date.now(),
      event: 'form_created',
      properties: {
        form_type: 'wedding_questionnaire',
        vendor_type: 'photographer',
        is_first_form: true,
        test_environment: true,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('✅ Test events sent successfully!');
    
    // Shutdown client
    await client.shutdown();
    
    console.log('\n🎉 PostHog Integration Test Complete!');
    console.log('\n📈 Next Steps:');
    console.log('1. Check your PostHog dashboard at https://app.posthog.com');
    console.log('2. Look for events: wedding_vendor_analytics_test, form_created');
    console.log('3. Visit http://localhost:3002/auth/login to test live tracking');
    console.log('4. Create some forms and journeys to see analytics in action');
    
  } catch (error) {
    console.log('❌ PostHog integration failed:', error.message);
  }
}

testPostHogIntegration().catch(console.error);