/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@neondatabase/serverless', 'bcryptjs'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  // Evitar que variáveis de ambiente sejam acessadas durante build
  env: {},
  // Configurações para evitar problemas de build
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@neondatabase/serverless')
    }
    return config
  },
}

export default nextConfig
