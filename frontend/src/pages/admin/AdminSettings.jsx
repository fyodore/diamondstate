import { useEffect, useState } from 'react'
import { api, ensureCsrf } from '../../api'
import { SOCIAL_PLATFORMS } from '../../components/SocialLinks'

const emptyDraft = {
  league_name: '',
  location: '',
  motto: '',
  facebook_url: '',
  instagram_url: '',
  threads_url: '',
  x_url: '',
  bluesky_url: '',
  youtube_url: '',
  notify_email: '',
  email_enabled: false,
}

export default function AdminSettings() {
  const [draft, setDraft] = useState(emptyDraft)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/settings/')
      .then((data) => {
        setDraft({
          league_name: data.league_name || '',
          location: data.location || '',
          motto: data.motto || '',
          facebook_url: data.facebook_url || '',
          instagram_url: data.instagram_url || '',
          threads_url: data.threads_url || '',
          x_url: data.x_url || '',
          bluesky_url: data.bluesky_url || '',
          youtube_url: data.youtube_url || '',
          notify_email: data.notify_email || '',
          email_enabled: Boolean(data.email_enabled),
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function save(e) {
    e.preventDefault()
    setMessage('')
    setError('')
    try {
      await ensureCsrf()
      const data = await api('/api/settings/', { method: 'PATCH', body: draft })
      setDraft({
        ...draft,
        ...Object.fromEntries(
          Object.keys(emptyDraft).map((key) => [key, data[key] ?? draft[key] ?? '']),
        ),
      })
      setMessage('Settings saved. Social links with URLs will show in the footer.')
    } catch (err) {
      setError(err.message || 'Save failed')
    }
  }

  if (loading) return <div className="panel">Loading settings…</div>

  return (
    <div className="panel">
      <h1>Site settings</h1>
      <p className="muted">
        Add profile URLs for social platforms. Leave a field blank to hide that icon in the footer.
      </p>
      <form className="stack" onSubmit={save}>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>League name</label>
            <input
              value={draft.league_name}
              onChange={(e) => setDraft({ ...draft, league_name: e.target.value })}
              required
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Location</label>
            <input
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            />
          </div>
        </div>
        <div className="field">
          <label>Motto</label>
          <input
            value={draft.motto}
            onChange={(e) => setDraft({ ...draft, motto: e.target.value })}
          />
        </div>

        <h2>Social media</h2>
        <div className="stack">
          {SOCIAL_PLATFORMS.map(({ key, label, Icon }) => (
            <div className="field social-admin-field" key={key}>
              <label htmlFor={key}>
                <span className="social-admin-label">
                  <Icon />
                  {label}
                </span>
              </label>
              <input
                id={key}
                type="url"
                placeholder={`https://…`}
                value={draft[key] || ''}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>

        {message ? <div className="form-success">{message}</div> : null}
        {error ? <div className="form-error">{error}</div> : null}
        <button className="btn" type="submit">
          Save settings
        </button>
      </form>
    </div>
  )
}
