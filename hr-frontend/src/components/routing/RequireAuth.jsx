import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { selectIsAuthenticated } from '../../store/authSlice'

export default function RequireAuth() {
    const authenticated = useSelector(selectIsAuthenticated)
    const previousUsername = useSelector((state) => state.auth.previousUsername)
    const location = useLocation()

    if (!authenticated) {
        // "by" records whose page this was, in history state so it survives a
        // reload: after sign-in, only that person is sent back to it.
        const state = { from: location.pathname + location.search, by: previousUsername ?? null }
        return <Navigate to="/login" replace state={state} />
    }
    return <Outlet />
}
