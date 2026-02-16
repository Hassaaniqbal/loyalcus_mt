import { useState, useEffect } from 'react'

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function DateOfBirthPicker({ value, onChange, disabled }) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i)

  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')

  // Parse incoming value (YYYY-MM-DD string)
  useEffect(() => {
    if (value) {
      const parts = value.split('-')
      if (parts.length === 3) {
        setYear(parts[0])
        setMonth(parts[1])
        setDay(parts[2])
      }
    } else {
      setYear('')
      setMonth('')
      setDay('')
    }
  }, [value])

  const getDaysInMonth = (y, m) => {
    if (!y || !m) return 31
    return new Date(parseInt(y), parseInt(m), 0).getDate()
  }

  const daysInMonth = getDaysInMonth(year, month)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const handleChange = (newYear, newMonth, newDay) => {
    // If all are empty, clear
    if (!newYear && !newMonth && !newDay) {
      onChange('')
      return
    }

    // Only emit value when all three are selected
    if (newYear && newMonth && newDay) {
      const dayNum = parseInt(newDay)
      const maxDays = getDaysInMonth(newYear, newMonth)
      const safeDay = dayNum > maxDays ? maxDays : dayNum
      const formatted = `${newYear}-${newMonth.padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
      onChange(formatted)
    }
  }

  const handleYearChange = (val) => {
    setYear(val)
    handleChange(val, month, day)
  }

  const handleMonthChange = (val) => {
    setMonth(val)
    handleChange(year, val, day)
  }

  const handleDayChange = (val) => {
    setDay(val)
    handleChange(year, month, val)
  }

  const handleClear = () => {
    setYear('')
    setMonth('')
    setDay('')
    onChange('')
  }

  return (
    <div className="dob-picker">
      <div className="dob-selects">
        <select
          value={year}
          onChange={(e) => handleYearChange(e.target.value)}
          disabled={disabled}
          className="dob-select dob-year"
        >
          <option value="">Year</option>
          {years.map(y => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>

        <select
          value={month}
          onChange={(e) => handleMonthChange(e.target.value)}
          disabled={disabled}
          className="dob-select dob-month"
        >
          <option value="">Month</option>
          {months.map((m, i) => (
            <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
          ))}
        </select>

        <select
          value={day}
          onChange={(e) => handleDayChange(e.target.value)}
          disabled={disabled}
          className="dob-select dob-day"
        >
          <option value="">Day</option>
          {days.map(d => (
            <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
          ))}
        </select>
      </div>
      {(year || month || day) && (
        <button type="button" onClick={handleClear} className="dob-clear" disabled={disabled}>
          Clear
        </button>
      )}
    </div>
  )
}

export default DateOfBirthPicker
