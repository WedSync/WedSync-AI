# 🔍 SONARLINT IDE CONFIGURATION GUIDE
## Complete Setup for Cursor and Windsurf Extensions

**Date**: September 4, 2025  
**SonarQube Version**: 25.9.0.112764  
**Project**: WedSync Wedding Platform  
**Token**: wedsync-lint (squ_ec3f122f113ca55975dbb342ad5cffbd59a82cd0)  

---

## 🎯 CURSOR SONARLINT CONFIGURATION

### **Extension Installation**
1. Open Cursor
2. Go to Extensions (Cmd+Shift+X)
3. Search for "SonarLint"
4. Install **SonarLint** by SonarSource

### **Settings Configuration**
Open Cursor Settings (Cmd+,) and configure:

#### **1. Connected Mode Settings**
```json
{
  "sonarlint.connectedMode.connections.sonarqube": [
    {
      "serverUrl": "http://localhost:9000",
      "connectionId": "wedsync-local"
    }
  ],
  "sonarlint.connectedMode.project": {
    "connectionId": "wedsync-local",
    "projectKey": "wedsync-wedding-platform"
  }
}
```

#### **2. Test File Pattern**
```json
{
  "sonarlint.testFilePattern": "**/test/**,**/*test*,**/*Test*,**/__tests__/**,**/*.spec.*,**/*.test.*"
}
```

#### **3. Analysis Excludes (Standalone Mode)**
```json
{
  "sonarlint.analysisExcludesStandalone": "**/node_modules/**,**/.next/**,**/build/**,**/dist/**,**/.serena/**,**/.claude/**,**/.git/**,**/.vscode/**,WORKFLOW-V2-DRAFT/**,**/INBOX/**,**/coverage/**,**/playwright-report/**,public/**,docs/**,supabase/migrations/**"
}
```

#### **4. Advanced Wedding Platform Settings**
```json
{
  "sonarlint.rules": {
    "javascript:S1854": "off",
    "javascript:S109": "info",
    "typescript:S1854": "off",
    "typescript:S109": "info"
  },
  "sonarlint.output.showAnalyzerLogs": false,
  "sonarlint.output.showVerboseLogs": false,
  "sonarlint.disableTelemetry": true
}
```

### **Complete Cursor settings.json**
```json
{
  // SonarLint Configuration for WedSync Wedding Platform
  "sonarlint.connectedMode.connections.sonarqube": [
    {
      "serverUrl": "http://localhost:9000",
      "connectionId": "wedsync-local",
      "token": "squ_ec3f122f113ca55975dbb342ad5cffbd59a82cd0"
    }
  ],
  "sonarlint.connectedMode.project": {
    "connectionId": "wedsync-local",
    "projectKey": "wedsync-wedding-platform"
  },
  "sonarlint.testFilePattern": "**/test/**,**/*test*,**/*Test*,**/__tests__/**,**/*.spec.*,**/*.test.*",
  "sonarlint.analysisExcludesStandalone": "**/node_modules/**,**/.next/**,**/build/**,**/dist/**,**/.serena/**,**/.claude/**,**/.git/**,**/.vscode/**,WORKFLOW-V2-DRAFT/**,**/INBOX/**,**/coverage/**,**/playwright-report/**,public/**,docs/**,supabase/migrations/**",
  "sonarlint.rules": {
    "javascript:S1854": "off",
    "javascript:S109": "info",
    "typescript:S1854": "off", 
    "typescript:S109": "info"
  },
  "sonarlint.output.showAnalyzerLogs": false,
  "sonarlint.output.showVerboseLogs": false,
  "sonarlint.disableTelemetry": true
}
```

---

## 🎯 WINDSURF SONARLINT CONFIGURATION

### **Extension Installation**
1. Open Windsurf
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "SonarLint"
4. Install **SonarLint** by SonarSource

### **Settings Configuration**
Open Windsurf Settings and configure the same values as Cursor:

#### **Method 1: Via Settings UI**
1. Open Settings (Ctrl+, / Cmd+,)
2. Search for "sonarlint"
3. Configure each setting individually:

**Sonarlint: Test File Pattern**
```
**/test/**,**/*test*,**/*Test*,**/__tests__/**,**/*.spec.*,**/*.test.*
```

**Sonarlint: Analysis Excludes Standalone**
```
**/node_modules/**,**/.next/**,**/build/**,**/dist/**,**/.serena/**,**/.claude/**,**/.git/**,**/.vscode/**,WORKFLOW-V2-DRAFT/**,**/INBOX/**,**/coverage/**,**/playwright-report/**,public/**,docs/**,supabase/migrations/**
```

#### **Method 2: Via settings.json**
Use the same JSON configuration as Cursor above.

---

## 🔧 WORKSPACE-SPECIFIC CONFIGURATION

### **VS Code Workspace Settings**
Create `.vscode/settings.json` in the WedSync root:

```json
{
  "sonarlint.connectedMode.connections.sonarqube": [
    {
      "serverUrl": "http://localhost:9000",
      "connectionId": "wedsync-local",
      "token": "squ_ec3f122f113ca55975dbb342ad5cffbd59a82cd0"
    }
  ],
  "sonarlint.connectedMode.project": {
    "connectionId": "wedsync-local",
    "projectKey": "wedsync-wedding-platform"
  },
  "sonarlint.testFilePattern": "**/test/**,**/*test*,**/*Test*,**/__tests__/**,**/*.spec.*,**/*.test.*",
  "sonarlint.analysisExcludesStandalone": "**/node_modules/**,**/.next/**,**/build/**,**/dist/**,**/.serena/**,**/.claude/**,**/.git/**,**/.vscode/**,WORKFLOW-V2-DRAFT/**,**/INBOX/**,**/coverage/**,**/playwright-report/**,public/**,docs/**,supabase/migrations/**",
  "sonarlint.rules": {
    "javascript:S1854": "off",
    "javascript:S109": "info",
    "typescript:S1854": "off",
    "typescript:S109": "info"
  }
}
```

