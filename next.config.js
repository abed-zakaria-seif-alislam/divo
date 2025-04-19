/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
    unoptimized: process.env.NODE_ENV === 'development',
  }
}

module.exports = nextConfig