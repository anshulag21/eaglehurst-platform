/**
 * Badge Component
 * Status indicators and count badges
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';
type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'medium',
  style,
}) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'success':
        return colors.success.background;
      case 'error':
        return colors.error.background;
      case 'warning':
        return colors.warning.background;
      case 'info':
        return colors.info.background;
      case 'neutral':
        return colors.neutral[100];
      default:
        return colors.neutral[100];
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'success':
        return colors.success.dark;
      case 'error':
        return colors.error.dark;
      case 'warning':
        return colors.warning.dark;
      case 'info':
        return colors.info.dark;
      case 'neutral':
        return colors.text.primary;
      default:
        return colors.text.primary;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'medium':
        return styles.medium;
      case 'large':
        return styles.large;
      default:
        return styles.medium;
    }
  };

  return (
    <View
      style={[
        styles.badge,
        getSizeStyle(),
        { backgroundColor: getBackgroundColor() },
        style,
      ]}>
      <Text style={[styles.text, { color: getTextColor() }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  small: {
    height: 20,
    paddingHorizontal: spacing.xs,
  },
  medium: {
    height: 24,
    paddingHorizontal: spacing.sm,
  },
  large: {
    height: 32,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.labelSmall,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default Badge;

