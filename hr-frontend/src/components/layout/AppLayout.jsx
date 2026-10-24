import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import useMediaQuery from '@mui/material/useMediaQuery'
import LogoutOutlined from '@mui/icons-material/LogoutOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import MenuOpen from '@mui/icons-material/MenuOpen'
import PersonOutlined from '@mui/icons-material/PersonOutlined'
import { signedOut } from '../../store/authSlice'
import { useAuth } from '../../hooks/useAuth'
import { NAV_GROUPS } from './navigation'
import { formatLongDate } from '../../utils/format'
import BrandMark from '../ui/BrandMark'
import RoleTag from '../ui/RoleTag'

const COLLAPSE_KEY = 'ems.sidebarCollapsed'

function readCollapsed() {
    try {
        return window.localStorage.getItem(COLLAPSE_KEY) === 'true'
    } catch {
        return false
    }
}

function Navigation({ role, collapsed, onNavigate }) {
    return (
        <nav className="sidebar-nav" aria-label="Main">
            {NAV_GROUPS.map((group) => {
                const links = group.links.filter((link) => link.roles.includes(role))
                if (links.length === 0) {
                    return null
                }
                return (
                    <div className="nav-group" key={group.title}>
                        <div className="nav-group-title">{group.title}</div>
                        {links.map((link) => {
                            const Icon = link.icon
                            const item = (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    className="nav-link"
                                    onClick={onNavigate}
                                    aria-label={collapsed ? link.label : undefined}
                                >
                                    <Icon />
                                    <span className="nav-link-label">{link.label}</span>
                                </NavLink>
                            )
                            return collapsed ? (
                                <Tooltip key={link.to} title={link.label} placement="right">
                                    {item}
                                </Tooltip>
                            ) : (
                                item
                            )
                        })}
                    </div>
                )
            })}
        </nav>
    )
}

function Brand() {
    return (
        <NavLink to="/dashboard" className="sidebar-brand">
            <BrandMark className="sidebar-brand-mark" />
            <span className="sidebar-brand-name">
                EMS
                <small>Employee management</small>
            </span>
        </NavLink>
    )
}

function initials(name = '') {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('')
}

export default function AppLayout() {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { user, role } = useAuth()
    const isDesktop = useMediaQuery('(min-width: 901px)')
    const [collapsed, setCollapsed] = useState(readCollapsed)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [menuAnchor, setMenuAnchor] = useState(null)

    const toggleSidebar = () => {
        if (!isDesktop) {
            setDrawerOpen(true)
            return
        }
        setCollapsed((value) => {
            const next = !value
            try {
                window.localStorage.setItem(COLLAPSE_KEY, String(next))
            } catch {
                // ignore unavailable storage
            }
            return next
        })
    }

    const signOut = () => {
        setMenuAnchor(null)
        dispatch(signedOut())
        navigate('/login', { replace: true })
    }

    const showCollapsed = collapsed && isDesktop

    return (
        <div className={`shell ${showCollapsed ? 'is-collapsed' : ''}`}>
            <aside className="sidebar">
                <Brand />
                <Navigation role={role} collapsed={showCollapsed} />
                <div className="sidebar-footer">Signed in as {user?.username}</div>
            </aside>

            <Drawer open={drawerOpen && !isDesktop} onClose={() => setDrawerOpen(false)}>
                <div className="drawer-sidebar">
                    <Brand />
                    <Navigation role={role} collapsed={false} onNavigate={() => setDrawerOpen(false)} />
                </div>
            </Drawer>

            <div className="main">
                <header className="topbar">
                    <IconButton
                        onClick={toggleSidebar}
                        aria-label={showCollapsed || !isDesktop ? 'Open navigation' : 'Collapse navigation'}
                    >
                        {showCollapsed || !isDesktop ? <MenuIcon /> : <MenuOpen />}
                    </IconButton>
                    <span className="topbar-date">{formatLongDate(new Date())}</span>
                    <div className="topbar-spacer" />
                    <Button
                        color="inherit"
                        onClick={(event) => setMenuAnchor(event.currentTarget)}
                        aria-haspopup="menu"
                        aria-label="Account menu"
                        sx={{ gap: 1.2, px: 1, fontWeight: 600 }}
                    >
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>
                            {initials(user?.fullName)}
                        </Avatar>
                        <span style={{ textAlign: 'left', lineHeight: 1.2 }}>
                            {user?.fullName}
                            <span style={{ display: 'block' }}>
                                <RoleTag role={role} />
                            </span>
                        </span>
                    </Button>
                    <Menu
                        anchorEl={menuAnchor}
                        open={Boolean(menuAnchor)}
                        onClose={() => setMenuAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                        <MenuItem
                            onClick={() => {
                                setMenuAnchor(null)
                                navigate('/profile')
                            }}
                        >
                            <ListItemIcon>
                                <PersonOutlined fontSize="small" />
                            </ListItemIcon>
                            My profile
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={signOut}>
                            <ListItemIcon>
                                <LogoutOutlined fontSize="small" />
                            </ListItemIcon>
                            Sign out
                        </MenuItem>
                    </Menu>
                </header>
                <main className="content" id="main">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
