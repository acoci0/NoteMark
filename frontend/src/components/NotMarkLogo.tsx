type NotMarkLogoProps = {
  size?: number;
};

export default function NotMarkLogo({
  size = 40,
}: NotMarkLogoProps) {
  return (
    <svg
      className="notmark-logo"
      width={size}
      height={size}
      viewBox="0 0 56 56"
      role="img"
      aria-label="NotMark"
    >
      <defs>
        <linearGradient
          id="nm-bg"
          x1="6"
          y1="5"
          x2="50"
          y2="52"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0"
            stopColor="#202B4A"
          />

          <stop
            offset="1"
            stopColor="#111B2D"
          />
        </linearGradient>

        <linearGradient
          id="nm-white"
          x1="14"
          y1="14"
          x2="32"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0"
            stopColor="#FFFFFF"
          />

          <stop
            offset="1"
            stopColor="#EEF1F6"
          />
        </linearGradient>

        <linearGradient
          id="nm-orange"
          x1="29"
          y1="39"
          x2="44"
          y2="14"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0"
            stopColor="#F56A0B"
          />

          <stop
            offset="1"
            stopColor="#FFA62B"
          />
        </linearGradient>

        <filter
          id="nm-shadow"
          x="-35%"
          y="-35%"
          width="170%"
          height="170%"
        >
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="3.5"
            floodColor="#000000"
            floodOpacity="0.22"
          />
        </filter>
      </defs>

      {/* Arka plan */}
      <rect
        x="2"
        y="2"
        width="52"
        height="52"
        rx="15"
        fill="url(#nm-bg)"
        filter="url(#nm-shadow)"
      />

      <rect
        x="2.5"
        y="2.5"
        width="51"
        height="51"
        rx="14.5"
        fill="none"
        stroke="rgba(255,255,255,0.06)"
      />

      {/* Beyaz N: sol dikey + çapraz */}
      <path
        d="M15 39V18.5C15 16.3 16.8 14.5 19 14.5H20C21.2 14.5 22.3 15 23.1 15.9L33 27.5"
        fill="none"
        stroke="url(#nm-white)"
        strokeWidth="7.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Turuncu üst sağ kol */}
      <path
        d="M32.8 27.8L42.5 15.8"
        fill="none"
        stroke="url(#nm-orange)"
        strokeWidth="7.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Turuncu alt sağ kol */}
      <path
        d="M41 28.5V37.3C41 40.8 38.4 43.2 35 43.2H32.8C31.1 43.2 29.5 42.5 28.4 41.2L23.2 35.4"
        fill="none"
        stroke="url(#nm-orange)"
        strokeWidth="7.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Birleşim derinliği */}
      <path
        d="M31.6 27L35 30.8"
        fill="none"
        stroke="#C85207"
        strokeWidth="2.1"
        strokeLinecap="round"
        opacity="0.28"
      />
    </svg>
  );
}
