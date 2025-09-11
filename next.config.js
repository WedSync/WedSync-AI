// Fixed Next.js config for Docker development
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  
  // Experimental features
  experimental: {},
  
  // Enable standalone output for production Docker builds
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Docker-optimized webpack configuration
  webpack: (config, { dev }) => {
    // Enable file watching with polling for Docker development
    if (dev && process.env.NODE_ENV === 'development') {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay rebuild after first change
        ignored: /node_modules/, // Ignore node_modules for performance
      };
    }
    
    return config;
  },
  
  // Basic image configuration
  images: {
    domains: ['localhost', '127.0.0.1'],
    unoptimized: process.env.NODE_ENV === 'development', // Skip optimization in dev
  },
};

module.exports = nextConfig;