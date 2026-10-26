// Lightweight inline SVG illustrations in the soft, flat style of the reference screens.

type P = { className?: string };

export function ParkScene({ className }: P) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden="true">
      <ellipse cx="60" cy="72" rx="58" ry="10" fill="#cfeccf" />
      <path d="M0 74 Q30 62 60 70 T120 66 V80 H0z" fill="#a9dca6" />
      <rect x="83" y="40" width="4" height="26" rx="2" fill="#8a6a4a" />
      <circle cx="85" cy="30" r="15" fill="#5cbf6a" />
      <circle cx="94" cy="38" r="10" fill="#4caf5c" />
      <circle cx="77" cy="38" r="10" fill="#6fcc7a" />
      <rect x="103" y="48" width="3" height="18" rx="1.5" fill="#8a6a4a" />
      <circle cx="104.5" cy="42" r="9" fill="#7fd08a" />
      <rect x="30" y="56" width="34" height="3.5" rx="1.5" fill="#6d7b8c" />
      <rect x="30" y="50" width="34" height="3" rx="1.5" fill="#8995a5" />
      <rect x="33" y="59" width="2.5" height="8" fill="#5a6676" />
      <rect x="58" y="59" width="2.5" height="8" fill="#5a6676" />
      <circle cx="16" cy="62" r="6" fill="#8fd694" />
      <circle cx="22" cy="64" r="5" fill="#7fcc86" />
    </svg>
  );
}

export function FortIllustration({ className }: P) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden="true">
      <circle cx="132" cy="18" r="9" fill="#ffd23f" />
      <g stroke="#ffc53d" strokeWidth="2" strokeLinecap="round">
        <line x1="132" y1="3" x2="132" y2="6" /><line x1="147" y1="18" x2="144" y2="18" /><line x1="143" y1="7" x2="141" y2="9" />
      </g>
      <path d="M118 22a6 6 0 0 1 11-3 5 5 0 0 1 8 4h-19z" fill="#fff" stroke="#dbe4ef" strokeWidth="0.8" />
      <ellipse cx="80" cy="84" rx="76" ry="6" fill="#d9ecd3" />
      <circle cx="12" cy="74" r="9" fill="#5cb85c" /><circle cx="150" cy="74" r="9" fill="#5cb85c" />
      <rect x="18" y="44" width="124" height="38" fill="#c8553d" />
      <rect x="18" y="44" width="124" height="5" fill="#a8432f" />
      {Array.from({ length: 16 }).map((_, i) => (
        <rect key={i} x={19 + i * 7.8} y="40" width="4" height="5" fill="#c8553d" />
      ))}
      <rect x="60" y="30" width="40" height="52" fill="#d4613f" />
      <path d="M70 82v-18a10 10 0 0 1 20 0v18z" fill="#7a2d1f" />
      <rect x="58" y="27" width="44" height="4" fill="#a8432f" />
      {[30, 50, 110, 130].map((x) => (
        <g key={x}>
          <rect x={x - 6} y="34" width="12" height="12" fill="#d4613f" />
          <path d={`M${x - 7} 34 q7 -10 14 0z`} fill="#f2efe6" />
          <path d={`M${x - 3} 82v-10a3 3 0 0 1 6 0v10z`} fill="#7a2d1f" />
        </g>
      ))}
      {[66, 80, 94].map((x) => (
        <g key={x}>
          <rect x={x - 4} y="18" width="8" height="10" fill="#d4613f" />
          <path d={`M${x - 5} 18 q5 -9 10 0z`} fill="#f2efe6" />
        </g>
      ))}
      <rect x="79.5" y="4" width="1" height="12" fill="#555" />
      <rect x="80.5" y="4" width="9" height="2" fill="#ff9933" />
      <rect x="80.5" y="6" width="9" height="2" fill="#fff" />
      <rect x="80.5" y="8" width="9" height="2" fill="#138808" />
    </svg>
  );
}

