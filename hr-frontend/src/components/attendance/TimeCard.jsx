import { useState } from 'react'
import Button from '@mui/material/Button'
import LoginOutlined from '@mui/icons-material/LoginOutlined'
import LogoutOutlined from '@mui/icons-material/LogoutOutlined'
import { getErrorMessage } from '../../api/client'
import { attendanceApi } from '../../api/endpoints'
import { useToast } from '../../context/contexts'
import { labelFor } from '../../utils/constants'
import { formatLongDate, formatMinutes, formatTime, greeting } from '../../utils/format'
import MonthRegister from './MonthRegister'

/**
 * The dashboard hero: today's date, punch-in / punch-out times and the
 * month's attendance register.
 */
export default function TimeCard({ name, today, monthRecords, onChange }) {
    const toast = useToast()
    const [busy, setBusy] = useState(false)
    const record = today?.record

    const punch = async (action) => {
        setBusy(true)
        try {
            const result = action === 'in' ? await attendanceApi.checkIn() : await attendanceApi.checkOut()
            toast.success(action === 'in' ? 'Checked in. Have a good day!' : 'Checked out. See you tomorrow!')
            onChange?.(result)
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setBusy(false)
        }
    }

    let note = null
    if (today?.onApprovedLeave) {
        note = 'You are on approved leave today.'
    } else if (record && !record.checkIn) {
        note = `Recorded as ${labelFor(record.status).toLowerCase()} today.`
    } else if (record?.checkOut) {
        note = `${labelFor(record.status)}, worked ${formatMinutes(record.workedMinutes)}.`
    }

    return (
        <section className="timecard" aria-label="Today">
            <div className="timecard-main">
                <p className="timecard-greeting">
                    {greeting()}, {name?.split(' ')[0]}
                </p>
                <p className="timecard-date">{formatLongDate(today?.date || new Date())}</p>

                <div className="punches">
                    <div className="punch">
                        <span className="label">Checked in</span>
                        <span className={`time ${record?.checkIn ? '' : 'is-empty'}`}>
                            {record?.checkIn ? formatTime(record.checkIn) : '--:--'}
                        </span>
                    </div>
                    <div className="punch">
                        <span className="label">Checked out</span>
                        <span className={`time ${record?.checkOut ? '' : 'is-empty'}`}>
                            {record?.checkOut ? formatTime(record.checkOut) : '--:--'}
                        </span>
                    </div>
                </div>

                <div className="timecard-actions">
                    {today?.canCheckIn ? (
                        <Button
                            variant="contained"
                            color="secondary"
                            size="large"
                            startIcon={<LoginOutlined />}
                            onClick={() => punch('in')}
                            disabled={busy}
                        >
                            Check in
                        </Button>
                    ) : null}
                    {today?.canCheckOut ? (
                        <Button
                            variant="contained"
                            color="secondary"
                            size="large"
                            startIcon={<LogoutOutlined />}
                            onClick={() => punch('out')}
                            disabled={busy}
                        >
                            Check out
                        </Button>
                    ) : null}
                    {note ? <span className="timecard-note">{note}</span> : null}
                </div>
            </div>
            <div className="timecard-side">
                <h3>This month</h3>
                <MonthRegister date={today?.date} records={monthRecords} />
            </div>
        </section>
    )
}
