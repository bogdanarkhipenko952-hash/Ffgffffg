import React from 'react';

export type ServiceIconType =
  | 'selection'
  | 'unpacking'
  | 'install'
  | 'service'
  | 'multisplit';

export const ServiceIcon: React.FC<{ type: ServiceIconType }> = ({ type }) => {
  const common = {
    className: 'card-icon',
    viewBox: '0 0 38 38',
    fill: 'none',
    stroke: '#ffffff',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (type) {
    case 'selection':
      return (
        <svg {...common}>
          <rect x="4" y="8" width="30" height="22" rx="2.5" />
          <path d="M9 15h12" />
          <path d="M9 20h7" />
          <circle cx="27" cy="19" r="3.5" />
          <path d="M27 13v1.5M27 23.5V25M21 19h1.5M31.5 19H33" />
        </svg>
      );
    case 'unpacking':
      return (
        <svg {...common}>
          <path d="M7 14l12-6 12 6v14l-12 6-12-6V14z" />
          <path d="M7 14l12 6 12-6" />
          <path d="M19 20v14" />
          <path d="M13 11l12 6" />
          <path d="M19 3v4M16.5 5L19 2.5 21.5 5" />
        </svg>
      );
    case 'install':
      return (
        <svg {...common}>
          <rect x="4" y="8" width="30" height="12" rx="2.5" />
          <path d="M9 16.5h20" />
          <path d="M26 12h3" />
          <path d="M12 24c-1 2.2-1 4.2 0 6.5" />
          <path d="M19 24c-1 2.2-1 4.2 0 6.5" />
          <path d="M26 24c-1 2.2-1 4.2 0 6.5" />
        </svg>
      );
    case 'service':
      return (
        <svg {...common}>
          <circle cx="19" cy="19" r="13" />
          <circle cx="19" cy="19" r="3" />
          <path d="M19 16c0-4 3-7 6-7 1.5 0 2.5 1.5 1.5 3.5C25.5 14.5 22 16 19 16z" />
          <path d="M21.6 20.5c3.5 2 4.6 6.1 3.1 8.7-.8 1.3-2.6 1.4-3.8-.5-1.2-1.8-.8-5.6.7-8.2z" />
          <path d="M16.4 20.5c-3.5 2-7.6.9-9.1-1.7-.7-1.3.1-2.9 2.3-3 2.2-.1 5.3 2.1 6.8 4.7z" />
        </svg>
      );
    case 'multisplit':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="13" height="10" rx="2" />
          <rect x="21" y="5" width="13" height="10" rx="2" />
          <rect x="11" y="23" width="16" height="11" rx="2" />
          <path d="M10.5 15v4.5h8.5V23" />
          <path d="M27.5 15v4.5H19V23" />
          <circle cx="17" cy="28.5" r="2.5" />
        </svg>
      );
  }
};
