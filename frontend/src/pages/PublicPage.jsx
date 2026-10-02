import { useEffect, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { api } from '../api'
import BlockRenderer from '../components/BlockRenderer'

export default function PublicPage({ slug: forcedSlug }) {
  const { slug: paramSlug } = useParams()
  const slug = forcedSlug || paramSlug || 'home'
  const { settings } = useOutletContext()
  const [page, setPage] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setPage(null)
    setError('')
    api(`/api/pages/${slug}/`)
      .then(setPage)
      .catch((err) => setError(err.message || 'Page not found'))
  }, [slug])

  if (error) {
    return (
      <div className="page">
        <section className="block">
          <h2>Page not found</h2>
          <p>{error}</p>
        </section>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="page">
        <section className="block">Loading…</section>
      </div>
    )
  }

  return (
    <div className="page">
      {page.page_blocks.map((pb) => (
        <BlockRenderer
          key={pb.id}
          pageBlock={pb}
          settings={settings}
          pageSlug={page.slug}
        />
      ))}
    </div>
  )
}
