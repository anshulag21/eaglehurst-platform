import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Button,
  Grid,
  Alert,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Warning,
  ArrowBack,
  ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { useAppSelector } from '../store';
import { userService } from '../services/user.service';
import { ROUTES } from '../constants';

const steps = [
  'Business Information',
  'Identity Verification',
  'Professional Documents',
  'Review & Submit'
];

const KYCUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  
  // Get verification status from user profile
  const verificationStatus = userProfile?.seller_profile?.verification_status || 'pending';
  
  // Business Information states
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  
  // File states
  const [identityDocument, setIdentityDocument] = useState<File | null>(null);
  const [licenseDocument, setLicenseDocument] = useState<File | null>(null);
  const [additionalDocuments, setAdditionalDocuments] = useState<File[]>([]);

  useEffect(() => {
    // Check if user is a seller
    if (user?.user_type !== 'seller') {
      toast.error('Only sellers can access verification');
      navigate(ROUTES.DASHBOARD);
    }
  }, [user, navigate]);

  // Redirect approved sellers to dashboard (only after profile is loaded)
  useEffect(() => {
    console.log('KYC Redirect Debug:', {
      userProfile: !!userProfile,
      verificationStatus,
      sellerProfile: userProfile?.seller_profile,
      shouldRedirect: userProfile && verificationStatus === 'approved'
    });
    
    if (userProfile && verificationStatus === 'approved') {
      console.log('Redirecting approved seller to dashboard');
      toast.success('Your verification is already approved!');
      navigate(ROUTES.SELLER_DASHBOARD);
    }
  }, [verificationStatus, navigate, userProfile]);

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await userService.getProfile();
        if (response.success) {
          setUserProfile(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };

    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'identity' | 'license' | 'additional') => {
    const files = event.target.files;
    if (!files) return;

    switch (type) {
      case 'identity':
        setIdentityDocument(files[0]);
        break;
      case 'license':
        setLicenseDocument(files[0]);
        break;
      case 'additional':
        setAdditionalDocuments(Array.from(files));
        break;
    }
  };

  const handleSubmitVerification = async () => {
    // Validate business information
    if (!businessName.trim()) {
      toast.error('Please enter your business name');
      return;
    }
    if (!businessDescription.trim()) {
      toast.error('Please enter your business description');
      return;
    }
    if (!businessType) {
      toast.error('Please select your business type');
      return;
    }
    if (!businessAddress.trim()) {
      toast.error('Please enter your business address');
      return;
    }

    // Validate documents
    if (!identityDocument || !licenseDocument) {
      toast.error('Please upload both identity and license documents');
      return;
    }

    setLoading(true);
    try {
      // Submit business information and documents
      await userService.submitSellerVerification({
        businessName,
        businessDescription,
        businessType,
        businessAddress,
        identityDocument,
        licenseDocument,
        additionalDocuments,
      }, setUploadProgress);
      
      toast.success('Verification submitted successfully!');
      toast('Your business information and documents are being reviewed. You will be notified once approved.');
      
      // Redirect to dashboard
      navigate(ROUTES.SELLER_DASHBOARD);
      
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast.error('Failed to submit verification. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleNext = () => {
    // Validate current step before proceeding
    if (activeStep === 0) {
      // Validate business information
      if (!businessName.trim()) {
        toast.error('Please enter your business name');
        return;
      }
      if (!businessDescription.trim() || businessDescription.trim().length < 100) {
        toast.error('Please provide a detailed business description (minimum 100 characters)');
        return;
      }
      if (!businessType) {
        toast.error('Please select your business type');
        return;
      }
      if (!businessAddress.trim()) {
        toast.error('Please enter your business address');
        return;
      }
    }
    
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Business Information
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Please provide accurate information about your medical practice. This information will be reviewed by our admin team.
            </Alert>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Business Name *"
                  placeholder="e.g., London General Practice"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  helperText="Enter the official name of your medical practice"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Business Type *</InputLabel>
                  <Select
                    value={businessType}
                    label="Business Type *"
                    onChange={(e) => setBusinessType(e.target.value)}
                  >
                    <MenuItem value="general_practice">General Practice (GP)</MenuItem>
                    <MenuItem value="dental_practice">Dental Practice</MenuItem>
                    <MenuItem value="physiotherapy">Physiotherapy Clinic</MenuItem>
                    <MenuItem value="specialist_clinic">Specialist Clinic</MenuItem>
                    <MenuItem value="pharmacy">Pharmacy</MenuItem>
                    <MenuItem value="veterinary">Veterinary Practice</MenuItem>
                    <MenuItem value="other">Other Medical Practice</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Business Address *"
                  placeholder="Full business address including postcode"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  helperText="Enter your practice's registered address"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Business Description *"
                  placeholder="Describe your medical practice, services offered, specializations, years of operation, etc."
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  helperText="Provide a detailed description of your practice (minimum 100 characters)"
                />
              </Grid>
            </Grid>
            
            <Alert severity="warning" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Important:</strong> All information provided will be verified against official records. 
                Please ensure accuracy to avoid delays in the verification process.
              </Typography>
            </Alert>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Identity Verification
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload a clear photo of your government-issued ID (passport, driver's license, or national ID)
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <input
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  id="identity-upload"
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'identity')}
                />
                <label htmlFor="identity-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Upload Identity Document
                  </Button>
                </label>
                
                {identityDocument && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle color="success" />
                    <Typography variant="body2">
                      {identityDocument.name} ({(identityDocument.size / 1024 / 1024).toFixed(2)} MB)
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
            
            <Alert severity="warning">
              <Typography variant="body2">
                • Ensure the document is clear and all text is readable<br/>
                • Accepted formats: JPG, PNG, PDF<br/>
                • Maximum file size: 10MB
              </Typography>
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Professional Documents
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload your medical license and any relevant professional certificates
            </Typography>
            
            {/* Medical License */}
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Medical License *
                </Typography>
                <input
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  id="license-upload"
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'license')}
                />
                <label htmlFor="license-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Upload Medical License
                  </Button>
                </label>
                
                {licenseDocument && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle color="success" />
                    <Typography variant="body2">
                      {licenseDocument.name} ({(licenseDocument.size / 1024 / 1024).toFixed(2)} MB)
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Additional Documents */}
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Additional Certificates (Optional)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Upload any additional professional certificates, qualifications, or relevant documents
                </Typography>
                
                <input
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  id="additional-upload"
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e, 'additional')}
                />
                <label htmlFor="additional-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Upload Additional Documents
                  </Button>
                </label>
                
                {additionalDocuments.length > 0 && (
                  <Box>
                    {additionalDocuments.map((file, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CheckCircle color="success" />
                        <Typography variant="body2">
                          {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Review & Submit
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Please review your business information and uploaded documents before submitting for verification
            </Typography>
            
            {/* Business Information Review */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  Business Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Business Name</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{businessName}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Business Type</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {businessType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Business Address</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{businessAddress}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Business Description</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{businessDescription}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            {/* Documents Review */}
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Uploaded Documents
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Identity Document
                    </Typography>
                    {identityDocument ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle color="success" />
                        <Typography variant="body2">{identityDocument.name}</Typography>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Warning color="error" />
                        <Typography variant="body2" color="error">Not uploaded</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Medical License
                    </Typography>
                    {licenseDocument ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle color="success" />
                        <Typography variant="body2">{licenseDocument.name}</Typography>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Warning color="error" />
                        <Typography variant="body2" color="error">Not uploaded</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {additionalDocuments.length > 0 && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        Additional Documents ({additionalDocuments.length})
                      </Typography>
                      {additionalDocuments.map((file, index) => (
                        <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                          • {file.name}
                        </Typography>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
            
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>What happens next?</strong><br/>
                • Your documents will be reviewed by our admin team<br/>
                • You'll receive an email notification once approved<br/>
                • Verification typically takes 1-2 business days<br/>
                • Once approved, you can create and publish listings
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(ROUTES.SELLER_DASHBOARD)}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>
        
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Seller Verification
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete your verification to start creating listings
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <Chip 
            label={`Status: ${verificationStatus === 'submitted_for_review' ? 'UNDER REVIEW' : verificationStatus.toUpperCase()}`}
            color={verificationStatus === 'approved' ? 'success' : verificationStatus === 'rejected' ? 'error' : 'warning'}
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Main Content */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          {verificationStatus === 'submitted_for_review' ? (
            // Verification is submitted for review - show status message
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Verification Under Review
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Your seller profile and documents have been submitted successfully and are currently being reviewed by our admin team.
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2">
                  <strong>What happens next?</strong><br/>
                  • Our admin team is reviewing your business information and documents<br/>
                  • You will receive an email notification once the review is complete<br/>
                  • Verification typically takes 1-2 business days<br/>
                  • Once approved, you can create and publish listings
                </Typography>
              </Alert>

              <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2">
                  <strong>Temporary Restrictions:</strong><br/>
                  • You cannot create new listings while verification is pending<br/>
                  • You can still browse and view existing listings<br/>
                  • All other platform features remain available
                </Typography>
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate(ROUTES.SELLER_DASHBOARD)}
                >
                  Go to Dashboard
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate(ROUTES.LISTINGS)}
                >
                  Browse Listings
                </Button>
              </Box>
            </Box>
          ) : verificationStatus === 'rejected' ? (
            // Verification is rejected - show resubmission form
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Warning sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Verification Requires Attention
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Your verification was not approved. Please review the feedback and resubmit your documents.
              </Typography>
              
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2">
                  <strong>Admin Feedback:</strong><br/>
                  {userProfile?.seller_profile?.admin_notes || 'Please ensure all documents are clear and valid.'}
                </Typography>
              </Alert>

              <Button
                variant="contained"
                onClick={() => window.location.reload()}
              >
                Resubmit Verification
              </Button>
            </Box>
          ) : verificationStatus === 'pending' ? (
            // New user - show verification form
            <>
              {/* Stepper */}
              <Stepper activeStep={activeStep} orientation="vertical">
                {steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                    <StepContent>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Box sx={{ mb: 3 }}>
                          {renderStepContent(index)}
                        </Box>
                      </motion.div>
                      
                      {/* Navigation */}
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                          disabled={index === 0}
                          onClick={handleBack}
                          sx={{ visibility: index === 0 ? 'hidden' : 'visible' }}
                        >
                          Back
                        </Button>
                        
                        {index === steps.length - 1 ? (
                          <Button
                            variant="contained"
                            onClick={handleSubmitVerification}
                            disabled={
                              loading || 
                              !businessName.trim() || 
                              !businessDescription.trim() || 
                              !businessType || 
                              !businessAddress.trim() || 
                              !identityDocument || 
                              !licenseDocument
                            }
                            startIcon={loading ? undefined : <CheckCircle />}
                          >
                            {loading ? 'Submitting...' : 'Submit for Verification'}
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            onClick={handleNext}
                            endIcon={<ArrowForward />}
                          >
                            Next
                          </Button>
                        )}
                      </Box>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
              
              {/* Upload Progress */}
              {loading && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Uploading documents... {uploadProgress}%
                  </Typography>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                </Box>
              )}
            </>
          ) : (
            // Fallback for any other status
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h5" gutterBottom>
                Verification Status Unknown
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Please contact support for assistance with your verification status.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate(ROUTES.SELLER_DASHBOARD)}
              >
                Go to Dashboard
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default KYCUploadPage;
