# 🌐 Browser MCP Usage Examples & Patterns
## Complete Guide for Development Teams A-E

**Browser MCP vs Playwright MCP:**
- **Browser MCP**: Interactive, visual, real-time testing during development
- **Playwright MCP**: Automated, programmatic, CI/CD testing
- **Use Both**: Browser MCP for exploration, Playwright MCP for automation

---

## 📋 Quick Reference: When to Use Browser MCP

**✅ Use Browser MCP For:**
- Real-time feedback during feature development
- Interactive UI debugging and exploration
- Manual form testing and validation
- Screenshot documentation for features
- Responsive design testing across viewports
- Accessibility testing with keyboard navigation
- User flow validation during development
- Visual confirmation of styling changes

**❌ Don't Use Browser MCP For:**
- Automated CI/CD testing (use Playwright MCP)
- Headless testing scenarios
- Performance benchmarking (use Playwright MCP)
- Bulk regression testing
- Load testing scenarios

---

## 🎯 Core Browser MCP Patterns

### Pattern 1: Feature Development Testing
```javascript
// MANDATORY: Start every feature development with Browser MCP validation

// 1. Navigate to your feature
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard/your-feature"});

// 2. Take accessibility snapshot for LLM analysis
const accessibilityTree = await mcp__playwright__browser_snapshot();
// This returns structured data that can be analyzed for UX issues

// 3. Interactive form testing
await mcp__playwright__browser_fill_form({
  fields: [
    {name: "Wedding Venue", type: "textbox", ref: "input[name='venue']", value: "Grand Hotel Ballroom"},
    {name: "Priority Level", type: "combobox", ref: "select[name='priority']", value: "High"},
    {name: "Requires Photo Evidence", type: "checkbox", ref: "input[name='photo']", value: "true"}
  ]
});

// 4. Capture development state
await mcp__playwright__browser_take_screenshot({filename: "feature-development-state.png"});

// 5. Verify real-time updates
await mcp__playwright__browser_wait_for({text: "Wedding task created successfully"});
```

### Pattern 2: Responsive Design Validation
```javascript
// MANDATORY: Test all wedding supplier interfaces on mobile first

const weddingViewports = [
  {width: 375, height: 667, name: "iPhone_SE", description: "Minimum mobile size"},
  {width: 414, height: 896, name: "iPhone_Pro", description: "Common iPhone size"},
  {width: 768, height: 1024, name: "iPad", description: "Tablet portrait"},
  {width: 1920, height: 1080, name: "Desktop", description: "Desktop standard"}
];

for (const viewport of weddingViewports) {
  console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height}) - ${viewport.description}`);
  
  await mcp__playwright__browser_resize({width: viewport.width, height: viewport.height});
  
  // Test navigation on each viewport
  if (viewport.width < 768) {
    // Mobile: Test hamburger menu
    await mcp__playwright__browser_click({element: "Mobile Menu", ref: "button[aria-label='Menu']"});
    await mcp__playwright__browser_wait_for({text: "Dashboard"});
  }
  
  // Capture viewport state
  await mcp__playwright__browser_take_screenshot({
    filename: `${viewport.name}-${viewport.width}px-feature.png`,
    fullPage: false
  });
  
  // Test touch targets on mobile
  if (viewport.width < 768) {
    const touchElements = await mcp__playwright__browser_evaluate({
      function: `() => {
        const buttons = document.querySelectorAll('button, a, [role="button"]');
        return Array.from(buttons).slice(0, 5).map(btn => {
          const rect = btn.getBoundingClientRect();
          return {
            text: btn.textContent?.slice(0, 20) || 'No text',
            width: rect.width,
            height: rect.height,
            touchFriendly: rect.width >= 44 && rect.height >= 44
          };
        });
      }`
    });
    
    console.log("Touch target validation:", touchElements);
  }
}
```

### Pattern 3: Wedding-Specific User Flows
```javascript
// Test actual wedding coordinator workflow

// 1. Supplier logs in and views wedding dashboard
await mcp__playwright__browser_navigate({url: "http://localhost:3000/login"});
await mcp__playwright__browser_fill_form({
  fields: [
    {name: "Email", type: "textbox", ref: "input[name='email']", value: "photographer@weddingco.com"},
    {name: "Password", type: "textbox", ref: "input[name='password']", value: "testpass123"}
  ]
});
await mcp__playwright__browser_click({element: "Login Button", ref: "button[type='submit']"});

