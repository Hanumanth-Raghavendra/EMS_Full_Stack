import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined'
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined'
import AssignmentIndOutlined from '@mui/icons-material/AssignmentIndOutlined'
import BadgeOutlined from '@mui/icons-material/BadgeOutlined'
import BeachAccessOutlined from '@mui/icons-material/BeachAccessOutlined'
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined'
import GroupsOutlined from '@mui/icons-material/GroupsOutlined'
import HistoryOutlined from '@mui/icons-material/HistoryOutlined'
import ManageAccountsOutlined from '@mui/icons-material/ManageAccountsOutlined'
import SpaceDashboardOutlined from '@mui/icons-material/SpaceDashboardOutlined'
import WorkOutlineOutlined from '@mui/icons-material/WorkOutlineOutlined'
import PersonOutlined from '@mui/icons-material/PersonOutlined'
import { ROLES } from '../../utils/constants'

const ALL = [ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE]
const MANAGERS = [ROLES.ADMIN, ROLES.HR]

/** Sidebar entries; each link lists the roles that can see it. */
export const NAV_GROUPS = [
    {
        title: 'My workday',
        links: [
            { to: '/dashboard', label: 'Dashboard', icon: SpaceDashboardOutlined, roles: ALL },
            { to: '/attendance', label: 'Attendance', icon: EventAvailableOutlined, roles: ALL },
            { to: '/leave', label: 'Leave', icon: BeachAccessOutlined, roles: ALL },
            { to: '/projects', label: 'Projects', icon: WorkOutlineOutlined, roles: ALL },
            { to: '/profile', label: 'My profile', icon: PersonOutlined, roles: ALL },
        ],
    },
    {
        title: 'People',
        links: [
            { to: '/employees', label: 'Employees', icon: GroupsOutlined, roles: MANAGERS },
            { to: '/departments', label: 'Departments', icon: ApartmentOutlined, roles: MANAGERS },
            { to: '/designations', label: 'Designations', icon: BadgeOutlined, roles: MANAGERS },
            { to: '/assignments', label: 'Project teams', icon: AssignmentIndOutlined, roles: MANAGERS },
        ],
    },
    {
        title: 'Administration',
        links: [
            { to: '/users', label: 'User accounts', icon: ManageAccountsOutlined, roles: MANAGERS },
            { to: '/roles', label: 'Roles', icon: AdminPanelSettingsOutlined, roles: MANAGERS },
            { to: '/audit-logs', label: 'Audit log', icon: HistoryOutlined, roles: [ROLES.ADMIN] },
        ],
    },
]

