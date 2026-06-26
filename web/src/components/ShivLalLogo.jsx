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

export function ShivLalLogoFull({ width = 220 }) {
  return (
    <svg viewBox="0 0 400 480" width={width} height={width * 1.2} xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="480" fill="#B71C1C" />
      <polygon points="200,18 385,240 200,462 15,240" fill="none" stroke="#D4AF37" strokeWidth="5" />
      <path d="M200,120 L274,148 L274,252 Q274,312 200,338 Q126,312 126,252 L126,148 Z" fill="none" stroke="#D4AF37" strokeWidth="5" />
      <polygon points="200,152 212,188 250,188 220,210 232,246 200,224 168,246 180,210 150,188 188,188" fill="#D4AF37" />
      <line x1="200" y1="246" x2="200" y2="338" stroke="#D4AF37" strokeWidth="5" />
      <text textAnchor="middle" fontFamily="'Arial Black',Impact,sans-serif" fontSize="50" fontWeight="900" letterSpacing="1">
        <tspan x="200" y="408" fill="#1A0500">M/S </tspan>
        <tspan fill="#D4AF37">SHIV </tspan>
        <tspan fill="#1A0500">LAL</tspan>
      </text>
    </svg>
  );
}
