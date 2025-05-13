
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
      // Explicitly alias 'async_hooks' to false for client-side bundles.
      // This tells Webpack to use an empty module for it.
      config.resolve.alias = {
        ...config.resolve.alias,
        'async_hooks': false,
      };

      // Fallbacks for other Node.js core modules that might be problematic on the client.
      // 'async_hooks: false' here is redundant due to the alias above but kept for clarity.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false, 
        fs: false, 
        net: false,
        tls: false,
        child_process: false,
        perf_hooks: false,
      };

      // Use null-loader for problematic OpenTelemetry modules on the client.
      // This replaces their content with null, preventing them from running or requiring Node.js specifics.
      config.module.rules.push(
        {
          test: /@opentelemetry\/context-async-hooks/,
          use: 'null-loader',
        },
        {
          test: /@opentelemetry\/sdk-trace-node/,
          use: 'null-loader',
        }
      );

      // Ignore problematic server-side modules and 'async_hooks' in client bundles.
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@opentelemetry\/sdk-trace-node(\/.*)?$/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /^@opentelemetry\/context-async-hooks(\/.*)?$/,
        }),
        // Crucial: Ignore 'async_hooks' in any context for client builds.
        new webpack.IgnorePlugin({
          resourceRegExp: /^async_hooks$/,
          contextRegExp: /.*/, // Apply this ignore rule in all contexts for client builds
        })
      );
    }

    // Fix for "critical dependency: the request of a dependency is an expression"
    // often related to dynamic requires in libraries like Genkit or its dependencies.
    // This rule is for @google-cloud/functions-framework which might also try to pull in server-only things.
    config.module.rules.push({
      test: /@google-cloud\/functions-framework/,
      use: 'null-loader',
    });
    config.plugins.push(new webpack.IgnorePlugin({
      resourceRegExp: /^@google-cloud\/functions-framework$/,
    }));


    return config;
  },
};

export default nextConfig;
