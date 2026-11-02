import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Connect, Plugin } from 'vite'

function installDemoApi(middlewares: Connect.Server) {
  middlewares.use((request, response, next) => {
    const path = request.url?.split('?')[0]
    if (path !== '/api/demo/success' && path !== '/api/demo/failure') return next()
    const failed = path === '/api/demo/failure'
    response.statusCode = failed ? 503 : 200
    response.setHeader('Content-Type', 'application/json')
    response.setHeader('Cache-Control', 'no-store')
    response.end(JSON.stringify({ demo: true, message: failed ? 'Intentional demo failure' : 'Demo API ready' }))
  })
}

function demoApi(): Plugin {
  return {
    name: 'local-demo-api',
    configureServer(server) { installDemoApi(server.middlewares) },
    configurePreviewServer(server) { installDemoApi(server.middlewares) },
  }
}

export default defineConfig({
  plugins: [react(), demoApi()],
})
