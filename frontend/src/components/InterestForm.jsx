import { useMemo, useState } from 'react'
import { api, ensureCsrf } from '../api'

function defaultValue(field) {
  if (field.field_type === 'checkbox') return false
  if (field.field_type === 'multicheckbox') return []
  return ''
}

export default function InterestForm({ form, sourcePage }) {
  const fields = form?.fields || []
  const initial = useMemo(() => {
    const values = {}
    fields.forEach((f) => {
      values[f.field_key] = defaultValue(f)
    })
    return values
  }, [fields])
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!form) return null

  function toggleMultiOption(fieldKey, option, checked) {
    setValues((v) => {
      const current = Array.isArray(v[fieldKey]) ? v[fieldKey] : []
      const next = checked
        ? [...current, option]
        : current.filter((item) => item !== option)
      return { ...v, [fieldKey]: next }
    })
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    setSuccess('')
    try {
      await ensureCsrf()
      const res = await api(`/api/forms/${form.slug}/submit/`, {
        method: 'POST',
        body: { payload: values, source_page: sourcePage || '' },
      })
      setSuccess(res.message || 'Thanks!')
      setValues(initial)
    } catch (err) {
      if (err.data?.errors) setErrors(err.data.errors)
      else setErrors({ _form: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="form-block">
      {form.intro_text ? <p className="muted">{form.intro_text}</p> : null}
      {success ? <div className="form-success">{success}</div> : null}
      {!success ? (
        <form onSubmit={onSubmit}>
          {fields.map((field) => (
            <div className="field" key={field.id}>
              {field.field_type === 'checkbox' ? (
                <label className="checkbox-row">
                  <span>
                    {field.label}
                    {field.required ? ' *' : ''}
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(values[field.field_key])}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [field.field_key]: e.target.checked }))
                    }
                  />
                </label>
              ) : field.field_type === 'multicheckbox' ? (
                <>
                  <span className="field-legend">
                    {field.label}
                    {field.required ? ' *' : ''}
                  </span>
                  <div className="checkbox-group" role="group" aria-label={field.label}>
                    {(field.options || []).map((opt) => {
                      const selected = Array.isArray(values[field.field_key])
                        ? values[field.field_key]
                        : []
                      return (
                        <label className="checkbox-row" key={opt}>
                          <input
                            type="checkbox"
                            checked={selected.includes(opt)}
                            onChange={(e) =>
                              toggleMultiOption(field.field_key, opt, e.target.checked)
                            }
                          />
                          <span>{opt}</span>
                        </label>
                      )
                    })}
                  </div>
                </>
              ) : (
                <>
                  <label htmlFor={field.field_key}>
                    {field.label}
                    {field.required ? ' *' : ''}
                  </label>
                  {field.field_type === 'textarea' ? (
                    <textarea
                      id={field.field_key}
                      placeholder={field.placeholder}
                      value={values[field.field_key] || ''}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.field_key]: e.target.value }))
                      }
                      required={field.required}
                    />
                  ) : field.field_type === 'select' ? (
                    <select
                      id={field.field_key}
                      value={values[field.field_key] || ''}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.field_key]: e.target.value }))
                      }
                      required={field.required}
                    >
                      <option value="">Select…</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={field.field_key}
                      type={
                        field.field_type === 'email'
                          ? 'email'
                          : field.field_type === 'number'
                            ? 'number'
                            : field.field_type === 'phone'
                              ? 'tel'
                              : 'text'
                      }
                      placeholder={field.placeholder}
                      value={values[field.field_key] || ''}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.field_key]: e.target.value }))
                      }
                      required={field.required}
                    />
                  )}
                </>
              )}
              {errors[field.field_key] ? (
                <div className="form-error">{errors[field.field_key]}</div>
              ) : null}
            </div>
          ))}
          {errors._form ? <div className="form-error">{errors._form}</div> : null}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Submit interest'}
          </button>
        </form>
      ) : null}
    </div>
  )
}
