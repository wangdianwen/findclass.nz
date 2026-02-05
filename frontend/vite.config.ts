import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function removeTestIdPlugin(): Plugin {
  return {
    name: 'remove-test-id',
    enforce: 'pre' as const,
    transform(code, id) {
      if (!/\.(tsx?|jsx?)$/.test(id)) return null;
      if (id.includes('node_modules')) return null;

      // Keep data-testid in development and test modes
      const isDevOrTest = process.env.NODE_ENV === 'development' ||
                          process.env.NODE_ENV === 'test' ||
                          process.env.NODE_ENV === 'storybook';
      if (isDevOrTest) return null;

      const testIdRegex = /\s+data-testid\s*=\s*["'][^"']+["']/g;
      const newCode = code.replace(testIdRegex, '');

      return {
        code: newCode,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [
    react({
      include: /node_modules\/antd.*/,
    }),
    removeTestIdPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Use JavaScript-based Sass API for path aliases
        javascriptImports: true,
      },
    },
  },
  optimizeDeps: {
    include: ['antd/es/locale/en_US', 'antd/es/locale/zh_CN', 'react-quill-new', 'quill'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-error-boundary'],
          'vendor-antd': ['antd', '@ant-design/icons', '@ant-design/cssinjs'],
          'vendor-state': ['zustand', '@tanstack/react-query'],
          'vendor-router': ['react-router-dom', 'i18next', 'react-i18next'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    cssCodeSplit: true,
    minify: 'esbuild',
  },
  server: {
    port: 3000,
    open: true,
    headers: {
      // Required for MSW to work properly with sharedArrayBuffer
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
});
