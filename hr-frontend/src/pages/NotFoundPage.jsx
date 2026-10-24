import Button from '@mui/material/Button'
import { Link } from 'react-router-dom'
import EmptyState from '../components/ui/EmptyState'

export default function NotFoundPage() {
    return (
        <div className="sheet">
            <EmptyState
                title="This page doesn't exist"
                message="The link may be old or mistyped."
                action={
                    <Button component={Link} to="/dashboard" variant="contained">
                        Go to dashboard
                    </Button>
                }
            />
        </div>
    )
}
