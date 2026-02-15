/**
 * CareAcquire Color System
 * Professional, trustworthy design for UK medical business marketplace
 * Inspired by NHS and professional UK business aesthetics
 */

export const colors = {
  // Primary - Professional Blue (inspired by NHS blue but more modern)
  primary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#005EB8', // Main NHS-inspired blue
    600: '#004A94',
    700: '#003A75',
    800: '#002A56',
    900: '#001A37',
  },

  // Secondary - Trust Green (medical/health association)
  secondary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#41B883', // Fresh, trustworthy green
    600: '#388E3C',
    700: '#2E7D32',
    800: '#1B5E20',
    900: '#0D3F11',
  },

  // Accent - Warm Professional (for CTAs and highlights)
  accent: {
    50: '#FFF3E0',
    100: '#FFE0B2',
    200: '#FFCC80',
    300: '#FFB74D',
    400: '#FFA726',
    500: '#FF9800', // Warm, inviting orange
    600: '#FB8C00',
    700: '#F57C00',
    800: '#EF6C00',
    900: '#E65100',
  },

  // Neutral - Professional Grays
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
    1000: '#000000',
  },

  // Semantic Colors
  success: {
    light: '#81C784',
    main: '#4CAF50',
    dark: '#388E3C',
    background: '#E8F5E9',
  },

  error: {
    light: '#E57373',
    main: '#D32F2F',
    dark: '#C62828',
    background: '#FFEBEE',
  },

  warning: {
    light: '#FFB74D',
    main: '#F57C00',
    dark: '#E65100',
    background: '#FFF3E0',
  },

  info: {
    light: '#64B5F6',
    main: '#1976D2',
    dark: '#0D47A1',
    background: '#E3F2FD',
  },

  // Background Colors
  background: {
    default: '#FAFAFA',
    paper: '#FFFFFF',
    elevated: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Text Colors
  text: {
    primary: '#212121',
    secondary: '#616161',
    disabled: '#9E9E9E',
    hint: '#BDBDBD',
    inverse: '#FFFFFF',
  },

  // Border Colors
  border: {
    light: '#E0E0E0',
    main: '#BDBDBD',
    dark: '#757575',
  },

  // Divider
  divider: '#E0E0E0',

  // Status Colors (for listings, connections, etc.)
  status: {
    published: '#4CAF50',
    pending: '#FF9800',
    draft: '#9E9E9E',
    rejected: '#D32F2F',
    approved: '#4CAF50',
    active: '#4CAF50',
    inactive: '#9E9E9E',
  },

  // Special Colors
  premium: {
    gold: '#FFD700',
    silver: '#C0C0C0',
    platinum: '#E5E4E2',
  },
};

export type ColorScheme = typeof colors;

export default colors;