// 2. Navigate to specific wedding
await mcp__playwright__browser_wait_for({text: "Dashboard"});
await mcp__playwright__browser_click({element: "Sarah & James Wedding", ref: "[data-wedding-id='12345']"});

// 3. Test task management workflow
await mcp__playwright__browser_click({element: "Add Task", ref: "button[data-action='add-task']"});
await mcp__playwright__browser_fill_form({
  fields: [
    {name: "Task Name", type: "textbox", ref: "input[name='taskName']", value: "Venue final walkthrough"},
    {name: "Assigned To", type: "combobox", ref: "select[name='assignee']", value: "Wedding Planner"},
    {name: "Due Date", type: "textbox", ref: "input[name='dueDate']", value: "2025-06-15"},
    {name: "Priority", type: "combobox", ref: "select[name='priority']", value: "High"}
  ]
});

// 4. Test drag and drop task organization
await mcp__playwright__browser_drag({
  startElement: "New Task", startRef: "[data-task-id='new-task-123']",
  endElement: "In Progress Column", endRef: "[data-status='in-progress']"
});

// 5. Verify real-time updates
await mcp__playwright__browser_wait_for({text: "Task moved to In Progress"});
await mcp__playwright__browser_take_screenshot({filename: "task-workflow-complete.png"});
```

### Pattern 4: Accessibility Testing
```javascript
// MANDATORY: Wedding platforms must be accessible (couples with disabilities)

// 1. Keyboard navigation testing
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedding/timeline"});

// Test tab navigation through wedding timeline
const tabSequence = [];
for (let i = 0; i < 10; i++) {
  await mcp__playwright__browser_press_key({key: "Tab"});
  
  const focusedElement = await mcp__playwright__browser_evaluate({
    function: `() => {
      const focused = document.activeElement;
      return {
        tagName: focused.tagName,
        text: focused.textContent?.slice(0, 30) || '',
        ariaLabel: focused.getAttribute('aria-label') || '',
        role: focused.getAttribute('role') || focused.tagName.toLowerCase()
      };
    }`
  });
  
  tabSequence.push(focusedElement);
  console.log(`Tab ${i + 1}:`, focusedElement);
}

// 2. Test Enter key functionality
await mcp__playwright__browser_press_key({key: "Enter"});
await mcp__playwright__browser_wait_for({text: "Timeline event expanded"});

// 3. Test Escape key functionality  
await mcp__playwright__browser_press_key({key: "Escape"});
await mcp__playwright__browser_wait_for({text: "Modal closed"});

// 4. Color contrast validation
const contrastResults = await mcp__playwright__browser_evaluate({
  function: `() => {
    const elements = document.querySelectorAll('button, a, input, [role="button"]');
    return Array.from(elements).slice(0, 10).map(el => {
      const styles = getComputedStyle(el);
      return {
        element: el.tagName + (el.textContent ? ': ' + el.textContent.slice(0, 20) : ''),
        color: styles.color,
        backgroundColor: styles.backgroundColor,
        fontSize: styles.fontSize
      };
    });
  }`
});

console.log("Color contrast check:", contrastResults);
```

### Pattern 5: Error Handling Validation
```javascript
// Test wedding-critical error scenarios

// 1. Network failure simulation
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedding/photos"});

// 2. Test large file upload (wedding photos are often large)
const testPhotoPath = "/path/to/large-wedding-photo.jpg"; // 10MB+ test file
await mcp__playwright__browser_file_upload({paths: [testPhotoPath]});

// 3. Monitor upload progress
const uploadProgress = await mcp__playwright__browser_evaluate({
  function: `() => {
    const progressBar = document.querySelector('[data-upload-progress]');
    return {
      visible: !!progressBar,
      percentage: progressBar?.getAttribute('aria-valuenow') || 'N/A',
      text: progressBar?.textContent || 'No progress text'
    };
  }`
});

console.log("Upload progress:", uploadProgress);

// 4. Test error message display
await mcp__playwright__browser_wait_for({text: "File too large"});
await mcp__playwright__browser_take_screenshot({filename: "error-handling-validation.png"});

