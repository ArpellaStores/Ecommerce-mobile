import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';
import { useSelector } from 'react-redux';

const isVersionOlder = (current, required) => {
  if (!current || !required) return false;
  const currentParts = current.split('.').map(Number);
  const requiredParts = required.split('.').map(Number);
  for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
    const c = currentParts[i] || 0;
    const r = requiredParts[i] || 0;
    if (c < r) return true;
    if (c > r) return false;
  }
  return false;
};

export default function AppUpdateModal() {
  const [showModal, setShowModal] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);
  const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated);

  useEffect(() => {
    let mounted = true;

    const checkVersion = async () => {
      if (!isAuthenticated) return;
      try {
        const response = await axios.get('https://api.arpellastore.com/settings');
        if (!mounted) return;
        
        if (response.data && Array.isArray(response.data)) {
          const versionSetting = response.data.find(s => s.settingName === 'Latest_App_Version');
          if (versionSetting && versionSetting.settingValue) {
            const requiredVersion = versionSetting.settingValue;
            const currentVersion = Constants.expoConfig?.version || '1.0.0';
            
            if (isVersionOlder(currentVersion, requiredVersion)) {
              setLatestVersion(requiredVersion);
              setShowModal(true);
            }
          }
        }
      } catch (error) {
        console.error('[AppUpdateModal] Failed to check version:', error);
      }
    };
    
    checkVersion();
    return () => { mounted = false; };
  }, [isAuthenticated]);

  const handleUpdate = () => {
    const pkg = 'com.mgachanja.Arpella';
    if (Platform.OS === 'android') {
      Linking.openURL(`market://details?id=${pkg}`).catch(() => {
        Linking.openURL(`https://play.google.com/store/apps/details?id=${pkg}`);
      });
    } else {
      Linking.openURL(`https://play.google.com/store/apps/details?id=${pkg}`);
    }
  };

  return (
    <Modal visible={showModal} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Update Available</Text>
          <Text style={styles.message}>
            A new version of Arpella Stores ({latestVersion}) is available. Please update the app to get the latest features and bug fixes.
          </Text>
          
          <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
            <Text style={styles.updateButtonText}>Update Now</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.laterButton} onPress={() => setShowModal(false)}>
            <Text style={styles.laterButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  updateButton: {
    backgroundColor: '#5a2428',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  laterButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  laterButtonText: {
    color: '#888',
    fontSize: 15,
  },
});
