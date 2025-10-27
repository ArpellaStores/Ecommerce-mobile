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
        } catch {
          // ignore manifest parsing errors
        }

        if (updateId && promptedUpdateIdRef.current === updateId) {
          return
        }
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
                  onPress: () => {
                    toast.show('Will install on next app launch', { duration: 2000 })
                  },
                },
                {
                  text: 'Install now',
                  onPress: async () => {
                    try {
                      await Updates.reloadAsync()
                    } catch {
                      toast.show('Failed to apply update; please restart the app', {
                        duration: 4000,
                      })
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
                      toast.show('Failed to apply update; please restart the app', {
                        duration: 4000,
                      })
                    }
                  },
                },
                {
                  text: 'Install on next launch',
                  onPress: () => {
                    toast.show('Will install on next app launch', { duration: 2000 })
                  },
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

  if (isChecking || reduxLoading) {
    return (
      <SafeAreaView style={styles.fullScreen}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loaderText}>Loading…</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.fullScreen}>
      <StatusBar barStyle="dark-content" />
      {reduxLoading && (
        <View style={styles.overlayLoader}>
          <ActivityIndicator size="large" />
        </View>
      )}
      <Slot />
    </SafeAreaView>
  )
}

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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  loaderText: {
    marginTop: 10,
    color: '#FFFFFF',
  },
  overlayLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
})
