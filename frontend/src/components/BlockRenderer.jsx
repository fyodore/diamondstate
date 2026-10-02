import { Link } from 'react-router-dom'
import InterestForm from './InterestForm'

export default function BlockRenderer({ pageBlock, settings, pageSlug }) {
  const block = pageBlock.block
  const content = { ...(block.content || {}), ...(pageBlock.override || {}) }

  if (block.block_type === 'hero') {
    const logo = settings?.logo_url || '/logo.png'
    return (
      <section className="hero">
        <div className="hero__content">
          {content.show_logo !== false ? (
            <img className="hero__logo" src={logo} alt="" />
          ) : null}
          <h1>{content.headline || settings?.league_name}</h1>
          <p>{content.subheadline}</p>
          {content.cta_label && content.cta_href ? (
            <Link className="btn" to={content.cta_href}>
              {content.cta_label}
            </Link>
          ) : null}
        </div>
      </section>
    )
  }

  if (block.block_type === 'rich_text') {
    return (
      <section className="block rich-text">
        {content.heading ? <h2>{content.heading}</h2> : null}
        <p>{content.body}</p>
      </section>
    )
  }

  if (block.block_type === 'image') {
    return (
      <section className="block">
        {content.heading ? <h2>{content.heading}</h2> : null}
        {content.src ? <img src={content.src} alt={content.alt || ''} /> : null}
        {content.caption ? <p className="muted">{content.caption}</p> : null}
      </section>
    )
  }

  if (block.block_type === 'cta') {
    return (
      <section className="block cta-block">
        {content.heading ? <h2 style={{ color: 'white' }}>{content.heading}</h2> : null}
        {content.body ? <p>{content.body}</p> : null}
        {content.button_label && content.button_href ? (
          <div>
            <Link className="btn" to={content.button_href}>
              {content.button_label}
            </Link>
          </div>
        ) : null}
      </section>
    )
  }

  if (block.block_type === 'form') {
    return (
      <section className="block">
        <h2>{block.form_detail?.name || 'Form'}</h2>
        <InterestForm form={block.form_detail} sourcePage={pageSlug} />
      </section>
    )
  }

  return null
}
