#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all route.ts files with dynamic segments
const routeFiles = glob.sync('src/app/api/**/\\[*\\]/route.ts', {
  cwd: process.cwd()
});

console.log(`Found ${routeFiles.length} route files with dynamic params to update`);

routeFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Extract param names from the path
  const paramMatches = file.match(/\[([^\]]+)\]/g);
  if (!paramMatches) return;
  
  const paramNames = paramMatches.map(m => m.slice(1, -1));
  console.log(`Processing ${file} with params: ${paramNames.join(', ')}`);
  
  // Pattern to match old style params
  const oldParamPattern = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\([^)]*\{\s*params\s*\}\s*:\s*\{\s*params:\s*\{([^}]+)\}\s*\}/g;
  
  // Check if file needs updating
  if (content.includes('params: Promise<{')) {
    console.log(`  ✓ Already updated`);
    return;
  }
  
  // Update GET function
  content = content.replace(
    /export\s+async\s+function\s+GET\s*\(\s*([^,]+),\s*\{\s*params\s*\}\s*:\s*\{\s*params:\s*\{([^}]+)\}\s*\}\s*\)/g,
    (match, req, paramsContent) => {
      modified = true;
      return `export async function GET(\n  ${req.trim()},\n  { params }: { params: Promise<{${paramsContent}}> }\n)`;
    }
  );
  
  // Update POST function
  content = content.replace(
    /export\s+async\s+function\s+POST\s*\(\s*([^,]+),\s*\{\s*params\s*\}\s*:\s*\{\s*params:\s*\{([^}]+)\}\s*\}\s*\)/g,
    (match, req, paramsContent) => {
      modified = true;
      return `export async function POST(\n  ${req.trim()},\n  { params }: { params: Promise<{${paramsContent}}> }\n)`;
    }
  );
  
  // Update PUT function
  content = content.replace(
    /export\s+async\s+function\s+PUT\s*\(\s*([^,]+),\s*\{\s*params\s*\}\s*:\s*\{\s*params:\s*\{([^}]+)\}\s*\}\s*\)/g,
    (match, req, paramsContent) => {
      modified = true;
      return `export async function PUT(\n  ${req.trim()},\n  { params }: { params: Promise<{${paramsContent}}> }\n)`;
    }
  );
  
  // Update PATCH function
  content = content.replace(
    /export\s+async\s+function\s+PATCH\s*\(\s*([^,]+),\s*\{\s*params\s*\}\s*:\s*\{\s*params:\s*\{([^}]+)\}\s*\}\s*\)/g,
    (match, req, paramsContent) => {
      modified = true;
      return `export async function PATCH(\n  ${req.trim()},\n  { params }: { params: Promise<{${paramsContent}}> }\n)`;
    }
  );
  
  // Update DELETE function
  content = content.replace(
    /export\s+async\s+function\s+DELETE\s*\(\s*([^,]+),\s*\{\s*params\s*\}\s*:\s*\{\s*params:\s*\{([^}]+)\}\s*\}\s*\)/g,
    (match, req, paramsContent) => {
      modified = true;
      return `export async function DELETE(\n  ${req.trim()},\n  { params }: { params: Promise<{${paramsContent}}> }\n)`;
    }
  );
  
  if (modified) {
    // Add await params after the function signature
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    methods.forEach(method => {
      const pattern = new RegExp(`(export\\s+async\\s+function\\s+${method}[^{]*\\{)`, 'g');
      content = content.replace(pattern, (match) => {
        // Extract param names from the Promise type
        const promiseMatch = content.match(new RegExp(`${method}[^}]*params:\\s*Promise<\\{([^}]+)\\}>`));
        if (promiseMatch) {
          const params = promiseMatch[1].trim();
          const paramNames = params.split(',').map(p => p.trim().split(':')[0].trim());
          const destructure = paramNames.length === 1 
            ? `const { ${paramNames[0]} } = await params;`
            : `const { ${paramNames.join(', ')} } = await params;`;
          return `${match}\n  ${destructure}`;
        }
        return match;
      });
    });
    
    // Update all references to params.paramName to just paramName
    paramNames.forEach(paramName => {
      const paramAccessPattern = new RegExp(`params\\.${paramName}`, 'g');
      content = content.replace(paramAccessPattern, paramName);
    });
    
    // Write the updated content
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Updated ${file}`);
  } else {
    console.log(`  ⏭️  No changes needed`);
  }
});

console.log('\nDone! All route files have been updated.');