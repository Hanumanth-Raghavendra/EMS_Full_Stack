import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout as logoutAction } from '../store/authSlice'
import { useUI } from '../context/UIContext'

const groups = [
    {
        title: 'Overview',
        links: [
            {
                to: '/dashboard',
                label: 'Dashboard',
                short: 'D',
            },
        ],
    },
    {
        title: 'People',
        links: [
            {
                to: '/employees',
                label: 'Employees',
                short: 'E',
            },
            {
                to: '/departments',
                label: 'Departments',
                short: 'D',
                adminOnly: true,
            },
            {
                to: '/designations',
                label: 'Designations',
                short: 'D',
                adminOnly: true,
            },
            {
                to: '/users',
                label: 'Users',
                short: 'U',
                adminOnly: true,
            },
            {
                to: '/roles',
                label: 'Roles',
                short: 'R',
                adminOnly: true,
            },
        ],
    },
    {
        title: 'Work',
        links: [
            {
                to: '/attendance',
                label: 'Attendance',
                short: 'A',
            },
            {
                to: '/leave-requests',
                label: 'Leave Requests',
                short: 'L',
            },
            {
                to: '/projects',
                label: 'Projects',
                short: 'P',
            },
            {
                to: '/employee-projects',
                label: 'Employee Projects',
                short: 'E',
            },
        ],
    },
    {
        title: 'Administration',
        links: [
            {
                to: '/audit-logs',
                label: 'Audit Logs',
                short: 'A',
                adminOnly: true,
            },
        ],
    },
]

export default function Layout() {
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const {
        sidebarCollapsed,
        toggleSidebar,
    } = useUI()

    const username = useSelector(
        (state) => state.auth.username
    )

    const role = useSelector(
        (state) => state.auth.role
    )

    const handleLogout = () => {
        dispatch(logoutAction())
        navigate('/', { replace: true })
    }

    return (
        <div
            className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''
                }`}
        >
            <aside className="sidebar">
                <div className="brand">
                    <div className="brand-mark">
                        HR
                    </div>

                    <div className="brand-info">
                        <strong>
                            HR Management
                        </strong>

                        <span>
                            Human Resources
                        </span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {groups.map((group) => (
                        <div
                            className="nav-group"
                            key={group.title}
                        >
                            <div className="nav-group-title">
                                {group.title}
                            </div>

                            {group.links
                                .filter((link) => !link.adminOnly || role !== 'EMPLOYEE')
                                .map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    data-tooltip={link.label}
                                    className={({ isActive }) =>
                                        `nav-link ${isActive
                                            ? 'active'
                                            : ''
                                        }`
                                    }
                                >
                                    <span className="nav-link-short">
                                        {link.short}
                                    </span>

                                    <span className="nav-link-label">
                                        {link.label}
                                    </span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>
            </aside>

            <section className="main-section">
                <header className="topbar">
                    <div className="topbar-left">
                        <button
                            type="button"
                            className="sidebar-toggle"
                            onClick={toggleSidebar}
                            aria-label={
                                sidebarCollapsed
                                    ? 'Expand sidebar'
                                    : 'Collapse sidebar'
                            }
                        >
                            ☰
                        </button>

                        <div>
                            <span className="topbar-title">
                                HR Management System
                            </span>

                            <span className="topbar-subtitle">
                                {role === 'EMPLOYEE' ? 'Employee portal' : 'Administration portal'}
                            </span>
                        </div>
                    </div>

                    <div className="topbar-user">
                        <span className="username">
                            {username || 'User'}
                        </span>

                        {role && (
                            <span className="user-role">
                                {role}
                            </span>
                        )}

                        <button
                            className="logout-button"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <main className="page-content">
                    <Outlet />
                </main>
            </section>
        </div>
    )
}