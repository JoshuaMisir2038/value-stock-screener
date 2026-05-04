// Rainbow eye — Apple 1977 meets Pepsi bold.
// Six horizontal colour bands clipped to the eye silhouette, white pupil, dark field.
export default function AletheiaLogo({ size = 48 }) {
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
          <path d="M3 24 C10 12 18 6 24 6 C30 6 38 12 45 24 C38 36 30 42 24 42 C18 42 10 36 3 24Z" />
        </clipPath>
      </defs>

      {/* Dark field */}
      <rect width="48" height="48" fill="#09111f" />

      {/* Rainbow stripes — clipped to eye silhouette */}
      <g clipPath="url(#aletheia-eye)">
        {/* Red */}
        <rect x="0" y="6"    width="48" height="6"   fill="#FF3B30" />
        {/* Thin dark separator */}
        <rect x="0" y="12"   width="48" height="0.6" fill="#09111f" />
        {/* Orange */}
        <rect x="0" y="12.6" width="48" height="6"   fill="#FF9500" />
        <rect x="0" y="18.6" width="48" height="0.6" fill="#09111f" />
        {/* Yellow */}
        <rect x="0" y="19.2" width="48" height="6"   fill="#FFD60A" />
        <rect x="0" y="25.2" width="48" height="0.6" fill="#09111f" />
        {/* Green */}
        <rect x="0" y="25.8" width="48" height="6"   fill="#30D158" />
        <rect x="0" y="31.8" width="48" height="0.6" fill="#09111f" />
        {/* Cyan / light blue */}
        <rect x="0" y="32.4" width="48" height="5"   fill="#40C8E0" />
        <rect x="0" y="37.4" width="48" height="0.6" fill="#09111f" />
        {/* Purple */}
        <rect x="0" y="38"   width="48" height="5"   fill="#BF5AF2" />
      </g>

      {/* Iris ring — white, semi-transparent so colours show through */}
      <circle cx="24" cy="24" r="9" stroke="white" strokeWidth="0.8" fill="none" opacity="0.35" />

      {/* Eye outline */}
      <path
        d="M3 24 C10 12 18 6 24 6 C30 6 38 12 45 24 C38 36 30 42 24 42 C18 42 10 36 3 24Z"
        stroke="white"
        strokeWidth="0.7"
        fill="none"
        opacity="0.25"
      />

      {/* Pupil — solid white, sharp centre point */}
      <circle cx="24" cy="24" r="2.8" fill="white" />
      <circle cx="24" cy="24" r="1"   fill="#09111f" />

      {/* Corner bracket marks */}
      <line x1="0"  y1="0"  x2="7"  y2="0"  stroke="#1e3a5f" strokeWidth="0.8" />
      <line x1="0"  y1="0"  x2="0"  y2="7"  stroke="#1e3a5f" strokeWidth="0.8" />
      <line x1="41" y1="0"  x2="48" y2="0"  stroke="#1e3a5f" strokeWidth="0.8" />
      <line x1="48" y1="0"  x2="48" y2="7"  stroke="#1e3a5f" strokeWidth="0.8" />
      <line x1="0"  y1="41" x2="0"  y2="48" stroke="#1e3a5f" strokeWidth="0.8" />
      <line x1="0"  y1="48" x2="7"  y2="48" stroke="#1e3a5f" strokeWidth="0.8" />
      <line x1="41" y1="48" x2="48" y2="48" stroke="#1e3a5f" strokeWidth="0.8" />
      <line x1="48" y1="41" x2="48" y2="48" stroke="#1e3a5f" strokeWidth="0.8" />
    </svg>
  )
}
