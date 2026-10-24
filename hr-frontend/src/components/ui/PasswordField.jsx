import { useState } from 'react'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'

export default function PasswordField(props) {
    const [visible, setVisible] = useState(false)
    return (
        <TextField
            {...props}
            type={visible ? 'text' : 'password'}
            slotProps={{
                ...props.slotProps,
                input: {
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                onClick={() => setVisible((value) => !value)}
                                edge="end"
                                size="small"
                                aria-label={visible ? 'Hide password' : 'Show password'}
                            >
                                {visible ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
                            </IconButton>
                        </InputAdornment>
                    ),
                },
            }}
        />
    )
}
