import Button from '@mui/material/Button'

function ActionButton({
    children,
    onClick,
    variant = 'outlined',
    color = 'primary',
    disabled = false,
}) {
    return (
        <Button
            variant={variant}
            color={color}
            size="small"
            onClick={onClick}
            disabled={disabled}
            sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1,
            }}
        >
            {children}
        </Button>
    )
}

export default ActionButton