import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { attendanceApi, dashboardApi } from '../api/endpoints'
import TimeCard from '../components/attendance/TimeCard'
import LeaveBalance from '../components/leave/LeaveBalance'
import ReviewDialog from '../components/leave/ReviewDialog'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import Loading from '../components/ui/Loading'
import StatusLabel from '../components/ui/StatusLabel'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { ATTENDANCE_COLORS, labelFor } from '../utils/constants'
import { formatDate, formatDateRange, formatShortDate, pluralize } from '../utils/format'

const TODAY_PARTS = [
    { key: 'PRESENT', label: 'Present' },
    { key: 'HALF_DAY', label: 'Half day' },
    { key: 'LEAVE', label: 'On leave' },
    { key: 'ABSENT', label: 'Absent' },
    { key: 'NOT_MARKED', label: 'Not marked yet' },
]

function Section({ title, action, children }) {
    return (
        <section className="section">
            <div className="section-title">
                <Typography variant="h2">{title}</Typography>
                {action}
            </div>
            {children}
        </section>
    )
}

function TodayAtWork({ counts }) {
    const total = TODAY_PARTS.reduce((sum, part) => sum + (counts[part.key] || 0), 0)
    return (
        <div className="sheet sheet-body">
            <div className="stack-bar" role="img" aria-label="Attendance today">
                {TODAY_PARTS.map((part) =>
                    counts[part.key] ? (
                        <span
                            key={part.key}
                            style={{
                                width: `${(counts[part.key] / total) * 100}%`,
                                background: ATTENDANCE_COLORS[part.key],
                            }}
                        />
                    ) : null
                )}
            </div>
            <div className="legend">
                {TODAY_PARTS.map((part) => (
                    <span className="legend-item" key={part.key}>
                        <i style={{ background: ATTENDANCE_COLORS[part.key] }} />
                        {part.label} <strong>{counts[part.key] || 0}</strong>
                    </span>
                ))}
            </div>
        </div>
    )
}

