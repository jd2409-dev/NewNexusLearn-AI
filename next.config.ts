
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

      // Ignore problematic server-side modules in client bundles
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@opentelemetry\/sdk-trace-node$/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /^@opentelemetry\/context-async-hooks$/,
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

