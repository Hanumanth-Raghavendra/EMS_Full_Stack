import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

function EmptyState({
    title = 'No records found',
    message,
}) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 5,
                textAlign: 'center',
            }}
        >
            <Typography
                variant="h6"
                sx={{
                    fontWeight: 600,
                    marginBottom: message ? 0.5 : 0,
                }}
            >
                {title}
            </Typography>

            {message && (
                <Typography
                    variant="body2"
                    color="text.secondary"
                >
                    {message}
                </Typography>
            )}
        </Box>
    )
}

export default EmptyState