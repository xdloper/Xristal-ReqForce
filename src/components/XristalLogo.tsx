import React from 'react';

/** Crisp Xristal ∞ mark — solid fill, even-odd holes. */
export function XristalLogo({
  className = 'h-7 w-7',
  disabled = false,
}: {
  className?: string;
  disabled?: boolean;
}) {
  const ink = disabled ? '#71717a' : '#4E4FEB';
  const wash = disabled ? 'rgba(113,113,122,0.12)' : 'rgba(78,79,235,0.16)';
  const rim = disabled ? 'rgba(113,113,122,0.3)' : 'rgba(78,79,235,0.4)';

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-label="Xristal"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="1"
        y="1"
        width="46"
        height="46"
        rx="12"
        fill={wash}
        stroke={rim}
        strokeWidth="1.25"
      />
      <g transform="translate(24 24) scale(0.78) translate(-64 -56)">
        <path
          fill={ink}
          fillRule="evenodd"
          d="M64 46.5C70.8 37.2 77.6 32 86.5 32C98.6 32 108 41.8 108 56C108 70.2 98.6 80 86.5 80C77.6 80 70.8 74.8 64 65.5C57.2 74.8 50.4 80 41.5 80C29.4 80 20 70.2 20 56C20 41.8 29.4 32 41.5 32C50.4 32 57.2 37.2 64 46.5ZM41.5 43C35.2 43 30.5 48.4 30.5 56C30.5 63.6 35.2 69 41.5 69C48.2 69 53.4 64.2 59 56C53.4 47.8 48.2 43 41.5 43ZM86.5 43C79.8 43 74.6 47.8 69 56C74.6 64.2 79.8 69 86.5 69C92.8 69 97.5 63.6 97.5 56C97.5 48.4 92.8 43 86.5 43Z"
        />
      </g>
    </svg>
  );
}
