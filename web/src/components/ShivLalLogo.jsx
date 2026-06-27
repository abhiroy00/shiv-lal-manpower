export default function ShivLalLogo({ size = 48 }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#B71C1C" rx="10" />
      <polygon points="100,8 192,100 100,192 8,100" fill="none" stroke="#D4AF37" strokeWidth="3.5" />
      <path d="M100,60 L142,75 L142,128 Q142,162 100,176 Q58,162 58,128 L58,75 Z" fill="none" stroke="#D4AF37" strokeWidth="3" />
      <polygon points="100,82 106,100 124,100 110,111 116,129 100,118 84,129 90,111 76,100 94,100" fill="#D4AF37" />
      <line x1="100" y1="129" x2="100" y2="176" stroke="#D4AF37" strokeWidth="2.5" />
    </svg>
  );
}

export function ShivLalLogoFull({ width = 200 }) {
  return (
    <svg viewBox="0 0 400 400" width={width} height={width} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="slm-circle">
          <circle cx="200" cy="200" r="197" />
        </clipPath>
      </defs>
      {/* Circle background */}
      <circle cx="200" cy="200" r="200" fill="#B71C1C" />
      {/* Everything clipped to the circle */}
      <g clipPath="url(#slm-circle)">
        {/* Diamond — kept tighter so text has room below */}
        <polygon points="200,28 368,196 200,344 32,196" fill="none" stroke="#D4AF37" strokeWidth="4" />
        {/* Shield */}
        <path d="M200,80 L258,102 L258,188 Q258,236 200,258 Q142,236 142,188 L142,102 Z" fill="none" stroke="#D4AF37" strokeWidth="4" />
        {/* Star */}
        <polygon points="200,108 211,141 246,141 219,161 229,194 200,174 171,194 181,161 154,141 189,141" fill="#D4AF37" />
        {/* Pin line */}
        <line x1="200" y1="194" x2="200" y2="258" stroke="#D4AF37" strokeWidth="4" />
        {/* Text — centered at x=200, font-size tuned to fit circle width at y≈340 */}
        <text
          x="200" y="336"
          textAnchor="middle"
          fontFamily="'Arial Black',Impact,sans-serif"
          fontSize="36"
          fontWeight="900"
          letterSpacing="2"
        >
          <tspan fill="#1A0500">M/S </tspan>
          <tspan fill="#D4AF37">SHIV </tspan>
          <tspan fill="#1A0500">LAL</tspan>
        </text>
      </g>
      {/* Gold border ring */}
      <circle cx="200" cy="200" r="196" fill="none" stroke="#D4AF37" strokeWidth="4" />
    </svg>
  );
}
