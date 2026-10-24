const PATTERN = [
    'PRESENT', 'PRESENT', 'PRESENT', 'HALF_DAY', 'PRESENT', 'weekend', 'weekend',
    'PRESENT', 'LEAVE', 'LEAVE', 'PRESENT', 'PRESENT', 'weekend', 'weekend',
    'PRESENT', 'PRESENT', 'ABSENT', 'PRESENT', 'PRESENT', 'weekend', 'weekend',
    'PRESENT', 'PRESENT', 'PRESENT', 'future', 'future', 'weekend', 'weekend',
]

/** A sample month register used as illustration on the sign-in screens. */
export default function DecorativeRegister() {
    return (
        <div className="register" aria-hidden="true">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                <span className="register-head" key={`${day}-${index}`}>
                    {day}
                </span>
            ))}
            {PATTERN.map((kind, index) => (
                <span key={index} className={`register-day ${kind} ${index === 23 ? 'today' : ''}`}>
                    {index + 1}
                </span>
            ))}
        </div>
    )
}
