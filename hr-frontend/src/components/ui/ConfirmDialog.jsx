import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'

function ConfirmDialog({
    open,
    title = 'Confirm Action',
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
}) {
    return (
        <Dialog
            open={open}
            onClose={onCancel}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>
                {title}
            </DialogTitle>

            <DialogContent>
                <DialogContentText>
                    {message}
                </DialogContentText>
            </DialogContent>

            <DialogActions>
                <Button
                    onClick={onCancel}
                    color="inherit"
                    sx={{
                        textTransform: 'none',
                    }}
                >
                    {cancelText}
                </Button>

                <Button
                    onClick={onConfirm}
                    color="error"
                    variant="contained"
                    sx={{
                        textTransform: 'none',
                    }}
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default ConfirmDialog