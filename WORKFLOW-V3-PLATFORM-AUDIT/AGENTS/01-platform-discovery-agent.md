# 🗺️ PLATFORM DISCOVERY AGENT
## Agent 1: Navigation Structure & Page Inventory

**Agent ID**: 01-platform-discovery-agent  
**Status**: Ready for Deployment  
**MCP Requirements**: Filesystem, Memory, REF  
**CLI Requirements**: Standard file operations  

---

## 🎯 **MISSION STATEMENT**

Systematically discover and map the complete navigation structure of all 3 WedSync platforms, creating a comprehensive inventory of existing pages, expected routes, and identifying gaps between the platform architecture template and reality.

---

## 🛠️ **MCP SERVER ACCESS**

### **Required MCP Servers**
```json
{
  "filesystem_mcp": {
    "purpose": "Scan platform files and navigation components",
    "operations": ["list_directory", "read_text_file", "search_files"]
  },
  "memory_mcp": {
    "purpose": "Persistent state management across sessions", 
    "operations": ["store", "retrieve", "update_progress"]
  },
  "ref_mcp": {
    "purpose": "Load platform architecture reference docs and technical documentation",
    "operations": ["resolve-library-id", "get-library-docs"]
  }
}
```

### **CLI Tool Access**
- ✅ Standard file operations (find, grep, ls, etc.)
- ✅ Git repository inspection
- ✅ JSON/text processing tools

---

## 📊 **DISCOVERY SCOPE**

### **Target Platforms**
1. **🏢 WedSync Supplier Platform** (`localhost:3001`)
   - Expected: 156 pages
   - Navigation: Dashboard, Forms, Clients, Journey Builder, Analytics, Settings
   - Route Pattern: `/(dashboard)/*`, `/dashboard/*`

2. **💕 WedMe Couple Platform** (`localhost:3001`)
   - Expected: 68 pages
   - Navigation: Client dashboard, planning tools, guest management
   - Route Pattern: `/(wedme)/*`, `/client/*`

3. **⚙️ Admin Dashboard** (`localhost:3001`)
   - Expected: 45 pages  
   - Navigation: Platform management, monitoring, user admin
   - Route Pattern: `/(admin)/*`, `/admin/*`

