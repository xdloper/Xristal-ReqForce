import React from 'react';

const INFINITY_PATH =
  'M64 46.5C70.8 37.2 77.6 32 86.5 32C98.6 32 108 41.8 108 56C108 70.2 98.6 80 86.5 80C77.6 80 70.8 74.8 64 65.5C57.2 74.8 50.4 80 41.5 80C29.4 80 20 70.2 20 56C20 41.8 29.4 32 41.5 32C50.4 32 57.2 37.2 64 46.5ZM41.5 43C35.2 43 30.5 48.4 30.5 56C30.5 63.6 35.2 69 41.5 69C48.2 69 53.4 64.2 59 56C53.4 47.8 48.2 43 41.5 43ZM86.5 43C79.8 43 74.6 47.8 69 56C74.6 64.2 79.8 69 86.5 69C92.8 69 97.5 63.6 97.5 56C97.5 48.4 92.8 43 86.5 43Z';

/** White rounded tile with blue Xristal ∞ mark + ReqForge wordmark in front. */
export function XristalLogo({
  className = 'h-7 w-7',
  disabled = false,
}: {
  className?: string;
  disabled?: boolean;
}) {
  const blue = disabled ? '#94a3b8' : '#4E4FEB';

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-label="ReqForge by Xristal"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Crisp white tile so the blue Xristal mark pops on both dark & light themes */}
      <rect
        x="1"
        y="1"
        width="46"
        height="46"
        rx="12"
        fill="#ffffff"
        stroke={disabled ? '#cbd5e1' : '#e0e7ff'}
        strokeWidth="1.5"
      />
      {/* Blue Xristal ∞ behind */}
      <g transform="translate(24 19.5) scale(0.36) translate(-64 -56)">
        <path fill={blue} fillRule="evenodd" d={INFINITY_PATH} />
      </g>
      {/* ReqForge badge in front */}
      <rect
        x="5.5"
        y="30"
        width="37"
        height="12"
        rx="4"
        fill={blue}
      />
      <text
        x="24"
        y="38.2"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="6.7"
        fontWeight="800"
        fontFamily="-apple-system, BlinkMacSystemFont, Inter, sans-serif"
        letterSpacing="-0.2"
      >
        ReqForge
      </text>
    </svg>
  );
}