function Trend({ days }) {
    const max = Math.max(1, ...days.map((day) => day.present + day.halfDay + day.absent + day.leave))
    const parts = [
        ['present', 'PRESENT'],
        ['halfDay', 'HALF_DAY'],
        ['leave', 'LEAVE'],
        ['absent', 'ABSENT'],
    ]
    return (
        <div className="sheet sheet-body">
            <div className="trend">
                {days.map((day) => {
                    const total = day.present + day.halfDay + day.absent + day.leave
                    return (
                        <div className="trend-day" key={day.date} title={`${formatDate(day.date)}: ${total} marked`}>
                            <div className="trend-stack" style={{ height: `${(total / max) * 100}%` }}>
                                {parts.map(([field, status]) =>
                                    day[field] ? (
                                        <span
                                            key={field}
                                            style={{
                                                height: `${(day[field] / total) * 100}%`,
                                                background: ATTENDANCE_COLORS[status],
                                            }}
                                        />
                                    ) : null
                                )}
                            </div>
                            <span>{formatShortDate(day.date).split(',')[0]}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function Headcount({ rows }) {
    if (!rows.length) {
        return (
            <div className="sheet">
                <EmptyState title="No departments with people yet" />
            </div>
        )
    }
    const max = Math.max(...rows.map((row) => row.count))
    return (
        <div className="sheet sheet-body">
            <div className="hbar-list">
                {rows.map((row) => (
                    <div className="hbar-row" key={row.name}>
                        <span>{row.name}</span>
                        <div className="hbar-track">
                            <div className="hbar-fill" style={{ width: `${(row.count / max) * 100}%` }} />
                        </div>
                        <span className="hbar-value">{row.count}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function LeaveList({ items, empty, renderAction, personal = false }) {
    if (!items.length) {
        return (
            <div className="sheet">
                <EmptyState title={empty} />
            </div>
        )
    }
    return (
        <div className="sheet">
            <ul className="list-plain">
                {items.map((leave) => (
                    <li key={leave.leaveId}>
                        <span>
                            <span className="cell-primary">
                                {personal ? `${labelFor(leave.leaveType)} leave` : leave.employeeName}
                            </span>
                            <span className="cell-secondary">
                                {personal ? '' : `${labelFor(leave.leaveType)} leave, `}
                                {formatDateRange(leave.startDate, leave.endDate)}, {pluralize(leave.days, 'working day')}
                            </span>
                        </span>
                        {renderAction ? renderAction(leave) : <StatusLabel value={leave.status} />}
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default function DashboardPage() {
    const { user } = useAuth()
    const summary = useFetch(() => dashboardApi.summary(), [])
    const today = summary.data?.today
    const month = useFetch(
        () =>
            today
                ? attendanceApi.list({
                      employeeId: user.employeeId,
                      from: `${today.slice(0, 8)}01`,
                      to: today,
                      size: 31,
                  })
                : Promise.resolve(null),
        [today, user?.employeeId]
    )
    const [review, setReview] = useState(null)

    if (summary.error && !summary.data) {
        return <ErrorState error={summary.error} onRetry={summary.reload} />
    }
    if (!summary.data) {
        return <Loading />
    }

    const { me, organization: org } = summary.data
    const refresh = () => {
        summary.reload()
        month.reload()
    }

    return (
        <>
            <TimeCard
                name={user?.fullName}
                today={me.attendanceToday}
                monthRecords={month.data?.content}
                onChange={refresh}
            />

            {org ? (
                <>
                    <section className="section" aria-label="Organisation at a glance">
                        <div className="ledger-strip">
                            <RouterLink className="ledger-cell" to="/employees">
                                <span className="figure">{org.activeEmployees}</span>
                                <span className="caption">
                                    Active employees{org.totalEmployees !== org.activeEmployees
                                        ? ` (${org.totalEmployees} total)`
                                        : ''}
                                </span>
                            </RouterLink>
                            <RouterLink className="ledger-cell" to="/departments">
                                <span className="figure">{org.departments}</span>
                                <span className="caption">Departments</span>
                            </RouterLink>
                            <RouterLink className="ledger-cell" to="/projects">
                                <span className="figure">{org.activeProjects}</span>
                                <span className="caption">Active projects</span>
                            </RouterLink>
                            <RouterLink
                                className={`ledger-cell ${org.pendingLeaveRequests ? 'attention' : ''}`}
                                to="/leave?tab=approvals"
                            >
                                <span className="figure">{org.pendingLeaveRequests}</span>
                                <span className="caption">Leave requests waiting</span>
                            </RouterLink>
                        </div>
                    </section>

                    <div className="columns">
                        <Section title="Today at work">
                            <TodayAtWork counts={org.attendanceToday} />
                        </Section>
                        <Section title="Last 7 days">
                            <Trend days={org.attendanceTrend} />
                        </Section>
                    </div>

                    <div className="columns">
                        <Section
                            title="Waiting for approval"
                            action={
                                <Button component={RouterLink} to="/leave?tab=approvals" size="small">
                                    See all
                                </Button>
                            }
                        >
                            <LeaveList
                                items={org.pendingApprovals}
                                empty="Nothing to approve right now"
                                renderAction={(leave) =>
                                    leave.permissions?.review ? (
                                        <span className="row-actions">
                                            <Button size="small" onClick={() => setReview({ leave, decision: 'approve' })}>
                                                Approve
                                            </Button>
                                            <Button
                                                size="small"
                                                color="error"
                                                onClick={() => setReview({ leave, decision: 'reject' })}
                                            >
                                                Reject
                                            </Button>
                                        </span>
                                    ) : (
                                        <span className="muted" style={{ fontSize: 13 }}>
                                            Needs an administrator
                                        </span>
                                    )
                                }
                            />
                        </Section>
                        <Section title="On leave this week">
                            <LeaveList items={org.onLeaveThisWeek} empty="Everyone is in this week" />
                        </Section>
                    </div>

                    <div className="columns">
                        <Section title="People by department">
                            <Headcount rows={org.headcountByDepartment} />
                        </Section>
                        <Section title="Recently joined">
                            {org.recentHires.length ? (
                                <div className="sheet">
                                    <ul className="list-plain">
                                        {org.recentHires.map((person) => (
                                            <li key={person.employeeId}>
                                                <span>
                                                    <span className="cell-primary">{person.fullName}</span>
                                                    <span className="cell-secondary">
                                                        {[person.designationName, person.departmentName]
                                                            .filter(Boolean)
                                                            .join(', ') || person.employeeCode}
                                                    </span>
                                                </span>
                                                <span className="muted numeric">{formatDate(person.dateOfJoining)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <div className="sheet">
                                    <EmptyState title="No employees yet" />
                                </div>
                            )}
                        </Section>
                    </div>
                </>
            ) : null}

            <Section
                title={org ? 'Your leave' : 'Leave balance'}
                action={
                    <Button component={RouterLink} to="/leave?apply=1" variant="outlined" size="small">
                        Apply for leave
                    </Button>
                }
            >
                <LeaveBalance balances={me.leaveBalance} />
            </Section>

            {!org ? (
                <div className="columns">
                    <Section title="Coming up">
                        <LeaveList items={me.upcomingLeave} empty="No upcoming leave" personal />
                    </Section>
                    <Section title="This month so far">
                        <div className="sheet sheet-body">
                            <div className="legend" style={{ marginTop: 0 }}>
                                {['PRESENT', 'HALF_DAY', 'LEAVE', 'ABSENT'].map((status) => (
                                    <span className="legend-item" key={status}>
                                        <i style={{ background: ATTENDANCE_COLORS[status] }} />
                                        {labelFor(status)} <strong>{me.attendanceThisMonth[status] || 0}</strong>
                                    </span>
                                ))}
                            </div>
                            <p className="muted" style={{ marginBottom: 0 }}>
                                You are on {pluralize(me.activeProjects, 'active project')}.{' '}
                                <RouterLink to="/projects">View projects</RouterLink>
                            </p>
                        </div>
                    </Section>
                </div>
            ) : null}

            {review ? (
                <ReviewDialog
                    leave={review.leave}
                    decision={review.decision}
                    onClose={() => setReview(null)}
                    onDone={() => {
                        setReview(null)
                        summary.reload()
                    }}
                />
            ) : null}
        </>
    )
}

