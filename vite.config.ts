import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

/**
 * Com os mocks ligados, o chunk do backend simulado (e o que ele importa) entra no HTML como
 * `modulepreload`: baixa junto com o shell, em vez de esperar o `main.tsx` executar para pedi-lo.
 * Sem mocks o chunk nem existe e nada é injetado.
 */
function preloadMocks(): Plugin {
  return {
    name: 'kurio:preload-mocks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle }) {
        const chunks = Object.values(bundle ?? {}).flatMap((c) => (c.type === 'chunk' ? [c] : []))
        const mocks = chunks.find((c) => c.facadeModuleId?.endsWith('/src/mocks/browser.ts'))
        if (!mocks) return
        return [mocks.fileName, ...mocks.imports]
          .filter((file) => !chunks.find((c) => c.fileName === file)?.isEntry)
          .map((file) => ({
            tag: 'link',
            attrs: { rel: 'modulepreload', crossorigin: true, href: `/${file}` },
            injectTo: 'head' as const,
          }))
      },
    },
  }
}

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    preloadMocks(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
