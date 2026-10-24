import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

/**
 * A labelled select built on TextField.
 * options: [{ value, label }]; `emptyLabel` adds a first "all"/"none" option.
 */
export default function SelectField({ options, emptyLabel, value, ...props }) {
    return (
        <TextField select value={value ?? ''} {...props}>
            {emptyLabel !== undefined ? (
                <MenuItem value="">
                    <em style={{ fontStyle: 'normal', color: '#56625F' }}>{emptyLabel}</em>
                </MenuItem>
            ) : null}
            {options.map((option) => (
                <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                </MenuItem>
            ))}
        </TextField>
    )
}
