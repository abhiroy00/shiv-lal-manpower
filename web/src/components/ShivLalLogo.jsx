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
        <polygon points="200,22 378,200 200,378 22,200" fill="none" stroke="#D4AF37" strokeWidth="4.5" />
        <path d="M200,92 L264,116 L264,208 Q264,262 200,286 Q136,262 136,208 L136,116 Z" fill="none" stroke="#D4AF37" strokeWidth="4.5" />
        <polygon points="200,122 212,157 248,157 220,178 230,213 200,192 170,213 180,178 152,157 188,157" fill="#D4AF37" />
        <line x1="200" y1="213" x2="200" y2="286" stroke="#D4AF37" strokeWidth="4.5" />
        <text textAnchor="middle" fontFamily="'Arial Black',Impact,sans-serif" fontSize="40" fontWeight="900" letterSpacing="1">
          <tspan x="200" y="352" fill="#1A0500">M/S </tspan>
          <tspan fill="#D4AF37">SHIV </tspan>
          <tspan fill="#1A0500">LAL</tspan>
        </text>
      </g>
      {/* Gold border ring */}
      <circle cx="200" cy="200" r="196" fill="none" stroke="#D4AF37" strokeWidth="4" />
    </svg>
  );
}
