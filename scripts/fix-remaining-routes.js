#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of specific files that need manual fixes
const filesToFix = [
  'src/app/api/ab-testing/tests/[id]/actions/route.ts',
  'src/app/api/booking/[id]/preparation/route.ts', 
  'src/app/api/clients/[id]/milestones/route.ts',
  'src/app/api/communications/messages/[id]/read/route.ts',
  'src/app/api/contracts/[id]/deliverables/route.ts',
  'src/app/api/contracts/[id]/milestones/route.ts',
  'src/app/api/contracts/[id]/revisions/route.ts',
  'src/app/api/creators/onboarding/[applicationId]/complete-step/route.ts'
];

console.log(`Fixing ${filesToFix.length} remaining route files...`);

filesToFix.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ❌ File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  console.log(`Processing ${file}...`);
  
  // Fix function signatures - more comprehensive patterns
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  
  methods.forEach(method => {
    // Pattern 1: Standard { params: { id: string } } format
    const pattern1 = new RegExp(
      `(export\\s+async\\s+function\\s+${method}\\s*\\([^,]+,\\s*\\{\\s*params\\s*\\}\\s*:\\s*\\{\\s*params:\\s*\\{)([^}]+)(\\}\\s*\\}\\s*\\))`,
      'g'
    );
    
    content = content.replace(pattern1, (match, before, paramTypes, after) => {
      modified = true;
      return `${before.trim()} Promise<{${paramTypes}}>}${after}`;
    });
    
    // Add await params destructuring after function signature
    const awaitPattern = new RegExp(
      `(export\\s+async\\s+function\\s+${method}[^{]*\\{)(?!\\s*const\\s*\\{[^}]+\\}\\s*=\\s*await\\s+params)`,
      'g'
    );
    
    content = content.replace(awaitPattern, (match) => {
      // Extract param names from the Promise type
      const promiseMatch = content.match(new RegExp(`${method}[^}]*params:\\s*Promise<\\{([^}]+)\\}>`));
      if (promiseMatch) {
        const params = promiseMatch[1].trim();
        const paramNames = params.split(',').map(p => {
          const paramName = p.trim().split(':')[0].trim();
          return paramName;
        });
        
        const destructure = paramNames.length === 1 
          ? `const { ${paramNames[0]} } = await params;`
          : `const { ${paramNames.join(', ')} } = await params;`;
        
        modified = true;
        return `${match}\n  ${destructure}`;
      }
      return match;
    });
  });
  
  // Fix params.id references to just id
  content = content.replace(/params\.id\b/g, 'id');
  content = content.replace(/params\.applicationId\b/g, 'applicationId');
  content = content.replace(/params\.code\b/g, 'code');
  content = content.replace(/params\.token\b/g, 'token');
  
  // Fix top-level async createClient calls
  content = content.replace(/^const supabase = await createClient\(\);$/m, '// Moved createClient inside functions');
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Updated ${file}`);
  } else {
    console.log(`  ⏭️  No changes needed for ${file}`);
  }
});

console.log('Done fixing remaining routes!');