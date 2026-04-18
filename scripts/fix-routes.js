import { writeFileSync } from 'fs'
import { resolve } from 'path'

const routes = {
  version: 1,
  include: ['/api/*', '/favicon.ico'],
  exclude: ['/*']
}

writeFileSync(resolve('./dist/_routes.json'), JSON.stringify(routes, null, 2) + '\n')
