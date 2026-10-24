import { labelFor } from '../../utils/constants'

/** One column per leave type: remaining days, a meter of used/pending, and the detail. */
export default function LeaveBalance({ balances = [] }) {
    return (
        <div className="balance-list">
            {balances.map((item) => {
                const quota = item.quota
                const usedPct = quota ? Math.min(100, (item.used / quota) * 100) : 0
                const pendingPct = quota ? Math.min(100 - usedPct, (item.pending / quota) * 100) : 0
                return (
                    <div className="balance-item" key={item.leaveType}>
                        <div className="name">{labelFor(item.leaveType)}</div>
                        <div className="figure">
                            {quota === null ? item.used : item.remaining}
                            <small> {quota === null ? 'days taken' : `of ${quota} left`}</small>
                        </div>
                        {quota !== null ? (
                            <div className="balance-meter" aria-hidden="true">
                                <span style={{ width: `${usedPct}%`, background: 'var(--ledger)' }} />
                                <span style={{ width: `${pendingPct}%`, background: 'var(--marigold)' }} />
                            </div>
                        ) : (
                            <div className="balance-meter" aria-hidden="true" />
                        )}
                        <div className="detail">
                            {item.used} used{item.pending ? `, ${item.pending} pending` : ''}
                            {quota === null ? ', no annual limit' : ''}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
