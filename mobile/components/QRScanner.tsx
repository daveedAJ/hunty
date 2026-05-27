import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { useTheme } from '@react-navigation/native';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  title?: string;
}

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = 250;

export const QRScanner: React.FC<QRScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan QR Code',
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const cameraRef = useRef<CameraView>(null);
  const { colors } = useTheme();

  useEffect(() => {
    if (isOpen && !permission?.granted) {
      requestPermission();
    }
  }, [isOpen, permission?.granted, requestPermission]);

  useEffect(() => {
    if (isOpen) {
      setScanned(false);
      setIsInitializing(true);
      const timer = setTimeout(() => setIsInitializing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleBarCodeScanned = ({ data }: { data: string; type?: string }) => {
    if (!scanned) {
      setScanned(true);
      onScan(data);
      // Auto-close after a short delay to show the scan was successful
      setTimeout(onClose, 800);
    }
  };

  if (!isOpen) return null;

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.permissionText, { color: colors.text }]}>
            Camera permission is required
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={() => requestPermission()}
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <X width={24} height={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.permissionText, { color: colors.text }]}>
            Camera access denied
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={() => requestPermission()}
          >
            <Text style={styles.buttonText}>Enable Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <X width={24} height={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isInitializing && <ActivityIndicator size="large" color="#3737A4" style={styles.loadingIndicator} />}
      
      <CameraView
        ref={cameraRef}
        style={[styles.camera, { opacity: isInitializing ? 0.1 : 1 }]}
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top section */}
        <View style={[styles.overlaySection, { height: (height - SCAN_AREA_SIZE) / 2 }]} />

        {/* Middle section with scan area */}
        <View style={styles.middleSection}>
          {/* Left */}
          <View style={[styles.overlaySide, { width: (width - SCAN_AREA_SIZE) / 2 }]} />

          {/* Scan area frame */}
          <View style={styles.scanAreaContainer}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>

          {/* Right */}
          <View style={[styles.overlaySide, { width: (width - SCAN_AREA_SIZE) / 2 }]} />
        </View>

        {/* Bottom section */}
        <View style={[styles.overlaySection, { height: (height - SCAN_AREA_SIZE) / 2 }]} />
      </View>

      {/* Top header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity
          style={styles.headerCloseButton}
          onPress={onClose}
        >
          <X width={28} height={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Bottom hint */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>
          {scanned ? 'QR Code detected!' : 'Position the QR code within the frame'}
        </Text>
      </View>

      {scanned && (
        <ActivityIndicator
          size="large"
          color="white"
          style={styles.scanSuccessIndicator}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  overlaySection: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: '100%',
  },
  middleSection: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  overlaySide: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanAreaContainer: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderColor: '#3737A4',
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    zIndex: 100,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerCloseButton: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  hintContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'white',
    fontSize: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  permissionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
  },
  permissionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 50,
  },
  loadingIndicator: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  scanSuccessIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 100,
    zIndex: 101,
  },
});
