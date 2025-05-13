/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Solution for Node.js core modules not available in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}), // Preserve any existing fallbacks
        async_hooks: false, // Crucial for the reported error
        fs: false,
        net: false,
        tls: false,
        dns: false, 
        http2: false,
        child_process: false, // Often needed for server-side libraries
        perf_hooks: false,    // Related to performance monitoring
        'pg-native': false,   // Example if 'pg' library is used
        // Add other Node.js core modules here if similar errors appear
      };
    }
    
    return config;
  },
};

export default nextConfig;
