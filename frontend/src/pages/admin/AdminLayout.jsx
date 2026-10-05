import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth'

export default function AdminLayout() {
  const { user, loading, logout } = useAuth()

  if (loading) return <div className="login-page">Loading…</div>
  if (!user?.is_staff) return <Navigate to="/manage/login" replace />

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <strong>DSS Admin</strong>
        <span className="muted" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {user.username}
        </span>
        <NavLink to="/manage" end>
          Dashboard
        </NavLink>
        <NavLink to="/manage/settings">Settings</NavLink>
        <NavLink to="/manage/pages">Pages</NavLink>
        <NavLink to="/manage/blocks">Blocks</NavLink>
        <NavLink to="/manage/forms">Forms</NavLink>
        <NavLink to="/manage/submissions">Submissions</NavLink>
        <NavLink to="/manage/users">Users</NavLink>
        <NavLink to="/manage/passkeys">Passkeys</NavLink>
        <button className="btn ghost" type="button" onClick={logout} style={{ marginTop: 'auto' }}>
          Log out
        </button>
      </aside>
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  )
}
