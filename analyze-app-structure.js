#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class AppStructureAnalyzer {
  constructor(basePath) {
    this.basePath = basePath;
    this.pages = [];
    this.components = [];
    this.dependencies = [];
    this.routes = [];
  }

  // Analyze Next.js app directory structure
  analyzeAppDirectory(dir = 'src/app', currentRoute = '') {
    const fullPath = path.join(this.basePath, dir);
    
    if (!fs.existsSync(fullPath)) return;

    const items = fs.readdirSync(fullPath);
    
    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Handle route groups like (dashboard) and (admin)
        const isRouteGroup = item.startsWith('(') && item.endsWith(')');
        const routeSegment = isRouteGroup ? '' : `/${item}`;
        const newRoute = currentRoute + routeSegment;
        
        this.analyzeAppDirectory(path.join(dir, item), newRoute);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        this.analyzePageFile(itemPath, currentRoute, item);
      }
    }
  }

  // Analyze individual page files
  analyzePageFile(filePath, route, fileName) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(this.basePath, filePath);
    
    // Determine page type
    let pageType = 'unknown';
    if (fileName === 'page.tsx') pageType = 'page';
    else if (fileName === 'layout.tsx') pageType = 'layout';
    else if (fileName === 'loading.tsx') pageType = 'loading';
    else if (fileName === 'error.tsx') pageType = 'error';
    else if (fileName === 'not-found.tsx') pageType = 'not-found';
    else if (fileName.includes('.tsx')) pageType = 'component';

    const pageInfo = {
      path: relativePath,
      route: route || '/',
      fileName,
      type: pageType,
      imports: this.extractImports(content),
      exports: this.extractExports(content),
      components: this.extractComponentUsage(content)
    };

    this.pages.push(pageInfo);
    
    if (pageType === 'page') {
      this.routes.push({
        route: route || '/',
        file: relativePath,
        components: pageInfo.components
      });
    }
  }

  // Extract imports from file content
  extractImports(content) {
    const imports = [];
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:{[^}]*}|\*\s+as\s+\w+|\w+))?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      // Focus on local imports (starting with ./ or ../ or @/)
      if (importPath.startsWith('./') || importPath.startsWith('../') || importPath.startsWith('@/')) {
        imports.push(importPath);
      }
    }
    
    return imports;
  }

  // Extract exports from file content
  extractExports(content) {
    const exports = [];
    
    // Default export
    if (content.includes('export default')) {
      exports.push('default');
    }
    
    // Named exports
    const namedExportRegex = /export\s+(?:const|function|class)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  // Extract component usage from JSX content
  extractComponentUsage(content) {
    const components = [];
    
    // Find JSX components (PascalCase)
    const componentRegex = /<(\w*[A-Z]\w*)/g;
    let match;
    
    while ((match = componentRegex.exec(content)) !== null) {
      const componentName = match[1];
      if (!components.includes(componentName)) {
        components.push(componentName);
      }
    }
    
    return components;
  }

  // Analyze components directory
  analyzeComponents(dir = 'src/components') {
    const fullPath = path.join(this.basePath, dir);
    
    if (!fs.existsSync(fullPath)) return;

    this.walkDirectory(fullPath, (filePath) => {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(this.basePath, filePath);
        
        this.components.push({
          path: relativePath,
          name: path.basename(filePath, path.extname(filePath)),
          imports: this.extractImports(content),
          exports: this.extractExports(content),
          usedComponents: this.extractComponentUsage(content)
        });
      }
    });
  }

  // Walk directory recursively
  walkDirectory(dir, callback) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        this.walkDirectory(itemPath, callback);
      } else {
        callback(itemPath);
      }
    }
  }

  // Generate dependency graph
  generateDependencyGraph() {
    const nodes = [];
    const edges = [];
    
    // Add pages as nodes
    this.pages.forEach((page, index) => {
      nodes.push({
        id: `page-${index}`,
        label: page.route,
        type: 'page',
        file: page.path,
        pageType: page.type
      });
    });
    
    // Add components as nodes
    this.components.forEach((component, index) => {
      nodes.push({
        id: `comp-${index}`,
        label: component.name,
        type: 'component',
        file: component.path
      });
    });
    
    // Add edges for dependencies
    this.pages.forEach((page, pageIndex) => {
      page.imports.forEach(importPath => {
        // Find matching component
        const componentIndex = this.components.findIndex(comp => 
          comp.path.includes(importPath.replace('@/', 'src/').replace('./', ''))
        );
        
        if (componentIndex !== -1) {
          edges.push({
            from: `page-${pageIndex}`,
            to: `comp-${componentIndex}`,
            type: 'imports'
          });
        }
      });
    });
    
    return { nodes, edges };
  }

  // Generate HTML visualization
  generateVisualization() {
    const graph = this.generateDependencyGraph();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>WedSync App Structure Visualization</title>
    <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; }
        #network { height: 800px; border: 1px solid #ccc; }
        .controls { padding: 20px; background: #f5f5f5; }
        .route-list { 
            max-height: 300px; 
            overflow-y: auto; 
            background: white; 
            border: 1px solid #ddd; 
            padding: 10px; 
            margin: 10px 0;
        }
        .route-item { 
            padding: 5px; 
            border-bottom: 1px solid #eee; 
            font-family: monospace;
        }
        .stats { display: flex; gap: 20px; margin: 10px 0; }
        .stat { background: white; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="controls">
        <h1>🎯 WedSync Application Structure</h1>
        
        <div class="stats">
            <div class="stat">
                <strong>📄 Pages:</strong> ${this.pages.filter(p => p.type === 'page').length}
            </div>
            <div class="stat">
                <strong>🧩 Components:</strong> ${this.components.length}
            </div>
            <div class="stat">
                <strong>🛣️ Routes:</strong> ${this.routes.length}
            </div>
            <div class="stat">
                <strong>🔗 Dependencies:</strong> ${graph.edges.length}
            </div>
        </div>
        
        <h3>📍 Available Routes:</h3>
        <div class="route-list">
            ${this.routes.map(route => 
              `<div class="route-item">
                <strong>${route.route}</strong> → ${route.file}
                <br><small>Components: ${route.components.join(', ') || 'None detected'}</small>
              </div>`
            ).join('')}
        </div>
        
        <button onclick="fitNetwork()">🔍 Fit View</button>
        <button onclick="togglePhysics()">⚡ Toggle Physics</button>
        <button onclick="showOnlyPages()">📄 Pages Only</button>
        <button onclick="showAll()">🔄 Show All</button>
    </div>
    
    <div id="network"></div>
    
    <script>
        const nodes = new vis.DataSet(${JSON.stringify(graph.nodes.map(node => ({
          ...node,
          color: node.type === 'page' ? '#e1f5fe' : '#f3e5f5',
          shape: node.type === 'page' ? 'box' : 'ellipse',
          font: { size: 12 }
        })))});
        
        const edges = new vis.DataSet(${JSON.stringify(graph.edges.map(edge => ({
          ...edge,
          arrows: 'to',
          color: '#666'
        })))});
        
        const container = document.getElementById('network');
        const data = { nodes, edges };
        const options = {
            physics: {
                enabled: true,
                stabilization: { iterations: 100 }
            },
            layout: {
                hierarchical: {
                    direction: 'UD',
                    sortMethod: 'directed'
                }
            },
            nodes: {
                margin: 10,
                font: { size: 12 }
            },
            edges: {
                smooth: true
            }
        };
        
        const network = new vis.Network(container, data, options);
        
        // Control functions
        function fitNetwork() {
            network.fit();
        }
        
        let physicsEnabled = true;
        function togglePhysics() {
            physicsEnabled = !physicsEnabled;
            network.setOptions({ physics: { enabled: physicsEnabled } });
        }
        
        function showOnlyPages() {
            const pageNodes = ${JSON.stringify(graph.nodes.filter(n => n.type === 'page'))};
            nodes.clear();
            nodes.add(pageNodes);
            edges.clear();
        }
        
        function showAll() {
            nodes.clear();
            nodes.add(${JSON.stringify(graph.nodes)});
            edges.clear();
            edges.add(${JSON.stringify(graph.edges)});
        }
        
        // Node click handler
        network.on('click', function(params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = nodes.get(nodeId);
                alert(\`\${node.type.toUpperCase()}: \${node.label}\\nFile: \${node.file}\`);
            }
        });
    </script>
</body>
</html>`;
    
    return html;
  }

  // Run complete analysis
  analyze() {
    console.log('🔍 Analyzing WedSync application structure...');
    
    this.analyzeAppDirectory();
    this.analyzeComponents();
    
    console.log(`✅ Found ${this.pages.length} pages and ${this.components.length} components`);
    console.log(`📍 Discovered ${this.routes.length} routes`);
    
    return {
      pages: this.pages,
      components: this.components,
      routes: this.routes,
      graph: this.generateDependencyGraph()
    };
  }
}

// Run the analysis
const analyzer = new AppStructureAnalyzer(process.cwd());
const result = analyzer.analyze();

// Generate visualization
const html = analyzer.generateVisualization();
fs.writeFileSync('wedsync-app-structure.html', html);

console.log('🎯 Generated: wedsync-app-structure.html');
console.log('📊 Open the file in your browser to explore the app structure!');

// Also save raw data
fs.writeFileSync('app-structure-data.json', JSON.stringify(result, null, 2));
console.log('💾 Saved raw data: app-structure-data.json');