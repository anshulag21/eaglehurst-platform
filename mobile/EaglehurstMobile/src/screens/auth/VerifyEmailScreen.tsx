/**
 * Verify Email Screen
 * Email verification with OTP
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button, Loading } from '../../components/common';
import { authAPI } from '../../api';
import { colors, typography, spacing, borderRadius } from '../../theme';

export const VerifyEmailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { verificationToken, email } = route.params as {
    verificationToken: string;
    email: string;
  };

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // Start cooldown timer
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits entered
    if (newOtp.every((digit) => digit !== '') && value) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');

    if (code.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyEmail(verificationToken, code);

      if (response.success) {
        Alert.alert(
          'Success! 🎉',
          'Your email has been verified. Please log in to continue.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login' as never),
            },
          ]
        );
      } else {
        setError(response.error?.message || 'Invalid verification code');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.resendOTP(verificationToken);

      if (response.success) {
        Alert.alert('Success', 'A new verification code has been sent to your email.');
        setResendCooldown(60); // 60 seconds cooldown
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(response.error?.message || 'Failed to resend code');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && otp.every((digit) => digit === '')) {
    return <Loading fullScreen message="Sending verification code..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.icon}>📧</Text>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit code to{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>
      </View>

      {/* OTP Input */}
      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[
              styles.otpInput,
              digit && styles.otpInputFilled,
              error && styles.otpInputError,
            ]}
            value={digit}
            onChangeText={(value) => handleOtpChange(value, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            autoFocus={index === 0}
          />
        ))}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Verify Button */}
      <Button
        title={isLoading ? 'Verifying...' : 'Verify Email'}
        onPress={() => handleVerify()}
        variant="primary"
        size="large"
        fullWidth
        disabled={isLoading || otp.some((digit) => digit === '')}
        loading={isLoading}
        style={styles.verifyButton}
      />

      {/* Resend Code */}
      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn't receive the code? </Text>
        <TouchableOpacity
          onPress={handleResendOtp}
          disabled={resendCooldown > 0 || isLoading}>
          <Text
            style={[
              styles.resendLink,
              (resendCooldown > 0 || isLoading) && styles.resendLinkDisabled,
            ]}>
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Back to Login */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('Login' as never)}>
        <Text style={styles.backButtonText}>← Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  email: {
    ...typography.bodyMedium,
    color: colors.primary[500],
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.paper,
    ...typography.headlineSmall,
    color: colors.text.primary,
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  otpInputError: {
    borderColor: colors.error.main,
  },
  errorContainer: {
    backgroundColor: colors.error.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodyMedium,
    color: colors.error.dark,
    textAlign: 'center',
  },
  verifyButton: {
    marginBottom: spacing.lg,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  resendText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  resendLink: {
    ...typography.bodyMedium,
    color: colors.primary[500],
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: colors.text.disabled,
  },
  backButton: {
    alignSelf: 'center',
  },
  backButtonText: {
    ...typography.labelLarge,
    color: colors.text.secondary,
  },
});

export default VerifyEmailScreen;

