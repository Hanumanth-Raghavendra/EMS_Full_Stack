import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Dashboard from './Dashboard'

vi.mock('react-redux', () => ({
    useSelector: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
    useNavigate: vi.fn(),
}))

vi.mock('../api/axios', () => ({
    default: {
        get: vi.fn(),
    },
}))

describe('Dashboard component', () => {
    let mockNavigate

    beforeEach(() => {
        vi.clearAllMocks()

        mockNavigate = vi.fn()
        useNavigate.mockReturnValue(mockNavigate)

        useSelector.mockReturnValue('ADMIN')

        api.get
            .mockResolvedValueOnce({
                data: [
                    { employeeId: 1, status: 'ACTIVE' },
                    { employeeId: 2, status: 'INACTIVE' },
                ],
            })
            .mockResolvedValueOnce({
                data: [
                    { projectId: 1 },
                    { projectId: 2 },
                ],
            })
            .mockResolvedValueOnce({
                data: [
                    { leaveRequestId: 1 },
                ],
            })
            .mockResolvedValueOnce({
                data: [
                    { attendanceId: 1 },
                    { attendanceId: 2 },
                    { attendanceId: 3 },
                ],
            })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('renders admin dashboard cards with loaded statistics', async () => {
        render(<Dashboard />)

        await waitFor(() => {
            expect(screen.getByText('Employees')).toBeInTheDocument()
            expect(screen.getByText('Active Employees')).toBeInTheDocument()
            expect(screen.getByText('Projects')).toBeInTheDocument()
            expect(screen.getByText('Leave Requests')).toBeInTheDocument()
            expect(screen.getByText('Attendance Records')).toBeInTheDocument()
        })

        const statCards = document.querySelectorAll('.stat-card')

        expect(statCards).toHaveLength(5)

        expect(statCards).toHaveLength(5)
    })

    it('loads all required dashboard endpoints', async () => {
        render(<Dashboard />)

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledTimes(4)
        })

        expect(api.get).toHaveBeenNthCalledWith(1, '/api/employees')
        expect(api.get).toHaveBeenNthCalledWith(2, '/api/projects')
        expect(api.get).toHaveBeenNthCalledWith(3, '/api/leave-requests')
        expect(api.get).toHaveBeenNthCalledWith(4, '/api/attendance')
    })

    it('navigates when an admin statistic card is clicked', async () => {
        render(<Dashboard />)

        await waitFor(() => {
            expect(screen.getByText('Employees')).toBeInTheDocument()
        })

        const employeesCard = screen
            .getAllByRole('button')
            .find((button) => button.className === 'stat-card' &&
                button.textContent.includes('Employees') &&
                !button.textContent.includes('Active'))

        fireEvent.click(employeesCard)

        expect(mockNavigate).toHaveBeenCalledWith('/employees')
    })

    it('renders employee-specific dashboard cards', async () => {
        useSelector.mockReturnValue('EMPLOYEE')

        render(<Dashboard />)

        await waitFor(() => {
            expect(screen.getAllByText('My Profile')).toHaveLength(2)
            expect(screen.getByText('My Projects')).toBeInTheDocument()
            expect(screen.getByText('My Leave Requests')).toBeInTheDocument()
            expect(screen.getByText('My Attendance')).toBeInTheDocument()
        })

        expect(screen.queryByText('Active Employees')).not.toBeInTheDocument()
        expect(screen.queryByText('Administration')).not.toBeInTheDocument()
    })

    it('stops loading and displays zero values when API requests fail', async () => {
        api.get.mockReset()
        api.get.mockRejectedValue(new Error('API failure'))

        vi.spyOn(console, 'error').mockImplementation(() => { })

        render(<Dashboard />)

        await waitFor(() => {
            expect(screen.getAllByText('0')).toHaveLength(5)
        })
    })
})