import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { cs } from 'date-fns/locale'
import {
  isAuthenticated,
  adminLogout,
  getReservations,
  updateReservationStatus,
  getIcalFeeds,
  addIcalFeed,
} from '../lib/api'

// ── Status badge ─────────────────────────────────────────

const STATUS = {
  pending:   { label: 'Čeká',     cls: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Potvrzeno', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Zrušeno',  cls: 'bg-red-100 text-red-800' },
}

function Badge({ status }) {
  const s = STATUS[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-pill text-[0.65rem] tracking-wide font-sans uppercase ${s.cls}`}>
      {s.label}
    </span>
  )
}

// ── Tabs ─────────────────────────────────────────────────

const TABS = ['Rezervace', 'Synchronizace']

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-0 border-b border-border mb-8">
      {TABS.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={[
            'px-5 py-3 text-xs tracking-widest uppercase transition-colors border-b-2 -mb-px',
            active === t
              ? 'border-dark text-dark'
              : 'border-transparent text-dark/40 hover:text-dark/70',
          ].join(' ')}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// ── Reservations tab ──────────────────────────────────────

function ReservationsTab() {
  const qc = useQueryClient()

  const { data: reservations = [], isLoading, isError } = useQuery({
    queryKey: ['admin-reservations'],
    queryFn: getReservations,
  })

  const { mutate: updateStatus, variables: updating } = useMutation({
    mutationFn: ({ id, status }) => updateReservationStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reservations'] }),
  })

  if (isLoading) return <p className="text-sm text-dark/50 py-8 text-center">Načítám rezervace…</p>
  if (isError)   return <p className="text-sm text-primary py-8 text-center">Chyba při načítání.</p>
  if (!reservations.length) return <p className="text-sm text-dark/50 py-8 text-center">Žádné rezervace.</p>

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-sm border-collapse min-w-[640px]">
        <thead>
          <tr className="border-b border-border">
            {['Jméno', 'Termín', 'Hostů', 'E-mail', 'Stav', ''].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-[0.65rem] tracking-widest uppercase text-dark/40 font-normal whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {reservations.map((r) => {
            const isUpdating = updating?.id === r.id
            return (
              <tr key={r.id} className="hover:bg-dark/[0.02] transition-colors">
                <td className="px-4 py-3 text-dark">{r.guest_name}</td>
                <td className="px-4 py-3 text-dark/70 whitespace-nowrap">
                  {format(parseISO(r.date_from), 'd.M.', { locale: cs })}
                  {' – '}
                  {format(parseISO(r.date_to), 'd.M.yyyy', { locale: cs })}
                </td>
                <td className="px-4 py-3 text-dark/70">{r.guest_count}</td>
                <td className="px-4 py-3 text-dark/70">{r.guest_email}</td>
                <td className="px-4 py-3"><Badge status={r.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    {r.status !== 'confirmed' && (
                      <button
                        disabled={isUpdating}
                        onClick={() => updateStatus({ id: r.id, status: 'confirmed' })}
                        className="px-3 py-1.5 text-[0.65rem] tracking-widest uppercase bg-secondary text-off-white hover:bg-secondary/80 transition-colors disabled:opacity-40"
                      >
                        Potvrdit
                      </button>
                    )}
                    {r.status !== 'cancelled' && (
                      <button
                        disabled={isUpdating}
                        onClick={() => updateStatus({ id: r.id, status: 'cancelled' })}
                        className="px-3 py-1.5 text-[0.65rem] tracking-widest uppercase border border-primary/40 text-primary hover:bg-primary/5 transition-colors disabled:opacity-40"
                      >
                        Zrušit
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Sync tab ──────────────────────────────────────────────

const EXPORT_URL = `${import.meta.env.VITE_API_URL ?? ''}/ical/${import.meta.env.VITE_PROPERTY_ID ?? 'main'}.ics`

function SyncTab() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ platform: '', url: '' })
  const [copied, setCopied]   = useState(false)
  const [formErr, setFormErr] = useState(null)

  const { data: feeds = [], isLoading } = useQuery({
    queryKey: ['ical-feeds'],
    queryFn: getIcalFeeds,
  })

  const { mutate: addFeed, isPending: adding } = useMutation({
    mutationFn: addIcalFeed,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ical-feeds'] })
      setForm({ platform: '', url: '' })
      setFormErr(null)
    },
    onError: (err) => setFormErr(err.message ?? 'Chyba při přidávání.'),
  })

  function handleAdd(e) {
    e.preventDefault()
    if (!form.platform.trim() || !form.url.trim()) {
      setFormErr('Vyplňte název platformy i URL.')
      return
    }
    setFormErr(null)
    addFeed(form)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(EXPORT_URL).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const PLATFORM_COLORS = {
    'booking.com': 'bg-blue-100 text-blue-800',
    'e-chalupy':   'bg-orange-100 text-orange-800',
    website:       'bg-green-100 text-green-800',
  }

  return (
    <div className="space-y-10">
      {/* Export URL */}
      <section>
        <h2 className="text-xs tracking-widest uppercase text-dark/40 mb-3">Váš exportní odkaz iCal</h2>
        <div className="flex gap-2 items-stretch">
          <input
            readOnly
            value={EXPORT_URL}
            className="flex-1 bg-off-white border border-border px-3.5 py-2.5 text-sm text-dark/60 font-mono truncate focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 bg-dark text-off-white text-xs tracking-widest uppercase hover:bg-secondary transition-colors shrink-0"
          >
            {copied ? 'Zkopírováno ✓' : 'Kopírovat'}
          </button>
        </div>
        <p className="mt-2 text-xs text-dark/40 leading-relaxed">
          Vložte tento odkaz do Booking.com, Airbnb nebo jiné platformy, aby přijímaly vaši dostupnost.
        </p>
      </section>

      {/* Connected feeds */}
      <section>
        <h2 className="text-xs tracking-widest uppercase text-dark/40 mb-3">Připojené kalendáře</h2>
        {isLoading ? (
          <p className="text-sm text-dark/50">Načítám…</p>
        ) : feeds.length === 0 ? (
          <p className="text-sm text-dark/50">Zatím žádné připojené kalendáře.</p>
        ) : (
          <ul className="divide-y divide-border border border-border">
            {feeds.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-4 py-3 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 px-2 py-0.5 text-[0.6rem] tracking-wide uppercase rounded-pill ${PLATFORM_COLORS[f.platform_name] ?? 'bg-gray-100 text-gray-700'}`}>
                    {f.platform_name}
                  </span>
                  <span className="text-sm text-dark/60 truncate">{f.feed_url}</span>
                </div>
                {f.last_synced_at && (
                  <span className="shrink-0 text-xs text-dark/30 whitespace-nowrap">
                    {format(parseISO(f.last_synced_at), 'd.M. HH:mm', { locale: cs })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add feed form */}
      <section>
        <h2 className="text-xs tracking-widest uppercase text-dark/40 mb-3">Přidat kalendář</h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <input
            placeholder="Název platformy (např. Booking.com)"
            value={form.platform}
            onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
            className="flex-1 bg-off-white border border-border px-3.5 py-2.5 text-sm text-dark placeholder:text-dark/30 focus:outline-none focus:border-dark/40"
          />
          <input
            placeholder="https://…/cal.ics"
            value={form.url}
            onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
            className="flex-[2] bg-off-white border border-border px-3.5 py-2.5 text-sm text-dark placeholder:text-dark/30 focus:outline-none focus:border-dark/40"
          />
          <button
            type="submit"
            disabled={adding}
            className="px-6 py-2.5 bg-dark text-off-white text-xs tracking-widest uppercase hover:bg-secondary transition-colors disabled:opacity-60 shrink-0"
          >
            {adding ? 'Přidávám…' : 'Přidat'}
          </button>
        </form>
        {formErr && <p className="mt-2 text-xs text-primary">{formErr}</p>}
      </section>
    </div>
  )
}

// ── Admin page ────────────────────────────────────────────

export default function AdminPage() {
  const navigate  = useNavigate()
  const [tab, setTab] = useState('Rezervace')

  if (!isAuthenticated()) return <Navigate to="/admin/login" replace />

  function handleLogout() {
    adminLogout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <main className="min-h-dvh bg-light">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Page header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-xs tracking-widest uppercase text-dark/40 mb-1">Administrace</p>
            <h1 className="font-serif text-3xl text-dark">Damai</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs tracking-widest uppercase text-dark/40 hover:text-dark transition-colors mt-1"
          >
            Odhlásit
          </button>
        </div>

        <TabBar active={tab} onChange={setTab} />

        {tab === 'Rezervace'    && <ReservationsTab />}
        {tab === 'Synchronizace' && <SyncTab />}
      </div>
    </main>
  )
}
