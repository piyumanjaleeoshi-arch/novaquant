import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';

// Load local .env with override: true
if (fs.existsSync(path.resolve(__dirname, '.env'))) {
  dotenv.config({
    path: path.resolve(__dirname, '.env'),
    override: true
  });
} else if (fs.existsSync(path.resolve(__dirname, '.env.example'))) {
  dotenv.config({
    path: path.resolve(__dirname, '.env.example'),
    override: true
  });
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      host: '0.0.0.0',

      allowedHosts: [
        'crop-angelfish-kiln.ngrok-free.dev'
      ],

      hmr: false,
      watch: null,
    },
  };
});