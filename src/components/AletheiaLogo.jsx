/**
 * Aletheia mark — Mastercard geometry, Pepsi palette.
 *
 * Two overlapping circles (red left, blue right) with a warm-white
 * lens formed at the intersection — the same technique as Mastercard
 * but in the Pepsi tricolour. The lens is the eye: truth revealed at
 * the overlap of data and analysis.
 */
export default function AletheiaLogo({ size = 48 }) {
  // Circle geometry — r=13, centres at (15,24) and (33,24), distance=18
  // Intersection points: x=24, y = 24 ± √(13²−9²) = 24 ± 9.38
  const r   = 13
  const lx  = 15    // left  circle centre x
  const rx  = 33    // right circle centre x
  const cy  = 24    // shared centre y
  const ix  = 24    // intersection x (midpoint)
  const iy1 = 14.6  // top    intersection y
  const iy2 = 33.4  // bottom intersection y

  const bg   = '#08111e'
  const red  = '#E8192C'
  const blue = '#004A98'
  const wht  = '#F0ECE4'   // warm off-white — lens / overlap
  const brkt = '#1e3050'   // corner brackets

  // Lens path: arc of left circle + arc of right circle
  const lens = [
    `M ${ix} ${iy1}`,
    `A ${r} ${r} 0 0 1 ${ix} ${iy2}`,   // right arc of left circle
    `A ${r} ${r} 0 0 0 ${ix} ${iy1}`,   // left  arc of right circle
    'Z',
  ].join(' ')

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Deep navy field */}
      <rect width="48" height="48" fill={bg} />

      {/* Left circle — Pepsi red */}
      <circle cx={lx} cy={cy} r={r} fill={red} />

      {/* Right circle — Pepsi blue (overlaps red on the right) */}
      <circle cx={rx} cy={cy} r={r} fill={blue} />

      {/* Lens — warm white, sits on top of both circles */}
      <path d={lens} fill={wht} />

      {/* Centre dot — dark, anchors the mark, hints at the pupil/eye */}
      <circle cx={ix} cy={cy} r="2.2" fill={bg} />

      {/* Corner brackets — subtle, old-school instrument feel */}
      <line x1="0"  y1="0"  x2="6"  y2="0"  stroke={brkt} strokeWidth="0.9" />
      <line x1="0"  y1="0"  x2="0"  y2="6"  stroke={brkt} strokeWidth="0.9" />
      <line x1="42" y1="0"  x2="48" y2="0"  stroke={brkt} strokeWidth="0.9" />
      <line x1="48" y1="0"  x2="48" y2="6"  stroke={brkt} strokeWidth="0.9" />
      <line x1="0"  y1="42" x2="0"  y2="48" stroke={brkt} strokeWidth="0.9" />
      <line x1="0"  y1="48" x2="6"  y2="48" stroke={brkt} strokeWidth="0.9" />
      <line x1="42" y1="48" x2="48" y2="48" stroke={brkt} strokeWidth="0.9" />
      <line x1="48" y1="42" x2="48" y2="48" stroke={brkt} strokeWidth="0.9" />
    </svg>
  )
}