export function MountainIllustration({ className }: P) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="mtn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d93b5" />
          <stop offset="1" stopColor="#4f6a92" />
        </linearGradient>
        <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#eef3f9" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="44" r="40" fill="#e6eff9" />
      <path d="M22 80 L70 20 L118 80z" fill="url(#mtn)" />
      <path d="M70 20 L60 33 L66 31 L70 36 L75 30 L80 33z" fill="#fff" />
      <path d="M70 80 L105 38 L140 80z" fill="#6b84a8" />
      <path d="M105 38 L98 47 L104 45 L109 48z" fill="#fff" />
      <rect x="10" y="52" width="140" height="30" fill="url(#haze)" />
      {[18, 28, 132, 142].map((x, i) => (
        <path key={x} d={`M${x} ${84 - (i % 2) * 4} l6 -18 l6 18z`} fill={i % 2 ? "#3f8f5a" : "#2f7a4a"} />
      ))}
      <ellipse cx="80" cy="85" rx="70" ry="4" fill="#d9e7f2" />
    </svg>
  );
}

export function CarRainIllustration({ className }: P) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden="true">
      <path d="M96 30a10 10 0 0 1 3-19.6A15 15 0 0 1 127 8a11 11 0 0 1 9 22z" fill="#9aa9bf" />
      <path d="M118 36a8 8 0 0 1 3-15.6A12 12 0 0 1 143 20a8 8 0 0 1 3 16z" fill="#b8c4d6" />
      <g stroke="#5b8fd8" strokeWidth="1.6" strokeLinecap="round">
        {[104, 112, 120, 128, 136, 144].map((x, i) => (
          <line key={x} x1={x} y1={36 + (i % 2) * 4} x2={x - 3} y2={44 + (i % 2) * 4} />
        ))}
      </g>
      <path d="M0 82 L160 70 V90 H0z" fill="#6f7b8c" />
      <path d="M10 84 L150 73" stroke="#fff" strokeWidth="1.5" strokeDasharray="8 7" />
      <rect x="0" y="50" width="70" height="30" fill="#e8eef5" opacity="0.8" />
      <g transform="translate(36 52)">
        <path d="M4 22 L8 10 Q10 6 15 6 H42 Q47 6 50 10 L57 18 Q64 19 64 24 V28 H4z" fill="#2e6ad1" />
        <path d="M14 10 H27 V18 H11z M31 10 H43 L49 18 H31z" fill="#cfe2fb" />
        <circle cx="16" cy="29" r="5.5" fill="#26303d" /><circle cx="16" cy="29" r="2.2" fill="#9aa5b5" />
        <circle cx="52" cy="29" r="5.5" fill="#26303d" /><circle cx="52" cy="29" r="2.2" fill="#9aa5b5" />
        <rect x="59" y="21" width="5" height="3" rx="1" fill="#ffe08a" />
      </g>
    </svg>
  );
}

export function MinarIllustration({ className }: P) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden="true">
      <path d="M100 26a9 9 0 0 1 3-17.6A13 13 0 0 1 126 7a10 10 0 0 1 6 19z" fill="#c3cfde" />
      <g stroke="#5b8fd8" strokeWidth="1.5" strokeLinecap="round">
        <line x1="108" y1="31" x2="106" y2="37" /><line x1="117" y1="31" x2="115" y2="37" /><line x1="126" y1="31" x2="124" y2="37" />
      </g>
      <ellipse cx="80" cy="86" rx="60" ry="5" fill="#d9ecd3" />
      <circle cx="40" cy="78" r="8" fill="#5cb85c" /><circle cx="122" cy="78" r="8" fill="#5cb85c" />
      <path d="M70 84 L74 14 H86 L90 84z" fill="#c7643f" />
      {[26, 42, 58].map((y) => (
        <rect key={y} x={69 + (84 - y) * 0.04} y={y} width={22 - (84 - y) * 0.08} height="3.5" rx="1" fill="#e9d8b8" />
      ))}
      <rect x="75" y="8" width="10" height="7" fill="#d98a5d" />
      <path d="M75 8 q5 -7 10 0z" fill="#e9d8b8" />
      <g stroke="#a54a2c" strokeWidth="0.8">
        {[20, 34, 50, 66, 76].map((y) => (<line key={y} x1="75" y1={y} x2="85" y2={y} />))}
      </g>
    </svg>
  );
}

