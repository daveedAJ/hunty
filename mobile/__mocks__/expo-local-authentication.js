module.exports = {
  AuthenticationType: {
    FACIAL_RECOGNITION: 'facialRecognition',
    FINGERPRINT: 'fingerprint',
  },
  hasHardwareAsync: jest.fn(() => Promise.resolve(false)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(false)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: false })),
};
