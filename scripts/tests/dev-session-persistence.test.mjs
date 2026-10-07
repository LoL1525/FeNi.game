import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { getDevAuthSecret } from '../dev-auth-secret.mjs'

const projectDirectory = resolve(import.meta.dirname, '../..')
const serverEntry = resolve(projectDirectory, 'server-dist/server.js')

async function reservePort() {
  const socket = createServer()
  await new Promise((resolveListen, reject) => {
    socket.once('error', reject)
    socket.listen(0, '127.0.0.1', resolveListen)
  })
  const address = socket.address()
  assert.ok(address && typeof address !== 'string')
  await new Promise((resolveClose, reject) => socket.close((error) => error ? reject(error) : resolveClose()))
  return address.port
}

async function startGameServer({ port, dataDirectory, backupDirectory, secret }) {
  const child = spawn(process.execPath, [serverEntry], {
    cwd: projectDirectory,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      GAME_SITE_ORIGIN: '',
      GAME_REQUIRE_HTTPS: 'false',
      GAME_AUTH_SECRET: secret,
      GAME_DATA_DIR: dataDirectory,
      GAME_BACKUP_DIR: backupDirectory,
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let output = ''
  let settled = false
  let timeout
  const ready = new Promise((resolveReady, rejectReady) => {
    const finish = (callback, value) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      callback(value)
    }
    const capture = (chunk) => {
      output += chunk.toString()
      if (output.includes(`listening on http://localhost:${port}`)) finish(resolveReady)
    }
    child.stdout.on('data', capture)
    child.stderr.on('data', capture)
    child.once('error', (error) => finish(rejectReady, error))
    child.once('exit', (code, signal) => finish(rejectReady, new Error(`Game API exited before starting (${code ?? signal}).\n${output}`)))
    timeout = setTimeout(() => {
      child.kill('SIGTERM')
      finish(rejectReady, new Error(`Timed out waiting for the game API.\n${output}`))
    }, 10_000)
  })

  await ready
  return child
}

async function stopGameServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  await new Promise((resolveExit) => {
    const forceKill = setTimeout(() => child.kill('SIGKILL'), 5_000)
    child.once('exit', () => {
      clearTimeout(forceKill)
      resolveExit()
    })
    child.kill('SIGTERM')
  })
}

function sessionCookie(response) {
  const header = response.headers.get('set-cookie')
  assert.ok(header, 'API should issue a guest-session cookie')
  return header.split(';', 1)[0]
}

test('guest save and cookie survive a development API restart', { timeout: 30_000 }, async (t) => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'cosmic-miner-session-'))
  const dataDirectory = join(temporaryDirectory, 'data')
  const backupDirectory = join(temporaryDirectory, 'backups')
  const port = await reservePort()
  const apiUrl = `http://127.0.0.1:${port}`
  let child

  t.after(async () => {
    if (child) await stopGameServer(child)
    await rm(temporaryDirectory, { recursive: true, force: true })
  })

  const firstSecret = getDevAuthSecret(dataDirectory, '')
  assert.ok(firstSecret.length >= 32)

  try {
    child = await startGameServer({ port, dataDirectory, backupDirectory, secret: firstSecret })
    const firstLoad = await fetch(`${apiUrl}/api/game`)
    assert.equal(firstLoad.status, 200)
    const firstCookie = sessionCookie(firstLoad)
    await firstLoad.json()

    const miningResponse = await fetch(`${apiUrl}/api/game/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: apiUrl, Cookie: firstCookie },
      body: JSON.stringify({ action: 'mine' }),
    })
    assert.equal(miningResponse.status, 200)
    const minedSnapshot = await miningResponse.json()
    const updatedCookie = sessionCookie(miningResponse)
    assert.equal(minedSnapshot.state.totalClicks, 1)

    await stopGameServer(child)
    child = undefined

    const nextSecret = getDevAuthSecret(dataDirectory, '')
    assert.equal(nextSecret, firstSecret, 'dev secret should be reused after the process restarts')

    child = await startGameServer({ port, dataDirectory, backupDirectory, secret: nextSecret })
    const restoredResponse = await fetch(`${apiUrl}/api/game`, { headers: { Cookie: updatedCookie } })
    assert.equal(restoredResponse.status, 200)
    const restoredSnapshot = await restoredResponse.json()
    assert.equal(restoredSnapshot.state.totalClicks, 1, 'saved game state should be loaded for the existing cookie')
    assert.deepEqual(restoredSnapshot.asteroid, minedSnapshot.asteroid, 'current asteroid should also survive the restart')
  } finally {
    if (child) {
      await stopGameServer(child)
      child = undefined
    }
  }
})
