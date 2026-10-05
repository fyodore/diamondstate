import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ensureCsrf } from '../../api'
import { useAuth } from '../../auth'

const emptyForm = {
  username: '',
  email: '',
  password: '',
  is_superuser: false,
}

export default function AdminUsers() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [passwordEdits, setPasswordEdits] = useState({})
  const [ownPassword, setOwnPassword] = useState({
    current_password: '',
    new_password: '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setUsers(await api('/api/auth/users/'))
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  async function createUser(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await ensureCsrf()
      await api('/api/auth/users/', { method: 'POST', body: form })
      setForm(emptyForm)
      setMessage(`Created admin “${form.username}”. They can sign in with that password and register their own passkey.`)
      await load()
    } catch (err) {
      setError(err.message || 'Could not create user')
    } finally {
      setBusy(false)
    }
  }

  async function setUserPassword(userId) {
    const password = (passwordEdits[userId] || '').trim()
    if (!password) {
      setError('Enter a new password first.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await ensureCsrf()
      await api(`/api/auth/users/${userId}/`, {
        method: 'PATCH',
        body: { password },
      })
      setPasswordEdits((prev) => ({ ...prev, [userId]: '' }))
      setMessage('Password updated.')
      await load()
    } catch (err) {
      setError(err.message || 'Could not update password')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(target) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await ensureCsrf()
      await api(`/api/auth/users/${target.id}/`, {
        method: 'PATCH',
        body: { is_active: !target.is_active },
      })
      setMessage(
        target.is_active
          ? `Deactivated “${target.username}”.`
          : `Reactivated “${target.username}”.`,
      )
      await load()
    } catch (err) {
      setError(err.message || 'Could not update user')
    } finally {
      setBusy(false)
    }
  }

  async function changeOwnPassword(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await ensureCsrf()
      await api('/api/auth/change-password/', {
        method: 'POST',
        body: ownPassword,
      })
      setOwnPassword({ current_password: '', new_password: '' })
      setMessage('Your password was updated.')
    } catch (err) {
      setError(err.message || 'Could not change password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="panel stack">
        <h1 style={{ margin: 0 }}>Admin users</h1>
        <p className="muted">
          Each admin has their own password. After they sign in, they can register passkeys for
          their account on the <Link to="/manage/passkeys">Passkeys</Link> page.
        </p>
        {message ? <div className="form-success">{message}</div> : null}
        {error ? <div className="form-error">{error}</div> : null}
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0 }}>Create admin</h2>
        <form className="stack" onSubmit={createUser}>
          <div className="row">
            <div className="field" style={{ flex: 1, minWidth: '12rem' }}>
              <label htmlFor="new-username">Username</label>
              <input
                id="new-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoComplete="off"
                required
              />
            </div>
            <div className="field" style={{ flex: 1, minWidth: '12rem' }}>
              <label htmlFor="new-email">Email</label>
              <input
                id="new-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="off"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="new-password">Password</label>
            <input
              id="new-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              required
            />
          </div>
          {user?.is_superuser ? (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.is_superuser}
                onChange={(e) => setForm({ ...form, is_superuser: e.target.checked })}
              />
              <span>Superuser (can manage other admins’ passwords)</span>
            </label>
          ) : null}
          <button className="btn" type="submit" disabled={busy}>
            Create admin user
          </button>
        </form>
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0 }}>Your password</h2>
        <form className="stack" onSubmit={changeOwnPassword}>
          <div className="row">
            <div className="field" style={{ flex: 1, minWidth: '12rem' }}>
              <label htmlFor="current-password">Current password</label>
              <input
                id="current-password"
                type="password"
                value={ownPassword.current_password}
                onChange={(e) =>
                  setOwnPassword({ ...ownPassword, current_password: e.target.value })
                }
                autoComplete="current-password"
                required
              />
            </div>
            <div className="field" style={{ flex: 1, minWidth: '12rem' }}>
              <label htmlFor="own-new-password">New password</label>
              <input
                id="own-new-password"
                type="password"
                value={ownPassword.new_password}
                onChange={(e) =>
                  setOwnPassword({ ...ownPassword, new_password: e.target.value })
                }
                autoComplete="new-password"
                required
              />
            </div>
          </div>
          <button className="btn secondary" type="submit" disabled={busy}>
            Update my password
          </button>
        </form>
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0 }}>Existing admins</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Passkeys</th>
              <th>Status</th>
              <th>Password</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const canResetPassword = user?.is_superuser || u.id === user?.id
              return (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.email || '—'}</td>
                  <td>{u.is_superuser ? 'Superuser' : 'Staff'}</td>
                  <td>{u.passkey_count}</td>
                  <td>
                    <span className="badge">{u.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td>
                    {canResetPassword ? (
                      <div className="row">
                        <input
                          type="password"
                          placeholder="New password"
                          value={passwordEdits[u.id] || ''}
                          onChange={(e) =>
                            setPasswordEdits((prev) => ({
                              ...prev,
                              [u.id]: e.target.value,
                            }))
                          }
                          autoComplete="new-password"
                          style={{ minWidth: '10rem' }}
                        />
                        <button
                          className="btn secondary"
                          type="button"
                          disabled={busy}
                          onClick={() => setUserPassword(u.id)}
                        >
                          Set
                        </button>
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {u.id === user?.id ? (
                      <span className="muted">You</span>
                    ) : (
                      <button
                        className="btn ghost"
                        type="button"
                        disabled={busy}
                        onClick={() => toggleActive(u)}
                      >
                        {u.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
