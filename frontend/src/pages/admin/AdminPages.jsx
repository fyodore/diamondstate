import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'

const emptyPage = {
  title: '',
  slug: '',
  nav_label: '',
  is_published: true,
  show_in_nav: true,
  nav_order: 0,
  meta_description: '',
}

export default function AdminPages() {
  const [pages, setPages] = useState([])
  const [blocks, setBlocks] = useState([])
  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState(emptyPage)
  const [placements, setPlacements] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const [p, b] = await Promise.all([api('/api/pages/'), api('/api/blocks/')])
    setPages(p)
    setBlocks(b)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  async function openPage(slug) {
    setMessage('')
    setError('')
    const page = await api(`/api/pages/${slug}/`)
    setSelected(page)
    setDraft({
      title: page.title,
      slug: page.slug,
      nav_label: page.nav_label,
      is_published: page.is_published,
      show_in_nav: page.show_in_nav,
      nav_order: page.nav_order,
      meta_description: page.meta_description || '',
    })
    setPlacements(
      page.page_blocks.map((pb) => ({
        block_id: pb.block.id,
        order: pb.order,
        override: pb.override || {},
      })),
    )
  }

  function startNew() {
    setSelected(null)
    setDraft({ ...emptyPage, nav_order: pages.length })
    setPlacements([])
    setMessage('')
    setError('')
  }

  async function savePage(e) {
    e.preventDefault()
    setError('')
    try {
      let page
      if (selected) {
        page = await api(`/api/pages/${selected.slug}/`, {
          method: 'PATCH',
          body: draft,
        })
      } else {
        page = await api('/api/pages/', { method: 'POST', body: draft })
      }
      await api(`/api/pages/${page.slug}/blocks/`, {
        method: 'PUT',
        body: placements,
      })
      setMessage('Page saved')
      await load()
      await openPage(page.slug)
    } catch (err) {
      setError(err.message || 'Save failed')
    }
  }

  function move(index, dir) {
    const next = [...placements]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setPlacements(next.map((item, order) => ({ ...item, order })))
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0 }}>Pages</h1>
          <button className="btn" type="button" onClick={startNew}>
            New page
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Nav</th>
              <th>Published</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id}>
                <td>{page.title}</td>
                <td>{page.slug}</td>
                <td>{page.show_in_nav ? page.nav_order : '—'}</td>
                <td>{page.is_published ? 'Yes' : 'No'}</td>
                <td>
                  <button className="btn secondary" type="button" onClick={() => openPage(page.slug)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>{selected ? `Edit: ${selected.title}` : 'Create page'}</h2>
        <form className="stack" onSubmit={savePage}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Title</label>
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
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
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Nav label</label>
              <input
                value={draft.nav_label}
                onChange={(e) => setDraft({ ...draft, nav_label: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Nav order</label>
              <input
                type="number"
                value={draft.nav_order}
                onChange={(e) => setDraft({ ...draft, nav_order: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="field">
            <label>Meta description</label>
            <input
              value={draft.meta_description}
              onChange={(e) => setDraft({ ...draft, meta_description: e.target.value })}
            />
          </div>
          <div className="row">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draft.is_published}
                onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })}
              />
              Published
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draft.show_in_nav}
                onChange={(e) => setDraft({ ...draft, show_in_nav: e.target.checked })}
              />
              Show in nav
            </label>
          </div>

          <h3>Page blocks</h3>
          <div className="stack">
            {placements.map((item, index) => {
              const block = blocks.find((b) => b.id === item.block_id)
              return (
                <div className="row" key={`${item.block_id}-${index}`}>
                  <span className="badge">{block?.name || item.block_id}</span>
                  <span className="muted">{block?.block_type}</span>
                  <button type="button" className="btn ghost" onClick={() => move(index, -1)}>
                    Up
                  </button>
                  <button type="button" className="btn ghost" onClick={() => move(index, 1)}>
                    Down
                  </button>
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => setPlacements(placements.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
          <div className="row">
            <select
              defaultValue=""
              onChange={(e) => {
                const id = Number(e.target.value)
                if (!id) return
                setPlacements([...placements, { block_id: id, order: placements.length, override: {} }])
                e.target.value = ''
              }}
            >
              <option value="">Add block from library…</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.block_type})
                </option>
              ))}
            </select>
          </div>

          {message ? <div className="form-success">{message}</div> : null}
          {error ? <div className="form-error">{error}</div> : null}
          <div className="row">
            <button className="btn" type="submit">
              Save page
            </button>
            {selected ? (
              <Link className="btn secondary" to={selected.slug === 'home' ? '/' : `/${selected.slug}`}>
                View public page
              </Link>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}
