
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
import { baseUrl } from '../constants/const.js';

/**
 * Checkout Screen
 * - Displays cart summary and total
 * - Opens a checkout modal to collect M‑Pesa number, location, and ID/passport
 * - Submits order to backend and handles success/failure
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
  const [mpesaNumber, setMpesaNumber] = useState(userPhone || '');
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
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch {
      Alert.alert('Location Error', 'Unable to get your current location. Try again.');
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

  /** Submit the order **/
  const submitOrder = async () => {
    if (!mpesaNumber) {
      Alert.alert('Missing Information', 'M‑Pesa payment number is required');
      return;
    }
    if (!location) {
      Alert.alert('Location Required', 'Please set your delivery location');
      return;
    }
    const orderItems = getOrderItems();
    if (orderItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty');
      return;
    }

    const orderData = {
      userId: userPhone,
      mpesaNumber,
      buyerPin: buyerPin || 'N/A',
      latitude: location.latitude,
      longitude: location.longitude,
      orderItems,
    };

    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: 'Invalid server response' };
      }

      if (response.ok) {
        setPaymentSuccess(true);
        dispatch(clearCart());
        setTimeout(() => {
          setPaymentSuccess(false);
          setShowModal(false);  // Close the modal explicitly
          router.replace('/home');
        }, 3000);
      } else {
        Alert.alert('Order Failed', data.message || 'Failed to process your order');
        setShowModal(false);  // Close the modal on failure
      }
    } catch {
      Alert.alert('Connection Error', 'Could not connect to server. Please try again.');
      setShowModal(false);  // Close the modal on connection error
    } finally {
      setLoading(false);
    }
  };

  /** Open checkout modal and fetch location if needed **/
  const openCheckoutModal = () => {
    setShowModal(true);
    if (!location) getCurrentLocation();
  };

  /** Close the checkout modal **/
  const closeCheckoutModal = () => {
    setShowModal(false);
    setPaymentSuccess(false);  // Reset payment success state
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
        onRequestClose={closeCheckoutModal}  // Add this to handle back button on Android
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={closeCheckoutModal}>
              <FontAwesome name="close" size={24} color="#333" />
            </TouchableOpacity>

            {paymentSuccess ? (
              <View style={styles.successContainer}>
                <FontAwesome name="check-circle" size={60} color="green" />
                <Text style={styles.successText}>Payment Successful!</Text>
                <Text style={styles.successSubText}>Your order has been placed</Text>
              </View>
            ) : (
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
                <Text style={styles.inputLabel}>M‑Pesa Payment Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 0712345678"
                  value={mpesaNumber}
                  onChangeText={setMpesaNumber}
                  keyboardType="phone-pad"
                />

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
                  style={styles.payButton}
                  onPress={submitOrder}
                  disabled={loading}
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
  successContainer: { alignItems: 'center', padding: 20 },
  successText: { fontSize: 24, fontWeight: 'bold', color: 'green', marginTop: 20 },
  successSubText: { fontSize: 16, textAlign: 'center', marginTop: 10 },
  bottomNavigation: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: 50, borderTopWidth: 1, borderTopColor: '#ccc', backgroundColor: '#FFF8E1' },
  navItem: { alignItems: 'center' },
});

export default Checkout;
