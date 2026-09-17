import TextField from '@mui/material/TextField'

function SearchInput({
    value,
    onChange,
    placeholder = 'Search...',
    inputRef,
}) {
    return (
        <TextField
            inputRef={inputRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            size="small"
            sx={{
                width: '480px',

                '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                },

                '& .MuiInputBase-input': {
                    border: 'none !important',
                    outline: 'none !important',
                    boxShadow: 'none !important',
                    width: 'auto !important',
                },
            }}
        />
    )
}

export default SearchInput