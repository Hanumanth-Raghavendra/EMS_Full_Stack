import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import EmptyState from './EmptyState'
import ErrorState from './ErrorState'

/**
 * A ruled table on a sheet, with loading, error, empty and pagination states.
 *
 * columns: [{ key, header, render?(row), align?, width? }]
 * pagination: { page, size, total, onPageChange(page), onSizeChange(size) }
 */
export default function DataTable({
    columns,
    rows,
    rowKey,
    loading = false,
    error = null,
    onRetry,
    empty,
    pagination,
    label,
}) {
    const items = rows || []
    const firstLoad = loading && rows === undefined

    return (
        <div className="sheet">
            <div style={{ height: 3 }}>{loading ? <LinearProgress aria-label="Loading" /> : null}</div>
            {error ? (
                <div className="sheet-body">
                    <ErrorState error={error} onRetry={onRetry} />
                </div>
            ) : null}
            {!error && !firstLoad && items.length === 0 ? (
                <EmptyState
                    title={empty?.title || 'Nothing here yet'}
                    message={empty?.message}
                    action={empty?.action}
                />
            ) : null}
            {items.length > 0 ? (
                <TableContainer>
                    <Table size="medium" aria-label={label}>
                        <TableHead>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableCell key={column.key} align={column.align} style={{ width: column.width }}>
                                        {column.header}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((row, index) => (
                                <TableRow key={rowKey ? rowKey(row) : index} hover>
                                    {columns.map((column) => (
                                        <TableCell key={column.key} align={column.align}>
                                            {column.render ? column.render(row) : row[column.key]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : null}
            {pagination && pagination.total > 0 ? (
                <TablePagination
                    component="div"
                    count={pagination.total}
                    page={Math.min(pagination.page, Math.max(0, Math.ceil(pagination.total / pagination.size) - 1))}
                    rowsPerPage={pagination.size}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_event, page) => pagination.onPageChange(page)}
                    onRowsPerPageChange={(event) => pagination.onSizeChange(Number(event.target.value))}
                    sx={{ borderTop: '1px solid', borderColor: 'divider' }}
                />
            ) : null}
        </div>
    )
}
