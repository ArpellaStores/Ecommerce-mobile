// app/_layout.js  (or RootLayout.js)
import React, { useEffect, useState } from 'react'
import { SafeAreaView, StyleSheet, View, ActivityIndicator, StatusBar, Text } from 'react-native'
import { Slot, useRouter } from 'expo-router'
import { Provider, useSelector } from 'react-redux'
import store from '../redux/store'
import { ToastProvider } from 'react-native-toast-notifications'
import * as SecureStore from 'expo-secure-store'
import * as ScreenOrientation from 'expo-screen-orientation'

// 1) This inner component can safely call useSelector
function AppContent() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [initialRoute, setInitialRoute] = useState(null)
  const isAuthenticated = useSelector(s => s.auth.isAuthenticated)
  const reduxLoading   = useSelector(s => s.auth.loading)

  // Unlock orientation when app starts
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(error => {
      console.warn('Failed to unlock screen orientation:', error)
    })
  }, [])

  // fetch existing token
  useEffect(() => {
    SecureStore.getItemAsync('userToken')
      .then(tok => setInitialRoute(tok ? 'Home' : 'Login'))
      .catch(() => setInitialRoute('Login'))
      .finally(() => setIsChecking(false))
  }, [])

  // once SecureStore is read AND auth state resolves, navigate
  useEffect(() => {
    if (isChecking || !initialRoute) return
    const target = isAuthenticated ? 'Home' : 'Login'
    router.replace(`/${target}`)
  }, [isChecking, initialRoute, isAuthenticated, router])

  // splash while we're checking SecureStore
  if (isChecking) {
    return (
      <SafeAreaView style={styles.fullScreen}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
          <Text style={{ marginTop: 10, color: '#FFF' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  // normal app shell: global loader + routed screens
  return (
    <SafeAreaView style={styles.fullScreen}>
      <StatusBar barStyle="dark-content" />
      {reduxLoading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
        </View>
      )}
      <Slot />
    </SafeAreaView>
  )
}

// 2) Top‑level export wraps everything in Provider
export default function RootLayout() {
  return (
    <Provider store={store}>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </Provider>
  )
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#FFF8E1',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})