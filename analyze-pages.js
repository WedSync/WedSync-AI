#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to extract imports from a file
function extractImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = [];
    
    // Match ES6 imports
    const es6ImportRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)?\s*from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = es6ImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    // Match dynamic imports
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    // Match require statements
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  } catch (error) {
    return [];
  }
}

// Function to find all page files
function findPageFiles(dir, baseDir = dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...findPageFiles(fullPath, baseDir));
    } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.js') || item.endsWith('.jsx'))) {
      const relativePath = path.relative(baseDir, fullPath);
      files.push({
        path: relativePath,
        fullPath: fullPath,
        name: item,
        isPage: item === 'page.tsx' || item === 'page.ts' || item === 'page.js' || item === 'page.jsx',
        isLayout: item === 'layout.tsx' || item === 'layout.ts',
        isRoute: fullPath.includes('/api/') && item === 'route.ts',
        isComponent: fullPath.includes('/components/'),
        isLib: fullPath.includes('/lib/')
      });
    }
  }
  
  return files;
}

// Main analysis function
function analyzeProject() {
  console.log('🔍 Analyzing WedSync Pages and Dependencies...\n');
  
  const srcDir = path.join(__dirname, 'src');
  const files = findPageFiles(srcDir);
  
  // Categorize files
  const pages = files.filter(f => f.isPage);
  const apiRoutes = files.filter(f => f.isRoute);
  const layouts = files.filter(f => f.isLayout);
  const components = files.filter(f => f.isComponent);
  const libFiles = files.filter(f => f.isLib);
  
  console.log(`📊 **PROJECT OVERVIEW**`);
  console.log(`├── Pages: ${pages.length}`);
  console.log(`├── API Routes: ${apiRoutes.length}`);
  console.log(`├── Layouts: ${layouts.length}`);
  console.log(`├── Components: ${components.length}`);
  console.log(`└── Library Files: ${libFiles.length}\n`);
  
  // Analyze pages and their dependencies
  console.log('📄 **PAGES AND THEIR DEPENDENCIES**\n');
  
  pages.forEach(page => {
    const routeName = path.dirname(page.path).replace('app/', '').replace('(', '').replace(')', '') || '/';
    const imports = extractImports(page.fullPath);
    const localImports = imports.filter(imp => imp.startsWith('.') || imp.startsWith('@/'));
    
    console.log(`🌐 **${routeName}** (${page.path})`);
    console.log(`   Dependencies (${localImports.length}):`);
    
    localImports.slice(0, 10).forEach(imp => {
      console.log(`   ├── ${imp}`);
    });
    
    if (localImports.length > 10) {
      console.log(`   └── ... and ${localImports.length - 10} more dependencies`);
    }
    console.log('');
  });
  
  // Analyze API routes
  console.log('🔌 **API ROUTES AND THEIR DEPENDENCIES**\n');
  
  apiRoutes.forEach(route => {
    const routeName = path.dirname(route.path).replace('app/api/', '/api/');
    const imports = extractImports(route.fullPath);
    const localImports = imports.filter(imp => imp.startsWith('.') || imp.startsWith('@/'));
    
    console.log(`🔌 **${routeName}** (${route.path})`);
    console.log(`   Dependencies (${localImports.length}):`);
    
    localImports.slice(0, 8).forEach(imp => {
      console.log(`   ├── ${imp}`);
    });
    
    if (localImports.length > 8) {
      console.log(`   └── ... and ${localImports.length - 8} more dependencies`);
    }
    console.log('');
  });
  
  // Generate HTML report
  generateHTMLReport(pages, apiRoutes, components, libFiles);
  
  console.log('✅ Analysis complete!');
  console.log('📊 HTML report generated: page-dependency-report.html');
}

function generateHTMLReport(pages, apiRoutes, components, libFiles) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WedSync Page & Dependency Analysis</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .page-item { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background: #fafafa; }
        .route-name { font-weight: bold; color: #e74c3c; font-size: 18px; }
        .file-path { color: #7f8c8d; font-size: 12px; margin: 5px 0; }
        .dependencies { margin-top: 10px; }
        .dep-item { margin: 3px 0; padding: 3px 8px; background: #ecf0f1; border-radius: 3px; font-family: monospace; font-size: 12px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat-box { padding: 15px; background: #3498db; color: white; border-radius: 5px; text-align: center; min-width: 100px; }
        .stat-number { font-size: 24px; font-weight: bold; }
        .stat-label { font-size: 12px; }
        .api-route { border-left: 4px solid #f39c12; }
        .page-route { border-left: 4px solid #27ae60; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 WedSync Page & Dependency Analysis</h1>
        
        <div class="stats">
            <div class="stat-box">
                <div class="stat-number">${pages.length}</div>
                <div class="stat-label">Pages</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">${apiRoutes.length}</div>
                <div class="stat-label">API Routes</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">${components.length}</div>
                <div class="stat-label">Components</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">${libFiles.length}</div>
                <div class="stat-label">Library Files</div>
            </div>
        </div>
        
        <h2>📄 Pages and Dependencies</h2>
        ${pages.map(page => {
          const routeName = path.dirname(page.path).replace('app/', '').replace('(', '').replace(')', '') || '/';
          const imports = extractImports(page.fullPath);
          const localImports = imports.filter(imp => imp.startsWith('.') || imp.startsWith('@/'));
          
          return `
            <div class="page-item page-route">
                <div class="route-name">🌐 ${routeName}</div>
                <div class="file-path">${page.path}</div>
                <div class="dependencies">
                    <strong>Dependencies (${localImports.length}):</strong>
                    ${localImports.slice(0, 15).map(imp => `<div class="dep-item">${imp}</div>`).join('')}
                    ${localImports.length > 15 ? `<div class="dep-item">... and ${localImports.length - 15} more</div>` : ''}
                </div>
            </div>
          `;
        }).join('')}
        
        <h2>🔌 API Routes and Dependencies</h2>
        ${apiRoutes.map(route => {
          const routeName = path.dirname(route.path).replace('app/api/', '/api/');
          const imports = extractImports(route.fullPath);
          const localImports = imports.filter(imp => imp.startsWith('.') || imp.startsWith('@/'));
          
          return `
            <div class="page-item api-route">
                <div class="route-name">🔌 ${routeName}</div>
                <div class="file-path">${route.path}</div>
                <div class="dependencies">
                    <strong>Dependencies (${localImports.length}):</strong>
                    ${localImports.slice(0, 12).map(imp => `<div class="dep-item">${imp}</div>`).join('')}
                    ${localImports.length > 12 ? `<div class="dep-item">... and ${localImports.length - 12} more</div>` : ''}
                </div>
            </div>
          `;
        }).join('')}
        
        <div style="margin-top: 40px; padding: 20px; background: #ecf0f1; border-radius: 5px;">
            <strong>Generated:</strong> ${new Date().toLocaleString()}<br>
            <strong>Total Files Analyzed:</strong> ${pages.length + apiRoutes.length + components.length + libFiles.length}
        </div>
    </div>
</body>
</html>
  `;
  
  fs.writeFileSync(path.join(__dirname, '../docs/architecture/page-dependency-report.html'), html);
}

// Run the analysis
analyzeProject();