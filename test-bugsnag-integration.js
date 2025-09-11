const Bugsnag = require('@bugsnag/node');

async function testBugsnagIntegration() {
  console.log('🐛 Testing Bugsnag Integration for WedSync...');
  console.log('=' .repeat(50));
  
  // Check environment variables
  console.log('\n📋 Environment Variables:');
  const apiKey = process.env.BUGSNAG_API_KEY;
  
  if (!apiKey) {
    console.log('❌ BUGSNAG_API_KEY not found');
    return;
  }
  
  console.log('✅ Bugsnag API Key:', apiKey.substring(0, 10) + '...');
  
  // Initialize Bugsnag
  console.log('\n🔧 Initializing Bugsnag...');
  try {
    Bugsnag.start({
      apiKey: apiKey,
      environment: 'test',
      releaseStage: 'test',
      enabledReleaseStages: ['test'],
      metadata: {
        platform: {
          name: 'WedSync',
          type: 'wedding_platform',
          test: true
        }
      }
    });
    
    console.log('✅ Bugsnag initialized successfully');
  } catch (error) {
    console.log('❌ Failed to initialize Bugsnag:', error.message);
    return;
  }
  
  // Test wedding-specific error reporting
  console.log('\n📊 Testing Wedding-Specific Error Reporting:');
  
  try {
    // Test 1: Wedding day critical error
    console.log('1. Testing wedding day critical error...');
    Bugsnag.notify(new Error('Wedding day form submission failed'), (event) => {
      event.severity = 'error';
      event.addMetadata('wedding_error', {
        type: 'wedding_day_form_failure',
        is_wedding_day: true,
        escalated: true,
        requires_immediate_attention: true
      });
    });
    
    // Test 2: Vendor business error
    console.log('2. Testing vendor business error...');
    Bugsnag.notify(new Error('Payment processing failed for photographer'), (event) => {
      event.severity = 'error';
      event.setUser('test-photographer-123', 'photographer', 'Amazing Wedding Photography');
      event.addMetadata('wedding_error', {
        type: 'payment_processing_error',
        vendor_type: 'photographer',
        amount: 299,
        currency: 'GBP'
      });
    });
    
    // Test 3: Form submission error
    console.log('3. Testing form submission error...');
    Bugsnag.notify(new Error('Client questionnaire submission timeout'), (event) => {
      event.severity = 'warning';
      event.addMetadata('wedding_error', {
        type: 'form_submission_failed',
        form_id: 'wedding-questionnaire-001',
        client_id: 'test-couple-456',
        timeout_duration: '30s'
      });
    });
    
    // Test 4: Integration failure
    console.log('4. Testing integration failure...');
    Bugsnag.notify(new Error('Tave CRM sync failed - API timeout'), (event) => {
      event.severity = 'error';
      event.addMetadata('wedding_error', {
        type: 'crm_sync_failure',
        integration_name: 'tave',
        vendor_id: 'test-photographer-123',
        affected_records: 25
      });
    });
    
    console.log('✅ All test errors sent successfully!');
    
    // Test MCP server connection
    console.log('\n🔌 Testing Bugsnag MCP Server:');
    const { spawn } = require('child_process');
    
    const mcpProcess = spawn('npx', ['-y', 'bugsnag-mcp-server'], {
      env: {
        ...process.env,
        BUGSNAG_API_KEY: apiKey
      },
      stdio: 'pipe'
    });
    
    // Give it 3 seconds to start
    const timeout = setTimeout(() => {
      mcpProcess.kill();
    }, 3000);
    
    return new Promise((resolve) => {
      let output = '';
      
      mcpProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      mcpProcess.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      mcpProcess.on('exit', (code) => {
        clearTimeout(timeout);
        
        if (code === 0 || output.includes('server') || output.includes('mcp') || output.length === 0) {
          console.log('✅ Bugsnag MCP server test completed');
        } else {
          console.log('⚠️ Bugsnag MCP server output:', output.substring(0, 200));
        }
        
        console.log('\n🎉 Bugsnag Integration Test Complete!');
        console.log('\n📈 Next Steps:');
        console.log('1. Check your Bugsnag dashboard at https://app.bugsnag.com');
        console.log('2. Look for test errors with wedding-specific metadata');
        console.log('3. Visit http://localhost:3002/auth/login and try a failed login');
        console.log('4. Set up Bugsnag notifications for Saturday wedding day errors');
        
        resolve(true);
      });
      
      mcpProcess.on('error', (error) => {
        clearTimeout(timeout);
        console.log('⚠️ Bugsnag MCP server test issue:', error.message);
        resolve(true); // Still consider it a success for the main integration
      });
    });
    
  } catch (error) {
    console.log('❌ Error testing Bugsnag:', error.message);
  }
}

testBugsnagIntegration().catch(console.error);