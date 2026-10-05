import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  return (
    <div className="panel">
      <h1>Dashboard</h1>
      <p className="muted">
        Manage reusable content blocks, pages, and the interest form builder for Diamond State
        Softball League.
      </p>
      <div className="row">
        <Link className="btn" to="/manage/pages">
          Edit pages
        </Link>
        <Link className="btn secondary" to="/manage/settings">
          Site settings
        </Link>
        <Link className="btn secondary" to="/manage/blocks">
          Block library
        </Link>
        <Link className="btn secondary" to="/manage/forms">
          Form builder
        </Link>
        <Link className="btn secondary" to="/manage/submissions">
          View submissions
        </Link>
        <Link className="btn secondary" to="/manage/users">
          Admin users
        </Link>
      </div>
    </div>
  )
}
