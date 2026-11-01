import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('./standalone/web',import.meta.url)),plugins:[react()],server:{fs:{allow:[fileURLToPath(new URL('.',import.meta.url))]}},build:{outDir:'../../standalone-dist',emptyOutDir:true}});
