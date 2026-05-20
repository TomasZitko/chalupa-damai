import BookingForm from '../components/BookingForm'

const PROPERTY_NAME = import.meta.env.VITE_PROPERTY_NAME ?? 'Damai Chalupa'

const HIGHLIGHTS = [
  'Soukromý bazén & zahrada',
  'Kapacita až 12 hostů',
  'Minimální pobyt 2 noci',
]

export default function BookingPage() {
  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">

      {/* ── Hero panel ─────────────────────────────────── */}
      <aside className="relative lg:sticky lg:top-0 lg:h-dvh lg:w-[42%] shrink-0 overflow-hidden
                        h-[52vw] min-h-[260px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/hero.webp)' }}
          aria-hidden="true"
        />
        {/* overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/25 to-dark/10" />
        <div className="absolute inset-0 bg-dark/10 hidden lg:block" />

        <div className="relative h-full flex flex-col justify-between p-8 sm:p-10 lg:p-12 xl:p-14">
          <span className="hidden lg:inline-block text-off-white/50 text-[0.6rem] tracking-[0.35em] uppercase">
            Rezervace pobytu
          </span>

          <div className="hidden lg:block">
            <h1 className="font-serif text-off-white text-5xl xl:text-6xl leading-none mb-5">
              {PROPERTY_NAME}
            </h1>
            <div className="w-10 h-px bg-secondary mb-6" />
            <ul className="space-y-3">
              {HIGHLIGHTS.map((h) => (
                <li key={h} className="flex items-center gap-3 text-off-white/70 text-xs tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* ── Form panel ─────────────────────────────────── */}
      <main className="flex-1 bg-light">
        {/* mobile-only header */}
        <div className="lg:hidden px-6 pt-8 pb-6 border-b border-border">
          <p className="text-[0.6rem] tracking-[0.3em] uppercase text-dark/35 mb-1.5">Rezervace</p>
          <h1 className="font-serif text-3xl text-dark">{PROPERTY_NAME}</h1>
        </div>

        <div className="max-w-lg mx-auto px-6 sm:px-10 py-10 lg:py-16">
          <BookingForm />
        </div>
      </main>

    </div>
  )
}
