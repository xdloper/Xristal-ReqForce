import React from 'react';

export function XristalLogo({
  className = 'h-6 w-auto',
  disabled = false,
}: {
  className?: string;
  disabled?: boolean;
}) {
  const strokeColor = disabled ? '#52525b' : '#4E4FEB';
  return (
    <svg
      preserveAspectRatio="xMidYMid meet"
      viewBox="46 18 95 58"
      className={className}
      aria-label="Xristal Logo"
    >
      <path
        d="M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-13.3,7.2-22.1,17.1c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z"
        strokeMiterlimit="10"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth="4.5"
        fill="none"
        stroke={strokeColor}
      />
      <line
        x1="110"
        y1="25"
        x2="110"
        y2="45"
        stroke="#12151a"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <line
        x1="110"
        y1="25"
        x2="110"
        y2="45"
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <line
        x1="80"
        y1="50"
        x2="80"
        y2="70"
        stroke="#12151a"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <line
        x1="80"
        y1="50"
        x2="80"
        y2="70"
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
