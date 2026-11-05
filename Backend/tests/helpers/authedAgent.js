import request from 'supertest'
import jwt from 'jsonwebtoken'
import { env } from '../../src/config/env.js'
import { createUser } from './factories.js'

/**
 * Creates an authenticated SuperTest agent with cookies and the mandatory CSRF header.
 *
 * @param {import('express').Application} app
 * @param {'customer'|'seller'|'admin'} role
 * @param {Object} [userOverrides]
 * @returns {Promise<{ agent: import('supertest').SuperAgentTest, user: any, token: string }>}
 */
export async function authedAgent(app, role = 'customer', userOverrides = {}) {
  const user = await createUser({ role, ...userOverrides })

  // Sign access token matching server configuration
  const token = jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  )

  const agent = request.agent(app)

  // Attach auth cookie & CSRF header defaults
  agent.set('Cookie', [`lh_at=${token}`])
  agent.set('X-Requested-With', 'lh-web')
  agent.set('Origin', env.CLIENT_ORIGINS_ARRAY[0] || 'http://localhost:5173')

  return { agent, user, token }
}

export default authedAgent

