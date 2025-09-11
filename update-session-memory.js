#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const MEMORY_FILE = '/Users/skyphotography/.local/share/mcp-servers/wedsync-memory.json';

function updateSessionMemory(updates) {
  try {
    const memoryData = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    
    // Update current session context
    const currentDate = new Date().toISOString().split('T')[0];
    
    if (!memoryData.entities.current_session_context) {
      memoryData.entities.current_session_context = {
        type: "session_memory",
        date: currentDate,
        focus: "Development session",
        completed_today: [],
        next_priorities: [],
        technical_debt: {}
      };
    }
    
    const sessionContext = memoryData.entities.current_session_context;
    sessionContext.date = currentDate;
    sessionContext.last_updated = new Date().toISOString();
    
    // Apply updates
    if (updates.completed_today) {
      sessionContext.completed_today = [...new Set([
        ...(sessionContext.completed_today || []),
        ...updates.completed_today
      ])];
    }
    
    if (updates.next_priorities) {
      sessionContext.next_priorities = updates.next_priorities;
    }
    
    if (updates.focus) {
      sessionContext.focus = updates.focus;
    }
    
    if (updates.technical_debt) {
      sessionContext.technical_debt = {
        ...sessionContext.technical_debt,
        ...updates.technical_debt
      };
    }
    
    // Update metadata
    memoryData.metadata.last_updated = new Date().toISOString();
    
    // Write back to file
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memoryData, null, 2));
    
    console.log('✅ Memory updated successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to update memory:', error.message);
    return false;
  }
}

// Update with current MCP server integration progress
const currentUpdates = {
  focus: "MCP server integration for enhanced development workflow",
  completed_today: [
    "Memory MCP server setup with comprehensive WedSync knowledge base",
    "PostHog analytics integration with wedding-specific event tracking", 
    "Bugsnag error monitoring with Saturday escalation and vendor context"
  ],
  next_priorities: [
    "Continue MCP server integrations (Swagger API testing, additional free servers)",
    "Security hardening sprint - implement RLS policies and fix P0 vulnerabilities",
    "Mobile optimization for wedding day offline usage",
    "Enhanced form builder with wedding-specific templates"
  ],
  technical_debt: {
    "mcp_servers_progress": "3 of 10 planned servers implemented (PostHog, Bugsnag, Memory)",
    "knowledge_management": "Comprehensive wedding industry context now persistent across sessions",
    "development_efficiency": "Context preservation will improve future development speed"
  }
};

if (require.main === module) {
  updateSessionMemory(currentUpdates);
}

module.exports = { updateSessionMemory };