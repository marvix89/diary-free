interface CategoryIconProps {
  category: string;
  size?: number;
  className?: string;
}

export default function CategoryIcon({ category, size = 24, className }: CategoryIconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  switch (category) {
    // 🥛 Alternative Vegetali – brocca/bottiglia
    case 'alternative-vegetali':
      return (
        <svg {...props}>
          <path d="M8 3h8l1.5 4H6.5L8 3Z" stroke="currentColor" fill="none" />
          <path d="M6.5 7v11a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 17 18V7" stroke="currentColor" />
          <path d="M9.5 11.5h5" stroke="currentColor" />
          <path d="M9.5 14.5h3.5" stroke="currentColor" />
        </svg>
      );

    // 🧀 Formaggi – blocco di formaggio
    case 'formaggi':
      return (
        <svg {...props}>
          <path d="M3 12 L12 4 L21 12" stroke="currentColor" />
          <rect x="3" y="12" width="18" height="8" rx="1" stroke="currentColor" />
          <circle cx="9" cy="16" r="1.2" stroke="currentColor" />
          <circle cx="15" cy="15" r="0.9" stroke="currentColor" />
          <circle cx="13" cy="17.5" r="0.7" stroke="currentColor" />
        </svg>
      );

    // 🫙 Yogurt & Dessert – vasetto
    case 'yogurt-dessert':
      return (
        <svg {...props}>
          <path d="M7 4h10v2H7z" stroke="currentColor" />
          <path d="M6 6h12l-1.5 13.5a1 1 0 0 1-1 .5h-7a1 1 0 0 1-1-.5L6 6Z" stroke="currentColor" />
          <path d="M9 11c1 1 5 1 6 0" stroke="currentColor" />
        </svg>
      );

    // 🍪 Dolci & Biscotti – biscotto
    case 'dolci-biscotti':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" />
          <circle cx="9" cy="10" r="1" fill="currentColor" />
          <circle cx="14" cy="9" r="0.8" fill="currentColor" />
          <circle cx="10.5" cy="13.5" r="0.8" fill="currentColor" />
          <circle cx="15" cy="13" r="1" fill="currentColor" />
          <circle cx="12" cy="16" r="0.7" fill="currentColor" />
        </svg>
      );

    // 🍦 Gelati – cono gelato
    case 'gelati':
      return (
        <svg {...props}>
          <path d="M9 14 L12 21 L15 14" stroke="currentColor" />
          <path d="M8.5 14h7" stroke="currentColor" />
          <path
            d="M8 10a4 4 0 0 1 8 0c0 2.5-2 4-4 4s-4-1.5-4-4Z"
            stroke="currentColor"
          />
          <path d="M10 8.5c0-1 .8-2 2-2" stroke="currentColor" strokeLinecap="round" />
        </svg>
      );

    // 🍳 Piatti Pronti – piatto con coperchio
    case 'piatti-pronti':
      return (
        <svg {...props}>
          <path d="M4 14a8 8 0 0 1 16 0" stroke="currentColor" />
          <path d="M3 14h18" stroke="currentColor" />
          <path d="M8 14v2.5" stroke="currentColor" />
          <path d="M16 14v2.5" stroke="currentColor" />
          <path d="M5 16.5h14" stroke="currentColor" />
          <path d="M12 6v3" stroke="currentColor" />
          <path d="M10.5 6.5 12 6l1.5.5" stroke="currentColor" />
        </svg>
      );

    // ⭐ Personalizzato – stella
    case 'personalizzato':
      return (
        <svg {...props}>
          <path
            d="M12 2l2.7 8.5H23l-7 5 2.7 8.5L12 19l-6.7 5 2.7-8.5-7-5h8.3L12 2Z"
            stroke="currentColor"
          />
        </svg>
      );

    // Fallback generico – pacchetto
    default:
      return (
        <svg {...props}>
          <rect x="3" y="6" width="18" height="14" rx="1.5" stroke="currentColor" />
          <path d="M3 10h18" stroke="currentColor" />
          <path d="M9 10v10" stroke="currentColor" />
        </svg>
      );
  }
}
