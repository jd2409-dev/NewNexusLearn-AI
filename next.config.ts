
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
        ...(config.resolve.fallback || {}), // Ensure fallback object exists
        "async_hooks": false,
        "node:async_hooks": false,
        "child_process": false,
        "node:child_process": false,
        "fs": false,
        "node:fs": false,
        "net": false,
        "node:net": false,
        "perf_hooks": false,
        "node:perf_hooks": false,
        "tls": false,
        "node:tls": false,
      };

      // Aggressively ignore server-side OpenTelemetry packages on the client
      // These are known to attempt to require 'async_hooks'
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /@opentelemetry[\\/]sdk-trace-node/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /@opentelemetry[\\/]context-async-hooks/,
        })
      );
    }

    // Ignore @google-cloud/functions-framework.
    // This is kept general (not in !isServer block) as per original structure,
    // though if it specifically causes client-side issues, it could be moved into the !isServer block.
    config.plugins = config.plugins || [];
    config.plugins.push(new webpack.IgnorePlugin({
      resourceRegExp: /^@google-cloud\/functions-framework$/,
    }));
    
    return config;
  },
};

export default nextConfig;
