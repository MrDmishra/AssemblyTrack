import { Hono } from 'hono'

const app = new Hono()

// This is a pure static app — all routing handled by Cloudflare Pages
// static asset serving. The worker just provides an API surface for future use.
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', app: 'AssemblyTrack' })
})

// All other requests fall through to Cloudflare Pages static assets
// (index.html and friends in public/)
export default app
