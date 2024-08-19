/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            {
              key: "Content-Security-Policy",
              value: `
                  default-src 'self';
                  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
                  style-src 'self' 'unsafe-inline';
                  img-src 'self' https://raw.githubusercontent.com;
                  connect-src 'self' ${process.env.NEXT_PUBLIC_FLOWISE_API_HOST} ${process.env.NEXT_PUBLIC_WEBSOCKET_URL};
                  media-src 'self' https://cdn.jsdelivr.net;
                  frame-ancestors 'self' https://dscvr.one;
                  object-src 'none';
                  base-uri 'self';
                `
                .replace(/\s{2,}/g, " ")
                .trim(), 
            },
          ],
        },
      ];
    },
  };
  
  export default nextConfig;