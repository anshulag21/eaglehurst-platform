/**
 * Typography System
 * Professional, readable typography for UK audience
 * Using system fonts for best performance and native feel
 */

import { Platform } from 'react-native';

const fontFamily = {
  // iOS uses SF Pro, Android uses Roboto (system defaults)
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: 'System',
  }),
  semiBold: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: 'System',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: 'System',
  }),
};

const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

export const typography = {
  // Display - For hero sections and major headings
  displayLarge: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 57,
    lineHeight: 64,
    letterSpacing: -0.25,
  },
  displayMedium: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 45,
    lineHeight: 52,
    letterSpacing: 0,
  },
  displaySmall: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: 0,
  },

  // Headline - For section headers
  headlineLarge: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 0,
  },
  headlineMedium: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
  },
  headlineSmall: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0,
  },

  // Title - For card titles and prominent text
  titleLarge: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
  },
  titleMedium: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },

  // Label - For buttons and labels
  labelLarge: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
  },

  // Body - For main content
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  bodyMedium: {
    fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },

  // Caption - For supporting text
  caption: {
    fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },

  // Overline - For labels and categories
  overline: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
};

export type Typography = typeof typography;

export default typography;

