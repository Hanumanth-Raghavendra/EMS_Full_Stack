import { ATTENDANCE_COLORS } from '../../utils/constants'
import { toIsoDate } from '../../utils/format'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** A month grid where each working day is coloured by its attendance status. */
export default function MonthRegister({ date, records = [] }) {
    const reference = date ? new Date(`${date}T00:00:00`) : new Date()
    const year = reference.getFullYear()
    const month = reference.getMonth()
    const todayIso = toIsoDate(reference)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7 // Monday first

    const statusByDate = Object.fromEntries((records || []).map((record) => [record.attendanceDate, record.status]))

    const cells = []
    for (let i = 0; i < leadingBlanks; i += 1) {
        cells.push(<span key={`blank-${i}`} />)
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        const current = new Date(year, month, day)
        const iso = toIsoDate(current)
        const weekday = current.getDay()
        const status = statusByDate[iso]
        const classes = ['register-day']
        if (status) {
            classes.push(status)
        } else if (iso > todayIso) {
            classes.push('future')
        } else if (weekday === 0 || weekday === 6) {
            classes.push('weekend')
        }
        if (iso === todayIso) {
            classes.push('today')
        }
        cells.push(
            <span key={iso} className={classes.join(' ')} title={status ? `${iso}: ${status}` : iso}>
                {day}
            </span>
        )
    }

    return (
        <>
            <div className="register" role="img" aria-label="Attendance this month">
                {WEEKDAYS.map((label, index) => (
                    <span className="register-head" key={`${label}-${index}`}>
                        {label}
                    </span>
                ))}
                {cells}
            </div>
            <div className="register-legend">
                <span>
                    <i style={{ background: ATTENDANCE_COLORS.PRESENT }} /> Present
                </span>
                <span>
                    <i style={{ background: ATTENDANCE_COLORS.HALF_DAY }} /> Half day
                </span>
                <span>
                    <i style={{ background: ATTENDANCE_COLORS.LEAVE }} /> Leave
                </span>
                <span>
                    <i style={{ background: ATTENDANCE_COLORS.ABSENT }} /> Absent
                </span>
            </div>
        </>
    )
}
