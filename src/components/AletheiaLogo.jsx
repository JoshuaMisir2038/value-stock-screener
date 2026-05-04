// Geometric eye mark — the eye as disclosure, unconcealment, seeing truth.
// Sized for the 48×48 header slot.
export default function AletheiaLogo({ size = 48 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Dark field */}
      <rect width="48" height="48" fill="#060c16" />

      {/* Outer lens / eye silhouette */}
      <path
        d="M4 24 C10 13 18 7 24 7 C30 7 38 13 44 24 C38 35 30 41 24 41 C18 41 10 35 4 24Z"
        stroke="#3b82f6"
        strokeWidth="1.25"
        fill="none"
      />

      {/* Iris ring */}
      <circle cx="24" cy="24" r="8.5" stroke="#3b82f6" strokeWidth="1.25" fill="none" />

      {/* Inner precision ring */}
      <circle cx="24" cy="24" r="4.5" stroke="#3b82f6" strokeWidth="0.6" fill="none" opacity="0.4" />

      {/* Pupil */}
      <circle cx="24" cy="24" r="2.25" fill="#3b82f6" />

      {/* Cardinal tick marks — precision / analysis */}
      <line x1="24" y1="13.5" x2="24" y2="16.5" stroke="#3b82f6" strokeWidth="1" strokeLinecap="round" />
      <line x1="24" y1="31.5" x2="24" y2="34.5" stroke="#3b82f6" strokeWidth="1" strokeLinecap="round" />
      <line x1="13.5" y1="24" x2="16.5" y2="24" stroke="#3b82f6" strokeWidth="1" strokeLinecap="round" />
      <line x1="31.5" y1="24" x2="34.5" y2="24" stroke="#3b82f6" strokeWidth="1" strokeLinecap="round" />

      {/* Corner border lines — terminal / instrument aesthetic */}
      <line x1="0" y1="0" x2="8"  y2="0"  stroke="#1e3a5f" strokeWidth="1" />
      <line x1="0" y1="0" x2="0"  y2="8"  stroke="#1e3a5f" strokeWidth="1" />
      <line x1="40" y1="0" x2="48" y2="0"  stroke="#1e3a5f" strokeWidth="1" />
      <line x1="48" y1="0" x2="48" y2="8"  stroke="#1e3a5f" strokeWidth="1" />
      <line x1="0"  y1="48" x2="8"  y2="48" stroke="#1e3a5f" strokeWidth="1" />
      <line x1="0"  y1="40" x2="0"  y2="48" stroke="#1e3a5f" strokeWidth="1" />
      <line x1="40" y1="48" x2="48" y2="48" stroke="#1e3a5f" strokeWidth="1" />
      <line x1="48" y1="40" x2="48" y2="48" stroke="#1e3a5f" strokeWidth="1" />
    </svg>
  )
}
