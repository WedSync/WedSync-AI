# MCP Server & CLI Tools Reference Guide
*Updated: January 14, 2025 - For All Sub-Agents*

## 🔌 Available MCP Servers (12 Active)

### **filesystem**
- **Purpose**: File system operations for WedSync project directory
- **Use Cases**: Bulk file operations, advanced search, project structure management
- **Key Functions**: read_file, write_file, list_directory, search_files, edit_file
- **Used By**: filesystem-mcp-specialist, documentation-chronicler, code-cleaner-refactoring

### **playwright**  
- **Purpose**: E2E testing and browser automation for web applications
- **Use Cases**: Visual regression testing, mobile testing, wedding day scenario testing
- **Key Functions**: browser_navigate, browser_click, browser_screenshot, browser_snapshot
- **Used By**: test-automation-architect, mobile-first-ux-specialist, wedding-day-reliability-engineer

### **sequential-thinking**
- **Purpose**: Structured problem-solving and step-by-step reasoning capabilities  
- **Use Cases**: Complex problem breakdown, multi-step analysis, decision trees
- **Key Functions**: sequentialthinking (with thought chains and reasoning)
- **Used By**: All agents for complex reasoning tasks

### **browsermcp**
- **Purpose**: Interactive browser automation for testing and debugging web interfaces
- **Use Cases**: Manual testing, debugging UI issues, interactive browser sessions
- **Key Functions**: browser_navigate, browser_click, browser_type, browser_wait
- **Used By**: test-automation-architect, mobile-first-ux-specialist

### **biome**
- **Purpose**: Fast code formatting and linting using the Biome toolchain
- **Use Cases**: Code quality enforcement, consistent formatting, linting fixes
- **Key Functions**: biome-lint, biome-format
- **Used By**: code-quality-guardian, code-cleaner-refactoring

### **ref**
- **Purpose**: Up-to-date library documentation and code examples retrieval
- **Use Cases**: Getting current API docs, finding implementation examples, version-specific guides
- **Key Functions**: resolve-library-id, get-library-docs
- **Used By**: nextjs-fullstack-developer, supabase-specialist, context7-documentation-specialist

### **memory**
- **Purpose**: Persistent context management and knowledge retention across sessions
- **Use Cases**: Learning from past decisions, maintaining project context, storing insights
- **Key Functions**: create_entities, add_observations, search_nodes, read_graph
- **Used By**: ALL agents for cross-session continuity and learning

### **postgres**
- **Purpose**: Direct PostgreSQL database operations and queries for WedSync data
- **Use Cases**: RLS policy creation, database migrations, direct queries, data validation
- **Key Functions**: query, describe_table, list_tables, get_constraints, explain_query
- **Used By**: authentication-architecture-specialist, database-mcp-specialist, postgresql-database-expert

### **posthog**
- **Purpose**: Analytics, feature flags, A/B testing, and user behavior tracking  
- **Use Cases**: Conversion optimization, user analytics, feature rollouts, performance monitoring
- **Key Functions**: query-run, create-feature-flag, insight-create, dashboard-get
- **Used By**: business-intelligence-specialist, conversion-optimization-specialist, wedding-day-reliability-engineer

### **bugsnag**
- **Purpose**: Error tracking and monitoring for production reliability
- **Use Cases**: Error detection, wedding day monitoring, incident response, reliability tracking
- **Key Functions**: list_errors, view_error, search_issues, view_stacktrace
- **Used By**: wedding-day-reliability-engineer, production-guardian, test-automation-architect

### **swagger**
- **Purpose**: API documentation generation, testing, and MCP tool creation
- **Use Cases**: API design, endpoint testing, documentation generation, tool creation
- **Key Functions**: getSwaggerDefinition, listEndpoints, generateModelCode, generateEndpointToolCode
- **Used By**: api-architect, integration-specialist

### **serena**
- **Purpose**: Intelligent code analysis and semantic editing with TypeScript support
- **Use Cases**: Code analysis, refactoring, symbol search, intelligent editing
- **Key Functions**: read_file, find_symbol, replace_symbol_body, search_for_pattern
- **Used By**: All development agents for code analysis and editing

