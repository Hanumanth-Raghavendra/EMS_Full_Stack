import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { attendanceApi, dashboardApi } from '../api/endpoints'
import DashboardPage from '../pages/DashboardPage'
import { USERS, page, renderPage } from '../test/render'

vi.mock('../api/endpoints', () => ({
    dashboardApi: { summary: vi.fn() },
    attendanceApi: { list: vi.fn(), checkIn: vi.fn(), checkOut: vi.fn() },
    leaveApi: { approve: vi.fn(), reject: vi.fn() },
}))

const me = {
    attendanceToday: { date: '2026-06-10', record: null, onApprovedLeave: false, canCheckIn: true, canCheckOut: false },
    leaveBalance: [{ leaveType: 'CASUAL', quota: 12, used: 1, pending: 0, remaining: 11 }],
    pendingLeaveRequests: 0,
    upcomingLeave: [],
    activeProjects: 1,
    attendanceThisMonth: { PRESENT: 5, ABSENT: 0, HALF_DAY: 0, LEAVE: 0 },
}

const organization = {
    totalEmployees: 12,
    activeEmployees: 11,
    departments: 3,
    activeProjects: 2,
    pendingLeaveRequests: 4,
    attendanceToday: { PRESENT: 6, HALF_DAY: 0, ABSENT: 1, LEAVE: 1, NOT_MARKED: 3 },
    headcountByDepartment: [{ name: 'Engineering', count: 7 }],
    attendanceTrend: [{ date: '2026-06-10', present: 6, halfDay: 0, absent: 1, leave: 1 }],
    pendingApprovals: [],
    onLeaveThisWeek: [],
    recentHires: [],
}

describe('DashboardPage', () => {
    beforeEach(() => {
        attendanceApi.list.mockResolvedValue(page([]))
    })

    it('shows managers the organisation at a glance', async () => {
        dashboardApi.summary.mockResolvedValue({ today: '2026-06-10', me, organization })
        renderPage(<DashboardPage />, { route: '/dashboard', user: USERS.HR })
        expect(await screen.findByText('Wednesday, 10 June')).toBeInTheDocument()
        expect(screen.getByText('Leave requests waiting').previousSibling).toHaveTextContent('4')
        expect(screen.getByText(/Active employees/)).toHaveTextContent('(12 total)')
        expect(screen.getByText('Engineering')).toBeInTheDocument()
        expect(screen.getByText('Nothing to approve right now')).toBeInTheDocument()
    })

    it('shows employees only their own summary', async () => {
        dashboardApi.summary.mockResolvedValue({ today: '2026-06-10', me, organization: null })
        renderPage(<DashboardPage />, { route: '/dashboard', user: USERS.EMPLOYEE })
        expect(await screen.findByText('Leave balance')).toBeInTheDocument()
        expect(screen.queryByText('Today at work')).not.toBeInTheDocument()
        expect(screen.getByText(/1 active project/)).toBeInTheDocument()
    })

    it('checks in from the time card', async () => {
        dashboardApi.summary.mockResolvedValue({ today: '2026-06-10', me, organization: null })
        attendanceApi.checkIn.mockResolvedValue({})
        renderPage(<DashboardPage />, { route: '/dashboard', user: USERS.EMPLOYEE })

        await userEvent.click(await screen.findByRole('button', { name: 'Check in' }))
        await waitFor(() => expect(attendanceApi.checkIn).toHaveBeenCalled())
        expect(await screen.findByText('Checked in. Have a good day!')).toBeInTheDocument()
        await waitFor(() => expect(dashboardApi.summary).toHaveBeenCalledTimes(2))
    })

    it('offers a retry when loading fails', async () => {
        dashboardApi.summary.mockRejectedValueOnce({ request: {} }).mockResolvedValueOnce({ today: '2026-06-10', me, organization: null })
        renderPage(<DashboardPage />, { route: '/dashboard', user: USERS.EMPLOYEE })
        expect(await screen.findByText(/Cannot reach the server/)).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
        expect(await screen.findByText('Leave balance')).toBeInTheDocument()
    })
})
