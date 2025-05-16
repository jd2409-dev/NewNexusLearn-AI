
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
        "node:fs": false,
        net: false,
        "node:net": false,
        tls: false,
        "node:tls": false,
        dns: false,
        "node:dns": false,
        dgram: false,
        "node:dgram": false,
        http2: false,
        "node:http2": false,
        child_process: false,
        "node:child_process": false,
        perf_hooks: false,
        "node:perf_hooks": false,
        'pg-native': false, // If pg-native is ever a transitive dependency
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
      if (!config.module.rules) {
        config.module.rules = [];
      }

      // Unconditionally add null-loader rules for async_hooks and node:async_hooks
      config.module.rules.push({
        test: /^async_hooks$/, // Match 'async_hooks' exactly
        use: 'null-loader',
      });

      config.module.rules.push({
        test: /^node:async_hooks$/, // Match 'node:async_hooks' exactly
        use: 'null-loader',
      });
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
