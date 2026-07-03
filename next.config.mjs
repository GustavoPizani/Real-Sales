/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    // No Windows, o cache em disco do webpack (.next/cache/webpack/*.pack.gz) é
    // frequentemente travado por antivírus/indexação, causando erros ENOENT
    // aleatórios em dev. Cache em memória evita esse conflito de arquivos.
    if (dev) {
      config.cache = { type: 'memory' }
    }
    return config
  },
}

export default nextConfig
