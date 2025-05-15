
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
        dgram: false, // Added fallback for dgram
        http2: false,
        child_process: false, // Often needed for server-side libraries
        perf_hooks: false,    // Related to performance monitoring
        'pg-native': false,   // Example if 'pg' library is used
        // Add other Node.js core modules here if similar errors appear
      };

      // Alias the specific OpenTelemetry modules causing issues on the client
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@opentelemetry/context-async-hooks': false,
        '@opentelemetry/sdk-trace-node': false,
      };

      // Add a specific rule to use null-loader for async_hooks
      // This is another way to ensure it's stubbed out on the client
      if (!config.module.rules) {
        config.module.rules = [];
      }
      const asyncHooksRuleExists = config.module.rules.some(
        (rule) => typeof rule === 'object' && rule.test instanceof RegExp && rule.test.source === /async_hooks/.source
      );
      if (!asyncHooksRuleExists) {
        config.module.rules.push({
          test: /async_hooks/,
          use: 'null-loader',
        });
      }
    }

    // If issues persist with Turbopack (next dev --turbopack),
    // they might stem from Turbopack not fully respecting these Webpack configurations.
    // Testing with `next dev` (which uses Webpack) can help isolate such issues.

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
