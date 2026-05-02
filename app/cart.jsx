import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { clearCart, updateItemQuantity, removeItemFromCart } from '../redux/slices/cartSlice'
import FontAwesome from 'react-native-vector-icons/FontAwesome'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import axios from 'axios'
import { baseUrl } from '../constants/const.js'
import * as Clipboard from 'expo-clipboard'
import BottomNav from '../components/BottomNav'
import ProductImage from '../components/ProductImage'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const STORE_LOCATION = {
  latitude: -1.3922513,
  longitude: 36.6829550,
}
const SHOP_NUMBER = '254704288802'

const TOTAL_CONTAINER_HEIGHT = 150
const NAV_HEIGHT = 64 // matches components/BottomNav NAVBAR_HEIGHT
const H_GUTTER = 15

const Checkout = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const userPhone = useSelector((s) => s.auth.user?.phone)
  const cartItems = useSelector((s) => s.cart?.items || {})
  const products = useSelector((s) => s.products.products || [])

  const cartCount = Object.values(cartItems || {}).reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0)

  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const [mpesaNumber, setMpesaNumber] = useState(userPhone || '254')
  const [mpesaError, setMpesaError] = useState('')
  const [buyerPin, setBuyerPin] = useState('')
  const [location, setLocation] = useState(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const [settings, setSettings] = useState({
    deliveryFee: 50,
    openingTime: '09:00',
    closingTime: '18:00',
    deliveryRadius: 50,
  })
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    fetchSettings()
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status === 'granted') {
          await getCurrentLocation()
        } else {
          Alert.alert('Permission Denied', 'Location permission is required for delivery calculation. You can manually set it in the checkout modal.')
        }
      } catch (err) {
        // Fallback or ignore
      }
    })()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await axios.get('https://api.arpellastore.com/settings')
      if (response.data && Array.isArray(response.data)) {
        const settingsMap = {}
        response.data.forEach((setting) => {
          if (setting.settingName === 'Delivery Fee') {
            settingsMap.deliveryFee = parseFloat(setting.settingValue) || 50
          } else if (setting.settingName === 'Opening Time') {
            settingsMap.openingTime = setting.settingValue || '09:00'
          } else if (setting.settingName === 'Closing Time') {
            settingsMap.closingTime = setting.settingValue || '18:00'
          } else if (setting.settingName === 'deliveryRadius') {
            settingsMap.deliveryRadius = parseFloat(setting.settingValue) || 50
          }
        })
        setSettings((prev) => ({ ...prev, ...settingsMap }))
      }
      setSettingsLoaded(true)
    } catch (error) {
      setSettingsLoaded(true)
    }
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const isWithinOperatingHours = () => {
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    return currentTime >= settings.openingTime && currentTime <= settings.closingTime
  }

  const copyToClipboard = async (text) => {
    try {
      await Clipboard.setStringAsync(String(text))
      Alert.alert('Copied', `${text} copied to clipboard`)
    } catch {
      Alert.alert('Copy Failed', 'Could not copy to clipboard')
    }
  }

  const getCurrentLocation = async () => {
    setLocationLoading(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for delivery calculation.')
        return null
      }
      
      const loc = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced 
      })
      
      const coords = { 
        latitude: loc.coords.latitude, 
        longitude: loc.coords.longitude 
      }
      
      setLocation(coords)
      return coords
    } catch (e) {
      Alert.alert('Location Error', 'Could not fetch your current location. Please ensure location services are enabled.')
      return null
    } finally {
      setLocationLoading(false)
    }
  }

  const getProductById = (id) => {
    return products.find((p) => {
      const pId = p.id ?? p._id ?? p.productId
      return String(pId) === String(id)
    }) || {}
  }

  const buildFusedItems = () =>
    Object.entries(cartItems).map(([id, item]) => {
      const product = getProductById(id)
      return { ...item, ...product, quantity: item.quantity, id: product.id ?? product._id ?? product.productId ?? item.id ?? id }
    })

  const buildOrderItems = (fusedItems) =>
    fusedItems.map((i) => {
      const qty = Number(i.quantity || 0)
      const basePrice = parseFloat(i.price || 0)
      const discountThreshold = parseFloat(i.discountQuantity ?? Infinity)
      const discounted = i.priceAfterDiscount != null ? parseFloat(i.priceAfterDiscount) : null
      const unitPrice = discounted !== null && qty >= discountThreshold ? discounted : basePrice
      const isDiscounted = discounted !== null && qty >= discountThreshold
      return {
        productId: i.id,
        quantity: qty,
        priceType: isDiscounted ? 'Discounted' : 'Retail',
        unitPrice: Number(unitPrice),
      }
    })

  const calculateSubtotal = () => {
    const fused = buildFusedItems()
    return fused.reduce((acc, item) => {
      const qty = Number(item.quantity || 0)
      const basePrice = parseFloat(item.price || 0)
      const discountThreshold = parseFloat(item.discountQuantity ?? Infinity)
      const discounted = item.priceAfterDiscount != null ? parseFloat(item.priceAfterDiscount) : null
      const unitPrice = discounted !== null && qty >= discountThreshold ? discounted : basePrice
      return acc + unitPrice * qty
    }, 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + settings.deliveryFee
  }

  const normalizeMpesaInput = (raw) => {
    if (!raw) return ''
    let digits = raw.replace(/\D/g, '')
    if (digits.startsWith('0')) digits = '254' + digits.slice(1)
    if (!digits.startsWith('254')) digits = '254' + digits
    if (digits.length > 12) digits = digits.slice(0, 12)
    return digits
  }

  const isValidSafaricomMpesa = (normalized) => {
    if (!normalized) return false
    const re = /^254\d{9}$/
    return re.test(normalized)
  }

  const handleMpesaChange = (text) => {
    const normalized = normalizeMpesaInput(text)
    setMpesaNumber(normalized)

    if (!normalized || normalized.length < 12) {
      setMpesaError('Enter M-Pesa number in format 254XXXXXXXX (no +).')
      return
    }
    if (!isValidSafaricomMpesa(normalized)) {
      setMpesaError('Number must be a Safaricom mobile (starts with 254) and 12 digits long and dont include " + ".')
      return
    }
    setMpesaError('')
  }

  const submitOrder = async () => {
    if (!mpesaNumber) {
      Alert.alert('Missing Information', 'M-Pesa payment number is required')
      return
    }

    if (!isValidSafaricomMpesa(mpesaNumber)) {
      Alert.alert('Invalid M-Pesa Number', 'Enter a valid Safaricom M-Pesa number in format 2547XXXXXXXX (no +)')
      return
    }

    const fusedItems = buildFusedItems()
    const orderItems = buildOrderItems(fusedItems)

    if (orderItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty')
      return
    }

    if (!isWithinOperatingHours()) {
      Alert.alert(
        'Outside Operating Hours',
        `Your order will be processed and delivered on the next operating day. Our business hours are ${settings.openingTime} to ${settings.closingTime}. Do you want to proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Proceed',
            onPress: () => processOrder(orderItems),
          },
        ]
      )
      return
    }

    await processOrder(orderItems)
  }

  const processOrder = async (orderItems) => {
    setLoading(true)

    try {
      if (!location) {
        setLoading(false)
        Alert.alert('Location Missing', 'We need your current location for delivery. Please tap "Get Location" in the checkout window.')
        return
      }
      let coords = location

      const distance = calculateDistance(
        STORE_LOCATION.latitude,
        STORE_LOCATION.longitude,
        coords.latitude,
        coords.longitude
      )

      if (distance > settings.deliveryRadius) {
        setLoading(false)
        Alert.alert(
          'Outside Delivery Zone',
          `You are approximately ${distance.toFixed(1)} km away from our store. Our delivery radius is ${settings.deliveryRadius} km. Please call us at ${SHOP_NUMBER} to arrange delivery.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Copy Number',
              onPress: () => copyToClipboard(SHOP_NUMBER),
            },
          ]
        )
        return
      }

      const payload = {
        userId: userPhone ?? null,
        phoneNumber: String(mpesaNumber),
        orderPaymentType: 'Mpesa',
        buyerPin: buyerPin || 'N/A',
        latitude: Number(coords.latitude),
        longitude: Number(coords.longitude),
        orderSource: "Ecommerce",
        orderItems,
      }



      const response = await axios.post(`${baseUrl}/order`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000,
      })

      if (response.status >= 200 && response.status < 300) {
        setPaymentSuccess(true)
        dispatch(clearCart())
      } else {
        const message = response.data?.message || 'Failed to process your order'
        Alert.alert('Order Failed', message)
        setShowModal(false)
      }
    } catch (err) {
      const serverMessage = err?.response?.data?.message || err?.response?.data || err?.message
      Alert.alert('Order Error', serverMessage || 'Could not connect to server. Please try again.')
      setShowModal(false)
    } finally {
      setLoading(false)
    }
  }

  const openCheckoutModal = () => {
    setShowModal(true)
    if (!location) getCurrentLocation()
    setMpesaNumber(normalizeMpesaInput(mpesaNumber))
    if (!isValidSafaricomMpesa(normalizeMpesaInput(mpesaNumber))) {
      setMpesaError('Enter M-Pesa number in format 2547XXXXXXXX (no +).')
    } else {
      setMpesaError('')
    }
  }

  const closeCheckoutModal = () => {
    setShowModal(false)
    setPaymentSuccess(false)
  }

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => dispatch(clearCart()),
        },
      ]
    )
  }

  const openEditModal = (item) => {
    setSelectedItem(item)
    setEditModalVisible(true)
  }

  const closeEditModal = () => {
    setEditModalVisible(false)
    setSelectedItem(null)
  }

  const handleUpdateQuantity = (newQty) => {
    if (newQty < 1) {
      Alert.alert(
        'Remove Item',
        'Do you want to remove this item from cart?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              dispatch(removeItemFromCart({ productId: selectedItem.id }))
              closeEditModal()
            },
          },
        ]
      )
      return
    }
    dispatch(updateItemQuantity({ productId: selectedItem.id, quantity: newQty }))
    setSelectedItem({ ...selectedItem, quantity: newQty })
  }

  const handleRemoveItem = () => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            dispatch(removeItemFromCart({ productId: selectedItem.id }))
            closeEditModal()
          },
        },
      ]
    )
  }

  const fusedForRender = buildFusedItems()
  const subtotal = calculateSubtotal()
  const total = calculateTotal()

  const distanceToStore = location
    ? calculateDistance(STORE_LOCATION.latitude, STORE_LOCATION.longitude, location.latitude, location.longitude)
    : null

  const showStoreNumberInModal =
    !location || (distanceToStore !== null && distanceToStore > Number(settings.deliveryRadius))

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.headerRow}>
        <Text style={styles.cartTitle}>Your Cart</Text>
        {fusedForRender.length > 0 && (
          <TouchableOpacity onPress={handleClearCart} style={styles.clearAllBtn}>
            <Text style={styles.clearCartText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {fusedForRender.length === 0 ? (
        <View style={styles.emptyCartContainer}>
          <FontAwesome name="shopping-cart" size={50} color="#aaa" />
          <Text style={styles.emptyCartText}>Your cart is empty</Text>
          <TouchableOpacity style={styles.continueShopping} onPress={() => router.back()}>
            <Text style={styles.continueShoppingText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: TOTAL_CONTAINER_HEIGHT + NAV_HEIGHT + Math.max(insets.bottom, 12) + 24,
            paddingHorizontal: H_GUTTER,
          }}
          showsVerticalScrollIndicator={true}
        >
          {fusedForRender.map((item) => {
            const qty = Number(item.quantity || 0)
            const basePrice = parseFloat(item.price || 0)
            const discountThreshold = parseFloat(item.discountQuantity ?? Infinity)
            const discounted = item.priceAfterDiscount != null ? parseFloat(item.priceAfterDiscount) : null
            const unitPrice = discounted !== null && qty >= discountThreshold ? discounted : basePrice
            return (
              <TouchableOpacity key={String(item.id)} style={styles.cartItem} onPress={() => openEditModal(item)} activeOpacity={0.8}>
                <View style={styles.cartItemRow}>
                  <View style={styles.imageWrapper}>
                    <ProductImage
                      product={item}
                      style={styles.cartItemImage}
                    />
                  </View>
                  <View style={styles.cartItemDetails}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name || 'Product'}</Text>
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemQty}>Qty: <Text style={styles.boldText}>{qty}</Text></Text>
                      <Text style={styles.itemPrice}>KSH {unitPrice.toLocaleString()}</Text>
                    </View>
                    <View style={styles.itemTotalRow}>
                      <Text style={styles.itemTotalLabel}>Total:</Text>
                      <Text style={styles.itemTotalValue}>KSH {(unitPrice * qty).toLocaleString()}</Text>
                    </View>
                  </View>
                  <View style={styles.editAction}>
                    <FontAwesome name="chevron-right" size={14} color="#5a2428" />
                  </View>
                </View>
              </TouchableOpacity>
            )
          })}

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Subtotal</Text>
              <Text style={styles.costValue}>KSH {subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Delivery Fee</Text>
              <Text style={styles.costValue}>KSH {settings.deliveryFee.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>KSH {total.toLocaleString()}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutButton} onPress={openCheckoutModal} activeOpacity={0.9}>
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
              <FontAwesome name="arrow-right" size={14} color="#fff" style={{ marginLeft: 10 }} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={closeEditModal}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }} showsVerticalScrollIndicator={true}>
              {selectedItem && (
                <View style={styles.editModalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.editModalTitle}>Edit Item</Text>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={closeEditModal}>
                      <FontAwesome name="close" size={20} color="#333" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.editImageContainer}>
                    <ProductImage
                      product={selectedItem}
                      style={styles.editItemImage}
                    />
                  </View>

                  <Text style={styles.editItemName}>{selectedItem.name || 'Product'}</Text>

                  <View style={styles.editQuantitySection}>
                    <Text style={styles.quantityLabel}>Quantity</Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity style={styles.qtyActionBtn} onPress={() => handleUpdateQuantity(selectedItem.quantity - 1)}>
                        <FontAwesome name="minus" size={12} color="#fff" />
                      </TouchableOpacity>
                      <Text style={styles.quantityValue}>{selectedItem.quantity}</Text>
                      <TouchableOpacity style={styles.qtyActionBtn} onPress={() => handleUpdateQuantity(selectedItem.quantity + 1)}>
                        <FontAwesome name="plus" size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.editModalFooter}>
                    <TouchableOpacity style={styles.removeButton} onPress={handleRemoveItem}>
                      <FontAwesome name="trash" size={16} color="#d32f2f" />
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.doneButton} onPress={closeEditModal}>
                      <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={closeCheckoutModal}>
        <View style={styles.modalOverlay}>
            <View style={styles.checkoutModalInner}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Checkout</Text>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={closeCheckoutModal}>
                  <FontAwesome name="close" size={20} color="#333" />
                </TouchableOpacity>
              </View>

              {paymentSuccess ? (
                <View style={styles.successWrapper}>
                  <View style={styles.successIconBg}>
                    <FontAwesome name="check" size={32} color="#fff" />
                  </View>
                  <Text style={styles.successTitle}>Payment Initiated!</Text>
                  <Text style={styles.successMessage}>A payment request has been sent to your phone. Please enter your M-Pesa PIN to complete the order.</Text>
                  
                  {!isWithinOperatingHours() && (
                    <View style={styles.noticeBox}>
                      <FontAwesome name="info-circle" size={16} color="#5a2428" />
                      <Text style={styles.noticeText}>Note: Your order will be processed during next business hours.</Text>
                    </View>
                  )}
                  
                  <TouchableOpacity style={styles.successCloseBtn} onPress={closeCheckoutModal}>
                    <Text style={styles.successCloseBtnText}>Got it</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView style={styles.checkoutScroll} showsVerticalScrollIndicator={false}>
                  {!isWithinOperatingHours() && (
                    <View style={styles.warningBox}>
                      <FontAwesome name="clock-o" size={16} color="#856404" />
                      <Text style={styles.warningText}>We're currently closed. Your order will be delivered tomorrow morning.</Text>
                    </View>
                  )}

                  <View style={styles.orderSummaryBox}>
                    <Text style={styles.boxLabel}>Items Summary</Text>
                    {fusedForRender.map((item) => {
                      const qty = Number(item.quantity || 0)
                      const basePrice = parseFloat(item.price || 0)
                      const discountThreshold = parseFloat(item.discountQuantity ?? Infinity)
                      const discounted = item.priceAfterDiscount != null ? parseFloat(item.priceAfterDiscount) : null
                      const unit = discounted !== null && qty >= discountThreshold ? discounted : basePrice
                      return (
                        <View style={styles.orderRow} key={String(item.id)}>
                          <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.orderItemQty}>x{qty}</Text>
                          <Text style={styles.orderItemTotal}>KSH {(unit * qty).toLocaleString()}</Text>
                        </View>
                      )
                    })}
                    <View style={styles.boxDivider} />
                    <View style={styles.orderTotalRow}>
                      <Text style={styles.orderTotalLabel}>Total</Text>
                      <Text style={styles.orderTotalValue}>KSH {total.toLocaleString()}</Text>
                    </View>
                  </View>

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>M-Pesa Number</Text>
                    <View style={[styles.phoneInputWrap, mpesaError ? styles.inputError : null]}>
                      <Text style={styles.prefix}>+254</Text>
                      <TextInput
                        style={styles.phoneField}
                        placeholder="7XXXXXXXX"
                        value={(mpesaNumber || '').replace(/^254/, '')}
                        onChangeText={handleMpesaChange}
                        keyboardType="phone-pad"
                        maxLength={9}
                      />
                    </View>
                    {mpesaError ? <Text style={styles.errorTextSmall}>{mpesaError}</Text> : null}
                  </View>

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>ID / Passport (Optional)</Text>
                    <TextInput style={styles.textField} placeholder="Enter ID number" value={buyerPin} onChangeText={setBuyerPin} />
                  </View>

                  <View style={styles.locationSection}>
                    <View style={styles.locationHeader}>
                      <FontAwesome name="map-marker" size={16} color="#5a2428" />
                      <Text style={styles.locationTitle}>Delivery Address</Text>
                    </View>
                    <Text style={styles.locationStatus}>
                      {location 
                        ? `Captured: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` 
                        : 'Fetching your location...'}
                    </Text>
                    <TouchableOpacity style={styles.updateLocationBtn} onPress={getCurrentLocation} disabled={locationLoading}>
                      {locationLoading ? <ActivityIndicator size="small" color="#5a2428" /> : <Text style={styles.updateLocationBtnText}>{location ? 'Update Location' : 'Get Location'}</Text>}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={[styles.payButton, (loading || mpesaError) && { opacity: 0.7 }]} onPress={submitOrder} disabled={loading || !!mpesaError}>
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : (
                      <>
                        <Text style={styles.payButtonText}>Place Order Now</Text>
                        <FontAwesome name="lock" size={14} color="#fff" style={{ marginLeft: 10 }} />
                      </>
                    )}
                  </TouchableOpacity>
                  
                  {showStoreNumberInModal && (
                    <TouchableOpacity onPress={() => copyToClipboard(SHOP_NUMBER)} style={styles.supportCall}>
                      <Text style={styles.supportCallText}>Need help? Call us at {SHOP_NUMBER}</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              )}
            </View>
        </View>
      </Modal>

      <Modal visible={loading} transparent>
        <View style={styles.backdrop}>
          <ActivityIndicator size="large" color="#5a2428" />
          <Text style={styles.backdropText}>Processing order...</Text>
        </View>
      </Modal>

      {/* Reusable bottom navigation component */}
      <BottomNav cartCount={cartCount} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1', paddingTop: Platform.OS === 'android' ? 20 : 36 },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20, 
    paddingHorizontal: H_GUTTER,
    paddingVertical: 10
  },
  cartTitle: { fontSize: 28, fontWeight: '900', color: '#5a2428', letterSpacing: -0.5 },
  clearAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    borderRadius: 8,
  },
  clearCartText: { color: '#d32f2f', fontSize: 13, fontWeight: '800' },
  emptyCartContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyCartText: { fontSize: 18, color: '#999', marginTop: 20, marginBottom: 30, fontWeight: '600' },
  continueShopping: { 
    backgroundColor: '#5a2428', 
    paddingHorizontal: 25, 
    paddingVertical: 15, 
    borderRadius: 12,
    shadowColor: '#5a2428',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  continueShoppingText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  
  cartItem: { 
    backgroundColor: '#fff', 
    marginBottom: 12, 
    borderRadius: 16, 
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  cartItemRow: { flexDirection: 'row', alignItems: 'center' },
  imageWrapper: {
    width: 80,
    height: 80,
    backgroundColor: '#fdfdfd',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#f5f5f5'
  },
  cartItemImage: { width: '85%', height: '85%' },
  cartItemDetails: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 6, lineHeight: 20 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemQty: { fontSize: 13, color: '#666', marginRight: 15 },
  boldText: { fontWeight: '800', color: '#333' },
  itemPrice: { fontSize: 13, color: '#5a2428', fontWeight: '700' },
  itemTotalRow: { flexDirection: 'row', alignItems: 'center' },
  itemTotalLabel: { fontSize: 12, color: '#999', marginRight: 5 },
  itemTotalValue: { fontSize: 14, fontWeight: '800', color: '#333' },
  editAction: {
    padding: 10,
  },
  
  summaryCard: { 
    padding: 20, 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  summaryTitle: { fontSize: 18, fontWeight: '800', color: '#333', marginBottom: 15 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  costLabel: { fontSize: 14, color: '#666', fontWeight: '600' },
  costValue: { fontSize: 14, color: '#333', fontWeight: '700' },
  summaryDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 15 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#333' },
  totalValue: { fontSize: 20, fontWeight: '900', color: '#5a2428' },
  checkoutButton: { 
    backgroundColor: '#5a2428', 
    paddingVertical: 18, 
    borderRadius: 14, 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#5a2428',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  checkoutButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  // Modal Common
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%'
  },
  modalCloseBtn: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20
  },
  
  // Edit Modal
  editModalContent: { 
    width: '100%', 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10
  },
  editModalTitle: { fontSize: 20, fontWeight: '800', color: '#333' },
  editImageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#fdfdfd',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f5f5f5'
  },
  editItemImage: { width: '70%', height: '70%' },
  editItemName: { fontSize: 18, fontWeight: '700', color: '#333', textAlign: 'center', marginBottom: 25 },
  editQuantitySection: {
    alignItems: 'center',
    marginBottom: 30
  },
  quantityLabel: { fontSize: 13, fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: 12 },
  quantityControls: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 30,
    padding: 5
  },
  qtyActionBtn: { 
    width: 44, 
    height: 44, 
    backgroundColor: '#5a2428', 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#5a2428',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  quantityValue: { fontSize: 20, fontWeight: '800', minWidth: 60, textAlign: 'center', color: '#333' },
  editModalFooter: {
    flexDirection: 'row',
    gap: 12
  },
  removeButton: { 
    flex: 1,
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    paddingVertical: 15, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffcdd2'
  },
  removeButtonText: { color: '#d32f2f', fontSize: 14, fontWeight: '800', marginLeft: 8 },
  doneButton: { 
    flex: 2,
    backgroundColor: '#5a2428', 
    paddingVertical: 15, 
    borderRadius: 12, 
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5a2428',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  // Checkout Modal
  checkoutModalInner: { 
    width: '100%', 
    maxHeight: '90%', 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10
  },
  checkoutScroll: { width: '100%' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#333' },
  
  warningBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff3cd', 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffeeba'
  },
  warningText: { marginLeft: 10, color: '#856404', fontSize: 12, flex: 1, fontWeight: '600', lineHeight: 18 },
  
  orderSummaryBox: {
    backgroundColor: '#fdfdfd',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 24
  },
  boxLabel: { fontSize: 13, fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  orderItemName: { flex: 1, fontSize: 14, color: '#333', fontWeight: '600' },
  orderItemQty: { width: 40, fontSize: 13, color: '#666', textAlign: 'center' },
  orderItemTotal: { width: 100, fontSize: 14, color: '#333', fontWeight: '700', textAlign: 'right' },
  boxDivider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  orderTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotalLabel: { fontSize: 15, fontWeight: '800', color: '#333' },
  orderTotalValue: { fontSize: 18, fontWeight: '900', color: '#5a2428' },
  
  inputSection: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#444', marginBottom: 10 },
  phoneInputWrap: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f9f9f9', 
    borderWidth: 1, 
    borderColor: '#eee', 
    borderRadius: 12,
    overflow: 'hidden'
  },
  inputError: { borderColor: '#f44336', backgroundColor: '#fff8f8' },
  prefix: { paddingHorizontal: 15, fontSize: 15, fontWeight: '700', color: '#5a2428', backgroundColor: '#f0f0f0', paddingVertical: 15 },
  phoneField: { flex: 1, padding: 15, fontSize: 16, color: '#333', fontWeight: '600' },
  textField: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 15, fontSize: 15, color: '#333', fontWeight: '600' },
  errorTextSmall: { color: '#f44336', fontSize: 12, marginTop: 5, fontWeight: '600' },
  
  locationSection: { 
    backgroundColor: 'rgba(90, 36, 40, 0.03)', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(90, 36, 40, 0.1)'
  },
  locationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  locationTitle: { fontSize: 14, fontWeight: '800', color: '#5a2428', marginLeft: 8 },
  locationStatus: { fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 18 },
  updateLocationBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#5a2428', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  updateLocationBtnText: { color: '#5a2428', fontSize: 13, fontWeight: '800' },
  
  payButton: { 
    backgroundColor: '#5a2428', 
    paddingVertical: 18, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#5a2428',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 15
  },
  payButtonText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  supportCall: { paddingVertical: 10, alignItems: 'center' },
  supportCallText: { fontSize: 13, color: '#5a2428', fontWeight: '700', textDecorationLine: 'underline' },
  
  successWrapper: { alignItems: 'center', paddingVertical: 20 },
  successIconBg: { width: 70, height: 70, backgroundColor: '#4caf50', borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#333', marginBottom: 10 },
  successMessage: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  noticeBox: { flexDirection: 'row', backgroundColor: '#f5f5f5', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 30 },
  noticeText: { flex: 1, marginLeft: 10, fontSize: 12, color: '#666', fontWeight: '600' },
  successCloseBtn: { backgroundColor: '#5a2428', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 12 },
  successCloseBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  backdropText: { color: 'white', marginTop: 15, fontWeight: '700', fontSize: 16 },
})

export default Checkout