---

## 🚀 VERIFICATION & TESTING

### **Connection Test Commands**
Run these in terminal to verify setup:

```bash
# 1. Test SonarQube server connection
curl -s -u "squ_ec3f122f113ca55975dbb342ad5cffbd59a82cd0:" \
  http://localhost:9000/api/authentication/validate

# 2. Verify project exists
curl -s -u "squ_ec3f122f113ca55975dbb342ad5cffbd59a82cd0:" \
  "http://localhost:9000/api/projects/search?projects=wedsync-wedding-platform"

# 3. Check quality profile
curl -s -u "squ_ec3f122f113ca55975dbb342ad5cffbd59a82cd0:" \
  "http://localhost:9000/api/qualityprofiles/search?project=wedsync-wedding-platform"
```

### **IDE Verification Steps**
1. **Restart IDEs** after configuration
2. **Open a TypeScript file** in `wedsync/src/`
3. **Check for SonarLint issues** in the Problems panel
4. **Verify connected mode** - should show "Connected to SonarQube"
5. **Test rule detection** - create a simple unused variable

---

## 🎯 WEDDING PLATFORM SPECIFIC RULES

### **Disabled Rules (Wedding Industry Specific)**
These rules are disabled for wedding platform development:

```json
{
  "sonarlint.rules": {
    // Unused variables - common in wedding event handlers
    "javascript:S1854": "off",
    "typescript:S1854": "off",
    
    // Magic numbers - wedding dates and prices are OK
    "javascript:S109": "info", 
    "typescript:S109": "info",
    
    // Line length - wedding descriptions can be long
    "javascript:S103": "warn",
    "typescript:S103": "warn",
    
    // Console logs - useful for wedding day debugging
    "javascript:S2228": "info",
    "typescript:S2228": "info"
  }
}
```

### **Enhanced Rules (Security Critical)**
```json
{
  "sonarlint.rules": {
    // Payment processing security
    "javascript:S2245": "error",
    "typescript:S2245": "error",
    
    // Guest data privacy (GDPR)
    "javascript:S5131": "error", 
    "typescript:S5131": "error",
    
    // SQL injection prevention
    "javascript:S2077": "error",
    "typescript:S2077": "error"
  }
}
```

---

## 📊 PERFORMANCE OPTIMIZATION

### **Large Codebase Settings (3M+ LOC)**
```json
{
  "sonarlint.ls.javaOpts": "-Xmx2048m",
  "sonarlint.analysisTimeout": 60000,
  "sonarlint.output.showAnalyzerLogs": false,
  "sonarlint.trace.server": "off"
}
```

### **Wedding Day Emergency Settings**
For production hotfixes (Saturday deployments):
```json
{
  "sonarlint.connectedMode.automatic": false,
  "sonarlint.rules": {
    "*": "off"
  }
}
```

---

## 🔄 MAINTENANCE & UPDATES

### **Token Rotation**
When regenerating tokens:
1. Generate new token in SonarQube
2. Update in both IDE settings
3. Update in `.vscode/settings.json`
4. Restart IDEs
5. Verify connection

### **Rule Updates**
To sync with server quality profiles:
1. SonarLint will auto-sync in connected mode
2. Manual sync: Command Palette → "SonarLint: Update all project bindings"
3. Restart IDE if needed

---

## 🚨 TROUBLESHOOTING

### **Common Issues & Solutions**

#### **"Connection Failed" Error**
```bash
# Check SonarQube is running
docker ps | grep sonarqube

# Test API manually
curl http://localhost:9000/api/system/status

# Restart SonarQube if needed  
docker-compose -f docker-compose.sonar.yml restart sonarqube
```

#### **"Project Not Found" Error**
```bash
# Verify project key
curl -s -u "squ_ec3f122f113ca55975dbb342ad5cffbd59a82cd0:" \
  "http://localhost:9000/api/projects/search" | jq '.components[].key'
```

#### **Token Authentication Failed**
```bash
# Test token validity
curl -s -u "squ_ec3f122f113ca55975dbb342ad5cffbd59a82cd0:" \
  http://localhost:9000/api/authentication/validate
```

### **Wedding Day Emergency Bypass**
If SonarLint is blocking critical wedding day fixes:
1. Command Palette → "SonarLint: Toggle SonarLint"
2. Make emergency fix
3. Re-enable SonarLint after wedding
4. Run full analysis and fix issues

---

## ✅ SUCCESS METRICS

**You know the configuration is working when:**
- ✅ SonarLint shows "Connected to SonarQube" in status bar
- ✅ Issues appear in Problems panel with SonarLint badge
- ✅ Hover over issues shows detailed explanations
- ✅ Quick fixes are available for applicable issues  
- ✅ New issues appear as you type (real-time analysis)
- ✅ Rules match server-side quality profile

---

**🎯 Ready for Wedding Platform Development!**

**Token**: `squ_ec3f122f113ca55975dbb342ad5cffbd59a82cd0`  
**Project Key**: `wedsync-wedding-platform`  
**Server**: `http://localhost:9000`  
**Status**: ✅ Production Ready