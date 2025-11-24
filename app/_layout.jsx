// app/_layout.js
import React, { useEffect, useState, useRef } from 'react'
import {
  SafeAreaView,
  StyleSheet,
  View,
  ActivityIndicator,
  StatusBar,
  Text,
  AppState,
  Alert,
  Platform,
} from 'react-native'
import { Slot, useRouter } from 'expo-router'
import { Provider, useSelector } from 'react-redux'
import store from '../redux/store'
import { ToastProvider, useToast } from 'react-native-toast-notifications'
import * as SecureStore from 'expo-secure-store'
import * as ScreenOrientation from 'expo-screen-orientation'
import * as Updates from 'expo-updates'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'

const VISUALIZE_TOUCH_BLOCKERS = false // set true while debugging locally

const canCheckForUpdates = () => {
  if (__DEV__) return false
  if (!Updates || !Updates.checkForUpdateAsync) return false
  return true
}

function AppContent() {
  const router = useRouter()
  const toast = useToast()
  const isAuthenticated = useSelector(s => s.auth?.isAuthenticated)
  const reduxLoading = useSelector(s => s.auth?.loading)
  const insets = useSafeAreaInsets()

  const [isChecking, setIsChecking] = useState(true)
  const [initialRoute, setInitialRoute] = useState(null)

  const appState = useRef(AppState.currentState)
  const promptedUpdateIdRef = useRef(null)
  const checkingRef = useRef(false)

  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {})
  }, [])

  useEffect(() => {
    let mounted = true
    async function bootstrap() {
      try {
        const token = await SecureStore.getItemAsync('userToken')
        if (!mounted) return
        setInitialRoute(token ? 'Home' : 'Login')
      } catch {
        if (mounted) setInitialRoute('Login')
      } finally {
        if (mounted) setIsChecking(false)
      }
    }
    bootstrap()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (isChecking || !initialRoute) return
    const effectiveAuth = typeof isAuthenticated === 'boolean' ? isAuthenticated : null
    const target = effectiveAuth === null ? initialRoute : effectiveAuth ? 'Home' : 'Login'
    const currentPath = router.getPathname?.() || ''
    if (!currentPath.includes(`/${target}`)) {
      router.replace(`/${target}`)
    }
  }, [isChecking, initialRoute, isAuthenticated, router])

  useEffect(() => {
    if (!canCheckForUpdates()) return
    let mounted = true
    async function checkAndPrompt(showToast = false) {
      if (!mounted || checkingRef.current) return
      checkingRef.current = true
      try {
        const updateCheck = await Updates.checkForUpdateAsync()
        if (!updateCheck.isAvailable) return
        await Updates.fetchUpdateAsync()
        let updateId = null
        try {
          const pending = Updates.manifest || (await Updates.getPendingUpdateAsync()) || {}
          updateId = pending.id || pending.commitTime || pending.releaseId || null
        } catch {}
        if (updateId && promptedUpdateIdRef.current === updateId) return
        if (updateId) promptedUpdateIdRef.current = updateId
        if (showToast) {
          toast.show('Update downloaded. Ready to install.', {
            placement: 'top',
            duration: 3000,
            type: 'normal',
          })
        }
        const title = 'Update available'
        const message =
          'A new update has been downloaded. Do you want to install it now or on next launch?'
        const buttons =
          Platform.OS === 'ios'
            ? [
                { text: 'Later', style: 'cancel' },
                {
                  text: 'Install on next launch',
                  onPress: () => toast.show('Will install on next app launch', { duration: 2000 }),
                },
                {
                  text: 'Install now',
                  onPress: async () => {
                    try {
                      await Updates.reloadAsync()
                    } catch {
                      toast.show('Failed to apply update; please restart the app', { duration: 4000 })
                    }
                  },
                },
              ]
            : [
                {
                  text: 'Install now',
                  onPress: async () => {
                    try {
                      await Updates.reloadAsync()
                    } catch {
                      toast.show('Failed to apply update; please restart the app', { duration: 4000 })
                    }
                  },
                },
                {
                  text: 'Install on next launch',
                  onPress: () => toast.show('Will install on next app launch', { duration: 2000 }),
                },
                { text: 'Later', style: 'cancel' },
              ]
        setTimeout(() => {
          Alert.alert(title, message, buttons, { cancelable: true })
        }, 300)
      } finally {
        checkingRef.current = false
      }
    }
    checkAndPrompt(true)
    function handleAppStateChange(nextAppState) {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkAndPrompt(false)
      }
      appState.current = nextAppState
    }
    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => {
      mounted = false
      subscription.remove()
    }
  }, [toast])

  const topPadding = insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight || 16 : 16)
  const bottomPadding = insets.bottom || 0

  if (isChecking) {
    return (
      <SafeAreaView style={[styles.fullScreen, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.centeredFull, { paddingBottom: bottomPadding }]}>
          <ActivityIndicator size="large" />
          <Text style={styles.loaderText}>Loading…</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView
      style={[styles.fullScreen, { paddingTop: topPadding }]}
      // allow child views to receive touches by default; overlays will opt-in to block touches
      pointerEvents="box-none"
    >
      <StatusBar barStyle="dark-content" />
      {/* Main content: must be full height and leave space for system/tab bar */}
      <View style={[styles.contentContainer, { paddingBottom: bottomPadding }]} pointerEvents="box-none">
        {/* Slot must be non-obstructive and fill available space */}
        <View style={styles.slotWrapper} pointerEvents="box-none">
          <Slot />
        </View>
      </View>

      {/* Global overlay for redux loading - never covers bottom inset (so tabs remain tappable) */}
      {reduxLoading && (
        <View
          pointerEvents="box-none"
          style={[
            styles.overlayContainer,
            { bottom: bottomPadding + 8 }, // ensure overlay stops above the bottom inset
            VISUALIZE_TOUCH_BLOCKERS ? styles.debugOverlay : null,
          ]}
        >
          <View style={styles.spinnerBox} pointerEvents="auto">
            <ActivityIndicator size="large" />
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </Provider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#FFF8E1',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
  },
  slotWrapper: {
    flex: 1,
  },
  centeredFull: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    color: '#333',
  },
  overlayContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    // bottom is set dynamically so the overlay never covers bottom inset / tab bar
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  spinnerBox: {
    minWidth: 120,
    minHeight: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  debugOverlay: {
    backgroundColor: 'rgba(255,0,0,0.08)',
  },
})
