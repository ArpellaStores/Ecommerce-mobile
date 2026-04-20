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
import axios from 'axios'

// ─── Global Axios Interceptor ────────────────────────────────────────────────
axios.interceptors.request.use(
  (config) => {
    const state = store.getState()
    const token = state.auth?.token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add logging consistent with RTK Query tracing
    console.log(`\n[AXIOS REQUEST] ${config.method?.toUpperCase()} ${config.url}`)
    if (config.data) {
      console.log(`[AXIOS PAYLOAD]`, JSON.stringify(config.data, null, 2))
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

axios.interceptors.response.use(
  (response) => {
    console.log(`[AXIOS RESPONSE] ${response.config.method?.toUpperCase()} ${response.config.url} -> SUCCESS`)
    if (response.data) {
      if (Array.isArray(response.data)) {
        console.log(`[AXIOS DATA] Count: ${response.data.length}`)
      } else {
        console.log(`[AXIOS DATA]`, JSON.stringify(response.data).substring(0, 500))
      }
    }
    return response
  },
  (error) => {
    console.log(`[AXIOS ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url} -> Status: ${error.response?.status}`)
    if (error.response?.data) {
      console.log(`[AXIOS ERROR DETAIL]`, JSON.stringify(error.response.data, null, 2))
    } else {
      console.log(`[AXIOS ERROR MESSAGE]`, error.message)
    }
    return Promise.reject(error)
  }
)

const VISUALIZE_TOUCH_BLOCKERS = false

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

  // ─── KEY FIX: once we navigate to Home, never let the guard bounce back ──────
  // This ref latches to true the moment we successfully route to Home,
  // preventing a stale redux-persist rehydration from kicking the user out.
  const hasNavigatedToHomeRef = useRef(false)

  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {})
  }, [])

  // ─── Bootstrap: check SecureStore for existing session ───────────────────────
  useEffect(() => {
    let mounted = true
    async function bootstrap() {
      try {
        // Try both key names in case saveCredentials uses 'token' not 'userToken'
        const token =
          (await SecureStore.getItemAsync('userToken')) ||
          (await SecureStore.getItemAsync('token'))
        if (!mounted) return
        const route = token ? 'Home' : 'Login'
        console.log('[LAYOUT bootstrap] SecureStore token found:', !!token, '→ initialRoute:', route)
        setInitialRoute(route)
      } catch (e) {
        console.error('[LAYOUT bootstrap] error:', e)
        if (mounted) setInitialRoute('Login')
      } finally {
        if (mounted) setIsChecking(false)
      }
    }
    bootstrap()
    return () => { mounted = false }
  }, [])

  // ─── Auth guard: navigate based on auth state ─────────────────────────────────
  useEffect(() => {
    if (isChecking || !initialRoute) return

    console.log('[LAYOUT auth guard] isAuthenticated:', isAuthenticated, '| initialRoute:', initialRoute, '| hasNavigatedToHome:', hasNavigatedToHomeRef.current)

    // If we've already sent the user to Home this session, don't touch navigation
    // even if isAuthenticated temporarily flips false (e.g. persist rehydration race)
    if (hasNavigatedToHomeRef.current) {
      console.log('[LAYOUT auth guard] Already navigated to Home — skipping guard')
      return
    }

    const effectiveAuth = typeof isAuthenticated === 'boolean' ? isAuthenticated : null
    const target = effectiveAuth === null ? initialRoute : effectiveAuth ? 'Home' : 'Login'

    console.log('[LAYOUT auth guard] effectiveAuth:', effectiveAuth, '→ target:', target)

    const currentPath = router.getPathname?.() ?? ''
    console.log('[LAYOUT auth guard] currentPath:', currentPath)

    if (!currentPath.includes(`/${target}`)) {
      console.log('[LAYOUT auth guard] Navigating to:', target)
      if (target === 'Home') {
        hasNavigatedToHomeRef.current = true
      }
      router.replace(`/${target}`)
    } else if (target === 'Home') {
      // Already on Home — latch the ref
      hasNavigatedToHomeRef.current = true
    }
  }, [isChecking, initialRoute, isAuthenticated, router])

  // ─── OTA updates ─────────────────────────────────────────────────────────────
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
        const message = 'A new update has been downloaded. Do you want to install it now or on next launch?'
        const buttons =
          Platform.OS === 'ios'
            ? [
                { text: 'Later', style: 'cancel' },
                { text: 'Install on next launch', onPress: () => toast.show('Will install on next app launch', { duration: 2000 }) },
                { text: 'Install now', onPress: async () => { try { await Updates.reloadAsync() } catch { toast.show('Failed to apply update; please restart the app', { duration: 4000 }) } } },
              ]
            : [
                { text: 'Install now', onPress: async () => { try { await Updates.reloadAsync() } catch { toast.show('Failed to apply update; please restart the app', { duration: 4000 }) } } },
                { text: 'Install on next launch', onPress: () => toast.show('Will install on next app launch', { duration: 2000 }) },
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
    return () => { mounted = false; subscription.remove() }
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
      pointerEvents="box-none"
    >
      <StatusBar barStyle="dark-content" />
      <View style={[styles.contentContainer, { paddingBottom: bottomPadding }]} pointerEvents="box-none">
        <View style={styles.slotWrapper} pointerEvents="box-none">
          <Slot />
        </View>
      </View>
      {reduxLoading && (
        <View
          pointerEvents="box-none"
          style={[
            styles.overlayContainer,
            { bottom: bottomPadding + 8 },
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
  fullScreen: { flex: 1, backgroundColor: '#FFF8E1' },
  contentContainer: { flex: 1, width: '100%' },
  slotWrapper: { flex: 1 },
  centeredFull: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 10, color: '#333' },
  overlayContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
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
  debugOverlay: { backgroundColor: 'rgba(255,0,0,0.08)' },
})