
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
      // Prevent bundling of Node.js specific modules for the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false, 
        fs: false, 
        net: false,
        tls: false,
        child_process: false, // common offender for server-side libs
        perf_hooks: false, // another node-specific module
      };

      // Use null-loader for problematic OTel modules on client
      // This can be more effective than IgnorePlugin with Turbopack
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

      // Ignore problematic server-side modules in client bundles
      // These might be redundant if null-loader works, but kept for Webpack compatibility
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@opentelemetry\/sdk-trace-node(\/.*)?$/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /^@opentelemetry\/context-async-hooks(\/.*)?$/,
        }),
        // Add an IgnorePlugin specifically for async_hooks itself
        // This can be more effective if resolve.fallback is not fully respected by Turbopack for this module
        new webpack.IgnorePlugin({
          resourceRegExp: /^async_hooks$/,
        })
      );
    }

    // Fix for "critial dependency: the request of a dependency is an expression"
    // often related to dynamic requires in libraries like Genkit or its dependencies.
    // This rule is for @google-cloud/functions-framework which might also try to pull in server-only things
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
