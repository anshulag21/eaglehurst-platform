/**
 * Create Listing Screen
 * Create a new business listing
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Card } from '../../components/common';
import { listingsAPI } from '../../api';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { CreateListingRequest } from '../../types';
import { UK_REGIONS, BUSINESS_TYPES } from '../../constants';

export const CreateListingScreen: React.FC = () => {
  const navigation = useNavigation();

  const [formData, setFormData] = useState<Partial<CreateListingRequest>>({
    title: '',
    description: '',
    business_type: '',
    location: '',
    asking_price: undefined,
    turnover: undefined,
    profit_margin: undefined,
    established_year: undefined,
    number_of_employees: undefined,
    reason_for_selling: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showBusinessTypePicker, setShowBusinessTypePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.business_type) newErrors.business_type = 'Business type is required';
    if (!formData.location) newErrors.location = 'Location is required';
    if (!formData.asking_price) newErrors.asking_price = 'Asking price is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await listingsAPI.createListing(formData as CreateListingRequest);

      if (response.success && response.data) {
        Alert.alert(
          'Success! 🎉',
          'Your listing has been created and is pending admin approval.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('MyListings' as never),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to create listing');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create listing');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof CreateListingRequest, value: any) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
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
          <Text style={styles.title}>Create New Listing</Text>
          <Text style={styles.subtitle}>
            Provide details about your medical business
          </Text>
        </View>

        {/* Basic Information */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <Input
            label="Listing Title"
            placeholder="e.g., Established GP Practice in Central London"
            value={formData.title}
            onChangeText={(text) => updateField('title', text)}
            error={errors.title}
            required
          />

          <Input
            label="Description"
            placeholder="Describe your business..."
            value={formData.description}
            onChangeText={(text) => updateField('description', text)}
            error={errors.description}
            multiline
            numberOfLines={6}
            required
          />

          {/* Business Type Picker */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              Business Type <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowBusinessTypePicker(!showBusinessTypePicker)}>
              <Text
                style={[
                  styles.pickerText,
                  !formData.business_type && styles.pickerPlaceholder,
                ]}>
                {formData.business_type || 'Select business type'}
              </Text>
              <Text style={styles.pickerIcon}>▼</Text>
            </TouchableOpacity>
            {errors.business_type && (
              <Text style={styles.errorText}>{errors.business_type}</Text>
            )}
          </View>

          {showBusinessTypePicker && (
            <View style={styles.pickerOptions}>
              {BUSINESS_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.pickerOption}
                  onPress={() => {
                    updateField('business_type', type);
                    setShowBusinessTypePicker(false);
                  }}>
                  <Text style={styles.pickerOptionText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Location Picker */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              Location <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowLocationPicker(!showLocationPicker)}>
              <Text
                style={[
                  styles.pickerText,
                  !formData.location && styles.pickerPlaceholder,
                ]}>
                {formData.location || 'Select location'}
              </Text>
              <Text style={styles.pickerIcon}>▼</Text>
            </TouchableOpacity>
            {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          </View>

          {showLocationPicker && (
            <ScrollView style={styles.pickerOptions} nestedScrollEnabled>
              {UK_REGIONS.map((region) => (
                <TouchableOpacity
                  key={region}
                  style={styles.pickerOption}
                  onPress={() => {
                    updateField('location', region);
                    setShowLocationPicker(false);
                  }}>
                  <Text style={styles.pickerOptionText}>{region}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Card>

        {/* Financial Information */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Information</Text>

          <Input
            label="Asking Price (£)"
            placeholder="e.g., 500000"
            value={formData.asking_price?.toString()}
            onChangeText={(text) => updateField('asking_price', parseFloat(text) || undefined)}
            error={errors.asking_price}
            keyboardType="numeric"
            required
          />

          <Input
            label="Annual Turnover (£)"
            placeholder="e.g., 750000"
            value={formData.turnover?.toString()}
            onChangeText={(text) => updateField('turnover', parseFloat(text) || undefined)}
            keyboardType="numeric"
          />

          <Input
            label="Profit Margin (%)"
            placeholder="e.g., 25"
            value={formData.profit_margin?.toString()}
            onChangeText={(text) =>
              updateField('profit_margin', parseFloat(text) || undefined)
            }
            keyboardType="numeric"
          />
        </Card>

        {/* Business Details */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Business Details</Text>

          <Input
            label="Established Year"
            placeholder="e.g., 2010"
            value={formData.established_year?.toString()}
            onChangeText={(text) =>
              updateField('established_year', parseInt(text) || undefined)
            }
            keyboardType="numeric"
          />

          <Input
            label="Number of Employees"
            placeholder="e.g., 15"
            value={formData.number_of_employees?.toString()}
            onChangeText={(text) =>
              updateField('number_of_employees', parseInt(text) || undefined)
            }
            keyboardType="numeric"
          />

          <Input
            label="Reason for Selling"
            placeholder="e.g., Retirement, Relocation..."
            value={formData.reason_for_selling}
            onChangeText={(text) => updateField('reason_for_selling', text)}
            multiline
            numberOfLines={4}
          />
        </Card>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Your listing will be reviewed by our admin team before going live. You'll be
            notified once it's approved.
          </Text>
        </View>

        {/* Submit Button */}
        <Button
          title={isLoading ? 'Creating...' : 'Create Listing'}
          onPress={handleSubmit}
          variant="primary"
          size="large"
          fullWidth
          disabled={isLoading}
          loading={isLoading}
          style={styles.submitButton}
        />
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
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  section: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error.main,
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  pickerText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  pickerPlaceholder: {
    color: colors.text.hint,
  },
  pickerIcon: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  pickerOptions: {
    maxHeight: 200,
    backgroundColor: colors.background.paper,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  pickerOption: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  pickerOptionText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  errorText: {
    ...typography.caption,
    color: colors.error.main,
    marginTop: spacing.xs,
  },
  infoNote: {
    flexDirection: 'row',
    backgroundColor: colors.primary[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  infoText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
  submitButton: {
    marginBottom: spacing.xl,
  },
});

export default CreateListingScreen;

