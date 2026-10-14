const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const PlusIcon = () => (
  <svg {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const EditIcon = () => (
  <svg {...base}>
    <path d="M4 20h4L19 9l-4-4L4 16v4z" />
  </svg>
);

export const TrashIcon = () => (
  <svg {...base}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </svg>
);

export const BackIcon = () => (
  <svg {...base}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const ChevronIcon = () => (
  <svg {...base} width={16} height={16}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);
