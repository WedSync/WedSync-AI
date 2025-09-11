/**
 * Webpack Bundle Analyzer Configuration
 * Analyzes bundle size and helps identify optimization opportunities
 */

const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const path = require('path');

module.exports = {
  mode: 'production',
  target: 'web',
  
  entry: {
    'environment-variables': './src/components/environment-variables/index.ts',
    'environment-variables-optimized': './src/components/environment-variables/EnvironmentVariablesManagementOptimized.tsx'
  },

  output: {
    path: path.resolve(__dirname, 'bundle-analysis'),
    filename: '[name].bundle.js',
    clean: true,
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
    },
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: path.resolve(__dirname, 'tsconfig.json'),
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },

  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
      defaultSizes: 'gzip',
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json',
      logLevel: 'info',
    }),
  ],

  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 20,
        },
        supabase: {
          test: /[\\/]node_modules[\\/]@supabase[\\/]/,
          name: 'supabase',
          chunks: 'all',
          priority: 15,
        },
        ui: {
          test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
          name: 'ui-components',
          chunks: 'all',
          priority: 5,
        },
        accessibility: {
          test: /[\\/]src[\\/]components[\\/]environment-variables[\\/]utils[\\/]accessibility/,
          name: 'accessibility-utils',
          chunks: 'all',
          priority: 8,
        },
        performance: {
          test: /[\\/]src[\\/]components[\\/]environment-variables[\\/]utils[\\/]performance/,
          name: 'performance-utils',
          chunks: 'all',
          priority: 8,
        },
      },
    },
    
    usedExports: true,
    sideEffects: false,
    
    // Tree shaking optimization
    providedExports: true,
    concatenateModules: true,
    
    // Minimize bundle size
    minimize: true,
  },

  // Ignore node modules that shouldn't be bundled
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM',
  },

  // Performance budgets
  performance: {
    maxAssetSize: 250000, // 250KB max per asset
    maxEntrypointSize: 500000, // 500KB max per entry point
    hints: 'warning',
    assetFilter: function(assetFilename) {
      return assetFilename.endsWith('.js');
    },
  },

  stats: {
    colors: true,
    modules: false,
    chunks: false,
    chunkModules: false,
    chunkOrigins: false,
    assets: true,
    assetsSort: 'size',
    builtAt: true,
    performance: true,
    reasons: false,
    source: false,
    warnings: true,
    errors: true,
    errorDetails: true,
  },
};

// Custom plugin to track bundle size over time
class BundleSizeTracker {
  constructor(options = {}) {
    this.options = options;
    this.sizeLimits = {
      'environment-variables': 200 * 1024, // 200KB
      'environment-variables-optimized': 180 * 1024, // 180KB (should be smaller)
      'vendors': 500 * 1024, // 500KB
      'react': 150 * 1024, // 150KB
      'ui-components': 50 * 1024, // 50KB
    };
  }

  apply(compiler) {
    compiler.hooks.done.tap('BundleSizeTracker', (stats) => {
      const assets = stats.toJson().assets;
      const sizeWarnings = [];
      
      assets.forEach(asset => {
        const assetName = asset.name.replace(/\.[a-f0-9]+\./, '.').replace('.bundle.js', '');
        const sizeLimit = this.sizeLimits[assetName];
        
        if (sizeLimit && asset.size > sizeLimit) {
          sizeWarnings.push({
            asset: asset.name,
            size: asset.size,
            limit: sizeLimit,
            excess: asset.size - sizeLimit
          });
        }
      });

      if (sizeWarnings.length > 0) {
        console.warn('\n⚠️  Bundle Size Warnings:');
        sizeWarnings.forEach(warning => {
          console.warn(
            `   ${warning.asset}: ${(warning.size / 1024).toFixed(1)}KB ` +
            `(limit: ${(warning.limit / 1024).toFixed(1)}KB, ` +
            `excess: ${(warning.excess / 1024).toFixed(1)}KB)`
          );
        });
        console.warn('');
      } else {
        console.log('\n✅ All bundles within size limits');
      }

      // Save bundle size history
      const sizeData = {
        timestamp: new Date().toISOString(),
        assets: assets.map(asset => ({
          name: asset.name,
          size: asset.size,
          gzipSize: asset.info?.minimized ? Math.round(asset.size * 0.3) : asset.size
        }))
      };

      const fs = require('fs');
      const historyFile = path.resolve(__dirname, 'bundle-analysis', 'size-history.json');
      
      let history = [];
      try {
        if (fs.existsSync(historyFile)) {
          history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        }
      } catch (e) {
        console.warn('Could not read bundle size history:', e.message);
      }

      history.push(sizeData);
      
      // Keep only last 50 entries
      if (history.length > 50) {
        history = history.slice(-50);
      }

      try {
        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
      } catch (e) {
        console.warn('Could not write bundle size history:', e.message);
      }
    });
  }
}

module.exports.plugins.push(new BundleSizeTracker());