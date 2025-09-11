# 🔍 Complete Verification Check with Advanced Playwright MCP

Think ultra hard about potential issues, then run complete verification suite for WedSync using ALL Playwright MCP features:

## Build & Type Checking
```bash
cd wedsync
npm run build
npm run typecheck
npm run lint
```

## Test Suite
```bash
npm run test:coverage
npm run test:integration
npm run test:e2e
```

## Security Scan
```bash
npm run security:scan
npm audit
```

## Performance Check
```bash
# Start dev server and measure
npm run dev &
sleep 5
curl -w "@-" -o /dev/null -s "http://localhost:3000" <<'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF
kill %1
```

## Advanced Playwright MCP Testing
```javascript
// Complete Quality Gate with Playwright MCP

// 1. Navigate and capture initial state
mcp__playwright__browser_navigate({url: "http://localhost:3000"})
const beforeSnapshot = mcp__playwright__browser_snapshot()

// 2. Check for console errors
const consoleMessages = mcp__playwright__browser_console_messages()
const errors = consoleMessages.filter(m => m.type === 'error')
console.log(`Console errors found: ${errors.length}`)

// 3. Monitor network for failures
const networkRequests = mcp__playwright__browser_network_requests()
const failedRequests = networkRequests.filter(r => r.status >= 400)
console.log(`Failed API calls: ${failedRequests.length}`)

// 4. Measure real performance
const metrics = mcp__playwright__browser_evaluate({
  function: `() => ({
    LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
    FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
    TTFB: performance.timing.responseStart - performance.timing.fetchStart,
    loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
    memoryUsed: performance.memory?.usedJSHeapSize / 1048576 // MB
  })`
})
console.log(`Load time: ${metrics.loadTime}ms`)

// 5. Test multi-viewport responsiveness
const viewports = [{width: 375, height: 812}, {width: 768, height: 1024}, {width: 1920, height: 1080}]
for (const vp of viewports) {
  mcp__playwright__browser_resize(vp)
  mcp__playwright__browser_take_screenshot({filename: `responsive-${vp.width}.png`})
}

// 6. Test multi-tab workflow
mcp__playwright__browser_tab_new({url: "http://localhost:3000/forms"})
mcp__playwright__browser_tab_new({url: "http://localhost:3000/dashboard"})
const tabs = mcp__playwright__browser_tab_list()
console.log(`Open tabs: ${tabs.length}`)
```

## Generate Evidence Package
```bash
mkdir -p SESSION-LOGS/$(date +%Y-%m-%d)/verification-evidence
cp coverage/lcov-report/index.html SESSION-LOGS/$(date +%Y-%m-%d)/verification-evidence/coverage.html
cp playwright-report/index.html SESSION-LOGS/$(date +%Y-%m-%d)/verification-evidence/playwright.html
ls -la SESSION-LOGS/$(date +%Y-%m-%d)/verification-evidence/
```

Report all findings with screenshots and metrics!