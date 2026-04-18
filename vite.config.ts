import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync, cpSync } from 'fs'
import { resolve } from 'path'

// Plugin to copy public/ assets to dist/ after build
function copyPublicAssetsPlugin() {
  return {
    name: 'copy-public-assets',
    closeBundle() {
      try {
        cpSync(resolve('./public'), resolve('./dist'), { recursive: true })
      } catch (e) {
        console.warn('cpSync failed, trying manual copy', e)
      }
    }
  }
}

export default defineConfig({
  plugins: [
    copyPublicAssetsPlugin(),
    build(),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ]
})
