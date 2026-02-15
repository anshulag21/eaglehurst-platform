/**
 * Avatar Component
 * User and business avatars with fallback initials
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, typography, borderRadius } from '../../theme';

type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: AvatarSize;
  variant?: 'user' | 'business';
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  imageUrl,
  size = 'medium',
  variant = 'user',
}) => {
  const getInitials = (fullName: string): string => {
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return { width: 32, height: 32 };
      case 'medium':
        return { width: 40, height: 40 };
      case 'large':
        return { width: 56, height: 56 };
      case 'xlarge':
        return { width: 80, height: 80 };
      default:
        return { width: 40, height: 40 };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 12;
      case 'medium':
        return 14;
      case 'large':
        return 18;
      case 'xlarge':
        return 24;
      default:
        return 14;
    }
  };

  const sizeStyle = getSizeStyle();

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.avatar,
          sizeStyle,
          variant === 'business' && styles.businessAvatar,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        styles.fallback,
        sizeStyle,
        variant === 'business' && styles.businessAvatar,
      ]}>
      <Text style={[styles.initials, { fontSize: getTextSize() }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  businessAvatar: {
    borderRadius: borderRadius.md,
  },
  fallback: {
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    ...typography.labelLarge,
    color: colors.primary[700],
    fontWeight: '600',
  },
});

export default Avatar;

