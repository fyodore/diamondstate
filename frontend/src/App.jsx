import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth'
import PublicLayout from './components/PublicLayout'
import PublicPage from './pages/PublicPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminPages from './pages/admin/AdminPages'
import AdminBlocks from './pages/admin/AdminBlocks'
import AdminForms from './pages/admin/AdminForms'
import AdminSubmissions from './pages/admin/AdminSubmissions'
import AdminPasskeys from './pages/admin/AdminPasskeys'
import AdminSettings from './pages/admin/AdminSettings'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/manage/login" element={<AdminLogin />} />
          <Route path="/manage" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="pages" element={<AdminPages />} />
            <Route path="blocks" element={<AdminBlocks />} />
            <Route path="forms" element={<AdminForms />} />
            <Route path="submissions" element={<AdminSubmissions />} />
            <Route path="passkeys" element={<AdminPasskeys />} />
          </Route>
          <Route element={<PublicLayout />}>
            <Route index element={<PublicPage slug="home" />} />
            <Route path=":slug" element={<PublicPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
