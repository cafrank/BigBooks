/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3000/v1',
  },
  experimental: {
    allowedDevOrigins: [
      'http://localhost:3001', // Example: your local development origin
      'http://192.168.1.64:3001', // Example: a custom local domain
      '*.osafo.com', // Example: allowing subdomains of a custom local domain
      // Add any other origins you need to allow during development
    ],
  },
};

module.exports = nextConfig;
