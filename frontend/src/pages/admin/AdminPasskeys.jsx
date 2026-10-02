import { useEffect, useState } from 'react'
import {
  api,
  ensureCsrf,
  preparePublicKeyOptions,
  publicKeyCredentialToJSON,
} from '../../api'

export default function AdminPasskeys() {
  const [passkeys, setPasskeys] = useState([])
  const [deviceName, setDeviceName] = useState('My passkey')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setPasskeys(await api('/api/auth/passkeys/'))
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  async function registerPasskey() {
    setError('')
    setMessage('')
    try {
      await ensureCsrf()
      const options = await api('/api/auth/passkey/register/options/', { method: 'POST' })
      const cred = await navigator.credentials.create({
        publicKey: preparePublicKeyOptions(options),
      })
      const payload = publicKeyCredentialToJSON(cred)
      payload.device_name = deviceName
      await api('/api/auth/passkey/register/verify/', { method: 'POST', body: payload })
      setMessage('Passkey registered')
      await load()
    } catch (err) {
      setError(err.message || 'Could not register passkey')
    }
  }

  return (
    <div className="panel stack">
      <h1 style={{ margin: 0 }}>Passkeys</h1>
      <p className="muted">
        Register a passkey on this device after signing in with your password. You can then use it
        on the admin login screen.
      </p>
      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label>Device name</label>
          <input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} />
        </div>
        <button className="btn" type="button" onClick={registerPasskey}>
          Register passkey
        </button>
      </div>
      {message ? <div className="form-success">{message}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Created</th>
            <th>Last used</th>
          </tr>
        </thead>
        <tbody>
          {passkeys.map((p) => (
            <tr key={p.id}>
              <td>{p.device_name}</td>
              <td>{new Date(p.created_at).toLocaleString()}</td>
              <td>{p.last_used_at ? new Date(p.last_used_at).toLocaleString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
