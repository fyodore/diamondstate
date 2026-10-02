import { useEffect, useState } from 'react'
import { api } from '../../api'

export default function AdminSubmissions() {
  const [items, setItems] = useState([])
  const [forms, setForms] = useState([])
  const [formFilter, setFormFilter] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/forms/')
      .then(setForms)
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    const q = formFilter ? `?form=${formFilter}` : ''
    api(`/api/submissions/${q}`)
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [formFilter])

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Submissions</h1>
        <select value={formFilter} onChange={(e) => setFormFilter(e.target.value)}>
          <option value="">All forms</option>
          {forms.map((f) => (
            <option key={f.id} value={f.slug}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      {error ? <div className="form-error">{error}</div> : null}
      <table className="table">
        <thead>
          <tr>
            <th>When</th>
            <th>Form</th>
            <th>Source</th>
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{new Date(item.created_at).toLocaleString()}</td>
              <td>{item.form_name}</td>
              <td>{item.source_page || '—'}</td>
              <td>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(item.payload, null, 2)}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length ? <p className="muted">No submissions yet.</p> : null}
    </div>
  )
}
