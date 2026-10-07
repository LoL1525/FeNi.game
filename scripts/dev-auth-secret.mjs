import { randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function validateSecret(secret) {
  if (secret.length < 32) {
    throw new Error('GAME_AUTH_SECRET must contain at least 32 characters. Keep the same secret between dev server restarts.')
  }
  return secret
}

export function getDevAuthSecret(dataDirectory, configuredSecret = process.env.GAME_AUTH_SECRET) {
  const suppliedSecret = configuredSecret?.trim()
  if (suppliedSecret) return validateSecret(suppliedSecret)

  const resolvedDataDirectory = resolve(dataDirectory)
  const secretPath = resolve(resolvedDataDirectory, '.game-auth-secret')
  mkdirSync(resolvedDataDirectory, { recursive: true })

  try {
    return validateSecret(readFileSync(secretPath, 'utf8').trim())
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }

  const generatedSecret = randomBytes(48).toString('base64url')
  try {
    writeFileSync(secretPath, generatedSecret, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
    return generatedSecret
  } catch (error) {
    // If another dev server created the file at the same time, reuse its secret.
    if (error?.code !== 'EEXIST') throw error
    return validateSecret(readFileSync(secretPath, 'utf8').trim())
  }
}
