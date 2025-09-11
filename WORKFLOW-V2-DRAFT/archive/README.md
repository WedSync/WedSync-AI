# 📋 WORKFLOW V2 DRAFT - 5-TEAM ORCHESTRATION MODEL
## REVIEW BEFORE IMPLEMENTATION

**Status:** DRAFT - Not for production use  
**Purpose:** Scale from 3 to 5 development teams with new orchestration layer  
**Review Required:** Read all documents before implementing  

---

## 🚨 IMPORTANT NOTICE

This folder contains DRAFT versions of the workflow documents adapted for:
- **5 Development Teams** (up from 3)
- **Project Orchestrator** role (coordinates all teams)
- **Feature Development** session (creates technical specs)
- **Dev Manager** role (generates team prompts)
- **Senior Dev** role (code review and quality)

**DO NOT USE THESE IN PRODUCTION** until fully reviewed and approved.

---

## 📁 DRAFT DOCUMENTS IN THIS FOLDER

✅ **ALL DOCUMENTS COMPLETE**

### Core Workflow Documents
1. **PM-MASTER-CONTROL-V2.md** - Updated PM workflow for 5-team orchestration
2. **PROJECT-ORCHESTRATOR-GUIDE.md** - New role for coordinating 5 teams
3. **FEATURE-DEVELOPMENT-GUIDE.md** - New role for technical specification
4. **DEV-MANAGER-GUIDE.md** - New role for prompt generation
5. **SENIOR-DEV-GUIDE.md** - New role for code review
6. **DAILY-WORKFLOW-V2.md** - Complete daily workflow with all roles

### Templates & Tools
7. **TEAM-PROMPT-TEMPLATES.md** - Templates for 5 teams × 3 sprints
8. **MIGRATION-GUIDE.md** - How to migrate from current 3-team to 5-team model

### NEW Enhancements (Based on Your Feedback)
9. **SENIOR-DEV-AUTOMATED-PROMPT.md** - Automated handover from teams to Senior Dev
10. **HUMAN-PM-QUICK-START.md** - What YOU actually do each day (simplified!)
11. **MARATHON-SESSION-PROTOCOL.md** - Handle multi-day continuous sessions with Virtual Days
12. **GIT-OPERATIONS-GUIDE.md** - Automated Git commits after Senior Dev approval

---

## 🔄 KEY CHANGES FROM CURRENT WORKFLOW

### **What's Preserved (Working Well)**
- ✅ MCP server usage patterns
- ✅ Sub-agent deployment strategy
- ✅ Context7 documentation queries
- ✅ Playwright testing requirements
- ✅ EXPLORE-PLAN-CODE-COMMIT cycle
- ✅ Verification protocols
- ✅ Document organization structure
- ✅ Session prompt templates
- ✅ Quality gates and security checks

### **What's New**
- 📍 Project Orchestrator role (reads roadmap, coordinates teams)
- 📍 Feature Development session (expands specs from CORE-SPECIFICATIONS)
- 📍 Dev Manager role (creates 15 daily prompts)
- 📍 Senior Dev role (reviews all code)
- 📍 5 teams instead of 3 (more parallel work)
- 📍 3 sprints per day per team (75 prompts total)

### **What's Enhanced**
- 🔧 Better dependency management between teams
- 🔧 Clearer role separation
- 🔧 More structured technical specification
- 🔧 Automated prompt generation
- 🔧 Continuous code review

---

## 🎯 REVIEW CHECKLIST

Before implementing this workflow:

- [ ] Read PM-MASTER-CONTROL-V2.md completely
- [ ] Understand PROJECT-ORCHESTRATOR-GUIDE.md role
- [ ] Review FEATURE-DEVELOPMENT-GUIDE.md process
- [ ] Check DEV-MANAGER-GUIDE.md prompt generation
- [ ] Validate SENIOR-DEV-GUIDE.md review process
- [ ] Walk through DAILY-WORKFLOW-V2.md step by step
- [ ] Review TEAM-PROMPT-TEMPLATES.md for clarity
- [ ] Understand MIGRATION-GUIDE.md steps
- [ ] Identify any gaps or concerns
- [ ] Test with one day's work before full rollout

---

## ⚠️ RISKS TO CONSIDER

1. **Coordination Overhead** - More teams = more coordination needed
2. **Prompt Quality** - 75 prompts/day needs careful management
3. **Integration Complexity** - 5 teams working in parallel
4. **Review Bottleneck** - Senior Dev reviewing all code
5. **Learning Curve** - New roles need time to establish

---

## 💡 RECOMMENDATION

1. Review all documents in this folder
2. Identify what needs adjustment for your workflow
3. Consider a gradual rollout (start with 4 teams, then 5)
4. Keep current workflow as backup
5. Run parallel for one day to compare results

---

**Remember:** The current workflow is achieving 15% in 5 days. Don't break what's working!