// 5. Verify graceful degradation
const errorState = await mcp__playwright__browser_evaluate({
  function: `() => {
    const errorMsg = document.querySelector('.error-message');
    const retryBtn = document.querySelector('[data-action="retry"]');
    return {
      errorVisible: !!errorMsg,
      errorText: errorMsg?.textContent || '',
      retryAvailable: !!retryBtn,
      userCanRecover: !!retryBtn && !!errorMsg
    };
  }`
});

console.log("Error recovery options:", errorState);
```

### Pattern 6: Multi-Tab Wedding Coordination Testing
```javascript
// Test multi-user wedding coordination scenarios

// 1. Simulate photographer and wedding planner coordination
await mcp__playwright__browser_tabs({action: "new"});
await mcp__playwright__browser_navigate({url: "http://localhost:3000/login"});

// Tab 1: Photographer view
await mcp__playwright__browser_tabs({action: "select", index: 0});
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedding/12345/timeline"});
await mcp__playwright__browser_click({element: "Mark Photo Session Complete", ref: "[data-task='photo-session']"});

// Tab 2: Wedding planner view  
await mcp__playwright__browser_tabs({action: "select", index: 1});
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedding/12345/dashboard"});

// Verify real-time sync between users
await mcp__playwright__browser_wait_for({text: "Photo session completed"});
await mcp__playwright__browser_take_screenshot({filename: "multi-user-sync.png"});

// Test coordination conflict resolution
await mcp__playwright__browser_tabs({action: "select", index: 0});
await mcp__playwright__browser_click({element: "Edit Timeline", ref: "[data-action='edit-timeline']"});

await mcp__playwright__browser_tabs({action: "select", index: 1});
await mcp__playwright__browser_click({element: "Edit Timeline", ref: "[data-action='edit-timeline']"});

// Should show conflict resolution UI
await mcp__playwright__browser_wait_for({text: "Another user is editing"});
```

---

## 📊 Browser MCP Success Metrics

### Development Testing Checklist
- [ ] Feature tested interactively before code commit
- [ ] Screenshots captured at major development milestones
- [ ] Console errors identified and resolved
- [ ] Network requests verified and optimized
- [ ] Accessibility tree analyzed for UX issues

### Responsive Design Validation
- [ ] All four viewport sizes tested (iPhone SE, iPhone Pro, iPad, Desktop)
- [ ] Touch targets verified on mobile (≥44x44px)
- [ ] Navigation tested at each breakpoint
- [ ] Screenshots documented for each viewport

### Wedding UX Validation
- [ ] Complete wedding coordinator workflows tested
- [ ] Multi-user coordination scenarios validated
- [ ] Photo upload and management tested
- [ ] Timeline and task management verified
- [ ] Error states and recovery tested

### Evidence Requirements
- **Screenshots**: Minimum 5 per feature showing different states
- **Console Log**: No errors in final development testing
- **Network Log**: All API calls successful and optimized
- **Accessibility Report**: Keyboard navigation and screen reader compatibility

---

## 🚨 Wedding Industry Critical Testing

### Saturday Wedding Protection
```javascript
// NEVER test on production on Saturdays (wedding day!)
const today = new Date();
if (today.getDay() === 6) { // Saturday
  console.log("🚨 SATURDAY DETECTED - Wedding day! No production testing!");
  process.exit(1);
}
```

### Mobile-First Wedding Scenarios
```javascript
// 60% of wedding suppliers use mobile phones
const weddingMobileScenarios = [
  {
    scenario: "Venue coordinator checking timeline on wedding morning",
    viewport: {width: 375, height: 667},
    tasks: ["Check vendor arrival times", "Update timeline", "Send notifications"]
  },
  {
    scenario: "Photographer uploading photos during reception",
    viewport: {width: 414, height: 896},
    tasks: ["Upload photos", "Tag photos", "Share with couple"]
  },
  {
    scenario: "Wedding planner managing timeline changes",
    viewport: {width: 768, height: 1024},
    tasks: ["Drag timeline events", "Notify all vendors", "Update schedules"]
  }
];
```

### Offline Wedding Venue Testing
```javascript
// Test functionality with poor network (common at wedding venues)
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Simulate poor network conditions
    if ('connection' in navigator) {
      // Test with slow 3G simulation
      console.log('Testing offline capability...');
    }
  }`
});
```

---

**Remember: Browser MCP is for development, Playwright MCP is for automation. Use both for comprehensive wedding platform testing!**