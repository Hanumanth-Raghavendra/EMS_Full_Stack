import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { selectIsAuthenticated } from '../../store/authSlice'

export default function RequireAuth() {
    const authenticated = useSelector(selectIsAuthenticated)
    const location = useLocation()

    if (!authenticated) {
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    }
    return <Outlet />
}
