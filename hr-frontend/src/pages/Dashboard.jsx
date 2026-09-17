import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api from '../api/axios'

function Dashboard() {
    const navigate = useNavigate()
    const role = useSelector((state) => state.auth.role)
    const isEmployee = role === 'EMPLOYEE'
    const [stats, setStats] = useState({ employees: 0, activeEmployees: 0, projects: 0, leaveRequests: 0, attendance: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const [employees, projects, leave, attendance] = await Promise.all([
                    api.get('/api/employees'),
                    api.get('/api/projects'),
                    api.get('/api/leave-requests'),
                    api.get('/api/attendance'),
                ])
                setStats({
                    employees: employees.data.length,
                    activeEmployees: employees.data.filter((e) => e.status === 'ACTIVE').length,
                    projects: projects.data.length,
                    leaveRequests: leave.data.length,
                    attendance: attendance.data.length,
                })
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [isEmployee])

    const cards = isEmployee
        ? [
            ['My Profile', stats.employees, '/employees'],
            ['My Projects', stats.projects, '/employee-projects'],
            ['My Leave Requests', stats.leaveRequests, '/leave-requests'],
            ['My Attendance', stats.attendance, '/attendance'],
        ]
        : [
            ['Employees', stats.employees, '/employees'],
            ['Active Employees', stats.activeEmployees, '/employees'],
            ['Projects', stats.projects, '/projects'],
            ['Leave Requests', stats.leaveRequests, '/leave-requests'],
            ['Attendance Records', stats.attendance, '/attendance'],
        ]

    return (
        <div className="page-container">
            <div className="page-header">
                <div><h1>Dashboard</h1><p>Overview of your HR operations.</p></div>
            </div>
            <div className="stats-grid">
                {cards.map(([label, value, route]) => (
                    <button className="stat-card" key={label} onClick={() => navigate(route)}>
                        <span>{label}</span>
                        <strong>{loading ? '—' : value}</strong>
                    </button>
                ))}
            </div>
            {isEmployee ? (
                <div className="dashboard-grid">
                    <div className="dashboard-card"><h2>My Profile</h2><p>Update your email address and phone number.</p><button className="primary-button" onClick={() => navigate('/employees')}>Open Profile</button></div>
                    <div className="dashboard-card"><h2>My Work</h2><p>Review your attendance, leave requests and assigned projects.</p><button className="primary-button" onClick={() => navigate('/leave-requests')}>Open Leave Requests</button></div>
                </div>
            ) : (
                <div className="dashboard-grid">
                    <div className="dashboard-card"><h2>Employee Management</h2><p>Create, update and maintain employee records.</p><button className="primary-button" onClick={() => navigate('/employees')}>Open Employees</button></div>
                    <div className="dashboard-card"><h2>Work Management</h2><p>Manage attendance, leave, projects and assignments.</p><button className="primary-button" onClick={() => navigate('/attendance')}>Open Attendance</button></div>
                    <div className="dashboard-card"><h2>Administration</h2><p>Manage users, roles and review audit activity.</p><button className="primary-button" onClick={() => navigate('/users')}>Open Administration</button></div>
                </div>
            )}
        </div>
    )
}

export default Dashboard