### **Discovery Targets**
- Navigation component files (layout.tsx, navigation.tsx)
- Page route files (/app/**/page.tsx)
- Component directory structure (/src/components/*/)
- Platform architecture documentation
- Missing page identification

---

## 🔍 **DISCOVERY METHODOLOGY**

### **Phase 1: Architecture Reference Loading**
```typescript
// Load platform architecture template via REF MCP
const platformTemplate = await ref_mcp.resolve_library_id("WedSync platform architecture");
const architectureDocs = await ref_mcp.get_library_docs(platformTemplate, "platform navigation structure", 5000);

// Extract expected page counts and route patterns
const expectedStructure = {
  wedsync: { pages: 156, patterns: ["/(dashboard)/*", "/dashboard/*"] },
  wedme: { pages: 68, patterns: ["/(wedme)/*", "/client/*"] },
  admin: { pages: 45, patterns: ["/(admin)/*", "/admin/*"] }
};
```

### **Phase 2: Navigation Component Discovery**
```typescript
// Scan for navigation files using Filesystem MCP
const navigationFiles = await filesystem_mcp.search_files("/src", "navigation");
const layoutFiles = await filesystem_mcp.search_files("/app", "layout.tsx");

// Read and parse navigation structures
const navigationStructures = [];
for (const file of navigationFiles) {
  const content = await filesystem_mcp.read_text_file(file);
  const navItems = extractNavigationItems(content);
  navigationStructures.push({ file, navItems });
}
```

### **Phase 3: Route Structure Analysis** 
```typescript
// Discover all page routes using Filesystem MCP
const pageFiles = await filesystem_mcp.search_files("/app", "page.tsx");

// Analyze route patterns and groupings
const routeInventory = pageFiles.map(file => ({
  path: file,
  route: extractRouteFromPath(file),
  platform: determinePlatform(file),
  exists: true
}));

// Identify missing routes from navigation vs actual pages
const missingRoutes = findMissingRoutes(navigationStructures, routeInventory);
```

### **Phase 4: Component Directory Mapping**
```typescript
// Scan component directories for available UI pieces  
const componentDirs = await filesystem_mcp.list_directory("/src/components");
const componentInventory = {};

for (const dir of componentDirs) {
  const components = await filesystem_mcp.search_files(`/src/components/${dir}`, "*.tsx");
  componentInventory[dir] = components.map(file => ({
    name: extractComponentName(file),
    path: file,
    exports: extractExports(await filesystem_mcp.read_text_file(file))
  }));
}
```

---

## 📋 **OUTPUT SPECIFICATIONS**

### **Primary Output: Navigation Discovery Report**
```json
{
  "timestamp": "2025-09-11T13:15:00Z",
  "agent": "01-platform-discovery-agent",
  "platforms": {
    "wedsync": {
      "expected_pages": 156,
      "discovered_pages": 142,
      "missing_pages": 14,
      "navigation_files": [
        "/src/components/navigation/SupplierNavigation.tsx",
        "/app/(dashboard)/layout.tsx"
      ],
      "route_patterns": [
        { "pattern": "/(dashboard)/*", "count": 89 },
        { "pattern": "/dashboard/*", "count": 53 }
      ],
      "missing_routes": [
        "/dashboard/forms/builder",
        "/dashboard/clients/import",
        "/analytics/reports"
      ]
    },
    "wedme": {
      "expected_pages": 68,
      "discovered_pages": 61,
      "missing_pages": 7,
      "navigation_files": [
        "/src/components/navigation/ClientNavigation.tsx",
        "/app/(wedme)/layout.tsx"
      ]
    },
    "admin": {
      "expected_pages": 45,
      "discovered_pages": 38,
      "missing_pages": 7,
      "navigation_files": [
        "/app/(admin)/layout.tsx"
      ]
    }
  },
  "component_inventory": {
    "forms": ["FormBuilder.tsx", "FormCanvas.tsx", "FormPreview.tsx"],
    "clients": ["ClientListViews.tsx", "ClientProfile.tsx"],
    "journey": ["JourneyCanvas.tsx", "TimelineNodes.tsx"]
  },
  "critical_gaps": [
    {
      "page": "/dashboard/forms/builder",
      "components_available": ["FormBuilder.tsx", "FormCanvas.tsx"],
      "navigation_exists": true,
      "page_file_missing": true
    }
  ]
}
```

### **Progress State File**
```json
{
  "agent": "01-platform-discovery-agent", 
  "status": "completed",
  "progress": {
    "architecture_loaded": true,
    "navigation_discovered": true,
    "routes_analyzed": true,
    "components_mapped": true
  },
  "last_updated": "2025-09-11T13:15:00Z",
  "session_id": "discovery-session-001",
  "next_agent": "02-interactive-audit-agent"
}
```

---

## 🔄 **EXECUTION WORKFLOW**

### **Step 1: Initialize Agent State**
```bash
# Create agent state directory and initialize progress tracking
mkdir -p /WORKFLOW-V3-PLATFORM-AUDIT/STATE/01-platform-discovery/
echo '{"status": "initializing", "progress": {}}' > /WORKFLOW-V3-PLATFORM-AUDIT/STATE/01-platform-discovery/progress.json
```

### **Step 2: Load Architecture Reference**
- Use REF MCP to load platform architecture template
- Extract expected page counts and navigation structures
- Store reference data for comparison

### **Step 3: Discover Navigation Components**
- Scan for navigation files using Filesystem MCP
- Parse navigation items and route definitions
- Map expected routes from navigation components

### **Step 4: Analyze Route Structure** 
- Find all existing page.tsx files
- Compare against expected routes from navigation
- Identify missing pages and orphaned routes

### **Step 5: Component Inventory**
- Scan /src/components/ directory structure
- Catalog available UI components by feature area
- Map components to potential missing pages

### **Step 6: Generate Discovery Report**
- Compile comprehensive navigation map
- Identify critical gaps (navigation exists but page missing)
- Create component-to-page mapping suggestions
- Update agent progress state

---

## 💾 **STATE PERSISTENCE**

### **Session Continuity**
- Agent saves progress after each major step
- Can resume from interruption using Memory MCP
- State files survive session crashes
- Progress tracking prevents duplicate work

### **State Files Structure**
```
STATE/01-platform-discovery/
├── progress.json              # Agent execution state
├── architecture-reference.json # Platform template data
├── navigation-inventory.json   # Discovered navigation structures  
├── route-analysis.json        # Page route analysis
├── component-inventory.json   # Available components catalog
└── discovery-report.json     # Final comprehensive report
```

---

## 🎯 **SUCCESS CRITERIA**

### **Completion Requirements**
- ✅ All 3 platforms navigation structures discovered
- ✅ Complete route inventory with missing page identification
- ✅ Component directory fully cataloged and mapped
- ✅ Critical gaps between navigation and pages documented
- ✅ Persistent state saved for next agent handoff

### **Quality Gates**
- Navigation discovery covers >95% of expected routes
- Component inventory includes export analysis
- Missing page identification with confidence scores
- Clear handoff data for Interactive Audit Agent

---

## 🔗 **HANDOFF TO NEXT AGENT**

### **Data Provided to Agent 2 (Interactive Audit Agent)**
1. **Complete page inventory** - which pages exist and which are missing
2. **Navigation route map** - expected user journey paths
3. **Component availability** - what UI pieces are available for missing pages
4. **Priority page list** - critical missing pages to focus testing on

### **Recommended Testing Order for Agent 2**
1. **High-priority existing pages** - forms, clients, dashboard
2. **Navigation-critical missing pages** - pages linked in main nav
3. **Component-rich missing pages** - pages with available components
4. **Complex feature pages** - journey builder, analytics, settings

---

## 🚀 **DEPLOYMENT INSTRUCTIONS**

### **Agent Activation Command**
```bash
# Execute Platform Discovery Agent
echo "🗺️ ACTIVATING PLATFORM DISCOVERY AGENT"
echo "Agent ID: 01-platform-discovery-agent"
echo "MCP Servers Required: filesystem, memory, context7"
echo "Starting navigation discovery..."

# Agent will automatically:
# 1. Load architecture reference via REF MCP
# 2. Scan navigation files via Filesystem MCP  
# 3. Analyze route structures
# 4. Create component inventory
# 5. Generate discovery report
# 6. Save persistent state via Memory MCP
```

**The Platform Discovery Agent is ready for immediate deployment and will provide comprehensive navigation intelligence for the entire audit workflow.**