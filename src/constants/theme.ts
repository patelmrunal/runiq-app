// ─── Color Palette ─────────────────────────────────────────────────────────────

export const COLORS = {
  white: '#FFFFFF',
  offWhite: '#F4F4F5',
  nearBlack: '#18181B',
  almostBlack: '#09090B',
  mediumGrey: '#71717A',
  lightGrey: '#A1A1AA',
  accent: '#E94560',        // RED-PINK — primary accent
  deepBlue: '#0F3460',
  success: '#10B981',
  warning: '#F59E0B',
  border: '#E4E4E7',
};

export const FONTS = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─── Legacy aliases (for backward compatibility with existing screens) ─────────

export const Colors = {
  PRIMARY_BG: COLORS.white,
  SECONDARY_BG: COLORS.offWhite,
  SURFACE: COLORS.nearBlack,
  PRIMARY_TEXT: COLORS.almostBlack,
  SECONDARY_TEXT: COLORS.mediumGrey,
  MUTED_TEXT: COLORS.lightGrey,
  ACCENT: COLORS.accent,
  ACCENT_SECONDARY: COLORS.deepBlue,
  SUCCESS: COLORS.success,
  WARNING: COLORS.warning,
  BORDER: COLORS.border,
} as const;

export const Typography = {
  fontFamily: 'Inter',
  hero: {
    fontSize: 36,
    fontWeight: '700' as const,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '600' as const,
  },
  sectionHeader: {
    fontSize: 19,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  stats: {
    fontSize: 28,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'] as const,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;
