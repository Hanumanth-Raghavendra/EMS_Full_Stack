import { useSelector } from 'react-redux'
import { selectUser } from '../store/authSlice'
import { ROLES } from '../utils/constants'

/** The signed-in user plus convenient role checks. */
export function useAuth() {
    const user = useSelector(selectUser)
    const role = user?.role
    return {
        user,
        role,
        isAdmin: role === ROLES.ADMIN,
        isHr: role === ROLES.HR,
        isManager: role === ROLES.ADMIN || role === ROLES.HR,
        isEmployee: role === ROLES.EMPLOYEE,
        hasRole: (...roles) => roles.includes(role),
    }
}
