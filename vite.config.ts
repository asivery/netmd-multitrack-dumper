import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
let base = process.env.PUBLIC_URL ?? '/';
if(!base.endsWith("/")) base += '/';

console.log(`Building for base = ${base}`);

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
