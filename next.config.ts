
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Apply these configurations only for the client-side bundle
    if (!isServer) {
      // Fallback for Node.js core modules that are not available in the browser.
      // This tells Webpack to provide an empty module for these imports on the client.
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}), // Preserve any existing fallbacks
        async_hooks: false, // For 'async_hooks'
        "node:async_hooks": false, // Explicitly for 'node:async_hooks'
        fs: false,
        net: false,
        tls: false,
        dns: false,
        dgram: false,
        http2: false,
        child_process: false,
        perf_hooks: false,
        'pg-native': false, // If pg-native is ever a transitive dependency
        "node:fs": false,
        "node:net": false,
        "node:tls": false,
        "node:dns": false,
        "node:dgram": false,
        "node:http2": false,
        "node:child_process": false,
        "node:perf_hooks": false,
      };

      // Alias problematic modules (especially server-side ones) to false
      // to prevent them from being bundled on the client.
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@opentelemetry/context-async-hooks': false,
        '@opentelemetry/sdk-trace-node': false,
        "node:async_hooks": false, // Explicitly alias "node:async_hooks" to false
        // Aliasing other "node:" prefixed modules, though fallbacks should also cover them.
        "node:fs": false,
        "node:net": false,
        "node:tls": false,
        "node:dns": false,
        "node:dgram": false,
        "node:http2": false,
        "node:child_process": false,
        "node:perf_hooks": false,
      };

      // Use null-loader for specific Node.js modules to replace them with an empty module.
      // This is an additional layer of defense.
      if (!config.module.rules) {
        config.module.rules = [];
      }

      // Rule for 'async_hooks' (without node: prefix)
      // Ensures that if a module tries to require 'async_hooks', it gets an empty module.
      const asyncHooksRuleExists = config.module.rules.some(
        (rule) =>
          typeof rule === 'object' &&
          rule !== null && // Ensure rule is not null
          rule.test instanceof RegExp &&
          rule.test.source === /^async_hooks$/.source && // Match 'async_hooks' exactly
          Array.isArray(rule.use) &&
          rule.use.some((u) => typeof u === 'object' && u !== null && u.loader === 'null-loader')
      );
      if (!asyncHooksRuleExists) {
        config.module.rules.push({
          test: /^async_hooks$/, // Match 'async_hooks' exactly
          use: 'null-loader',
        });
      }

      // Rule for 'node:async_hooks'
      // This specifically targets the "node:async_hooks" import scheme.
      const nodeAsyncHooksRuleExists = config.module.rules.some(
        (rule) =>
          typeof rule === 'object' &&
          rule !== null && // Ensure rule is not null
          rule.test instanceof RegExp &&
          rule.test.source === /^node:async_hooks$/.source && // Match 'node:async_hooks' exactly
          Array.isArray(rule.use) &&
          rule.use.some((u) => typeof u === 'object' && u !== null && u.loader === 'null-loader')
      );
      if (!nodeAsyncHooksRuleExists) {
        config.module.rules.push({
          test: /^node:async_hooks$/, // Match 'node:async_hooks' exactly
          use: 'null-loader',
        });
      }
    }

    // Comment for Turbopack users:
    // If issues with 'async_hooks' or 'node:async_hooks' persist when using
    // `next dev --turbopack`, it might indicate that Turbopack does not fully
    // respect all these Webpack configurations in the same way.
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
