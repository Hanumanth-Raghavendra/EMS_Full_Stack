import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import { getErrorMessage } from '../../api/client'

export default function ErrorState({ error, onRetry, message }) {
    return (
        <Alert
            severity="error"
            action={
                onRetry ? (
                    <Button color="inherit" size="small" onClick={onRetry}>
                        Try again
                    </Button>
                ) : undefined
            }
        >
            {message || getErrorMessage(error, 'Could not load this data.')}
        </Alert>
    )
}
