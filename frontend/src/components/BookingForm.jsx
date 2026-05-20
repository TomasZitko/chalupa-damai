import { useState } from 'react'
import { format, differenceInCalendarDays } from 'date-fns'
import { cs } from 'date-fns/locale'
import { submitBooking } from '../lib/api'
import BookingCalendar from './BookingCalendar'

const PROPERTY_ID = import.meta.env.VITE_PROPERTY_ID ?? 'main'

const STEPS = ['Termín', 'Hosté', 'Potvrzení']

const INITIAL_GUEST = {
  name: '',
  email: '',
  phone: '',
  guestCount: '',
  notes: '',
}

function validate(fields) {
  const errors = {}
  if (!fields.name.trim())                                    errors.name       = 'Jméno je povinné'
  if (!fields.email.trim())                                   errors.email      = 'E-mail je povinný'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errors.email      = 'Neplatný e-mail'
  if (!fields.phone.trim())                                   errors.phone      = 'Telefon je povinný'
  if (!fields.guestCount || Number(fields.guestCount) < 1)   errors.guestCount = 'Zadejte počet hostů'
  return errors
}

// ── Step indicator ───────────────────────────────────────

function StepIndicator({ current }) {
  return (
    <div className="flex items-start mb-10">
      {STEPS.map((label, i) => {
        const done   = i < current
        const active = i === current
        return (
          <div key={label} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className={[
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-light transition-all duration-300',
                done   ? 'bg-secondary text-off-white'                         : '',
                active ? 'bg-dark text-off-white shadow-md shadow-dark/20'     : '',
                !done && !active ? 'border-2 border-dark/15 text-dark/30'      : '',
              ].join(' ')}>
                {done ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span className={[
                'text-[0.58rem] tracking-[0.18em] uppercase transition-colors whitespace-nowrap',
                active ? 'text-dark' : done ? 'text-secondary' : 'text-dark/30',
              ].join(' ')}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={[
                'flex-1 h-px mt-4 mx-2 transition-colors duration-300',
                done ? 'bg-secondary/35' : 'bg-dark/10',
              ].join(' ')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Field wrapper ────────────────────────────────────────

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.62rem] tracking-[0.2em] uppercase text-dark/45">{label}</label>
      {children}
      {error && (
        <p className="text-[0.68rem] text-primary flex items-center gap-1 mt-0.5">
          <span>↑</span> {error}
        </p>
      )}
    </div>
  )
}

const inputCls =
  'w-full bg-off-white border border-border rounded-none px-4 py-3 text-sm text-dark placeholder:text-dark/25 ' +
  'focus:outline-none focus:border-secondary/60 focus:bg-white transition-colors'

const inputErrCls =
  'w-full bg-off-white border border-primary/40 rounded-none px-4 py-3 text-sm text-dark placeholder:text-dark/25 ' +
  'focus:outline-none focus:border-primary/60 transition-colors'

// ── Date summary strip ───────────────────────────────────

function DateSummary({ dates, nights }) {
  if (!dates) return null
  return (
    <div className="grid grid-cols-3 gap-2 mt-5">
      <div className="bg-off-white border border-border px-3.5 py-3">
        <p className="text-[0.55rem] tracking-[0.2em] uppercase text-dark/35 mb-1">Příjezd</p>
        <p className="text-sm text-dark leading-none mb-0.5">
          {format(dates.startDate, 'd. MMM', { locale: cs })}
        </p>
        <p className="text-[0.65rem] text-dark/45 capitalize">
          {format(dates.startDate, 'EEEE', { locale: cs })}
        </p>
      </div>
      <div className="bg-off-white border border-border px-3.5 py-3">
        <p className="text-[0.55rem] tracking-[0.2em] uppercase text-dark/35 mb-1">Odjezd</p>
        <p className="text-sm text-dark leading-none mb-0.5">
          {format(dates.endDate, 'd. MMM', { locale: cs })}
        </p>
        <p className="text-[0.65rem] text-dark/45 capitalize">
          {format(dates.endDate, 'EEEE', { locale: cs })}
        </p>
      </div>
      <div className="bg-secondary/8 border border-secondary/20 px-3.5 py-3">
        <p className="text-[0.55rem] tracking-[0.2em] uppercase text-secondary/50 mb-1">Nocí</p>
        <p className="text-sm text-secondary leading-none mb-0.5">{nights}</p>
        <p className="text-[0.65rem] text-secondary/50">
          {nights === 1 ? 'noc' : nights < 5 ? 'noci' : 'nocí'}
        </p>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────

export default function BookingForm() {
  const [step, setStep]           = useState(0)
  const [dates, setDates]         = useState(null)
  const [guest, setGuest]         = useState(INITIAL_GUEST)
  const [errors, setErrors]       = useState({})
  const [loading, setLoading]     = useState(false)
  const [apiError, setApiError]   = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const nights = dates ? differenceInCalendarDays(dates.endDate, dates.startDate) : 0

  function goToGuestStep() {
    if (!dates || nights < 1) {
      setApiError('Vyberte prosím příjezdový a odjezdový den.')
      return
    }
    setApiError(null)
    setStep(1)
  }

  function handleGuestChange(e) {
    setGuest((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (errors[e.target.name]) setErrors((prev) => ({ ...prev, [e.target.name]: undefined }))
  }

  function goToConfirmStep() {
    const errs = validate(guest)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setStep(2)
  }

  async function handleSubmit() {
    setLoading(true)
    setApiError(null)
    try {
      await submitBooking({
        propertySlug: PROPERTY_ID,
        checkIn:      format(dates.startDate, 'yyyy-MM-dd'),
        checkOut:     format(dates.endDate,   'yyyy-MM-dd'),
        guestName:    guest.name,
        guestEmail:   guest.email,
        guestPhone:   guest.phone,
        guestCount:   Number(guest.guestCount),
        notes:        guest.notes || undefined,
      })
      setSubmitted(true)
    } catch (err) {
      if (err.status === 409) {
        setApiError('Zvolený termín byl mezitím obsazen. Vyberte prosím jiné datum.')
        setStep(0)
      } else {
        setApiError(err.message ?? 'Něco se nepovedlo. Zkuste to prosím znovu.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Success ────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="animate-slide-up text-center py-16 px-4">
        <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-7 h-7 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-serif text-3xl text-dark mb-3">Rezervace odeslána</h2>
        <div className="w-8 h-px bg-secondary/40 mx-auto mb-5" />
        <p className="text-sm text-dark/55 leading-relaxed max-w-xs mx-auto">
          Obdrželi jsme vaši žádost. Potvrzení vám pošleme na{' '}
          <strong className="text-dark font-normal underline underline-offset-2">{guest.email}</strong>{' '}
          do 24 hodin.
        </p>
      </div>
    )
  }

  // ── Error banner ───────────────────────────────────────
  const ErrorBanner = apiError ? (
    <div className="mb-6 px-4 py-3.5 bg-primary/7 border-l-2 border-primary text-primary text-sm leading-relaxed">
      {apiError}
    </div>
  ) : null

  return (
    <div className="animate-fade-in">
      <StepIndicator current={step} />
      {ErrorBanner}

      {/* ── Step 0: Date selection ─────────────────────── */}
      {step === 0 && (
        <div className="animate-slide-up">
          <p className="font-serif text-xl text-dark mb-5">Vyberte termín</p>

          <div className="bg-off-white border border-border p-4 sm:p-5">
            <BookingCalendar onChange={setDates} />
          </div>

          <DateSummary dates={dates} nights={nights} />

          <div className="mt-8 flex items-center justify-between">
            <span className="text-xs text-dark/35 tracking-wide">
              {dates ? `${nights} ${nights === 1 ? 'noc' : nights < 5 ? 'noci' : 'nocí'} vybrány` : 'Klikněte na den příjezdu'}
            </span>
            <button
              onClick={goToGuestStep}
              className="px-7 py-3 bg-dark text-off-white text-xs tracking-[0.2em] uppercase hover:bg-secondary transition-colors"
            >
              Pokračovat →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 1: Guest details ──────────────────────── */}
      {step === 1 && (
        <div className="animate-slide-up">
          {dates && (
            <div className="flex items-center gap-2 mb-7 text-xs text-dark/50">
              <span className="text-secondary">◎</span>
              <span>
                {format(dates.startDate, 'd. M.', { locale: cs })}
                {' – '}
                {format(dates.endDate, 'd. M. yyyy', { locale: cs })}
                <span className="ml-2 text-dark/35">({nights} {nights === 1 ? 'noc' : nights < 5 ? 'noci' : 'nocí'})</span>
              </span>
            </div>
          )}

          <p className="font-serif text-xl text-dark mb-6">Kontaktní údaje</p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Jméno a příjmení" error={errors.name}>
                <input
                  className={errors.name ? inputErrCls : inputCls}
                  name="name"
                  value={guest.name}
                  onChange={handleGuestChange}
                  placeholder="Jan Novák"
                  autoComplete="name"
                />
              </Field>

              <Field label="E-mail" error={errors.email}>
                <input
                  className={errors.email ? inputErrCls : inputCls}
                  name="email"
                  type="email"
                  value={guest.email}
                  onChange={handleGuestChange}
                  placeholder="jan@example.cz"
                  autoComplete="email"
                />
              </Field>

              <Field label="Telefon" error={errors.phone}>
                <input
                  className={errors.phone ? inputErrCls : inputCls}
                  name="phone"
                  type="tel"
                  value={guest.phone}
                  onChange={handleGuestChange}
                  placeholder="+420 777 123 456"
                  autoComplete="tel"
                />
              </Field>

              <Field label="Počet hostů" error={errors.guestCount}>
                <input
                  className={errors.guestCount ? inputErrCls : inputCls}
                  name="guestCount"
                  type="number"
                  min="1"
                  max="30"
                  value={guest.guestCount}
                  onChange={handleGuestChange}
                  placeholder="2"
                />
              </Field>
            </div>

            <Field label="Poznámky (nepovinné)">
              <textarea
                className={`${inputCls} resize-none h-28`}
                name="notes"
                value={guest.notes}
                onChange={handleGuestChange}
                placeholder="Zvláštní požadavky, příležitost, otázky…"
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-8">
            <button
              onClick={() => setStep(0)}
              className="px-6 py-3 border border-dark/20 text-xs tracking-[0.2em] uppercase text-dark/50 hover:border-dark/40 hover:text-dark/70 transition-colors"
            >
              ← Zpět
            </button>
            <button
              onClick={goToConfirmStep}
              className="px-7 py-3 bg-dark text-off-white text-xs tracking-[0.2em] uppercase hover:bg-secondary transition-colors"
            >
              Zkontrolovat →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Confirmation ───────────────────────── */}
      {step === 2 && (
        <div className="animate-slide-up">
          <p className="font-serif text-xl text-dark mb-6">Zkontrolujte rezervaci</p>

          <div className="bg-off-white border border-border">
            {/* dates row */}
            <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
              <div className="px-5 py-4">
                <p className="text-[0.58rem] tracking-[0.2em] uppercase text-dark/35 mb-1.5">Příjezd</p>
                <p className="text-sm text-dark capitalize">
                  {format(dates.startDate, 'EEEE', { locale: cs })}
                </p>
                <p className="text-xs text-dark/55">
                  {format(dates.startDate, 'd. MMMM yyyy', { locale: cs })}
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-[0.58rem] tracking-[0.2em] uppercase text-dark/35 mb-1.5">Odjezd</p>
                <p className="text-sm text-dark capitalize">
                  {format(dates.endDate, 'EEEE', { locale: cs })}
                </p>
                <p className="text-xs text-dark/55">
                  {format(dates.endDate, 'd. MMMM yyyy', { locale: cs })}
                </p>
              </div>
            </div>

            {/* detail rows */}
            {[
              ['Délka pobytu', `${nights} ${nights === 1 ? 'noc' : nights < 5 ? 'noci' : 'nocí'}`],
              ['Host',         guest.name],
              ['E-mail',       guest.email],
              ['Telefon',      guest.phone],
              ['Počet hostů',  guest.guestCount],
              ...(guest.notes ? [['Poznámky', guest.notes]] : []),
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-start px-5 py-3 border-t border-border gap-6">
                <span className="text-xs text-dark/40 shrink-0">{label}</span>
                <span className="text-sm text-dark text-right break-words">{value}</span>
              </div>
            ))}
          </div>

          <p className="text-[0.68rem] text-dark/40 leading-relaxed mt-5 mb-7">
            Odesláním žádosti souhlasíte s podmínkami ubytování.
            Rezervace bude potvrzena e-mailem do 24 hodin.
          </p>

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              onClick={() => setStep(1)}
              disabled={loading}
              className="px-6 py-3 border border-dark/20 text-xs tracking-[0.2em] uppercase text-dark/50 hover:border-dark/40 hover:text-dark/70 transition-colors disabled:opacity-40"
            >
              ← Zpět
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-7 py-3 bg-dark text-off-white text-xs tracking-[0.2em] uppercase hover:bg-secondary transition-colors disabled:opacity-60 flex items-center gap-2.5 justify-center"
            >
              {loading && <Spinner />}
              {loading ? 'Odesílám…' : 'Odeslat rezervaci'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <span
      className="w-3.5 h-3.5 rounded-full border-2 border-off-white/30 border-t-off-white animate-spin"
      aria-hidden="true"
    />
  )
}
