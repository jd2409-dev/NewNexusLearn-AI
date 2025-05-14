
import type { SVGProps } from 'react';
import React from 'react';

// Original component definition
function OriginalNexusLearnLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 230 50" // Increased width from 200 to 230
      width="230" // Default width, adjusted to new aspect ratio
      height="50" // Default height
      role="img"
      aria-labelledby="nexuslearnLogoTitle"
      {...props}
    >
      <title id="nexuslearnLogoTitle">NexusLearn AI Logo</title>
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      {/* Icon part: Abstract N/L connected dots */}
      <circle cx="15" cy="25" r="5" fill="url(#logoGradient)" />
      <circle cx="35" cy="15" r="5" fill="url(#logoGradient)" />
      <circle cx="35" cy="35" r="5" fill="url(#logoGradient)" />
      <line x1="15" y1="25" x2="35" y2="15" stroke="hsl(var(--primary))" strokeWidth="2" />
      <line x1="15" y1="25" x2="35" y2="35" stroke="hsl(var(--primary))" strokeWidth="2" />
      <line x1="35" y1="15" x2="35" y2="35" stroke="hsl(var(--accent))" strokeWidth="2" />
      
      {/* Text part */}
      <text 
        x="50" // Adjusted x from 55 to 50
        y="32" 
        fontFamily="var(--font-geist-sans), Arial, sans-serif" 
        fontSize="24" 
        fontWeight="bold" 
        fill="hsl(var(--foreground))"
      >
        NexusLearn
        <tspan 
          fill="url(#logoGradient)" 
          dx="6" 
          fontSize="24"
        >
          AI
        </tspan>
      </text>
    </svg>
  );
}

// Memoized version of the component
export const NexusLearnLogo = React.memo(OriginalNexusLearnLogo);
