/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep the Node WebSocket transport intact in production route handlers.
  serverExternalPackages: ["socket.io-client"],
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
  poweredByHeader: false,
  devIndicators: false,
  experimental: {
    agentUpgrade: "security",
  },
  // Preserve the canonical pages, booking query parameters and authorization flow.
  redirects: async () =>
    [
      ["/movies", "/phim"],
      ["/booking", "/dat-ve"],
      ["/checkout", "/dat-ve"],
      ["/tickets", "/tai-khoan#ve-cua-toi"],
      ["/admin", "/quan-tri"],
      ["/staff", "/soat-ve"],
    ].map(([source, destination]) => ({
      source,
      destination,
      permanent: false,
    })),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
    ],
  },
};
export default nextConfig;
