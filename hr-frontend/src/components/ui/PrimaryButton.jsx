import Button from '@mui/material/Button'

function PrimaryButton({
    children,
    onClick,
    type = 'button',
    disabled = false,
}) {
    return (
        <Button
            variant="contained"
            type={type}
            onClick={onClick}
            disabled={disabled}
            sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1,
                boxShadow: 'none',
            }}
        >
            {children}
        </Button>
    )
}

export default PrimaryButton