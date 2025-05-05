import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import react from '@vitejs/plugin-react'
import inject from '@rollup/plugin-inject';
let base = process.env.PUBLIC_URL ?? '/';
if(!base.endsWith("/")) base += '/';

console.log(`Building for base = ${base}`);

// https://vitejs.dev/config/
export default ({ mode }: { mode: any }) => {
  return defineConfig({
    base,
    plugins: [
      react(),
      nodePolyfills({
        globals: {
          Buffer: false,
        },
        exclude: ['buffer'],
      }),
    ],
    build: {
      commonjsOptions: { transformMixedEsModules: true },
      rollupOptions: {
        plugins: [inject({ Buffer: ['buffer', 'Buffer'] })],
      },
    }
  })
}
