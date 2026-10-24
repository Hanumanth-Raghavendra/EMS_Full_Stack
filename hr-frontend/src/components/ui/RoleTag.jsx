import { ROLE_LABELS } from '../../utils/constants'

export default function RoleTag({ role }) {
    if (!role) {
        return null
    }
    return <span className={`role-tag role-${role.toLowerCase()}`}>{ROLE_LABELS[role] || role}</span>
}
