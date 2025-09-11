# 🧩 COMPONENT DISCOVERY AGENT  
## Agent 3: Component-Feature Mapping & Integration Analysis

**Agent ID**: 03-component-discovery-agent  
**Status**: Ready for Deployment  
**MCP Requirements**: Filesystem, Memory, REF  
**CLI Requirements**: Code analysis tools, grep, find  

---

## 🎯 **MISSION STATEMENT**

Systematically map available UI components to broken features identified by the Interactive Audit Agent, creating precise integration instructions that connect existing components to missing functionality.

---

## 🛠️ **MCP SERVER ACCESS**

### **Required MCP Servers**
```json
{
  "filesystem_mcp": {
    "purpose": "Deep component analysis and code inspection",
    "operations": [
      "read_text_file", "list_directory", "search_files", 
      "read_multiple_files", "directory_tree"
    ]
  },
  "memory_mcp": {
    "purpose": "Access Interactive Audit results and maintain component mappings",
    "operations": ["retrieve", "store", "update_mappings"]
  },
  "ref_mcp": {
    "purpose": "Load component documentation and integration patterns",
    "operations": ["resolve-library-id", "get-library-docs"]
  }
}
```

---

## 📊 **DISCOVERY METHODOLOGY**

### **Phase 1: Load Audit Results**
```typescript
// Retrieve broken features from Interactive Audit Agent
const auditResults = await memory_mcp.retrieve("interactive-audit-results");
const brokenFeatures = auditResults.issues.filter(issue => 
  issue.type === 'non_functional_button' || 
  issue.type === 'placeholder_content' ||
  issue.type === 'broken_form'
);

// Prioritize by business impact
const prioritizedIssues = brokenFeatures.sort((a, b) => {
  const priorityMap = { 'critical': 3, 'high': 2, 'medium': 1, 'low': 0 };
  return priorityMap[b.severity] - priorityMap[a.severity];
});
```

### **Phase 2: Component Directory Analysis**
```typescript
// Deep scan of component directories
const componentAnalysis = {};

// Scan each major feature directory
const featureDirs = await filesystem_mcp.list_directory("/src/components");
for (const dir of featureDirs) {
  const components = await analyzeComponentDirectory(dir);
  componentAnalysis[dir] = components;
}

async function analyzeComponentDirectory(dirName: string) {
  const files = await filesystem_mcp.search_files(`/src/components/${dirName}`, "*.tsx");
  const components = [];
  
  for (const file of files) {
    const content = await filesystem_mcp.read_text_file(file);
    const analysis = {
      name: extractComponentName(file),
      path: file,
      exports: extractExports(content),
      props: extractProps(content),
      dependencies: extractImports(content),
      usage_patterns: findUsagePatterns(content),
      integration_points: findIntegrationPoints(content)
    };
    components.push(analysis);
  }
  
  return components;
}
```

### **Phase 3: Component-Feature Matching**
```typescript
// Intelligent mapping using pattern matching
function matchComponentsToIssues(issues: any[], componentAnalysis: any) {
  const mappings = [];
  
  for (const issue of issues) {
    const potentialComponents = findMatchingComponents(issue, componentAnalysis);
    
    mappings.push({
      issue: issue,
      matched_components: potentialComponents,
      confidence_score: calculateConfidence(issue, potentialComponents),
      integration_complexity: assessIntegrationComplexity(issue, potentialComponents),
      recommended_approach: generateIntegrationApproach(issue, potentialComponents)
    });
  }
  
  return mappings;
}

function findMatchingComponents(issue: any, componentAnalysis: any) {
  const matches = [];
  
  // Example: "Preferences button" broken -> look for Modal/Dropdown components
  if (issue.description.includes('Preferences') && issue.type === 'non_functional_button') {
    const modalComponents = componentAnalysis.modals || [];
    const settingsComponents = componentAnalysis.settings || [];
    matches.push(...modalComponents, ...settingsComponents);
  }
  
  // Example: "Playlist builder coming soon" -> look for playlist/builder components
  if (issue.description.includes('Playlist') && issue.type === 'placeholder_content') {
    const musicComponents = componentAnalysis.music || [];
    const builderComponents = findBuilderComponents(componentAnalysis);
    matches.push(...musicComponents, ...builderComponents);
  }
  
  return matches;
}
```

