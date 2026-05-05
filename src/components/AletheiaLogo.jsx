/**
 * Aletheia mark — a prism triangle.
 *
 * Three Pepsi colour bands (red / white / blue) clipped to an upward-pointing
 * triangle. The prism is the symbol of unconcealment: hidden light revealed.
 * Same Apple-band technique as before, completely different form — no circles,
 * no Mastercard confusion. The triangle also reads as Greek Delta (Δ) = change,
 * and as an upward arrow = growth. All relevant to a stock screener.
 */
export default function AletheiaLogo({ size = 48 }) {
  const bg  = '#08111e'
  const red = '#E8192C'
  const wht = '#F0ECE4'
  const blu = '#004A98'
  const sep = '#08111e'
  const brkt = '#1e3050'

  // Triangle: apex (24,5), bottom-left (4,43), bottom-right (44,43)
  const tri = 'M 24 5 L 44 43 L 4 43 Z'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="aletheia-tri">
          <path d={tri} />
        </clipPath>
      </defs>

      {/* Background */}
      <rect width="48" height="48" fill={bg} />

      {/* ── Three Pepsi bands clipped to triangle ── */}
      <g clipPath="url(#aletheia-tri)">
        {/* Red — top */}
        <rect x="0" y="5"    width="48" height="13"  fill={red} />
        {/* Separator */}
        <rect x="0" y="18"   width="48" height="0.9" fill={sep} />
        {/* White — middle */}
        <rect x="0" y="18.9" width="48" height="9"   fill={wht} />
        {/* Separator */}
        <rect x="0" y="27.9" width="48" height="0.9" fill={sep} />
        {/* Blue — bottom */}
        <rect x="0" y="28.8" width="48" height="15"  fill={blu} />
      </g>

      {/* Triangle outline — faint white border */}
      <path
        d={tri}
        stroke="white"
        strokeWidth="0.6"
        fill="none"
        opacity="0.2"
      />

      {/* Small apex dot — anchors the tip */}
      <circle cx="24" cy="5" r="1.5" fill={red} opacity="0.8" />

      {/* Corner bracket marks */}
      <line x1="0"  y1="0"  x2="7"  y2="0"  stroke={brkt} strokeWidth="0.9" />
      <line x1="0"  y1="0"  x2="0"  y2="7"  stroke={brkt} strokeWidth="0.9" />
      <line x1="41" y1="0"  x2="48" y2="0"  stroke={brkt} strokeWidth="0.9" />
      <line x1="48" y1="0"  x2="48" y2="7"  stroke={brkt} strokeWidth="0.9" />
      <line x1="0"  y1="41" x2="0"  y2="48" stroke={brkt} strokeWidth="0.9" />
      <line x1="0"  y1="48" x2="7"  y2="48" stroke={brkt} strokeWidth="0.9" />
      <line x1="41" y1="48" x2="48" y2="48" stroke={brkt} strokeWidth="0.9" />
      <line x1="48" y1="41" x2="48" y2="48" stroke={brkt} strokeWidth="0.9" />
    </svg>
  )
}
