
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Primary strategy: Stub out Node.js core modules for the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false, // Key fix: ensure async_hooks is stubbed
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        perf_hooks: false,
      };

      // Aggressively ignore server-side OpenTelemetry packages on the client
      // These are known to attempt to require 'async_hooks'
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /@opentelemetry[\\/]sdk-trace-node/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /@opentelemetry[\\/]context-async-hooks/,
        })
      );
    }

    // Existing fix for @google-cloud/functions-framework
    // This part seems unrelated to the current async_hooks error but kept for stability
    if (typeof config.resolve.alias === 'object' && config.resolve.alias !== null) {
        // Ensure @google-cloud/functions-framework is handled if it causes issues
        // However, the primary issue is async_hooks, so the rule below might be too broad
        // or better handled by IgnorePlugin if it's a server-only package.
    }
    // Let's ensure @google-cloud/functions-framework is ignored if it's a server-only dependency
    config.plugins.push(new webpack.IgnorePlugin({
      resourceRegExp: /^@google-cloud\/functions-framework$/,
    }));
    // If null-loader is preferred for specific cases and installed:
    // config.module.rules.push({
    //   test: /@google-cloud\/functions-framework/,
    //   use: 'null-loader',
    // });


    return config;
  },
};

export default nextConfig;
