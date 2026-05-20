import { useState, useCallback } from 'react'
import { DateRangePicker } from 'react-date-range'
import { cs } from 'date-fns/locale'
import { isWithinInterval, parseISO, startOfDay } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { getBlockedDates } from '../lib/api'
import 'react-date-range/dist/styles.css'
import 'react-date-range/dist/theme/default.css'

const PROPERTY_ID = import.meta.env.VITE_PROPERTY_ID ?? 'main'

export default function BookingCalendar({ onChange }) {
  const [range, setRange] = useState([
    { startDate: new Date(), endDate: new Date(), key: 'selection' },
  ])

  const { data: blockedRanges = [], isLoading, isError } = useQuery({
    queryKey: ['blocked-dates', PROPERTY_ID],
    queryFn: () => getBlockedDates(PROPERTY_ID),
    staleTime: 5 * 60 * 1000,
  })

  const isDateBlocked = useCallback(
    (date) => {
      const d = startOfDay(date)
      return blockedRanges.some(({ date_from, date_to }) =>
        isWithinInterval(d, {
          start: startOfDay(parseISO(date_from)),
          end:   startOfDay(parseISO(date_to)),
        }),
      )
    },
    [blockedRanges],
  )

  function handleSelect({ selection }) {
    setRange([selection])
    if (selection.startDate.getTime() !== selection.endDate.getTime()) {
      onChange?.({ startDate: selection.startDate, endDate: selection.endDate })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-dark/50 text-sm tracking-wide">
        Načítám dostupnost…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-16 text-primary text-sm tracking-wide">
        Dostupnost se nepodařilo načíst. Zkuste to prosím znovu.
      </div>
    )
  }

  return (
    <div className="booking-calendar-wrapper">
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <DateRangePicker
          ranges={range}
          onChange={handleSelect}
          locale={cs}
          minDate={new Date()}
          disabledDay={isDateBlocked}
          months={1}
          direction="horizontal"
          showMonthAndYearPickers
          showDateDisplay={false}
          rangeColors={['#0A6365']}
          moveRangeOnFirstSelection={false}
          className="!w-full"
        />
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-xs text-dark/60 tracking-wide">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-secondary/20 border border-secondary/30 inline-block" />
          Váš výběr
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-primary/10 inline-block" />
          Obsazeno
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-dark/10 inline-block" />
          Volný termín
        </span>
      </div>
    </div>
  )
}
