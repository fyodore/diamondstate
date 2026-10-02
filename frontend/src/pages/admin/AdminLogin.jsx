import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  api,
  ensureCsrf,
  preparePublicKeyOptions,
  publicKeyCredentialToJSON,
} from '../../api'
import { useAuth } from '../../auth'

export default function AdminLogin() {
  const { user, login, setUser } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user?.is_staff) return <Navigate to="/manage" replace />

  async function onPasswordLogin(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username, password)
      navigate('/manage')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  async function onPasskeyLogin() {
    setBusy(true)
    setError('')
    try {
      await ensureCsrf()
      const options = await api('/api/auth/passkey/login/options/', {
        method: 'POST',
        body: { username },
      })
      const cred = await navigator.credentials.get({
        publicKey: preparePublicKeyOptions(options),
      })
      const payload = publicKeyCredentialToJSON(cred)
      const data = await api('/api/auth/passkey/login/verify/', {
        method: 'POST',
        body: payload,
      })
      setUser(data.user)
      navigate('/manage')
    } catch (err) {
      setError(err.message || 'Passkey login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card stack">
        <div>
          <h1 style={{ margin: 0, color: 'var(--navy)' }}>Admin login</h1>
          <p className="muted">Password or passkey for Diamond State Softball League.</p>
        </div>
        <form className="stack" onSubmit={onPasswordLogin}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error ? <div className="form-error">{error}</div> : null}
          <button className="btn" type="submit" disabled={busy}>
            Sign in with password
          </button>
        </form>
        <button className="btn secondary" type="button" onClick={onPasskeyLogin} disabled={busy}>
          Sign in with passkey
        </button>
        <Link to="/" className="muted">
          ← Back to site
        </Link>
      </div>
    </div>
  )
}
