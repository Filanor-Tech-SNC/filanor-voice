import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig =
  process.env.NODE_ENV === "development"
    ? {
        turbopack: {
          root: path.resolve(import.meta.dirname, "..", ".."),
        },
      }
    : {};

export default nextConfig;
