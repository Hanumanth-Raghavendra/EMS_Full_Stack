import { useCallback, useRef, useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { ConfirmContext } from './contexts'

/**
 * Promise-based confirmation dialog:
 *   if (await confirm({ title, message, confirmText: 'Delete', danger: true })) { ... }
 */
export function ConfirmProvider({ children }) {
    const [options, setOptions] = useState(null)
    const resolver = useRef(null)

    const confirm = useCallback(
        (next) =>
            new Promise((resolve) => {
                resolver.current = resolve
                setOptions(next)
            }),
        []
    )

    const finish = (result) => {
        resolver.current?.(result)
        resolver.current = null
        setOptions(null)
    }

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <Dialog open={Boolean(options)} onClose={() => finish(false)} maxWidth="xs">
                <DialogTitle>{options?.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText component="div">{options?.message}</DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button color="inherit" onClick={() => finish(false)}>
                        {options?.cancelText || 'Cancel'}
                    </Button>
                    <Button
                        variant="contained"
                        color={options?.danger ? 'error' : 'primary'}
                        onClick={() => finish(true)}
                        autoFocus
                    >
                        {options?.confirmText || 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>
        </ConfirmContext.Provider>
    )
}