### **Phase 4: Integration Pattern Analysis**
```typescript
// Analyze how components are typically integrated
async function analyzeIntegrationPatterns() {
  // Find existing successful integrations
  const workingPages = await findWorkingPageExamples();
  const integrationPatterns = [];
  
  for (const page of workingPages) {
    const pageContent = await filesystem_mcp.read_text_file(page);
    const pattern = {
      page: page,
      components_used: extractUsedComponents(pageContent),
      integration_approach: analyzeIntegrationApproach(pageContent),
      state_management: findStateManagement(pageContent),
      event_handling: findEventHandlers(pageContent)
    };
    integrationPatterns.push(pattern);
  }
  
  return integrationPatterns;
}
```

---

## 📋 **OUTPUT SPECIFICATIONS**

### **Component-Feature Mapping Report**
```json
{
  "timestamp": "2025-09-11T15:30:00Z",
  "agent": "03-component-discovery-agent",
  "component_inventory": {
    "total_components": 847,
    "by_category": {
      "forms": 89,
      "modals": 23,
      "navigation": 34,
      "dashboard": 67,
      "clients": 45,
      "music": 31,
      "journey": 78,
      "analytics": 42
    }
  },
  "issue_mappings": [
    {
      "issue": {
        "id": "preferences-button-broken",
        "page": "/dashboard/music",
        "element": "Preferences button",
        "type": "non_functional_button",
        "severity": "medium"
      },
      "available_components": [
        {
          "component": "PreferencesModal.tsx",
          "path": "/src/components/settings/PreferencesModal.tsx",
          "confidence": 0.95,
          "props": ["isOpen", "onClose", "onSave", "initialSettings"],
          "integration_approach": "modal_trigger"
        },
        {
          "component": "SettingsDropdown.tsx", 
          "path": "/src/components/ui/SettingsDropdown.tsx",
          "confidence": 0.78,
          "props": ["items", "onSelect", "trigger"],
          "integration_approach": "dropdown_trigger"
        }
      ],
      "recommended_solution": {
        "approach": "modal_integration",
        "primary_component": "PreferencesModal.tsx",
        "integration_steps": [
          "Import PreferencesModal component in music page",
          "Add modal state management (useState for isOpen)",
          "Connect Preferences button onClick to setIsOpen(true)", 
          "Pass music-specific settings as props",
          "Handle onSave to persist preferences to backend"
        ],
        "estimated_complexity": "low",
        "estimated_time": "30 minutes"
      }
    },
    {
      "issue": {
        "id": "playlist-builder-placeholder",
        "page": "/dashboard/music",
        "element": "My Playlists tab",
        "type": "placeholder_content",
        "severity": "high"
      },
      "available_components": [
        {
          "component": "PlaylistBuilder.tsx",
          "path": "/src/components/music/PlaylistBuilder.tsx", 
          "confidence": 0.92,
          "props": ["songs", "onSongAdd", "onSongRemove", "onPlaylistSave"],
          "features": ["drag_drop", "search", "categories", "preview"]
        },
        {
          "component": "PlaylistManager.tsx",
          "path": "/src/components/music/PlaylistManager.tsx",
          "confidence": 0.88,
          "props": ["playlists", "onEdit", "onDelete", "onCreate"]
        }
      ],
      "recommended_solution": {
        "approach": "component_replacement",
        "primary_component": "PlaylistBuilder.tsx",
        "secondary_component": "PlaylistManager.tsx",
        "integration_steps": [
          "Replace placeholder div in My Playlists tab",
          "Import both PlaylistBuilder and PlaylistManager",
          "Add playlist state management (usePlaylistStore or API calls)",
          "Implement song search integration with Spotify/Apple APIs",
          "Connect playlist CRUD operations to backend",
          "Add drag-and-drop functionality for playlist building"
        ],
        "estimated_complexity": "high",
        "estimated_time": "4-6 hours"
      }
    }
  ],
  "integration_patterns": [
    {
      "pattern": "modal_integration",
      "examples": ["/dashboard/clients - EditClientModal", "/forms - FormSettingsModal"],
      "approach": "useState + conditional rendering",
      "complexity": "low"
    },
    {
      "pattern": "tab_content_replacement", 
      "examples": ["/analytics - ReportsTab", "/clients - NotesTab"],
      "approach": "component swapping in TabPanel",
      "complexity": "medium"
    }
  ]
}
```

