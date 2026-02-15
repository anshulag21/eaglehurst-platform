/**
 * Forgot Password Screen
 * Request password reset
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Input } from '../../components/common';
import { authAPI } from '../../api';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { VALIDATION_RULES } from '../../constants';

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError('Email is required');
      return false;
    }
    if (!VALIDATION_RULES.EMAIL_REGEX.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.forgotPassword(email);

      if (response.success) {
        setIsSuccess(true);
        Alert.alert(
          'Email Sent! 📧',
          'We\'ve sent password reset instructions to your email address.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login' as never),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to send reset email');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            No worries! Enter your email address and we'll send you instructions to
            reset your password.
          </Text>
        </View>

        {/* Form */}
        {!isSuccess ? (
          <View style={styles.form}>
            <Input
              label="Email Address"
              placeholder="your.email@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) validateEmail(text);
              }}
              onBlur={() => validateEmail(email)}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              required
            />

            <Button
              title={isLoading ? 'Sending...' : 'Send Reset Instructions'}
              onPress={handleSubmit}
              variant="primary"
              size="large"
              fullWidth
              disabled={isLoading}
              loading={isLoading}
              style={styles.submitButton}
            />
          </View>
        ) : (
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successMessage}>
              We've sent password reset instructions to{'\n'}
              <Text style={styles.successEmail}>{email}</Text>
            </Text>
            <Text style={styles.successHint}>
              Didn't receive the email? Check your spam folder or try again.
            </Text>
          </View>
        )}

        {/* Back to Login */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Login' as never)}>
          <Text style={styles.backButtonText}>← Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  scrollContent: {
    flexGrow: 1,
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
    maxWidth: 320,
    lineHeight: 22,
  },
  form: {
    marginBottom: spacing.xl,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  successMessage: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  successEmail: {
    color: colors.primary[500],
    fontWeight: '600',
  },
  successHint: {
    ...typography.caption,
    color: colors.text.hint,
    textAlign: 'center',
    maxWidth: 280,
  },
  backButton: {
    alignSelf: 'center',
  },
  backButtonText: {
    ...typography.labelLarge,
    color: colors.text.secondary,
  },
});

export default ForgotPasswordScreen;

