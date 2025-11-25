// components/BottomNav.js
import React, { memo, useCallback, useMemo } from 'react'
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FontAwesome from 'react-native-vector-icons/FontAwesome'
import { useRouter, usePathname } from 'expo-router'
import * as Haptics from 'expo-haptics'

const NAV_ITEMS = [
  { key: 'home', label: 'Home', route: '/Home', icon: 'home' },
  { key: 'orders', label: 'Orders', route: '/Package', icon: 'shopping-bag' },
  { key: 'profile', label: 'Profile', route: '/Profile', icon: 'user' },
]

const NavButton = memo(({ item, isActive, onPress, badge }) => {
  const handlePress = useCallback(() => {
    // Lightweight haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onPress()
  }, [onPress])

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.label}${badge ? `, ${badge} items` : ''}`}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.navItem,
        pressed && styles.navItemPressed
      ]}
    >
      <View 
        style={[
          styles.iconContainer, 
          isActive && styles.iconContainerActive
        ]}
      >
        <FontAwesome 
          name={item.icon} 
          size={20} 
          color={isActive ? '#5a2428' : '#9E9E9E'} 
        />
        {typeof badge === 'number' && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badge > 99 ? '99+' : String(badge)}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
        {item.label}
      </Text>
    </Pressable>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.badge === nextProps.badge
  )
})

function BottomNav({ cartCount = 0 }) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const pathname = usePathname()

  // Memoize navigation handler
  const navigate = useCallback((route) => {
    // Use replace for same-level navigation to avoid stack buildup
    router.replace(route)
  }, [router])

  // Memoize route checking
  const isRouteActive = useCallback((route) => {
    const cleanRoute = route.replace(/^\//, '')
    const cleanPath = pathname.replace(/^\//, '')
    return cleanPath === cleanRoute || cleanPath.endsWith(cleanRoute)
  }, [pathname])

  // Memoize nav items to prevent recreation
  const navButtons = useMemo(() => {
    return NAV_ITEMS.map((item) => {
      const isActive = isRouteActive(item.route)
      const badge = item.key === 'home' ? cartCount : undefined
      
      return (
        <NavButton
          key={item.key}
          item={item}
          isActive={isActive}
          onPress={() => navigate(item.route)}
          badge={badge}
        />
      )
    })
  }, [isRouteActive, cartCount, navigate])

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {navButtons}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    minWidth: 80,
  },
  navItemPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  iconContainerActive: {
    backgroundColor: '#FFF3E0',
  },
  navLabel: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  navLabelActive: {
    color: '#5a2428',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
})

export default memo(BottomNav)