import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../lib/api'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError(null)
    try {
      await adminLogin(password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.status === 401 ? 'Nesprávné heslo.' : (err.message ?? 'Přihlášení selhalo.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh bg-light flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-10 text-center">
          <p className="text-xs tracking-widest uppercase text-dark/40 mb-2">Administrace</p>
          <h1 className="font-serif text-3xl text-dark">Přihlášení</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs tracking-widest uppercase text-dark/50">Heslo</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              className="w-full bg-off-white border border-border px-3.5 py-2.5 text-sm text-dark focus:outline-none focus:border-dark/40 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-primary">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-3 bg-dark text-off-white text-sm tracking-widest uppercase hover:bg-secondary transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 rounded-full border-2 border-off-white/30 border-t-off-white animate-spin" />
            )}
            {loading ? 'Přihlašuji…' : 'Přihlásit se'}
          </button>
        </form>
      </div>
    </main>
  )
}
