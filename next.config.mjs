/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  // distDir se usa para el export cuando output: 'export' está habilitado
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Eliminamos assetPrefix y basePath para evitar problemas con Live Server
  assetPrefix: '',
  basePath: '',
}

export default nextConfig
