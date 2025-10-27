// app/_layout.js  (RootLayout WITHOUT restoreFromToken; includes OTA prompt)
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

// helper: only enable update behavior in non-dev builds
const canCheckForUpdates = () => {
  if (__DEV__) return false
  if (!Updates || !Updates.checkForUpdateAsync) return false
  return true
}

function AppContent() {
  const router = useRouter()
  const toast = useToast()

  // Redux runtime auth state is used only after bootstrap (optional)
  const isAuthenticated = useSelector(s => s.auth?.isAuthenticated)
  const reduxLoading = useSelector(s => s.auth?.loading)

  // local bootstrap: derive initialRoute from SecureStore token (simple presence check)
  const [isChecking, setIsChecking] = useState(true)
  const [initialRoute, setInitialRoute] = useState(null)

  const appState = useRef(AppState.currentState)
  const promptedUpdateIdRef = useRef(null)
  const checkingRef = useRef(false)

  // 1) Unlock orientation (non-blocking)
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(err =>
      console.warn('unlock orientation failed', err)
    )
  }, [])

  // 2) Read token from SecureStore and set initialRoute (no server validation)
  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      try {
        const token = await SecureStore.getItemAsync('userToken')
        if (!mounted) return
        setInitialRoute(token ? 'Home' : 'Login')
      } catch (err) {
        console.error('Failed to read token from SecureStore', err)
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

  // 3) Navigate once SecureStore check finishes.
  //    This uses the token presence to decide initial navigation — intentional, simple behavior.
  useEffect(() => {
    if (isChecking || !initialRoute) return

    // prefer runtime redux auth state if it's known (non-null); otherwise use initialRoute
    const effectiveAuth = typeof isAuthenticated === 'boolean' ? isAuthenticated : null

    const target = effectiveAuth === null ? initialRoute : (effectiveAuth ? 'Home' : 'Login')
    const currentPath = router.getPathname?.() || ''
    if (!currentPath.includes(`/${target}`)) {
      router.replace(`/${target}`)
    }
  }, [isChecking, initialRoute, isAuthenticated, router])

  // 4) Update check + user prompt flow (download first, then prompt)
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

        // try to determine an identifier for this update to avoid re-prompting
        let updateId = null
        try {
          const pending = Updates.manifest || (await Updates.getPendingUpdateAsync()) || {}
          updateId = pending.id || pending.commitTime || pending.releaseId || null
        } catch (e) {
          // ignore
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
                    } catch (err) {
                      console.error('Failed to reload after update', err)
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
                    } catch (err) {
                      console.error('Failed to reload after update', err)
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
      } catch (err) {
        console.error('Update check/fetch error', err)
      } finally {
        checkingRef.current = false
      }
    }

    // initial check (show toast)
    checkAndPrompt(true)

    // check when app returns to foreground (no toast)
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

  // 5) Splash while checking SecureStore or while redux indicates loading
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

  // Normal app shell
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

// Top-level export with providers
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
