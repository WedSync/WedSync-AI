# TEAM D - ROUND 1: WS-156 - Task Creation System - WedMe Mobile & Couple Experience

**Date:** 2025-01-25  
**Feature ID:** WS-156 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build the couple-focused task creation experience with mobile optimization and intuitive design  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple preparing for their big day
**I want to:** Create detailed tasks for my wedding helpers with specific timing, locations, and instructions
**So that:** My helpers know exactly what to do, when to do it, and where to be, eliminating confusion and ensuring smooth execution

**Real Wedding Problem This Solves:**
A couple typically creates a "day-of timeline" in a Word document that gets lost or outdated. With this feature, they create tasks like "Set up ceremony chairs (2pm-2:30pm at Garden Pavilion, need 100 white chairs from storage)" that get assigned to specific helpers. This eliminates the chaos of people asking "what should I be doing now?" throughout the wedding day.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Mobile-first task creation interface optimized for couples on-the-go
- Touch-optimized drag-and-drop task reordering
- Wedding-specific task templates tailored to couple preferences
- Photo attachment capture using device camera
- Offline task creation with sync when connection restored
- Intuitive timeline visualization for non-technical users

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Mobile: PWA features, touch optimization, responsive design

**Integration Points:**
- PWA Configuration: Offline-first task management
- Camera API: Photo attachment capture
- Touch Events: Gesture-based task management
- Wedding Data: Venue, guest list, vendor integration
- Local Storage: Offline task persistence

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");  // Get correct library ID first
await mcp__context7__get-library-docs("/vercel/next.js", "pwa service-worker", 5000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "mobile-responsive touch", 3000);
await mcp__context7__get-library-docs("/web-apis/web-apis", "camera-api file-api", 2000);
await mcp__context7__get-library-docs("/react/react", "touch-events gestures", 3000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("TouchInput", "", true);
await mcp__serena__get_symbols_overview("/src/components/touch");
await mcp__serena__get_symbols_overview("/src/hooks/useWeddingDayOffline.ts");
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (PWA/Mobile APIs change frequently!)
- Serena shows existing patterns to follow (touch interaction patterns!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Track mobile task creation development"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Build touch-optimized task interfaces"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "Create PWA-enabled task pages" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --mobile-testing
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant files first
- Understand existing patterns and conventions
- Check integration points
- Review similar implementations
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan
- Write test cases FIRST (TDD)
- Plan error handling
- Consider edge cases
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing patterns
- Use Context7 examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright
- Create evidence package
- Generate reports
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Mobile-optimized task creation form with touch interactions
- [ ] Wedding-specific task template gallery for couples
- [ ] Photo attachment capture using device camera API
- [ ] Touch-based drag-and-drop task reordering
- [ ] Offline task creation with local storage persistence
- [ ] PWA manifest and service worker for task management
- [ ] Unit tests with >80% coverage
- [ ] Basic mobile testing across device sizes

### Round 2 (Enhancement & Polish):
- [ ] Advanced gesture support (swipe to delete, pinch to zoom timeline)
- [ ] Wedding timeline visualization with couple-friendly design
- [ ] Smart suggestions based on wedding type and date
- [ ] Batch photo upload and attachment management
- [ ] Offline sync conflict resolution

### Round 3 (Integration & Finalization):
- [ ] Full integration with helper assignment workflow
- [ ] Complete offline/online sync testing
- [ ] Cross-device testing and validation
- [ ] Performance optimization for older mobile devices
- [ ] App store preparation and PWA distribution

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Task component interfaces - Required for mobile adaptation
- FROM Team B: Offline-compatible API contracts - Dependency for PWA functionality

### What other teams NEED from you:
- TO Team A: Mobile touch interaction patterns - They need this for responsive adaptation
- TO Team C: PWA service worker interfaces - Blocking their offline integration
- TO Team E: Mobile component exports - Dependency for helper mobile experience

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MAJOR DISCOVERY:** Dev teams have been creating API routes with ZERO security validation. 305+ unprotected endpoints were found. This MUST stop immediately.

### MANDATORY SECURITY IMPLEMENTATION FOR MOBILE/PWA

**EVERY mobile feature MUST implement these security measures:**

```typescript
// ❌ NEVER DO THIS (FOUND IN MOBILE COMPONENTS):
const uploadPhoto = async (photo: File) => {
  const formData = new FormData();
  formData.append('photo', photo); // NO VALIDATION!
  const response = await fetch('/api/photos/upload', {
    method: 'POST',
    body: formData // NO SIZE/TYPE CHECKS!
  });
  return response.json();
};

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { validateFileUpload } from '@/lib/validation/file-validation';
import { sanitizeFileName } from '@/lib/security/input-validation';

const uploadPhoto = async (photo: File): Promise<UploadResult> => {
  // Validate file before upload
  const validation = validateFileUpload(photo, {
    maxSize: 10 * 1024 * 1024, // 10MB max
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxDimensions: { width: 4096, height: 4096 }
  });
  
  if (!validation.valid) {
    throw new ValidationError(`File validation failed: ${validation.errors.join(', ')}`);
  }
  
  // Sanitize filename
  const safeName = sanitizeFileName(photo.name);
  
  // Create secure upload with proper headers
  const formData = new FormData();
  formData.append('photo', photo, safeName);
  formData.append('task_id', taskId);
  formData.append('csrf_token', await getCSRFToken());
  
  const response = await fetch('/api/photos/upload', {
    method: 'POST',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Client-Type': 'mobile-pwa'
    },
    body: formData
  });
  
  if (!response.ok) {
    throw new UploadError(`Upload failed: ${response.status}`);
  }
  
  return response.json();
};
```

### SECURITY CHECKLIST FOR MOBILE FEATURES

Teams MUST implement ALL of these for mobile/PWA features:

- [ ] **File Upload Security**: Validate all photo uploads with size, type, and content checks
- [ ] **Touch Input Validation**: Sanitize all touch-based input data
- [ ] **Offline Data Security**: Encrypt sensitive data in local storage
- [ ] **PWA Manifest Security**: Secure service worker with proper scope
- [ ] **Camera API Security**: Request permissions properly and handle denials
- [ ] **Gesture Security**: Prevent gesture-based attacks (rapid taps, etc.)
- [ ] **Device Storage Limits**: Handle storage quota exceeded gracefully
- [ ] **Cross-Origin Security**: Proper CORS headers for PWA requests

### SPECIFIC SECURITY PATTERNS FOR MOBILE

```typescript
// Secure Offline Storage Pattern
class SecureOfflineStorage {
  private async encryptTaskData(taskData: any): Promise<string> {
    const key = await this.getOrCreateEncryptionKey();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) },
      key,
      new TextEncoder().encode(JSON.stringify(taskData))
    );
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }
  
  async storeTaskOffline(task: WeddingTask): Promise<void> {
    try {
      const encryptedData = await this.encryptTaskData({
        ...task,
        // Remove sensitive fields from offline storage
        couple_id: undefined,
        internal_notes: undefined
      });
      
      localStorage.setItem(`task_${task.id}`, encryptedData);
      localStorage.setItem(`task_${task.id}_timestamp`, Date.now().toString());
    } catch (error) {
      console.error('Failed to store task offline:', error);
      throw new StorageError('Unable to save task offline');
    }
  }
}

// Camera API Security Pattern
class SecurePhotoCapture {
  async capturePhoto(): Promise<File | null> {
    try {
      // Request camera permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer rear camera
      });
      
      // Create secure canvas for photo capture
      const video = document.createElement('video');
      video.srcObject = stream;
      
      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          // Set reasonable resolution limits
          canvas.width = Math.min(video.videoWidth, 2048);
          canvas.height = Math.min(video.videoHeight, 2048);
          
          context?.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Clean up stream
          stream.getTracks().forEach(track => track.stop());
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], `task-photo-${Date.now()}.jpg`, {
                type: 'image/jpeg'
              }));
            } else {
              resolve(null);
            }
          }, 'image/jpeg', 0.85);
        };
      });
    } catch (error) {
      console.error('Camera access denied:', error);
      return null;
    }
  }
}
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 MOBILE-FIRST VALIDATION (Beyond Desktop Testing!):**

```javascript
// REVOLUTIONARY MOBILE TESTING APPROACH!

// 1. MULTI-DEVICE RESPONSIVE TESTING
test('Task creation across all mobile breakpoints', async () => {
  const devices = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Samsung Galaxy S21', width: 360, height: 800 }
  ];
  
  for (const device of devices) {
    await mcp__playwright__browser_resize({
      width: device.width, 
      height: device.height
    });
    
    await mcp__playwright__browser_navigate({url: 'http://localhost:3000/tasks'});
    await mcp__playwright__browser_snapshot();
    
    // Test touch interactions
    await mcp__playwright__browser_click({
      element: 'Create task button',
      ref: 'button[data-testid="mobile-create-task"]'
    });
    
    // Test form filling on mobile
    await mcp__playwright__browser_type({
      element: 'Task title input',
      ref: 'input[name="title"]',
      text: `Mobile task test ${device.name}`,
      slowly: true // Simulate mobile typing
    });
    
    // Verify mobile-optimized form layout
    await mcp__playwright__browser_wait_for({
      text: 'Task created successfully'
    });
    
    await mcp__playwright__browser_take_screenshot({
      filename: `task-creation-${device.name.toLowerCase().replace(' ', '-')}.png`
    });
  }
});

// 2. TOUCH GESTURE TESTING
test('Drag and drop task reordering with touch', async () => {
  await mcp__playwright__browser_resize({width: 375, height: 667}); // Mobile size
  await mcp__playwright__browser_navigate({url: 'http://localhost:3000/tasks'});
  
  // Create multiple tasks first
  for (let i = 1; i <= 3; i++) {
    await mcp__playwright__browser_click({
      element: 'Create task button',
      ref: 'button[data-testid="create-task"]'
    });
    
    await mcp__playwright__browser_type({
      element: 'Task title input',
      ref: 'input[name="title"]',
      text: `Task ${i}`
    });
    
    await mcp__playwright__browser_click({
      element: 'Save task button',
      ref: 'button[type="submit"]'
    });
  }
  
  // Test drag and drop reordering
  await mcp__playwright__browser_drag({
    startElement: 'First task',
    startRef: '[data-testid="task-1"]',
    endElement: 'Third task position',
    endRef: '[data-testid="task-drop-zone-3"]'
  });
  
  // Verify task order changed
  await mcp__playwright__browser_wait_for({
    text: 'Task order updated'
  });
  
  await mcp__playwright__browser_snapshot();
});

// 3. OFFLINE FUNCTIONALITY TESTING
test('Offline task creation and sync', async () => {
  await mcp__playwright__browser_navigate({url: 'http://localhost:3000/tasks'});
  
  // Simulate going offline
  await mcp__playwright__browser_evaluate({
    function: `() => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      window.dispatchEvent(new Event('offline'));
    }`
  });
  
  // Verify offline indicator appears
  await mcp__playwright__browser_wait_for({
    text: 'Working offline'
  });
  
  // Create task while offline
  await mcp__playwright__browser_click({
    element: 'Create task button',
    ref: 'button[data-testid="create-task"]'
  });
  
  await mcp__playwright__browser_type({
    element: 'Task title input',
    ref: 'input[name="title"]',
    text: 'Offline task test'
  });
  
  await mcp__playwright__browser_click({
    element: 'Save task button',
    ref: 'button[type="submit"]'
  });
  
  // Verify task saved locally
  await mcp__playwright__browser_wait_for({
    text: 'Task saved offline - will sync when online'
  });
  
  // Simulate coming back online
  await mcp__playwright__browser_evaluate({
    function: `() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      window.dispatchEvent(new Event('online'));
    }`
  });
  
  // Verify sync occurs
  await mcp__playwright__browser_wait_for({
    text: 'Tasks synced successfully'
  });
  
  await mcp__playwright__browser_snapshot();
});

// 4. PHOTO CAPTURE SIMULATION TESTING
test('Photo attachment workflow', async () => {
  await mcp__playwright__browser_navigate({url: 'http://localhost:3000/tasks'});
  
  // Mock camera API
  await mcp__playwright__browser_evaluate({
    function: `() => {
      // Mock getUserMedia for camera testing
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const stream = canvas.captureStream();
        return stream;
      };
    }`
  });
  
  await mcp__playwright__browser_click({
    element: 'Add photo button',
    ref: 'button[data-testid="add-photo"]'
  });
  
  await mcp__playwright__browser_click({
    element: 'Take photo option',
    ref: 'button[data-testid="take-photo"]'
  });
  
  // Simulate photo capture
  await mcp__playwright__browser_wait_for({
    text: 'Photo captured'
  });
  
  await mcp__playwright__browser_click({
    element: 'Use photo button',
    ref: 'button[data-testid="use-photo"]'
  });
  
  // Verify photo attachment
  await mcp__playwright__browser_wait_for({
    text: 'Photo attached to task'
  });
  
  await mcp__playwright__browser_snapshot();
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Responsive design across all mobile breakpoints (375px to 1024px)
- [ ] Touch gesture interactions (tap, drag, swipe)
- [ ] Offline functionality and sync resolution
- [ ] Photo capture and attachment workflows
- [ ] PWA installation and behavior
- [ ] Performance on mobile devices (low-power CPUs)
- [ ] Accessibility with screen readers and voice control

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for this round complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Mobile testing validating touch interactions
- [ ] Zero TypeScript errors
- [ ] Zero console errors on mobile devices

### Mobile & Performance:
- [ ] Touch interactions working smoothly (no lag)
- [ ] Performance targets met (<3s page load on 3G, <1s on WiFi)
- [ ] Offline functionality working reliably
- [ ] PWA features functional (install, offline, etc.)
- [ ] Works on all mobile breakpoints (375px to 1024px)

### Evidence Package Required:
- [ ] Screenshots across multiple device sizes
- [ ] Touch interaction test results
- [ ] Offline/online sync validation
- [ ] Performance metrics on mobile devices
- [ ] PWA functionality proof

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Mobile Components: `/wedsync/src/components/tasks/mobile/`
- PWA Config: `/wedsync/public/manifest.json`, `/wedsync/src/app/sw.js`
- Touch Interactions: `/wedsync/src/components/touch/`
- Offline Logic: `/wedsync/src/hooks/useWeddingDayOffline.ts`
- Tests: `/wedsync/tests/mobile/tasks/`

### ⚠️ DATABASE MIGRATIONS:
- CREATE migration files if needed in /wedsync/supabase/migrations/
- DO NOT run migrations yourself
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-156.md
- SQL Expert will handle application and conflict resolution

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch16/WS-156-team-d-round-1-complete.md`
- **Include:** Feature ID (WS-156) AND team identifier in all filenames
- **Save in:** Correct batch folder (batch16)
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-156 | ROUND_1_COMPLETE | team-d | batch16" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

Use the standard team output template in `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md`
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch16/WS-156-team-d-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Tests written and passing
- [ ] Security validated
- [ ] Dependencies provided
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY