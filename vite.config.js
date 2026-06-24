import { transformAsync } from '@babel/core';
import { defineConfig } from 'vite';

function babelTsx() {
  return {
    name: 'local-babel-tsx',
    enforce: 'pre',
    async transform(code, id) {
      if (!/\.[cm]?[tj]sx?(?:\?.*)?$/.test(id) || id.includes('/node_modules/') || id.includes('\\node_modules\\')) {
        return null;
      }
      const result = await transformAsync(code, {
        filename: id,
        sourceMaps: true,
        babelrc: false,
        configFile: false,
        presets: [
          '@babel/preset-typescript',
          ['@babel/preset-react', { runtime: 'automatic', development: process.env.NODE_ENV !== 'production' }],
        ],
      });
      if (!result?.code) return null;
      return { code: result.code, map: result.map };
    },
  };
}

export default defineConfig({
  base: './',
  esbuild: false,
  optimizeDeps: {
    noDiscovery: true,
    include: [],
  },
  build: {
    minify: false,
    cssMinify: false,
  },
  plugins: [babelTsx()],
});

