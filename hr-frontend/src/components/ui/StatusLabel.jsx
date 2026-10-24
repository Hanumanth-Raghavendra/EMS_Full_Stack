import { STATUS_TONES, labelFor } from '../../utils/constants'

/** Coloured dot + sentence-case label, e.g. "Half day". */
export default function StatusLabel({ value, label }) {
    if (!value) {
        return <span className="muted">—</span>
    }
    const tone = STATUS_TONES[value] || 'neutral'
    return <span className={`status tone-${tone}`}>{label || labelFor(value)}</span>
}
