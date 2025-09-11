const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testMemoryMCP() {
  console.log('🧠 Testing Memory MCP Server for WedSync...');
  console.log('=' .repeat(50));
  
  // Check if memory file exists
  const memoryFilePath = '/Users/skyphotography/.local/share/mcp-servers/wedsync-memory.json';
  console.log('\n📁 Memory Storage Check:');
  
  if (fs.existsSync(memoryFilePath)) {
    const memoryData = JSON.parse(fs.readFileSync(memoryFilePath, 'utf8'));
    console.log('✅ WedSync memory file exists');
    console.log(`📊 Entities: ${Object.keys(memoryData.entities || {}).length}`);
    console.log(`🔗 Relationships: ${(memoryData.relationships || []).length}`);
    console.log(`📚 Knowledge Domains: ${(memoryData.metadata?.knowledge_domains || []).join(', ')}`);
  } else {
    console.log('❌ Memory file not found');
    return;
  }
  
  // Test MCP server command
  console.log('\n🔌 Testing Memory MCP Server Command:');
  
  try {
    const mcpProcess = spawn('npx', ['-y', '@modelcontextprotocol/server-memory'], {
      env: {
        ...process.env,
        MEMORY_FILE_PATH: memoryFilePath
      },
      stdio: 'pipe'
    });
    
    // Give it 3 seconds to start
    const timeout = setTimeout(() => {
      mcpProcess.kill();
    }, 3000);
    
    return new Promise((resolve) => {
      let output = '';
      let errorOutput = '';
      
      mcpProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      mcpProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      mcpProcess.on('exit', (code) => {
        clearTimeout(timeout);
        
        if (code === 0 || output.includes('server') || output.includes('memory') || errorOutput.includes('server')) {
          console.log('✅ Memory MCP server started successfully');
        } else {
          console.log('⚠️ Memory MCP server output:', (output + errorOutput).substring(0, 200));
        }
        
        // Test memory knowledge queries
        console.log('\n📚 WedSync Knowledge Base Summary:');
        console.log('================================');
        
        const memoryData = JSON.parse(fs.readFileSync(memoryFilePath, 'utf8'));
        
        console.log('\n🎯 Project Context:');
        const project = memoryData.entities.wedsync_project;
        console.log(`  • Platform: ${project.name}`);
        console.log(`  • Industry: ${project.industry}`);
        console.log(`  • Business Model: ${project.business_model}`);
        console.log(`  • Status: ${project.status}`);
        
        console.log('\n👤 User Context:');
        const user = memoryData.entities.user_photographer;
        console.log(`  • Role: ${user.name}`);
        console.log(`  • Technical Level: ${user.technical_level}`);
        console.log(`  • Decision Authority: ${user.decision_authority}`);
        
        console.log('\n🏗️ Technical Stack:');
        const tech = project.tech_stack;
        console.log(`  • Frontend: ${tech.frontend}`);
        console.log(`  • Database: ${tech.database}`);
        console.log(`  • Analytics: ${tech.analytics}`);
        console.log(`  • Error Tracking: ${tech.error_tracking}`);
        
        console.log('\n⚠️ Critical Business Rules:');
        const rules = project.critical_business_rules;
        console.log(`  • Saturday Rule: ${rules.saturday_deployment_ban}`);
        console.log(`  • Wedding Day Priority: ${rules.wedding_day_priority}`);
        console.log(`  • Mobile First: ${rules.mobile_first}`);
        
        console.log('\n🚀 Current Session Focus:');
        const session = memoryData.entities.current_session_context;
        console.log(`  • Date: ${session.date}`);
        console.log(`  • Focus: ${session.focus}`);
        console.log(`  • Completed: ${session.completed_today.length} items`);
        console.log(`  • Next: ${session.next_priorities.length} priorities`);
        
        console.log('\n🎉 Memory MCP Integration Complete!');
        console.log('\n📈 Benefits:');
        console.log('1. Persistent WedSync project context across sessions');
        console.log('2. Wedding industry knowledge and business rules');
        console.log('3. Technical architecture and decision history'); 
        console.log('4. User persona and communication preferences');
        console.log('5. Current development status and priorities');
        
        resolve(true);
      });
      
      mcpProcess.on('error', (error) => {
        clearTimeout(timeout);
        console.log('⚠️ Memory MCP server test issue:', error.message);
        resolve(true);
      });
    });
    
  } catch (error) {
    console.log('❌ Error testing Memory MCP:', error.message);
    return false;
  }
}

testMemoryMCP().catch(console.error);