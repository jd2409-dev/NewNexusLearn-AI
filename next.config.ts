
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
        dgram: false,
        http2: false,
        child_process: false, 
        perf_hooks: false,    
        'pg-native': false,
      };

      // Alias the specific OpenTelemetry modules causing issues on the client
      // AND explicitly alias "node:async_hooks"
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@opentelemetry/context-async-hooks': false,
        '@opentelemetry/sdk-trace-node': false,
        "node:async_hooks": false, // Explicitly alias "node:async_hooks"
        // Add other "node:" prefixed modules if they cause issues
        "node:fs": false,
        "node:net": false,
        "node:tls": false,
        "node:dns": false,
        "node:dgram": false,
        "node:http2": false,
        "node:child_process": false,
        "node:perf_hooks": false,
      };

      // Add a specific rule to use null-loader for async_hooks and node:async_hooks
      if (!config.module.rules) {
        config.module.rules = [];
      }
      
      // Rule for 'async_hooks' (without node: prefix)
      const asyncHooksRuleExists = config.module.rules.some(
        (rule) => typeof rule === 'object' && rule.test instanceof RegExp && rule.test.source === /async_hooks/.source && !rule.test.source.includes("node:")
      );
      if (!asyncHooksRuleExists) {
        config.module.rules.push({
          test: /^async_hooks$/, // Match 'async_hooks' exactly
          use: 'null-loader',
        });
      }

      // Rule for 'node:async_hooks'
      const nodeAsyncHooksRuleExists = config.module.rules.some(
        (rule) => typeof rule === 'object' && rule.test instanceof RegExp && rule.test.source === /node:async_hooks/.source
      );
      if (!nodeAsyncHooksRuleExists) {
        config.module.rules.push({
          test: /^node:async_hooks$/, // Match 'node:async_hooks' exactly
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
