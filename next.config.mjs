const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export is only needed for the GitHub Pages build; dev runs as a
  // normal server so the Spotlight editor can save (see `.dev.js` routes).
  output: isProd ? "export" : undefined,
  pageExtensions: isProd ? ["jsx", "js"] : ["jsx", "js", "dev.js"],
  basePath: isProd ? "/ArtPortfolio" : "",
  assetPrefix: isProd ? "/ArtPortfolio/" : "",
  images: { unoptimized: true },
  trailingSlash: true,
  env: { NEXT_PUBLIC_BASE_PATH: isProd ? "/ArtPortfolio" : "" },
};

export default nextConfig;
