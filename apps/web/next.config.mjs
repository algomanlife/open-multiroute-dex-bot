/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@omdb/ui", "@luxalgo/vela", "@luxalgo/vela-ui"],
  output: "standalone",
  webpack: (config, { webpack }) => {
    // @coinbase/cdp-sdk (optional deep dependency of wagmi's coinbase
    // connector) references optional @x402/* packages that don't ship browser
    // builds. They are only touched by x402 payment flows we never execute —
    // ignore them at bundle time.
    config.plugins = [
      ...(config.plugins ?? []),
      new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// })
    ];
    return config;
  }
};

export default nextConfig;
