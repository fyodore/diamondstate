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
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [clearLogo, setClearLogo] = useState(false)
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
        setLogoUrl(data.logo_url || null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null)
      return undefined
    }
    const url = URL.createObjectURL(logoFile)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  function onLogoChosen(e) {
    const file = e.target.files?.[0] || null
    setLogoFile(file)
    setClearLogo(false)
  }

  function onClearLogo() {
    setLogoFile(null)
    setClearLogo(true)
    setLogoPreview(null)
  }

  async function save(e) {
    e.preventDefault()
    setMessage('')
    setError('')
    try {
      await ensureCsrf()
      let data
      if (logoFile || clearLogo) {
        const body = new FormData()
        Object.entries(draft).forEach(([key, value]) => {
          if (typeof value === 'boolean') body.append(key, value ? 'true' : 'false')
          else body.append(key, value ?? '')
        })
        if (logoFile) body.append('logo', logoFile)
        if (clearLogo) body.append('clear_logo', 'true')
        data = await api('/api/settings/', { method: 'PATCH', body })
      } else {
        data = await api('/api/settings/', { method: 'PATCH', body: draft })
      }
      setDraft({
        ...draft,
        ...Object.fromEntries(
          Object.keys(emptyDraft).map((key) => [key, data[key] ?? draft[key] ?? '']),
        ),
      })
      setLogoUrl(data.logo_url || null)
      setLogoFile(null)
      setClearLogo(false)
      setMessage('Settings saved. Logo and social links update across the public site.')
    } catch (err) {
      setError(err.message || 'Save failed')
    }
  }

  if (loading) return <div className="panel">Loading settings…</div>

  const shownLogo = clearLogo ? null : logoPreview || logoUrl || '/logo.png'

  return (
    <div className="panel">
      <h1>Site settings</h1>
      <p className="muted">
        Update branding, logo, and social profile URLs. Leave a social field blank to hide that
        icon in the footer.
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

        <h2>Logo</h2>
        <div className="logo-admin">
          <div className="logo-admin__preview">
            {shownLogo ? (
              <img src={shownLogo} alt="Current league logo" />
            ) : (
              <span className="muted">No logo set</span>
            )}
          </div>
          <div className="stack" style={{ flex: 1 }}>
            <div className="field">
              <label htmlFor="logo-upload">Upload new logo</label>
              <input
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                onChange={onLogoChosen}
              />
              <p className="muted" style={{ margin: 0 }}>
                PNG or JPG recommended. This updates the header and hero logo site-wide.
              </p>
            </div>
            <div className="row">
              {(logoUrl || logoFile) && !clearLogo ? (
                <button className="btn ghost" type="button" onClick={onClearLogo}>
                  Remove logo
                </button>
              ) : null}
              {clearLogo ? (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => setClearLogo(false)}
                >
                  Undo remove
                </button>
              ) : null}
            </div>
          </div>
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
