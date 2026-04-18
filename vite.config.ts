import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync, cpSync } from 'fs'
import { resolve } from 'path'

// Plugin to copy public/ assets to dist/ and fix _routes.json after build
function copyPublicAssetsPlugin() {
  return {
    name: 'copy-public-assets',
    closeBundle() {
      // Copy public/ contents into dist/
      try {
        cpSync(resolve('./public'), resolve('./dist'), { recursive: true })
      } catch (e) {
        console.warn('cpSync failed, trying manual copy', e)
      }
      // Override _routes.json so only /api/* goes through the worker
      const routes = JSON.stringify({ version: 1, include: ['/api/*'], exclude: ['/*'] })
      try {
        const fs = require('fs')
        fs.writeFileSync(resolve('./dist/_routes.json'), routes + '\n')
      } catch {}
    }
  }
}

export default defineConfig({
  plugins: [
    build(),
    copyPublicAssetsPlugin(),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ]
})
