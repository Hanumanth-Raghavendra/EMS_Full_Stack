import Button from '@mui/material/Button'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import EmptyState from '../ui/EmptyState'

/** Renders child routes only for the given roles; otherwise explains why. */
export default function RequireRole({ roles }) {
    const { role } = useAuth()

    if (!roles.includes(role)) {
        return (
            <div className="sheet">
                <EmptyState
                    title="You don't have access to this page"
                    message="Ask an administrator if you think you should."
                    action={
                        <Button component={Link} to="/dashboard" variant="contained">
                            Go to dashboard
                        </Button>
                    }
                />
            </div>
        )
    }
    return <Outlet />
}
