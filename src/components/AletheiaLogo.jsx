/**
 * Aletheia mark — prism with gradient spectrum fill.
 *
 * The prism shape stays (ἀλήθεια = unconcealing hidden light) but the
 * flat Pepsi bands are replaced with a smooth gradient spectrum — the way
 * a real prism actually reveals colour. Hot pink → violet → electric blue.
 * Glow filter adds depth. Feels digital-native, not corporate.
 */
export default function AletheiaLogo({ size = 48 }) {
  const bg   = '#08111e'
  const brkt = '#1e3050'

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
        {/* Spectrum gradient — top to bottom, like a real prism */}
        <linearGradient id="spectrum" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FF2D55" />
          <stop offset="35%"  stopColor="#FF6B00" />
          <stop offset="55%"  stopColor="#BF5AF2" />
          <stop offset="100%" stopColor="#0A84FF" />
        </linearGradient>

        {/* Subtle glow behind the triangle */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#BF5AF2" floodOpacity="0.5" />
        </filter>

        {/* Gloss highlight — bright top-left shine */}
        <linearGradient id="gloss" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="white" stopOpacity="0.25" />
          <stop offset="50%"  stopColor="white" stopOpacity="0" />
        </linearGradient>

        <clipPath id="aletheia-tri">
          <path d={tri} />
        </clipPath>
      </defs>

      {/* Background */}
      <rect width="48" height="48" fill={bg} />

      {/* Gradient fill clipped to triangle, with glow */}
      <g filter="url(#glow)">
        <g clipPath="url(#aletheia-tri)">
          <rect x="0" y="0" width="48" height="48" fill="url(#spectrum)" />
          {/* Gloss overlay */}
          <rect x="0" y="0" width="48" height="48" fill="url(#gloss)" />
        </g>
      </g>

      {/* Triangle outline — bright white edge */}
      <path
        d={tri}
        stroke="white"
        strokeWidth="0.7"
        fill="none"
        opacity="0.25"
      />

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
