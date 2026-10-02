import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, ensureCsrf } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    await ensureCsrf()
    const data = await api('/api/auth/me/')
    setUser(data.authenticated ? data.user : null)
    return data
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      async login(username, password) {
        await ensureCsrf()
        const data = await api('/api/auth/login/', {
          method: 'POST',
          body: { username, password },
        })
        setUser(data.user)
        return data
      },
      async logout() {
        await api('/api/auth/logout/', { method: 'POST' })
        setUser(null)
      },
      setUser,
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
