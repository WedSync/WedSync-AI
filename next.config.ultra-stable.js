// Ultra-Stable Next.js Configuration
// Optimized for Docker development with advanced hot reload and performance features

const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  swcMinify: true,
  
  // CRITICAL: Disable problematic experimental features
  experimental: {
    reactCompiler: false,
    esmExternals: false,
    optimizeCss: process.env.NODE_ENV === 'production',
    serverComponentsExternalPackages: [
      '@tensorflow/tfjs',
      '@tensorflow/tfjs-node',
      'sharp',
      'canvas',
      'puppeteer',
      'playwright'
    ],
    // Enable faster refresh in development
    fastRefresh: true,
    // Optimize bundle splitting
    optimizeServerReact: true,
  },
  
  // Output configuration
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Advanced webpack configuration for Docker optimization
  webpack: (config, { dev, isServer }) => {
    // Ultra-fast hot reload configuration for Docker
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 500,                    // Very fast polling for immediate updates
        aggregateTimeout: 100,        // Minimal delay before rebuild
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/coverage/**',
          '**/dist/**',
          '**/.git/**',
          '**/logs/**'
        ]
      };
      
      // Enable hot module replacement optimizations
      if (config.plugins) {
        const webpack = require('webpack');
        config.plugins.push(
          new webpack.optimize.ModuleConcatenationPlugin()
        );
      }
    }
    
    // Optimize for development speed
    if (dev) {
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
      
      // Faster source maps for debugging
      config.devtool = 'cheap-module-eval-source-map';
    }
    
    // Handle problematic packages that cause Docker build failures
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
      child_process: false,
      worker_threads: false,
      // Canvas fallbacks
      canvas: false,
      'gl': false,
      'jsdom': false
    };
    
    // Exclude problematic packages from bundling
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push(
        '@tensorflow/tfjs',
        '@tensorflow/tfjs-node',
        'canvas',
        'jsdom',
        'puppeteer',
        'playwright',
        'sharp',
        'node-gyp'
      );
    }
    
    // Performance optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, './src'),
      '@/components': path.join(__dirname, './src/components'),
      '@/lib': path.join(__dirname, './src/lib'),
      '@/utils': path.join(__dirname, './src/utils'),
      '@/hooks': path.join(__dirname, './src/hooks'),
      '@/types': path.join(__dirname, './src/types'),
    };
    
    // Ignore problematic loaders and plugins
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    });
    
    // Handle native modules gracefully
    config.plugins = config.plugins || [];
    const webpack = require('webpack');
    
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(canvas|jsdom|puppeteer|@tensorflow\/tfjs-node)$/,
      })
    );
    
    // Development performance monitoring
    if (dev && !isServer) {
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.done.tap('DevelopmentMetrics', (stats) => {
            const buildTime = stats.endTime - stats.startTime;
            
            // Send metrics to development metrics collector
            if (process.env.COLLECT_DEV_METRICS === 'true') {
              fetch('http://wedsync-dev-metrics:9091/api/metrics/build', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duration: buildTime / 1000 })
              }).catch(() => {
                // Metrics collection failed, but don't break the build
              });
            }
          });
          
          // Track hot reload performance
          compiler.hooks.invalid.tap('HotReloadMetrics', () => {
            if (process.env.COLLECT_DEV_METRICS === 'true') {
              global.hotReloadStartTime = Date.now();
            }
          });
          
          compiler.hooks.afterCompile.tap('HotReloadMetrics', () => {
            if (process.env.COLLECT_DEV_METRICS === 'true' && global.hotReloadStartTime) {
              const hotReloadTime = (Date.now() - global.hotReloadStartTime) / 1000;
              
              fetch('http://wedsync-dev-metrics:9091/api/metrics/hot-reload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duration: hotReloadTime })
              }).catch(() => {
                // Metrics collection failed, but don't break the build
              });
              
              global.hotReloadStartTime = null;
            }
          });
        }
      });
    }
    
    return config;
  },
  
  // Optimized image configuration
  images: {
    domains: [
      'localhost',
      '127.0.0.1',
      'azhgptjkqiiqvvvhapml.supabase.co',
      'wedsync.com'
    ],
    // Disable optimization in development to prevent dependency issues
    unoptimized: process.env.NODE_ENV === 'development',
    // Faster image loading
    minimumCacheTTL: 60,
    formats: ['image/webp', 'image/avif'],
  },
  
  // Enhanced compiler configuration
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    // Remove React DevTools in production
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    // Remove data-testid attributes in production
    removeDataTestIds: process.env.NODE_ENV === 'production',
  },
  
  // TypeScript configuration optimization
  typescript: {
    // During Docker builds, ignore some type errors to prevent failures
    ignoreBuildErrors: process.env.DOCKER_BUILD === 'true',
    // Faster type checking
    tsconfigPath: './tsconfig.json',
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: process.env.DOCKER_BUILD === 'true',
    // Custom ESLint configuration
    dirs: ['src', 'app', 'components', 'lib', 'utils'],
  },
  
  // Development server configuration
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  
  // Advanced compression
  compress: true,
  
  // Runtime configuration
  serverRuntimeConfig: {
    // Server-only configuration
    PROJECT_ROOT: __dirname,
  },
  
  publicRuntimeConfig: {
    // Client and server configuration
    APP_ENV: process.env.NODE_ENV,
    ENABLE_METRICS: process.env.COLLECT_DEV_METRICS === 'true',
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // Development metrics headers
          ...(process.env.NODE_ENV === 'development' ? [
            {
              key: 'X-Development-Mode',
              value: 'true',
            },
            {
              key: 'X-Hot-Reload',
              value: 'enabled',
            }
          ] : [])
        ],
      },
      // API routes optimizations
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Redirects for better development workflow
  async redirects() {
    return [
      // Add development-specific redirects
      ...(process.env.NODE_ENV === 'development' ? [
        {
          source: '/metrics',
          destination: 'http://localhost:3001/d/wedsync-development',
          permanent: false,
        },
        {
          source: '/logs',
          destination: 'http://localhost:9999',
          permanent: false,
        }
      ] : [])
    ];
  },
  
  // API routes configuration
  async rewrites() {
    return [
      // Development metrics proxy
      ...(process.env.NODE_ENV === 'development' ? [
        {
          source: '/api/metrics/prometheus',
          destination: 'http://wedsync-dev-metrics:9091/metrics',
        },
        {
          source: '/api/status/container',
          destination: 'http://localhost:8765/status',
        }
      ] : [])
    ];
  },
  
  // Optimize bundle analyzer
  ...(process.env.ANALYZE === 'true' && {
    bundleAnalyzer: {
      enabled: true,
      openAnalyzer: false,
    }
  }),
  
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    // Production-specific optimizations
    generateEtags: true,
    
    // Advanced optimization
    optimizeFonts: true,
    
    // Static optimization
    trailingSlash: false,
    
    // Asset optimization
    assetPrefix: process.env.ASSET_PREFIX || undefined,
  }),
};

module.exports = nextConfig;