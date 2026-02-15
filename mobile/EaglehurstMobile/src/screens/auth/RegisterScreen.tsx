/**
 * Register Screen
 * New user registration
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Loading } from '../../components/common';
import { useAppDispatch, useAppSelector, register } from '../../store';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { VALIDATION_RULES } from '../../constants';

type UserType = 'buyer' | 'seller';

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<UserType>('buyer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  const validateStep1 = (): boolean => {
    const newErrors = { ...errors };
    let isValid = true;

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!VALIDATION_RULES.EMAIL_REGEX.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    } else {
      newErrors.email = '';
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
      newErrors.password = `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`;
      isValid = false;
    } else {
      newErrors.password = '';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    } else {
      newErrors.confirmPassword = '';
    }

    setErrors(newErrors);
    return isValid;
  };

  const validateStep2 = (): boolean => {
    const newErrors = { ...errors };
    let isValid = true;

    if (!firstName) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    } else {
      newErrors.firstName = '';
    }

    if (!lastName) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    } else {
      newErrors.lastName = '';
    }

    if (!phone) {
      newErrors.phone = 'Phone number is required';
      isValid = false;
    } else if (!VALIDATION_RULES.PHONE_REGEX.test(phone)) {
      newErrors.phone = 'Please enter a valid UK phone number';
      isValid = false;
    } else {
      newErrors.phone = '';
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleRegister = async () => {
    if (!validateStep2()) {
      return;
    }

    try {
      const result = await dispatch(
        register({
          email,
          password,
          user_type: userType,
          first_name: firstName,
          last_name: lastName,
          phone,
        })
      ).unwrap();

      // Navigate to email verification
      navigation.navigate('VerifyEmail' as never, {
        verificationToken: result.verification_token,
        email: result.email,
      } as never);
    } catch (err) {
      // Error displayed from Redux state
    }
  };

  if (isLoading) {
    return <Loading fullScreen message="Creating your account..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🏥</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join the UK's leading medical business marketplace
          </Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
          <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
          <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {step === 1 ? (
            <>
              {/* User Type Selection */}
              <Text style={styles.label}>I am a:</Text>
              <View style={styles.userTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.userTypeCard,
                    userType === 'buyer' && styles.userTypeCardActive,
                  ]}
                  onPress={() => setUserType('buyer')}>
                  <Text style={styles.userTypeIcon}>🛒</Text>
                  <Text style={styles.userTypeTitle}>Buyer</Text>
                  <Text style={styles.userTypeDescription}>
                    Looking to purchase a medical business
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.userTypeCard,
                    userType === 'seller' && styles.userTypeCardActive,
                  ]}
                  onPress={() => setUserType('seller')}>
                  <Text style={styles.userTypeIcon}>🏥</Text>
                  <Text style={styles.userTypeTitle}>Seller</Text>
                  <Text style={styles.userTypeDescription}>
                    Selling my medical business
                  </Text>
                </TouchableOpacity>
              </View>

              <Input
                label="Email Address"
                placeholder="your.email@example.com"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                required
              />

              <Input
                label="Password"
                placeholder="Create a strong password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                secureTextEntry
                helperText={`At least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`}
                required
              />

              <Input
                label="Confirm Password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={errors.confirmPassword}
                secureTextEntry
                required
              />

              <Button
                title="Next"
                onPress={handleNext}
                variant="primary"
                size="large"
                fullWidth
                style={styles.button}
              />
            </>
          ) : (
            <>
              <Input
                label="First Name"
                placeholder="John"
                value={firstName}
                onChangeText={setFirstName}
                error={errors.firstName}
                autoCapitalize="words"
                autoComplete="name-given"
                required
              />

              <Input
                label="Last Name"
                placeholder="Smith"
                value={lastName}
                onChangeText={setLastName}
                error={errors.lastName}
                autoCapitalize="words"
                autoComplete="name-family"
                required
              />

              <Input
                label="Phone Number"
                placeholder="+44 7700 900000"
                value={phone}
                onChangeText={setPhone}
                error={errors.phone}
                keyboardType="phone-pad"
                autoComplete="tel"
                helperText="UK phone number"
                required
              />

              <View style={styles.buttonRow}>
                <Button
                  title="Back"
                  onPress={() => setStep(1)}
                  variant="outline"
                  size="large"
                  style={styles.buttonHalf}
                />
                <Button
                  title="Create Account"
                  onPress={handleRegister}
                  variant="primary"
                  size="large"
                  disabled={isLoading}
                  style={styles.buttonHalf}
                />
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.neutral[300],
  },
  progressDotActive: {
    backgroundColor: colors.primary[500],
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.neutral[300],
    marginHorizontal: spacing.xs,
  },
  progressLineActive: {
    backgroundColor: colors.primary[500],
  },
  form: {
    marginBottom: spacing.lg,
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
  },
  label: {
    ...typography.labelLarge,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  userTypeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  userTypeCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border.light,
    backgroundColor: colors.background.paper,
    alignItems: 'center',
  },
  userTypeCardActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  userTypeIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  userTypeTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  userTypeDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  buttonHalf: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  footerLink: {
    ...typography.bodyMedium,
    color: colors.primary[500],
    fontWeight: '600',
  },
});

export default RegisterScreen;

