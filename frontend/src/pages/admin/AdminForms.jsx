import { useEffect, useRef, useState } from 'react'
import { api } from '../../api'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'multicheckbox', label: 'Multi-checkbox' },
  { value: 'number', label: 'Number' },
]

const emptyForm = {
  name: '',
  slug: '',
  intro_text: '',
  success_message: 'Thanks for your interest!',
  is_active: true,
  notify_email: '',
  email_enabled: false,
}

let fieldUid = 0
function nextFieldUid() {
  fieldUid += 1
  return `field-${fieldUid}`
}

function emptyField(order = 0) {
  return {
    _uid: nextFieldUid(),
    label: '',
    field_key: '',
    field_type: 'text',
    options: [],
    required: true,
    placeholder: '',
    order,
  }
}

function withClientIds(fields) {
  return (fields || []).map((field, order) => ({
    ...field,
    _uid: field._uid || (field.id ? `db-${field.id}` : nextFieldUid()),
    order,
  }))
}

export default function AdminForms() {
  const [forms, setForms] = useState([])
  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState(emptyForm)
  const [fields, setFields] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)
  const dragIndexRef = useRef(null)

  async function load() {
    setForms(await api('/api/forms/'))
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  async function openForm(slug) {
    const form = await api(`/api/forms/${slug}/`)
    setSelected(form)
    setDraft({
      name: form.name,
      slug: form.slug,
      intro_text: form.intro_text,
      success_message: form.success_message,
      is_active: form.is_active,
      notify_email: form.notify_email || '',
      email_enabled: form.email_enabled,
    })
    setFields(withClientIds(form.fields || []))
    setMessage('')
  }

  function startNew() {
    setSelected(null)
    setDraft(emptyForm)
    setFields([emptyField(0)])
  }

  function reorderFields(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex == null || toIndex == null) return
    setFields((current) => {
      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next.map((field, order) => ({ ...field, order }))
    })
  }

  function onFieldDragStart(index, event) {
    dragIndexRef.current = index
    setDragIndex(index)
    setOverIndex(index)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }

  function onFieldDragOver(index, event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (overIndex !== index) setOverIndex(index)
  }

  function onFieldDrop(index, event) {
    event.preventDefault()
    const from = dragIndexRef.current ?? Number(event.dataTransfer.getData('text/plain'))
    reorderFields(from, index)
    dragIndexRef.current = null
    setDragIndex(null)
    setOverIndex(null)
  }

  function onFieldDragEnd() {
    dragIndexRef.current = null
    setDragIndex(null)
    setOverIndex(null)
  }

  async function saveForm(e) {
    e.preventDefault()
    setError('')
    try {
      let form
      if (selected) {
        form = await api(`/api/forms/${selected.slug}/`, { method: 'PATCH', body: draft })
        const existing = await api(`/api/form-fields/?form=${selected.slug}`)
        await Promise.all(existing.map((f) => api(`/api/form-fields/${f.id}/`, { method: 'DELETE' })))
      } else {
        form = await api('/api/forms/', { method: 'POST', body: draft })
      }
      for (const [order, field] of fields.entries()) {
        await api('/api/form-fields/', {
          method: 'POST',
          body: {
            form: form.id,
            label: field.label,
            field_key: field.field_key || field.label.toLowerCase().replace(/\s+/g, '_'),
            field_type: field.field_type,
            options:
              typeof field.options === 'string'
                ? field.options.split('\n').map((s) => s.trim()).filter(Boolean)
                : field.options || [],
            required: field.required,
            placeholder: field.placeholder || '',
            order,
          },
        })
      }
      setMessage('Form saved')
      await load()
      await openForm(form.slug)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0 }}>Forms</h1>
          <button className="btn" type="button" onClick={startNew}>
            New form
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {forms.map((form) => (
              <tr key={form.id}>
                <td>{form.name}</td>
                <td>{form.slug}</td>
                <td>{form.is_active ? 'Yes' : 'No'}</td>
                <td>
                  <button className="btn secondary" type="button" onClick={() => openForm(form.slug)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>{selected ? `Edit: ${selected.name}` : 'Create form'}</h2>
        <form className="stack" onSubmit={saveForm}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Name</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                required
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Slug</label>
              <input
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="field">
            <label>Intro text</label>
            <textarea
              value={draft.intro_text}
              onChange={(e) => setDraft({ ...draft, intro_text: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Success message</label>
            <input
              value={draft.success_message}
              onChange={(e) => setDraft({ ...draft, success_message: e.target.value })}
            />
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Notify email (future)</label>
              <input
                type="email"
                value={draft.notify_email}
                onChange={(e) => setDraft({ ...draft, notify_email: e.target.value })}
              />
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draft.email_enabled}
                onChange={(e) => setDraft({ ...draft, email_enabled: e.target.checked })}
              />
              Email enabled later
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Fields</h3>
            <span className="muted">Drag the handle to reorder</span>
          </div>
          {fields.map((field, index) => (
            <div
              className={[
                'panel',
                'field-card',
                dragIndex === index ? 'is-dragging' : '',
                overIndex === index && dragIndex !== index ? 'is-drop-target' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={field._uid}
              onDragOver={(e) => onFieldDragOver(index, e)}
              onDrop={(e) => onFieldDrop(index, e)}
            >
              <div className="row field-card__header">
                <button
                  type="button"
                  className="drag-handle"
                  draggable
                  aria-label={`Drag to reorder ${field.label || `field ${index + 1}`}`}
                  title="Drag to reorder"
                  onDragStart={(e) => onFieldDragStart(index, e)}
                  onDragEnd={onFieldDragEnd}
                >
                  <span aria-hidden="true">⋮⋮</span>
                </button>
                <span className="badge">Field {index + 1}</span>
                <span className="muted">{field.label || 'Untitled field'}</span>
              </div>
              <div className="row">
                <div className="field" style={{ flex: 1 }}>
                  <label>Label</label>
                  <input
                    value={field.label}
                    onChange={(e) => {
                      const next = [...fields]
                      next[index] = { ...field, label: e.target.value }
                      setFields(next)
                    }}
                    required
                  />
                </div>
                <div className="field">
                  <label>Key</label>
                  <input
                    value={field.field_key}
                    onChange={(e) => {
                      const next = [...fields]
                      next[index] = { ...field, field_key: e.target.value }
                      setFields(next)
                    }}
                    placeholder="auto from label"
                  />
                </div>
                <div className="field">
                  <label>Type</label>
                  <select
                    value={field.field_type}
                    onChange={(e) => {
                      const next = [...fields]
                      next[index] = { ...field, field_type: e.target.value }
                      setFields(next)
                    }}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {field.field_type === 'select' || field.field_type === 'multicheckbox' ? (
                <div className="field">
                  <label>
                    Options (one per line)
                    {field.field_type === 'multicheckbox'
                      ? ' — each becomes a checkbox people can select'
                      : ''}
                  </label>
                  <textarea
                    value={Array.isArray(field.options) ? field.options.join('\n') : field.options}
                    onChange={(e) => {
                      const next = [...fields]
                      next[index] = { ...field, options: e.target.value }
                      setFields(next)
                    }}
                    placeholder={"Option A\nOption B\nOption C"}
                  />
                </div>
              ) : null}
              <div className="row">
                <div className="field" style={{ flex: 1 }}>
                  <label>Placeholder</label>
                  <input
                    value={field.placeholder || ''}
                    onChange={(e) => {
                      const next = [...fields]
                      next[index] = { ...field, placeholder: e.target.value }
                      setFields(next)
                    }}
                  />
                </div>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => {
                      const next = [...fields]
                      next[index] = { ...field, required: e.target.checked }
                      setFields(next)
                    }}
                  />
                  Required
                </label>
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => setFields(fields.filter((_, i) => i !== index))}
                >
                  Remove field
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn secondary"
            onClick={() => setFields([...fields, emptyField(fields.length)])}
          >
            Add field
          </button>

          {message ? <div className="form-success">{message}</div> : null}
          {error ? <div className="form-error">{error}</div> : null}
          <button className="btn" type="submit">
            Save form
          </button>
        </form>
      </div>
    </div>
  )
}
