import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { getDevAuthSecret } from './dev-auth-secret.mjs'

const dataDirectory = resolve(process.env.GAME_DATA_DIR || './data')

const env = {
  ...process.env,
  NODE_ENV: 'development',
  GAME_AUTH_SECRET: getDevAuthSecret(dataDirectory),
  GAME_PORT: process.env.GAME_PORT || '8787',
  GAME_DATA_DIR: dataDirectory,
}
const gameServer = spawn(process.execPath, ['server-dist/server.js'], { env, stdio: 'inherit' })
const viteServer = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'], { env, stdio: 'inherit' })
let shuttingDown = false

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  gameServer.kill('SIGTERM')
  viteServer.kill('SIGTERM')
  setTimeout(() => process.exit(code), 250).unref()
}

gameServer.on('exit', (code) => { if (!shuttingDown) shutdown(code || 1) })
viteServer.on('exit', (code) => { if (!shuttingDown) shutdown(code || 0) })
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
