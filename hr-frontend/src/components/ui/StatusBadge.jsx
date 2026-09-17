import Chip from '@mui/material/Chip'

function StatusBadge({ status }) {
    const normalizedStatus = String(
        status ?? ''
    ).toUpperCase()

    let color = 'default'

    if (
        normalizedStatus === 'ACTIVE' ||
        normalizedStatus === 'APPROVED' ||
        normalizedStatus === 'PRESENT' ||
        normalizedStatus === 'COMPLETED'
    ) {
        color = 'success'
    } else if (
        normalizedStatus === 'PENDING' ||
        normalizedStatus === 'IN_PROGRESS'
    ) {
        color = 'warning'
    } else if (
        normalizedStatus === 'INACTIVE' ||
        normalizedStatus === 'REJECTED' ||
        normalizedStatus === 'ABSENT' ||
        normalizedStatus === 'CANCELLED'
    ) {
        color = 'error'
    }

    return (
        <Chip
            label={status || '—'}
            color={color}
            size="small"
            sx={{
                fontWeight: 600,
            }}
        />
    )
}

export default StatusBadge