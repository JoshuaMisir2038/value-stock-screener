/**
 * Aletheia mark — a precision reticle.
 *
 * Outer ring + four inward cardinal ticks + a small square target at centre.
 * One colour, warm off-white on deep navy. No gradients, no effects.
 * Reads like a Bloomberg terminal widget or a Palantir interface element.
 */
export default function AletheiaLogo({ size = 48 }) {
  const C  = 24        // centre
  const R  = 15        // outer ring radius
  const TL = 3.5       // tick length (inward from ring)
  const SQ = 4         // half-size of centre target square
  const fg = '#ddd8ce' // warm off-white — not stark, not cold

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Deep navy field */}
      <rect width="48" height="48" fill="#080d16" />

      {/* Outer precision ring */}
      <circle
        cx={C} cy={C} r={R}
        stroke={fg} strokeWidth="1.2"
      />

      {/* Cardinal tick marks — inward from ring edge, like a watch dial */}
      {/* Top */}
      <line x1={C} y1={C - R} x2={C} y2={C - R + TL}
            stroke={fg} strokeWidth="1.1" strokeLinecap="square" />
      {/* Bottom */}
      <line x1={C} y1={C + R} x2={C} y2={C + R - TL}
            stroke={fg} strokeWidth="1.1" strokeLinecap="square" />
      {/* Left */}
      <line x1={C - R} y1={C} x2={C - R + TL} y2={C}
            stroke={fg} strokeWidth="1.1" strokeLinecap="square" />
      {/* Right */}
      <line x1={C + R} y1={C} x2={C + R - TL} y2={C}
            stroke={fg} strokeWidth="1.1" strokeLinecap="square" />

      {/* Centre target — open square, not a circle.
          The square reads as data cursor / terminal, not as a generic eye. */}
      <rect
        x={C - SQ} y={C - SQ}
        width={SQ * 2} height={SQ * 2}
        stroke={fg} strokeWidth="0.9"
      />

      {/* Centre fill dot */}
      <rect
        x={C - 1.1} y={C - 1.1}
        width="2.2" height="2.2"
        fill={fg}
      />

      {/* Subtle outer tick extensions — just past the ring, very short.
          Give it the feel of a calibrated instrument. */}
      <line x1={C} y1={C - R - 2.5} x2={C} y2={C - R}
            stroke={fg} strokeWidth="0.7" opacity="0.4" />
      <line x1={C} y1={C + R} x2={C} y2={C + R + 2.5}
            stroke={fg} strokeWidth="0.7" opacity="0.4" />
      <line x1={C - R - 2.5} y1={C} x2={C - R} y2={C}
            stroke={fg} strokeWidth="0.7" opacity="0.4" />
      <line x1={C + R} y1={C} x2={C + R + 2.5} y2={C}
            stroke={fg} strokeWidth="0.7" opacity="0.4" />
    </svg>
  )
}
