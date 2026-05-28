/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output port will be set in Dockerfile, but we can set a base path if needed
  // For now, we'll keep it default and rely on Docker mapping
  reactStrictMode: true,
  // We'll add any custom configurations here if needed
  // For example, images, webpack, etc.
}

module.exports = nextConfig