## 🖥️ Available CLI Tools (3 Active)

### **Supabase CLI v2.40.7**
- **Purpose**: Database migrations, Edge Functions, and local development for WedSync Supabase project
- **Key Commands**: 
  - `supabase migration new <name>` - Create new migration
  - `supabase db push` - Apply migrations
  - `supabase functions deploy` - Deploy Edge Functions
  - `supabase gen types typescript` - Generate TypeScript types
- **Used By**: supabase-specialist, authentication-architecture-specialist, database-mcp-specialist

### **GitHub CLI v2.76.0**  
- **Purpose**: Repository management, PR creation, and deployment automation (authenticated as WedSync account)
- **Key Commands**:
  - `gh pr create` - Create pull requests
  - `gh repo status` - Check repository status
  - `gh workflow run` - Trigger GitHub Actions
  - `gh release create` - Create releases
- **Used By**: deployment-safety-checker, devops-sre-engineer, documentation-chronicler

### **Claude CLI**
- **Purpose**: MCP server management and Claude Code configuration
- **Key Commands**:
  - `claude mcp list` - List MCP server status
  - `claude mcp restart <server>` - Restart MCP server
  - `claude mcp logs <server>` - View MCP server logs
- **Used By**: mcp-orchestrator, technical-lead-orchestrator for MCP management

## 🎯 Development Environment Context

### Project Details
- **Path**: `/Users/skyphotography/CODE/WedSync AI`  
- **Database**: PostgreSQL 15 via Supabase (azhgptjkqiiqvvvhapml.supabase.co)
- **Tech Stack**: Next.js 15, React 19, TypeScript 5.9, Tailwind CSS 4.1
- **Analytics**: PostHog configured and operational
- **Error Tracking**: Bugsnag configured for production monitoring
- **Status**: All 12 MCP servers operational and ready

### Wedding Industry Context
- **Industry**: Wedding photography and vendor management
- **Users**: 60% mobile (photographers working on-site at venues)
- **Critical Days**: Saturdays (zero tolerance for failures)
- **Venues**: Often poor signal, requiring offline-first approach
- **Security**: Client wedding data is irreplaceable and sacred

## 🚨 Saturday Wedding Day Protocol

### MCP Server Priorities During Weddings
1. **CRITICAL** (Must Work): bugsnag, posthog, postgres, playwright
2. **HIGH** (Graceful Degradation): filesystem, memory, biome
3. **ENHANCEMENT** (Continue Without): ref, swagger, serena

### Emergency MCP Commands
```bash
# Check all MCP server health
claude mcp list

# Restart failed critical servers
claude mcp restart bugsnag
claude mcp restart posthog
claude mcp restart postgres

# Monitor wedding day errors
bugsnag_mcp.listErrors({ status: 'open' })
posthog_mcp.query('saturday_wedding_activity')
```

## 🤖 Agent MCP Integration Guidelines

### When Creating New Agents
1. **Identify Relevant MCP Servers**: Match agent purpose to available MCP capabilities
2. **Update Tools List**: Include all relevant MCP servers in agent frontmatter  
3. **Add MCP Integration Section**: Document how agent uses each MCP server
4. **Include Wedding Day Protocol**: How MCP servers support Saturday reliability

### Common MCP Patterns
- **All Agents**: Use memory_mcp for cross-session learning
- **Development Agents**: Use ref_mcp for up-to-date documentation
- **Testing Agents**: Use playwright_mcp for browser automation
- **Database Agents**: Use postgres_mcp for direct operations
- **Analytics Agents**: Use posthog_mcp for metrics and insights
- **Reliability Agents**: Use bugsnag_mcp for error tracking

### MCP Server Selection Guide
**For Feature Development**: ref, memory, filesystem, biome
**For Testing**: playwright, browsermcp, postgres, bugsnag
**For Analytics**: posthog, memory, postgres
**For Wedding Day Support**: bugsnag, posthog, postgres, playwright
**For Documentation**: filesystem, memory, ref, swagger
**For Code Quality**: biome, serena, filesystem, memory

**Remember**: Every MCP server integration must consider wedding industry requirements - reliability, mobile-first, and Saturday zero-tolerance protocols.