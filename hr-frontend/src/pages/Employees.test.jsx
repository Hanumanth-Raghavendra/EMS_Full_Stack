import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
    render,
    screen,
    fireEvent,
    waitFor,
} from '@testing-library/react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Employees from './Employees'

vi.mock('react-redux', () => ({
    useSelector: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
    useNavigate: vi.fn(),
}))

vi.mock('../api/axios', () => ({
    default: {
        get: vi.fn(),
        delete: vi.fn(),
    },
}))

vi.mock('../utils/sortById', () => ({
    sortById: vi.fn((items) =>
        [...items].sort((a, b) => a.employeeId - b.employeeId)
    ),
}))

vi.mock('../components/ui/PageHeader', () => ({
    default: ({ title, description, action }) => (
        <div>
            <h1>{title}</h1>
            <p>{description}</p>
            {action}
        </div>
    ),
}))

vi.mock('../components/ui/PrimaryButton', () => ({
    default: ({ children, onClick }) => (
        <button onClick={onClick}>{children}</button>
    ),
}))

vi.mock('../components/ui/StatusBadge', () => ({
    default: ({ status }) => <span>{status}</span>,
}))

vi.mock('../components/ui/ActionButton', () => ({
    default: ({ children, onClick }) => (
        <button onClick={onClick}>{children}</button>
    ),
}))

vi.mock('../components/ui/SearchInput', () => ({
    default: ({ value, onChange, placeholder, inputRef }) => (
        <input
            ref={inputRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
        />
    ),
}))

vi.mock('../components/ui/LoadingState', () => ({
    default: ({ message }) => <div>{message}</div>,
}))

vi.mock('../components/ui/EmptyState', () => ({
    default: ({ title, message }) => (
        <div>
            <h2>{title}</h2>
            <p>{message}</p>
        </div>
    ),
}))

vi.mock('../components/ui/ConfirmDialog', () => ({
    default: ({
        open,
        title,
        message,
        onCancel,
        onConfirm,
        confirmText,
        cancelText,
    }) =>
        open ? (
            <div role="dialog">
                <h2>{title}</h2>
                <p>{message}</p>
                <button onClick={onConfirm}>{confirmText}</button>
                <button onClick={onCancel}>{cancelText}</button>
            </div>
        ) : null,
}))

const employees = [
    {
        employeeId: 2,
        employeeCode: 'EMP002',
        firstName: 'Ravi',
        lastName: 'Kumar',
        email: 'ravi@example.com',
        phone: '9999999999',
        departmentName: 'IT',
        designationName: 'Developer',
        status: 'INACTIVE',
    },
    {
        employeeId: 1,
        employeeCode: 'EMP001',
        firstName: 'Anil',
        lastName: 'Sharma',
        email: 'anil@example.com',
        phone: '8888888888',
        departmentName: 'HR',
        designationName: 'Manager',
        status: 'ACTIVE',
    },
]

describe('Employees component', () => {
    let mockNavigate

    beforeEach(() => {
        vi.clearAllMocks()

        mockNavigate = vi.fn()
        useNavigate.mockReturnValue(mockNavigate)
        useSelector.mockReturnValue('ADMIN')

        api.get.mockResolvedValue({
            data: employees,
        })

        api.delete.mockResolvedValue({})
    })

    it('loads and displays employees sorted by ID', async () => {
        render(<Employees />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
            expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
        })

        expect(screen.getByText('EMP001')).toBeInTheDocument()
        expect(screen.getByText('EMP002')).toBeInTheDocument()
        expect(screen.getByText('2 records')).toBeInTheDocument()
    })

    it('calls the employees API on mount', async () => {
        render(<Employees />)

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith('/api/employees')
        })
    })

    it('filters employees using the search input', async () => {
        render(<Employees />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        fireEvent.change(
            screen.getByPlaceholderText('Search employees...'),
            {
                target: { value: 'ravi' },
            }
        )

        expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
        expect(screen.queryByText('Anil Sharma')).not.toBeInTheDocument()
        expect(screen.getByText('1 records')).toBeInTheDocument()
    })

    it('navigates to add employee page for admin', async () => {
        render(<Employees />)

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: '+ Add Employee' })
            ).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getByRole('button', { name: '+ Add Employee' })
        )

        expect(mockNavigate).toHaveBeenCalledWith('/employees/add')
    })

    it('navigates to edit employee page', async () => {
        render(<Employees />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        const editButtons = screen.getAllByRole('button', {
            name: 'Edit',
        })

        fireEvent.click(editButtons[0])

        expect(mockNavigate).toHaveBeenCalledWith('/employees/edit/1')
    })

    it('opens delete confirmation dialog', async () => {
        render(<Employees />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        const deleteButtons = screen.getAllByRole('button', {
            name: 'Delete',
        })

        fireEvent.click(deleteButtons[0])

        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(
            screen.getByText(/Are you sure you want to delete/)
        ).toBeInTheDocument()
    })

    it('deletes an employee after confirmation', async () => {
        render(<Employees />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        const deleteButtons = screen.getAllByRole('button', {
            name: 'Delete',
        })

        fireEvent.click(deleteButtons[0])

        const dialog = screen.getByRole('dialog')

        fireEvent.click(
            dialog.querySelector('button')
        )

        await waitFor(() => {
            expect(api.delete).toHaveBeenCalledWith('/api/employees/1')
        })

        await waitFor(() => {
            expect(screen.queryByText('Anil Sharma')).not.toBeInTheDocument()
        })
    })

    it('hides admin controls for employees', async () => {
        useSelector.mockReturnValue('EMPLOYEE')

        render(<Employees />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        expect(
            screen.queryByRole('button', { name: '+ Add Employee' })
        ).not.toBeInTheDocument()

        expect(
            screen.queryByRole('button', { name: 'Delete' })
        ).not.toBeInTheDocument()

        expect(
            screen.getAllByRole('button', { name: 'Edit' })
        ).toHaveLength(2)
    })

    it('displays an empty state when no employees exist', async () => {
        api.get.mockResolvedValue({ data: [] })

        render(<Employees />)

        await waitFor(() => {
            expect(screen.getByText('No employees found')).toBeInTheDocument()
        })
    })

    it('displays an error when loading employees fails', async () => {
        api.get.mockRejectedValue({
            response: {
                data: {
                    message: 'Unable to load employee data',
                },
            },
        })

        render(<Employees />)

        await waitFor(() => {
            expect(
                screen.getByText('Unable to load employee data')
            ).toBeInTheDocument()
        })
    })
})