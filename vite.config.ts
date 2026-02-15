import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: set base to /repo-name/ when deploying (e.g. VITE_BASE_PATH=/chess_app/)
export default defineConfig({
    plugins: [react()],
    base: process.env.VITE_BASE_PATH || '/',
});
