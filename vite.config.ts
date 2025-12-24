
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno del sistema (Netlify las inyecta aquí)
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ""),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || ""),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY || "")
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    }
  }
})
