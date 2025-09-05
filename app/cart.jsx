// screens/Checkout.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { clearCart } from '../redux/slices/cartSlice';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { baseUrl } from '../constants/const.js';

/**
 * Checkout Screen
 * - Displays cart summary and total
 * - Opens a checkout modal to collect M-Pesa number, location, and ID/passport
 * - Submits order to backend and handles success/failure
 *
 * NOTE: Only the payment-success modal UI copy is simplified here.
 */

const Checkout = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const userPhone = useSelector((s) => s.auth.user?.phone);
  const cartItems = useSelector((s) => s.cart.items || {});
  const products = useSelector((s) => s.products.products || []);

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Default mpesaNumber seeded from userPhone if present
  const [mpesaNumber, setMpesaNumber] = useState(userPhone || '254');
  const [mpesaError, setMpesaError] = useState('');
  const [buyerPin, setBuyerPin] = useState('');
  const [location, setLocation] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Request permission on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required for delivery');
        }
      } catch {}
    })();
  }, []);

  /** Fetch current GPS coordinates **/
  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for delivery');
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setLocation(coords);
      return coords;
    } catch (e) {
      Alert.alert('Location Error', 'Unable to get your current location. Try again.');
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  /** Convert cart items into orderItems array **/
  const getOrderItems = () =>
    Object.entries(cartItems).map(([id, item]) => ({
      productId: parseInt(id, 10),
      quantity: item.quantity,
    }));

  /** Lookup product details by ID **/
  const getProductById = (id) =>
    products.find((p) => p.id === parseInt(id, 10)) || {};

  /** Sum up total price **/
  const calculateTotal = () =>
    Object.entries(cartItems).reduce((sum, [id, item]) => {
      const p = getProductById(id);
      return sum + (p.price || 0) * item.quantity;
    }, 0);

  // --- M-Pesa number normalization & validation helpers ---

  /**
   * Normalize input:
   * - strip spaces, plus sign, and non-digits
   * - if user types a local number starting with 0 (eg 0712...), convert to 254712...
   * - if user types number without 254, we prepend 254
   * Returns normalized digits-only string.
   */
  const normalizeMpesaInput = (raw) => {
    if (!raw) return '';
    // Remove non-digits (this strips + and spaces)
    let digits = raw.replace(/\D/g, '');

    // If user typed local number starting with 0 (e.g., 0712...), convert to 254712...
    if (digits.startsWith('0')) {
      digits = '254' + digits.slice(1);
    }

    // If user typed number without country code but not starting with 0 (e.g., 712...), prepend 254
    if (!digits.startsWith('254')) {
      // But avoid duplicating if they already typed something like '254...'
      digits = '254' + digits;
    }

    // Cap to 12 digits (254 + 9 digits local)
    if (digits.length > 12) digits = digits.slice(0, 12);

    return digits;
  };

  /**
   * Quick validation:
   * - Must be exactly 12 digits long
   * - Must start with 2547 (Safaricom mobile numbers follow 07 -> 2547)
   * - (Note: mobile number portability exists; this check validates the common Safaricom format)
   */
  const isValidSafaricomMpesa = (normalized) => {
    if (!normalized) return false;
    // 254 + 9 digits => total 12 digits
    const re = /^2547\d{8}$/;
    return re.test(normalized);
  };

  // Handler for changes from the text input
  const handleMpesaChange = (text) => {
    const normalized = normalizeMpesaInput(text);
    setMpesaNumber(normalized);

    // Validate and set inline error message
    if (!normalized || normalized.length < 12) {
      setMpesaError('Enter M-Pesa number in format 254XXXXXXXX (no +).');
      return;
    }
    if (!isValidSafaricomMpesa(normalized)) {
      setMpesaError('Number must be a Safaricom mobile (starts with 254) and 12 digits long and dont include "+"+.');
      return;
    }
    setMpesaError('');
  };

  /** Submit the order **/
  const submitOrder = async () => {
    // Final validation before submit
    if (!mpesaNumber) {
      Alert.alert('Missing Information', 'M-Pesa payment number is required');
      return;
    }

    if (!isValidSafaricomMpesa(mpesaNumber)) {
      Alert.alert('Invalid M-Pesa Number', 'Enter a valid Safaricom M-Pesa number in format 2547XXXXXXXX (no +)');
      return;
    }

    const orderItems = getOrderItems();
    if (orderItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty');
      return;
    }

    setLoading(true);

    try {
      // Resolve coordinates: prefer user-granted location, otherwise try to fetch,
      // otherwise fall back to Nairobi CBD coordinates.
      let coords = location;
      if (!coords) {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, maximumAge: 10000, timeout: 5000 });
          coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        } catch {
          // fallback to Nairobi CBD
          coords = { latitude: -1.28333, longitude: 36.81667 };
        }
      }

      const payload = {
        userId: userPhone,
        phoneNumber: mpesaNumber,
        orderPaymentType: 'Mpesa',
        buyerPin: buyerPin || 'N/A',
        latitude: coords.latitude,
        longitude: coords.longitude,
        orderItems,
      };

      // Use axios (same as web) to send JSON and get a consistent response shape.
      const response = await axios.post(`${baseUrl}/order`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000,
      });

      // axios already parses JSON into response.data
      if (response.status >= 200 && response.status < 300) {
        // Show the simplified payment instructions UI (persistent)
        setPaymentSuccess(true);
        dispatch(clearCart());
      } else {
        const message = response.data?.message || 'Failed to process your order';
        Alert.alert('Order Failed', message);
        setShowModal(false);
      }
    } catch (err) {
      const serverMessage = err?.response?.data?.message || err?.response?.data || err?.message;
      Alert.alert('Order Error', serverMessage || 'Could not connect to server. Please try again.');
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  };

  /** Open checkout modal and fetch location if needed **/
  const openCheckoutModal = () => {
    setShowModal(true);
    if (!location) getCurrentLocation();
    // ensure mpesaNumber is normalized when opening modal
    setMpesaNumber(normalizeMpesaInput(mpesaNumber));
    // validate seed value
    if (!isValidSafaricomMpesa(normalizeMpesaInput(mpesaNumber))) {
      setMpesaError('Enter M-Pesa number in format 2547XXXXXXXX (no +).');
    } else {
      setMpesaError('');
    }
  };

  /** Close the checkout modal **/
  const closeCheckoutModal = () => {
    setShowModal(false);
    setPaymentSuccess(false); // Reset payment success state
  };

  // Handler when user confirms they have completed the M-Pesa payment.
  const handleUserConfirmedPayment = () => {
    setPaymentSuccess(false);
    setShowModal(false);
    router.replace('./Package');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.cartTitle}>Shopping Cart</Text>
      </View>

      {Object.keys(cartItems).length === 0 ? (
        <View style={styles.emptyCartContainer}>
          <FontAwesome name="shopping-cart" size={50} color="#aaa" />
          <Text style={styles.emptyCartText}>Your cart is empty</Text>
          <TouchableOpacity style={styles.continueShopping} onPress={() => router.back()}>
            <Text style={styles.continueShoppingText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={Object.entries(cartItems)}
            keyExtractor={([id]) => id}
            renderItem={({ item }) => {
              const [id, cartItem] = item;
              const product = getProductById(id);
              return (
                <View style={styles.cartItem}>
                  <View style={styles.cartItemRow}>
                    <Image
                      source={{
                        uri:
                          product.productimages?.[0]?.imageUrl ||
                          product.imageUrl ||
                          'https://via.placeholder.com/150',
                      }}
                      style={styles.cartItemImage}
                    />
                    <View style={styles.cartItemDetails}>
                      <Text style={styles.itemName}>{product.name || 'Product'}</Text>
                      <View style={styles.itemDetails}>
                        <Text>Qty: {cartItem.quantity}</Text>
                        <Text>Price: KSH {product.price || 0}</Text>
                        <Text style={styles.itemTotal}>
                          Total: KSH {(product.price || 0) * cartItem.quantity}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.totalContainer}>
            <Text style={styles.totalText}>Total: KSH {calculateTotal()}</Text>
            <TouchableOpacity style={styles.checkoutButton} onPress={openCheckoutModal}>
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Checkout Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={closeCheckoutModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={closeCheckoutModal}>
              <FontAwesome name="close" size={24} color="#333" />
            </TouchableOpacity>

            {paymentSuccess ? (
              // --- Simplified: short and direct instructions ---
              <View style={styles.successContainer}>
                <FontAwesome name="info-circle" size={56} color="#1976d2" />
                <Text style={styles.successTitle}>Finish payment via M-Pesa</Text>
                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={closeCheckoutModal}>
                    <Text style={styles.secondaryButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // --- unchanged checkout form / summary ---
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalTitle}>Checkout</Text>

                {/* Order Summary Table */}
                <View style={styles.summaryTable}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderCell}>Image</Text>
                    <Text style={styles.tableHeaderCell}>Product</Text>
                    <Text style={styles.tableHeaderCell}>Qty</Text>
                    <Text style={styles.tableHeaderCell}>Price</Text>
                    <Text style={styles.tableHeaderCell}>Total</Text>
                  </View>
                  {Object.entries(cartItems).map(([productId, cartItem]) => {
                    const product = getProductById(productId);
                    return (
                      <View style={styles.tableRow} key={productId}>
                        <Image
                          source={{
                            uri:
                              product.productimages?.[0]?.imageUrl ||
                              product.imageUrl ||
                              'https://via.placeholder.com/150',
                          }}
                          style={styles.tableImage}
                        />
                        <Text style={styles.tableCell} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={styles.tableCell}>{cartItem.quantity}</Text>
                        <Text style={styles.tableCell}>{product.price}</Text>
                        <Text style={styles.tableCell}>
                          {(product.price || 0) * cartItem.quantity}
                        </Text>
                      </View>
                    );
                  })}
                  <View style={styles.tableTotalRow}>
                    <Text style={styles.tableTotalLabel}>TOTAL</Text>
                    <Text style={styles.tableTotalValue}>KSH {calculateTotal()}</Text>
                  </View>
                </View>

                {/* Payment Form */}
                <Text style={styles.inputLabel}>M-Pesa Payment Number</Text>
                <TextInput
                  style={[styles.input, mpesaError ? { borderColor: 'red' } : null]}
                  placeholder="e.g., 254712345678"
                  value={mpesaNumber}
                  onChangeText={handleMpesaChange}
                  keyboardType="phone-pad"
                  maxLength={12}
                />
                {mpesaError ? <Text style={styles.errorText}>{mpesaError}</Text> : null}

                <Text style={styles.inputLabel}>ID/Passport Number (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., P123456789A"
                  value={buyerPin}
                  onChangeText={setBuyerPin}
                />

                {/* Delivery Location */}
                <View style={styles.locationContainer}>
                  <Text style={styles.locationLabel}>Delivery Location:</Text>
                  <Text style={styles.locationText}>
                    {location
                      ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                      : 'Not set'}
                  </Text>
                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={getCurrentLocation}
                    disabled={locationLoading}
                  >
                    {locationLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.locationButtonText}>
                        {location ? 'Update Location' : 'Get Location'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.payButton, (loading || mpesaError) && { opacity: 0.6 }]}
                  onPress={submitOrder}
                  disabled={loading || !!mpesaError}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.payButtonText}>Complete Order</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Processing Overlay */}
      <Modal visible={loading} transparent>
        <View style={styles.backdrop}>
          <ActivityIndicator size="large" color="#5a2428" />
          <Text style={styles.backdropText}>Processing order...</Text>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('./')}>
          <FontAwesome name="home" size={24} color="black" />
          <Text>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('./Package')}>
          <FontAwesome name="ticket" size={24} color="black" />
          <Text>My Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('./Profile')}>
          <FontAwesome name="user" size={24} color="black" />
          <Text>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1', paddingHorizontal: 15, paddingTop: 30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cartTitle: { fontSize: 24, fontWeight: 'bold' },
  emptyCartContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCartText: { fontSize: 18, color: '#888', marginVertical: 20 },
  continueShopping: { backgroundColor: '#5a2428', padding: 10, borderRadius: 5 },
  continueShoppingText: { color: '#fff', fontWeight: 'bold' },
  cartItem: { backgroundColor: 'white', marginBottom: 10, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  cartItemRow: { flexDirection: 'row', alignItems: 'center' },
  cartItemImage: { width: 60, height: 60, borderRadius: 5, marginRight: 10 },
  cartItemDetails: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  itemDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  itemTotal: { fontWeight: 'bold' },
  totalContainer: { marginTop: 20, padding: 15, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  totalText: { fontSize: 18, fontWeight: 'bold', textAlign: 'right', marginBottom: 15 },
  checkoutButton: { backgroundColor: '#5a2428', padding: 15, borderRadius: 5, alignItems: 'center' },
  checkoutButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: '90%', backgroundColor: '#FFF8E1', borderRadius: 10, padding: 20 },
  modalScroll: { maxHeight: '100%' },
  closeButton: { position: 'absolute', top: 10, right: 10, padding: 5 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  summaryTable: { marginBottom: 20, borderWidth: 1, borderColor: '#ddd', borderRadius: 5, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f0f0f0', padding: 10, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  tableHeaderCell: { flex: 1, fontWeight: 'bold', textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  tableCell: { flex: 1, textAlign: 'center' },
  tableImage: { width: 40, height: 40, borderRadius: 3 },
  tableTotalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#f9f9f9' },
  tableTotalLabel: { fontSize: 16, fontWeight: 'bold' },
  tableTotalValue: { fontSize: 16, fontWeight: 'bold', color: '#5a2428' },
  inputLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 5, padding: 12, marginBottom: 15 },
  locationContainer: { marginBottom: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 5, padding: 12 },
  locationLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  locationText: { marginBottom: 10 },
  locationButton: { backgroundColor: '#5a2428', padding: 10, borderRadius: 5, alignItems: 'center' },
  locationButtonText: { color: 'white' },
  payButton: { backgroundColor: '#5a2428', padding: 15, borderRadius: 5, alignItems: 'center' },
  payButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  backdropText: { color: 'white', marginTop: 10 },

  // --- simplified success modal styles ---
  successContainer: { alignItems: 'center', padding: 10 },
  successTitle: { fontSize: 18, fontWeight: '700', color: '#222', marginTop: 12, textAlign: 'center' },
  simpleLine: { marginTop: 8, fontSize: 15, color: '#333', textAlign: 'center' },

  btnRow: { flexDirection: 'row', marginTop: 16, justifyContent: 'center', gap: 12 },
  confirmButton: { backgroundColor: '#1976d2', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, marginRight: 8 },
  confirmButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { backgroundColor: '#eee', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8 },
  secondaryButtonText: { color: '#333' },

  bottomNavigation: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: 50, borderTopWidth: 1, borderTopColor: '#ccc', backgroundColor: '#FFF8E1' },
  navItem: { alignItems: 'center' },

  // new inline error
  errorText: { color: 'red', marginTop: 6, fontSize: 13 },
});

export default Checkout;
