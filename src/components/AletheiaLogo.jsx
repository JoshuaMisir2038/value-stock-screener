/**
 * Aletheia mark — Pepsi palette, Apple rainbow treatment, old-school tech.
 *
 * Three bold horizontal bands (red / white / blue) clipped to the eye
 * silhouette, exactly like the 1977 Apple logo's colour-band technique
 * but using Pepsi's classic tricolour. Dark iris + pupil cut through
 * all three bands so the reticle reads at any size.
 */
export default function AletheiaLogo({ size = 48 }) {
  const bg  = '#08111e'   // deep navy-black
  const red = '#E8192C'   // classic Pepsi red
  const wht = '#F0EDE8'   // warm off-white
  const blu = '#004A98'   // classic Pepsi blue
  const sep = '#08111e'   // thin dark separator between bands

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="aletheia-eye">
          {/* Lens / eye silhouette */}
          <path d="M3 24 C10 12 18 6 24 6 C30 6 38 12 45 24 C38 36 30 42 24 42 C18 42 10 36 3 24Z" />
        </clipPath>
      </defs>

      {/* Background */}
      <rect width="48" height="48" fill={bg} />

      {/* ── Three Pepsi bands, Apple-logo technique ── */}
      <g clipPath="url(#aletheia-eye)">
        {/* Red — top third */}
        <rect x="0" y="6"    width="48" height="14"  fill={red} />
        {/* Separator */}
        <rect x="0" y="20"   width="48" height="0.9" fill={sep} />
        {/* White — centre band (narrower, like the Pepsi swipe) */}
        <rect x="0" y="20.9" width="48" height="8"   fill={wht} />
        {/* Separator */}
        <rect x="0" y="28.9" width="48" height="0.9" fill={sep} />
        {/* Blue — bottom third */}
        <rect x="0" y="29.8" width="48" height="13"  fill={blu} />
      </g>

      {/* Iris ring — dark, cuts cleanly across all three colour bands */}
      <circle cx="24" cy="24" r="8.5" stroke={bg} strokeWidth="1.8" fill="none" />

      {/* Cardinal tick marks inside the iris — old-school reticle feel */}
      <line x1="24" y1="15.5" x2="24" y2="18.5" stroke={bg} strokeWidth="1.1" strokeLinecap="square" />
      <line x1="24" y1="29.5" x2="24" y2="32.5" stroke={bg} strokeWidth="1.1" strokeLinecap="square" />
      <line x1="15.5" y1="24" x2="18.5" y2="24" stroke={bg} strokeWidth="1.1" strokeLinecap="square" />
      <line x1="29.5" y1="24" x2="32.5" y2="24" stroke={bg} strokeWidth="1.1" strokeLinecap="square" />

      {/* Pupil — solid dark disc */}
      <circle cx="24" cy="24" r="2.8" fill={bg} />

      {/* Eye outline — very faint white border */}
      <path
        d="M3 24 C10 12 18 6 24 6 C30 6 38 12 45 24 C38 36 30 42 24 42 C18 42 10 36 3 24Z"
        stroke="white"
        strokeWidth="0.6"
        fill="none"
        opacity="0.15"
      />

      {/* Corner bracket marks — old-school terminal aesthetic */}
      <line x1="0"  y1="0"  x2="7"  y2="0"  stroke="#2a3f5f" strokeWidth="0.9" />
      <line x1="0"  y1="0"  x2="0"  y2="7"  stroke="#2a3f5f" strokeWidth="0.9" />
      <line x1="41" y1="0"  x2="48" y2="0"  stroke="#2a3f5f" strokeWidth="0.9" />
      <line x1="48" y1="0"  x2="48" y2="7"  stroke="#2a3f5f" strokeWidth="0.9" />
      <line x1="0"  y1="41" x2="0"  y2="48" stroke="#2a3f5f" strokeWidth="0.9" />
      <line x1="0"  y1="48" x2="7"  y2="48" stroke="#2a3f5f" strokeWidth="0.9" />
      <line x1="41" y1="48" x2="48" y2="48" stroke="#2a3f5f" strokeWidth="0.9" />
      <line x1="48" y1="41" x2="48" y2="48" stroke="#2a3f5f" strokeWidth="0.9" />
    </svg>
  )
}
