import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [],
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
  },
});
