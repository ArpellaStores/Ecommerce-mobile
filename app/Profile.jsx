// screens/ProfilePage.js
import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  SafeAreaView,
  useWindowDimensions,
  ScrollView,
} from 'react-native'
import FontAwesome from 'react-native-vector-icons/FontAwesome'
import { useRouter } from 'expo-router'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { logout } from '../redux/slices/authSlice'
import { clearCredentials, exitApp } from '../services/Auth'
import { baseUrl } from '../constants/const'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import BottomNav from '../components/BottomNav'

const ProfilePage = () => {
  const router = useRouter()
  const dispatch = useDispatch()

  const { user, isAuthenticated } = useSelector((s) => s.auth || {})
  const productsArray = useSelector((s) => s.products?.products || [])
  const productsById = useSelector((s) => s.products?.productsById || {})
  const cartState = useSelector((s) => s.cart || {})
  const cartItemsCandidate = cartState.items ?? cartState.cartItems ?? []
  const cartCount = Array.isArray(cartItemsCandidate)
    ? cartItemsCandidate.reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0)
    : cartItemsCandidate && typeof cartItemsCandidate === 'object'
    ? Object.values(cartItemsCandidate).reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0)
    : 0

  const [autoEnabled, setAutoEnabled] = useState(true)
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)

  const dims = useWindowDimensions()
  const isLandscape = dims.width > dims.height
  const insets = useSafeAreaInsets()

  useEffect(() => {
    ;(async () => {
      try {
        const rem = await SecureStore.getItemAsync('rememberMe')
        setAutoEnabled(rem === 'true')
      } catch (e) {
        setAutoEnabled(false)
      }
    })()
  }, [])

  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true)
      try {
        const { data } = await axios.get(`${baseUrl}/orders`)
        if (!Array.isArray(data)) {
          setOrders([])
          return
        }
        const matchKey = String(user?.id ?? user?.phone ?? user?.phoneNumber ?? '')
        const filtered = data.filter((o) => String(o.userId || o.user || '').trim() === matchKey.trim())
        setOrders(filtered)
      } catch (e) {
        console.error('Fetch orders error', e)
        setOrders([])
      } finally {
        setLoadingOrders(false)
      }
    }

    if (isAuthenticated) fetchOrders()
  }, [user, isAuthenticated])

  const onToggleAuto = async (value) => {
    setAutoEnabled(value)
    if (!value) {
      await clearCredentials()
      await SecureStore.setItemAsync('rememberMe', 'false')
    } else {
      await SecureStore.setItemAsync('rememberMe', 'true')
    }
  }

  const onLogout = async () => {
    await clearCredentials()
    dispatch(logout())
    exitApp()
  }

  const lookupProductFromRedux = useMemo(() => {
    return (productId) => {
      if (!productId) return null
      if (productsById && productsById[productId]) return productsById[productId]
      const found = Object.values(productsById || {}).find(
        (p) =>
          String(p?.id) === String(productId) ||
          String(p?._id) === String(productId) ||
          String(p?.productId) === String(productId)
      )
      if (found) return found
      return (
        (productsArray || []).find(
          (p) =>
            String(p?.id) === String(productId) ||
            String(p?._id) === String(productId) ||
            String(p?.productId) === String(productId)
        ) || null
      )
    }
  }, [productsById, productsArray])

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.header}>Personal Details</Text>
      {isAuthenticated ? (
        <>
          {['firstName', 'lastName', 'email', 'phone'].map((field) => (
            <View key={field} style={styles.row}>
              <Text style={styles.label}>
                {field === 'phone' ? 'Phone:' : field === 'email' ? 'Email:' : `${field.replace(/Name/, ' Name')}:`}
              </Text>
              <View style={styles.valueRow}>
                <Text style={styles.valueText}>{user?.[field] ?? 'N/A'}</Text>
              </View>
            </View>
          ))}
          <View style={styles.row}>
            <Text style={styles.label}>Enable Auto-login:</Text>
            <Switch value={autoEnabled} onValueChange={onToggleAuto} />
          </View>
        </>
      ) : (
        <Text style={styles.centerText}>No user data. Please log in.</Text>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>Logout & Exit</Text>
      </TouchableOpacity>

      <Text style={styles.sectionHeader}>Order History</Text>
      {loadingOrders && (
        <View style={{ paddingVertical: 12 }}>
          <ActivityIndicator size="large" color="#4B2C20" />
        </View>
      )}
      {!loadingOrders && orders.length === 0 && <Text style={styles.centerText}>You have no past orders.</Text>}
    </View>
  )

  const openOrder = (order) => {
    setSelectedOrder(order)
    setModalVisible(true)
  }

  const closeOrderModal = () => {
    setModalVisible(false)
    setSelectedOrder(null)
  }

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity style={styles.orderCard} onPress={() => openOrder(item)}>
      <View style={styles.orderCardHeader}>
        <Text style={styles.orderId}>Order #{String(item?.orderid || item?.orderId || '').toUpperCase()}</Text>
        <Text style={styles.orderDate}>{item?.date ? new Date(item.date).toLocaleDateString() : ''}</Text>
      </View>
      <View style={styles.orderCardBody}>
        <Text>
          Status: <Text style={styles.orderStatus}>{item.status || 'N/A'}</Text>
        </Text>
        <FontAwesome
          name={item.status === 'fulfilled' ? 'check-circle' : item.status === 'in transit' ? 'truck' : 'hourglass'}
          size={20}
          color="#4B2C20"
        />
      </View>
    </TouchableOpacity>
  )

  const getOrderItems = (order) => {
    if (!order) return []
    return order.orderitem || order.orderItems || order.order_item || order.items || order.itemsOrdered || []
  }

  const computeUnitPrice = (item) => {
    const productFromOrder = item.product || null
    const productFromRedux = lookupProductFromRedux(item.productId)
    const unitPrice =
      Number(
        productFromOrder?.price ??
          productFromOrder?.unitPrice ??
          productFromRedux?.price ??
          item.price ??
          0
      ) || 0
    return unitPrice
  }

  const computeItemSubtotal = (item) => {
    const unitPrice = computeUnitPrice(item)
    const qty = Number(item.quantity || 0)
    return unitPrice * qty
  }

  const computeOrderTotal = (order) => {
    const items = getOrderItems(order)
    return items.reduce((acc, it) => acc + computeItemSubtotal(it), 0)
  }

  const modalWidth = isLandscape ? Math.min(900, dims.width * 0.9) : Math.min(600, dims.width * 0.92)
  const modalMaxHeight = isLandscape ? dims.height * 0.9 : dims.height * 0.8

  return (
    <SafeAreaView style={[styles.safe, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <FlatList
        data={orders}
        keyExtractor={(item) => String(item?.orderid || item?.orderId || item?._id || Math.random())}
        renderItem={renderOrderItem}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 120 }]}
        ListHeaderComponent={renderHeader}
        removeClippedSubviews={true}
      />

      <Modal visible={modalVisible} transparent animationType="slide" supportedOrientations={['portrait', 'landscape']} onRequestClose={closeOrderModal}>
        <View style={[styles.modalOverlay, { zIndex: 9999, elevation: 20 }]}>
          <View style={[styles.modalBox, { width: modalWidth, maxHeight: modalMaxHeight, elevation: 30, zIndex: 10000 }]}>
            <Text style={styles.modalTitle}>
              Order Details — #{String(selectedOrder?.orderid || selectedOrder?.orderId || '').toUpperCase()}
            </Text>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {selectedOrder ? (
                <>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Status:</Text>
                    <Text style={styles.metaValue}>{selectedOrder.status || '—'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Placed:</Text>
                    <Text style={styles.metaValue}>
                      {selectedOrder.createdAt
                        ? new Date(selectedOrder.createdAt).toLocaleString()
                        : selectedOrder.date
                        ? new Date(selectedOrder.date).toLocaleString()
                        : '—'}
                    </Text>
                  </View>

                  <View style={{ height: 12 }} />

                  {getOrderItems(selectedOrder).length > 0 ? (
                    getOrderItems(selectedOrder).map((item, i) => {
                      const productFromOrder = item.product || null
                      const productFromRedux = lookupProductFromRedux(item.productId)
                      const name =
                        productFromOrder?.name || productFromRedux?.name || productFromOrder?.title || `Product ${item.productId || i + 1}`
                      const unitPrice = computeUnitPrice(item)
                      const qty = Number(item.quantity || 0)
                      const subtotal = unitPrice * qty
                      const imageUri = productFromRedux?.productImage || productFromOrder?.imageUrl || productFromOrder?.productImage || null

                      return (
                        <View key={String(i)} style={styles.itemRowModal}>
                          <View style={styles.itemImageWrapper}>
                            {imageUri ? <Image source={{ uri: imageUri }} style={styles.itemImageModal} /> : <View style={styles.placeholderImageModal}><Text style={{ color: '#666', fontSize: 12 }}>No image</Text></View>}
                          </View>

                          <View style={styles.itemMetaWrapper}>
                            <Text style={styles.itemName}>{name}</Text>
                            <Text style={styles.itemMetaText}>Price: KSH {unitPrice.toFixed(2)}</Text>
                            {item.productId ? <Text style={styles.itemSmall}>ID: {item.productId}</Text> : null}
                          </View>

                          <View style={styles.itemQtyWrapper}>
                            <Text style={styles.itemMetaText}>Qty: {qty}</Text>
                            <Text style={styles.itemSubtotal}>Subtotal: KSH {subtotal.toFixed(2)}</Text>
                          </View>
                        </View>
                      )
                    })
                  ) : (
                    <Text style={styles.centerText}>No items in this order.</Text>
                  )}

                  <View style={styles.hr} />

                  <View style={styles.totalRow}>
                    <Text style={{ fontWeight: '700' }}>Order Total</Text>
                    <Text style={{ fontWeight: '700' }}>KSH {computeOrderTotal(selectedOrder).toFixed(2)}</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.centerText}>Loading order…</Text>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.closeBtn} onPress={closeOrderModal}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNav activeRoute="Profile" cartCount={cartCount} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8E1' },
  listContainer: { paddingBottom: 100, paddingHorizontal: 16 },
  headerContainer: { paddingTop: 8, paddingBottom: 8 },
  header: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  label: { fontSize: 16, fontWeight: '600' },
  valueRow: { flexDirection: 'row', alignItems: 'center' },
  valueText: { fontSize: 16 },
  logoutBtn: { backgroundColor: 'red', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 12 },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionHeader: { fontSize: 18, fontWeight: '700', marginVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 4 },
  orderCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginVertical: 6, elevation: 2 },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  orderId: { fontWeight: '600' },
  orderDate: { color: '#777' },
  orderCardBody: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' },
  orderStatus: { fontWeight: '600', textTransform: 'capitalize' },
  centerText: { textAlign: 'center', marginVertical: 12, color: '#555' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.44)', justifyContent: 'center', alignItems: 'center', padding: 12 },
  modalBox: { backgroundColor: '#fff', borderRadius: 10, padding: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  modalContent: { paddingBottom: 8 },

  itemRowModal: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  itemImageWrapper: { width: 80, height: 80, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  itemImageModal: { width: 80, height: 80, borderRadius: 6, backgroundColor: '#eee' },
  placeholderImageModal: { width: 80, height: 80, borderRadius: 6, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  itemMetaWrapper: { flex: 1, paddingRight: 8 },
  itemQtyWrapper: { width: 110, alignItems: 'flex-end' },
  itemName: { fontWeight: '700', marginBottom: 4 },
  itemMetaText: { color: '#757575', fontSize: 13 },
  itemSmall: { color: '#999', fontSize: 12, marginTop: 4 },
  itemSubtotal: { fontWeight: '700', marginTop: 8 },

  hr: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  metaLabel: { color: '#757575' },
  metaValue: { fontWeight: '600' },

  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  closeBtn: { backgroundColor: '#4B2C20', padding: 10, borderRadius: 6, alignItems: 'center' },
  closeText: { color: '#fff', fontWeight: '600' },
})

export default ProfilePage
