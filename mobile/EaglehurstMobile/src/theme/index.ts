/**
 * Main Theme Export
 * Professional UK medical business marketplace theme
 */

import colors from './colors';
import typography from './typography';
import { spacing, borderRadius, shadows } from './spacing';

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  
  // Component-specific styles
  components: {
    button: {
      height: {
        small: 36,
        medium: 44,
        large: 52,
      },
      borderRadius: borderRadius.md,
    },
    input: {
      height: 48,
      borderRadius: borderRadius.md,
      borderWidth: 1,
    },
    card: {
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    chip: {
      height: 32,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
    },
  },
};

export type Theme = typeof theme;

export { colors, typography, spacing, borderRadius, shadows };

export default theme;

