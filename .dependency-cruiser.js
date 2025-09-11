/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'warn',
      comment: 'This dependency is part of a circular relationship. You might want to revise your solution (i.e. use dependency inversion, make sure the modules have a single responsibility) ',
      from: {},
      to: {
        circular: true
      }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    exclude: {
      path: '\\.(test|spec)\\.(js|ts|tsx)$'
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.json'
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
        filters: {
          includeOnly: {
            path: '^src'
          }
        },
        theme: {
          graph: {
            bgcolor: '#ffffff',
            splines: 'true',
            rankdir: 'TD',
            fontname: 'Arial',
            fontsize: '9'
          },
          modules: [
            {
              criteria: { source: '\\.tsx?$' },
              attributes: { 
                fillcolor: '#87CEEB',
                color: '#4682B4',
                fontcolor: '#000000'
              }
            },
            {
              criteria: { source: '\\.jsx?$' },
              attributes: { 
                fillcolor: '#FFE4B5',
                color: '#DAA520',
                fontcolor: '#000000'
              }
            }
          ],
          dependencies: [
            {
              criteria: { resolved: '\\.tsx?$' },
              attributes: { color: '#4682B4' }
            },
            {
              criteria: { resolved: '\\.jsx?$' },
              attributes: { color: '#DAA520' }
            }
          ]
        }
      }
    }
  }
};