/** Destination header landmark, chosen by the planner's `landmark` key. */
export function Landmark({ kind, className }: { kind: string } & P) {
  const sun = (
    <g>
      <circle cx="146" cy="26" r="8" fill="#ffd23f" />
      <g stroke="#ffc53d" strokeWidth="1.8" strokeLinecap="round">
        <line x1="146" y1="12" x2="146" y2="15" /><line x1="160" y1="26" x2="157" y2="26" /><line x1="156" y1="16" x2="154" y2="18" />
      </g>
    </g>
  );
  const ground = (
    <>
      <ellipse cx="85" cy="86" rx="80" ry="6" fill="#d8ead2" />
      <circle cx="22" cy="78" r="9" fill="#6cc070" /><circle cx="150" cy="78" r="9" fill="#6cc070" />
      <circle cx="33" cy="81" r="6" fill="#86d08a" />
    </>
  );
  return (
    <svg viewBox="0 0 170 92" className={className} aria-hidden="true">
      {sun}
      {ground}
      {kind === "india_gate" && (
        <g>
          <rect x="58" y="22" width="54" height="62" fill="#d39a6a" />
          <path d="M72 84 V52 a13 13 0 0 1 26 0 V84z" fill="#f4f8fd" />
          <rect x="54" y="16" width="62" height="8" rx="1" fill="#c98b5b" />
          <rect x="62" y="8" width="46" height="9" fill="#d39a6a" />
          <path d="M70 8 q15 -9 30 0z" fill="#c98b5b" />
          <g fill="#b97a4c">
            <rect x="60" y="28" width="6" height="56" /><rect x="104" y="28" width="6" height="56" />
          </g>
          <rect x="67" y="26" width="36" height="3" fill="#b97a4c" />
        </g>
      )}
      {kind === "taj" && (
        <g fill="#f3f1ea" stroke="#d8d2c2" strokeWidth="0.8">
          <rect x="52" y="48" width="66" height="36" />
          <path d="M66 48 q19 -40 38 0z" />
          <rect x="83" y="2" width="4" height="8" fill="#d8b85e" stroke="none" />
          <path d="M77 84 V64 a8 8 0 0 1 16 0 V84z" fill="#c9d8ea" />
          {[42, 128].map((x) => (<rect key={x} x={x - 3} y="30" width="6" height="54" />))}
        </g>
      )}
      {kind === "gateway" && (
        <g>
          <rect x="54" y="28" width="62" height="56" fill="#d8b98e" />
          <path d="M73 84 V56 a12 12 0 0 1 24 0 V84z" fill="#f4f8fd" />
          {[56, 78, 100].map((x) => (<rect key={x} x={x} y="16" width="14" height="13" fill="#caa577" />))}
          <path d="M0 84 H170 V92 H0z" fill="#8fc2ea" />
        </g>
      )}
      {(kind === "fort" || kind === "open_hand") && (
        <g transform="translate(10 0)">
          <FortGroup />
        </g>
      )}
      {kind === "skyline" && (
        <g fill="#a9bedb">
          <rect x="40" y="44" width="18" height="40" /><rect x="60" y="30" width="16" height="54" fill="#8eaad0" />
          <rect x="78" y="50" width="20" height="34" /><rect x="100" y="36" width="14" height="48" fill="#8eaad0" />
          <rect x="116" y="56" width="18" height="28" />
          <path d="M66 30 l2 -10 l2 10z" fill="#8eaad0" />
        </g>
      )}
    </svg>
  );
}

function FortGroup() {
  return (
    <g>
      <rect x="38" y="46" width="94" height="38" fill="#c8553d" />
      <rect x="66" y="30" width="38" height="54" fill="#d4613f" />
      <path d="M76 84 v-16 a9 9 0 0 1 18 0 v16z" fill="#7a2d1f" />
      {[46, 124].map((x) => (
        <g key={x}><rect x={x - 6} y="36" width="12" height="12" fill="#d4613f" /><path d={`M${x - 7} 36 q7 -10 14 0z`} fill="#f2efe6" /></g>
      ))}
      {[74, 85, 96].map((x) => (
        <g key={x}><rect x={x - 4} y="20" width="8" height="10" fill="#d4613f" /><path d={`M${x - 5} 20 q5 -9 10 0z`} fill="#f2efe6" /></g>
      ))}
    </g>
  );
}
