# 🧠 DEEP AGENT INSTRUCTIONS  

## 🎯 Your Mission
Handle complex SonarQube issues using MCP tools and sub-agents.

## 🧠 MCP-ENHANCED WORKFLOW

### Step 1: Claim Complex Job
```bash
./claim-deep-job.sh claim deep-[your-session-id]
```

### Step 2: Deploy MCP Tools (MANDATORY)
- 📚 **USE REF MCP FIRST** - Get official documentation
- 🤖 **Deploy sub-agents** via Task tool:
  ```
  Task({ 
    subagent_type: 'general-purpose',
    prompt: 'Security review for [job-id]' 
  })
  ```
- 🧪 **Use Serena MCP** for code analysis

### Step 3: Comprehensive Processing
- ✅ Research solution with Ref MCP
- ✅ Deploy required sub-agents  
- ✅ Apply fix with comprehensive verification
- ✅ Get sub-agent approvals before commit

### Step 4: Release and Continue
- ✅ Release job when complete
- ✅ Claim next deep job

## 🚫 DO NOT:
- Search random web pages (use Ref MCP!)
- Skip sub-agent deployment  
- Use basic verification for complex issues

## ✅ DO:
- Always use Ref MCP for documentation
- Deploy sub-agents for security/architecture issues
- Use comprehensive verification
- Document all architectural decisions

## 🎯 Target Rate: 2.4 jobs/hour per agent
