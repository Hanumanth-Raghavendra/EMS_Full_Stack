import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'

/** A dialog wrapping a <form>; Enter submits, Escape cancels. */
export default function FormDialog({
    open,
    title,
    description,
    onClose,
    onSubmit,
    submitting = false,
    submitLabel = 'Save',
    submitColor = 'primary',
    error,
    maxWidth = 'sm',
    children,
}) {
    const handleSubmit = (event) => {
        event.preventDefault()
        if (!submitting) {
            onSubmit()
        }
    }

    return (
        <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth={maxWidth}>
            <form onSubmit={handleSubmit} noValidate>
                <DialogTitle>{title}</DialogTitle>
                <DialogContent>
                    {description ? <p className="muted" style={{ marginTop: 0 }}>{description}</p> : null}
                    {error ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    ) : null}
                    <div style={{ paddingTop: 6 }}>{children}</div>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button color="inherit" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" color={submitColor} disabled={submitting}>
                        {submitting ? 'Saving…' : submitLabel}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    )
}