### **Implementation Roadmap**
```json
{
  "roadmap": {
    "quick_wins": [
      {
        "issue": "preferences-button-broken",
        "effort": "30 minutes",
        "impact": "medium",
        "components_ready": true
      },
      {
        "issue": "form-validation-missing",
        "effort": "1 hour", 
        "impact": "high",
        "components_ready": true
      }
    ],
    "medium_effort": [
      {
        "issue": "playlist-builder-placeholder",
        "effort": "4-6 hours",
        "impact": "high", 
        "components_ready": true,
        "backend_work": "API integration needed"
      }
    ],
    "complex_features": [
      {
        "issue": "journey-canvas-broken",
        "effort": "2-3 days",
        "impact": "critical",
        "components_ready": true,
        "complexity": "high - drag-drop state management"
      }
    ]
  },
  "estimated_total_effort": "3-4 weeks",
  "quick_wins_effort": "2-3 days",
  "business_impact_priority": [
    "forms", "client_management", "dashboard", "journey_builder", "analytics"
  ]
}
```

---

## 🔄 **EXECUTION WORKFLOW**

### **Step 1: Load Interactive Audit Results**
- Retrieve comprehensive issue database from Memory MCP
- Filter and prioritize broken features by business impact
- Create systematic analysis queue

### **Step 2: Deep Component Analysis**
- Scan all component directories using Filesystem MCP
- Analyze component exports, props, and integration patterns
- Build comprehensive component capability database

### **Step 3: Intelligent Component Matching**
- Match broken features to available components using pattern analysis
- Calculate confidence scores for each potential match
- Assess integration complexity and estimated effort

### **Step 4: Integration Pattern Discovery**
- Analyze existing successful integrations as templates
- Document proven integration approaches and patterns
- Create reusable integration templates

### **Step 5: Generate Implementation Instructions**
- Create detailed, step-by-step integration guides
- Include code examples and component usage patterns
- Estimate effort and complexity for each fix

---

## 💾 **STATE PERSISTENCE**

### **Component Discovery State**
```json
{
  "agent": "03-component-discovery-agent",
  "status": "completed",
  "progress": {
    "components_analyzed": 847,
    "issues_mapped": 189,
    "patterns_identified": 12,
    "roadmap_generated": true
  },
  "last_updated": "2025-09-11T15:45:00Z"
}
```

---

## 🎯 **SUCCESS CRITERIA**

### **Completion Requirements**
- ✅ All broken features mapped to available components
- ✅ Confidence scores and integration complexity assessed
- ✅ Step-by-step implementation instructions generated  
- ✅ Implementation roadmap with effort estimates created
- ✅ Quick wins identified for immediate impact

### **Quality Gates**
- >90% of issues have component solutions identified
- All high-priority issues have detailed implementation plans
- Integration patterns documented with working examples
- Effort estimates validated against similar past integrations

---

## 🔗 **HANDOFF TO NEXT AGENT**

### **Data Provided to Agent 4 (Issue Classification Agent)**
1. **Component-feature mapping database** - exact solutions for each broken element
2. **Implementation complexity analysis** - effort estimates and technical requirements
3. **Priority matrix** - business impact vs implementation difficulty
4. **Quick wins list** - immediate fixes for maximum impact

---

## 🚀 **DEPLOYMENT INSTRUCTIONS**

```bash
# Execute Component Discovery Agent
echo "🧩 ACTIVATING COMPONENT DISCOVERY AGENT"
echo "Agent ID: 03-component-discovery-agent"
echo "MCP Servers Required: filesystem, memory, ref"
echo "Starting component-feature mapping..."

# Agent will automatically:
# 1. Load Interactive Audit results via Memory MCP
# 2. Analyze all components via Filesystem MCP
# 3. Map components to broken features intelligently
# 4. Generate detailed implementation instructions
# 5. Create implementation roadmap with effort estimates
# 6. Save mapping database via Memory MCP
```

**The Component Discovery Agent will provide precise instructions for connecting existing components to broken functionality, turning scattered pieces into working features.**