import { useEffect, useState } from 'react'
import { api } from '../../api'

const emptyBlock = {
  name: '',
  block_type: 'rich_text',
  content: { heading: '', body: '' },
  is_active: true,
}

function defaultContent(type) {
  switch (type) {
    case 'hero':
      return {
        headline: '',
        subheadline: '',
        show_logo: true,
        cta_label: '',
        cta_href: '',
      }
    case 'image':
      return { heading: '', src: '', alt: '', caption: '' }
    case 'cta':
      return { heading: '', body: '', button_label: '', button_href: '' }
    case 'form':
      return { form_slug: 'interest' }
    default:
      return { heading: '', body: '' }
  }
}

export default function AdminBlocks() {
  const [blocks, setBlocks] = useState([])
  const [forms, setForms] = useState([])
  const [draft, setDraft] = useState(emptyBlock)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const [b, f] = await Promise.all([api('/api/blocks/'), api('/api/forms/')])
    setBlocks(b)
    setForms(f)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  function startNew() {
    setEditingId(null)
    setDraft(emptyBlock)
    setMessage('')
  }

  function editBlock(block) {
    setEditingId(block.id)
    setDraft({
      name: block.name,
      block_type: block.block_type,
      content: block.content || defaultContent(block.block_type),
      is_active: block.is_active,
    })
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    try {
      if (editingId) {
        await api(`/api/blocks/${editingId}/`, { method: 'PATCH', body: draft })
      } else {
        await api('/api/blocks/', { method: 'POST', body: draft })
      }
      setMessage('Block saved')
      await load()
      startNew()
    } catch (err) {
      setError(err.message)
    }
  }

  const content = draft.content || {}

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0 }}>Block library</h1>
          <button className="btn" type="button" onClick={startNew}>
            New block
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => (
              <tr key={block.id}>
                <td>{block.name}</td>
                <td>{block.block_type}</td>
                <td>{block.is_active ? 'Yes' : 'No'}</td>
                <td>
                  <button className="btn secondary" type="button" onClick={() => editBlock(block)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>{editingId ? 'Edit block' : 'Create block'}</h2>
        <form className="stack" onSubmit={save}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Name</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Type</label>
              <select
                value={draft.block_type}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    block_type: e.target.value,
                    content: defaultContent(e.target.value),
                  })
                }
              >
                <option value="hero">Hero</option>
                <option value="rich_text">Rich text</option>
                <option value="image">Image</option>
                <option value="cta">CTA</option>
                <option value="form">Form</option>
              </select>
            </div>
          </div>

          {draft.block_type === 'hero' ? (
            <>
              <div className="field">
                <label>Headline</label>
                <input
                  value={content.headline || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, content: { ...content, headline: e.target.value } })
                  }
                />
              </div>
              <div className="field">
                <label>Subheadline</label>
                <textarea
                  value={content.subheadline || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, content: { ...content, subheadline: e.target.value } })
                  }
                />
              </div>
              <div className="row">
                <div className="field" style={{ flex: 1 }}>
                  <label>CTA label</label>
                  <input
                    value={content.cta_label || ''}
                    onChange={(e) =>
                      setDraft({ ...draft, content: { ...content, cta_label: e.target.value } })
                    }
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>CTA href</label>
                  <input
                    value={content.cta_href || ''}
                    onChange={(e) =>
                      setDraft({ ...draft, content: { ...content, cta_href: e.target.value } })
                    }
                  />
                </div>
              </div>
            </>
          ) : null}

          {draft.block_type === 'rich_text' ? (
            <>
              <div className="field">
                <label>Heading</label>
                <input
                  value={content.heading || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, content: { ...content, heading: e.target.value } })
                  }
                />
              </div>
              <div className="field">
                <label>Body</label>
                <textarea
                  value={content.body || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, content: { ...content, body: e.target.value } })
                  }
                  required
                />
              </div>
            </>
          ) : null}

          {draft.block_type === 'cta' ? (
            <>
              <div className="field">
                <label>Heading</label>
                <input
                  value={content.heading || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, content: { ...content, heading: e.target.value } })
                  }
                />
              </div>
              <div className="field">
                <label>Body</label>
                <textarea
                  value={content.body || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, content: { ...content, body: e.target.value } })
                  }
                />
              </div>
              <div className="row">
                <div className="field" style={{ flex: 1 }}>
                  <label>Button label</label>
                  <input
                    value={content.button_label || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        content: { ...content, button_label: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Button href</label>
                  <input
                    value={content.button_href || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        content: { ...content, button_href: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </>
          ) : null}

          {draft.block_type === 'image' ? (
            <>
              <div className="field">
                <label>Image URL</label>
                <input
                  value={content.src || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, content: { ...content, src: e.target.value } })
                  }
                />
              </div>
              <div className="field">
                <label>Alt text</label>
                <input
                  value={content.alt || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, content: { ...content, alt: e.target.value } })
                  }
                />
              </div>
            </>
          ) : null}

          {draft.block_type === 'form' ? (
            <div className="field">
              <label>Form</label>
              <select
                value={content.form_slug || ''}
                onChange={(e) =>
                  setDraft({ ...draft, content: { ...content, form_slug: e.target.value } })
                }
              >
                {forms.map((f) => (
                  <option key={f.id} value={f.slug}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
            />
            Active
          </label>

          {message ? <div className="form-success">{message}</div> : null}
          {error ? <div className="form-error">{error}</div> : null}
          <button className="btn" type="submit">
            Save block
          </button>
        </form>
      </div>
    </div>
  )
}
