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
import { clearCart, updateItemQuantity, removeItemFromCart } from '../redux/slices/cartSlice';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { baseUrl } from '../constants/const.js';

const Checkout = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const userPhone = useSelector((s) => s.auth.user?.phone);
  const cartItems = useSelector((s) => s.cart.items || {});
  const products = useSelector((s) => s.products.products || []);

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [mpesaNumber, setMpesaNumber] = useState(userPhone || '254');
  const [mpesaError, setMpesaError] = useState('');
  const [buyerPin, setBuyerPin] = useState('');
  const [location, setLocation] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

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

  const getProductById = (id) =>
    products.find((p) => p.id === parseInt(id, 10)) || {};

  const buildFusedItems = () =>
    Object.entries(cartItems).map(([id, item]) => {
      const product = getProductById(id);
      return { ...product, quantity: item.quantity, id: product.id ?? Number(id) };
    });

  const buildOrderItems = (fusedItems) =>
    fusedItems.map((i) => {
      const qty = Number(i.quantity || 0);
      const basePrice = parseFloat(i.price || 0);
      const discountThreshold = parseFloat(i.discountQuantity ?? Infinity);
      const discounted = i.priceAfterDiscount != null ? parseFloat(i.priceAfterDiscount) : null;
      const unitPrice = discounted !== null && qty >= discountThreshold ? discounted : basePrice;
      const isDiscounted = discounted !== null && qty >= discountThreshold;
      return {
        productId: Number(i.id),
        quantity: qty,
        priceType: isDiscounted ? 'Discounted' : 'Retail',
        unitPrice: Number(unitPrice),
      };
    });

  const calculateTotal = () => {
    const fused = buildFusedItems();
    return fused.reduce((acc, item) => {
      const qty = Number(item.quantity || 0);
      const basePrice = parseFloat(item.price || 0);
      const discountThreshold = parseFloat(item.discountQuantity ?? Infinity);
      const discounted = item.priceAfterDiscount != null ? parseFloat(item.priceAfterDiscount) : null;
      const unitPrice = discounted !== null && qty >= discountThreshold ? discounted : basePrice;
      return acc + unitPrice * qty;
    }, 0);
  };

  const normalizeMpesaInput = (raw) => {
    if (!raw) return '';
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = '254' + digits.slice(1);
    if (!digits.startsWith('254')) digits = '254' + digits;
    if (digits.length > 12) digits = digits.slice(0, 12);
    return digits;
  };

  const isValidSafaricomMpesa = (normalized) => {
    if (!normalized) return false;
    const re = /^254\d{9}$/;
    return re.test(normalized);
  };

  const handleMpesaChange = (text) => {
    const normalized = normalizeMpesaInput(text);
    setMpesaNumber(normalized);

    if (!normalized || normalized.length < 12) {
      setMpesaError('Enter M-Pesa number in format 254XXXXXXXX (no +).');
      return;
    }
    if (!isValidSafaricomMpesa(normalized)) {
      setMpesaError('Number must be a Safaricom mobile (starts with 254) and 12 digits long and dont include " + ".');
      return;
    }
    setMpesaError('');
  };

  const submitOrder = async () => {
    if (!mpesaNumber) {
      Alert.alert('Missing Information', 'M-Pesa payment number is required');
      return;
    }

    if (!isValidSafaricomMpesa(mpesaNumber)) {
      Alert.alert('Invalid M-Pesa Number', 'Enter a valid Safaricom M-Pesa number in format 2547XXXXXXXX (no +)');
      return;
    }

    const fusedItems = buildFusedItems();
    const orderItems = buildOrderItems(fusedItems);

    if (orderItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty');
      return;
    }

    setLoading(true);

    try {
      let coords = location;
      if (!coords) {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            maximumAge: 10000,
            timeout: 5000,
          });
          coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        } catch {
          coords = { latitude: -1.28333, longitude: 36.81667 };
        }
      }

      const payload = {
        userId: userPhone ?? null,
        phoneNumber: String(mpesaNumber),
        orderPaymentType: 'Mpesa',
        buyerPin: buyerPin || 'N/A',
        latitude: Number(coords.latitude),
        longitude: Number(coords.longitude),
        orderItems,
      };

      const response = await axios.post(`${baseUrl}/order`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000,
      });

      if (response.status >= 200 && response.status < 300) {
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

  const openCheckoutModal = () => {
    setShowModal(true);
    if (!location) getCurrentLocation();
    setMpesaNumber(normalizeMpesaInput(mpesaNumber));
    if (!isValidSafaricomMpesa(normalizeMpesaInput(mpesaNumber))) {
      setMpesaError('Enter M-Pesa number in format 2547XXXXXXXX (no +).');
    } else {
      setMpesaError('');
    }
  };

  const closeCheckoutModal = () => {
    setShowModal(false);
    setPaymentSuccess(false);
  };

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
    );
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setSelectedItem(null);
  };

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
              dispatch(removeItemFromCart({ productId: selectedItem.id }));
              closeEditModal();
            },
          },
        ]
      );
      return;
    }
    dispatch(updateItemQuantity({ productId: selectedItem.id, quantity: newQty }));
    setSelectedItem({ ...selectedItem, quantity: newQty });
  };

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
            dispatch(removeItemFromCart({ productId: selectedItem.id }));
            closeEditModal();
          },
        },
      ]
    );
  };

  const fusedForRender = buildFusedItems();
  const total = calculateTotal();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.cartTitle}>Shopping Cart</Text>
        {fusedForRender.length > 0 && (
          <TouchableOpacity onPress={handleClearCart}>
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
        <>
          <FlatList
            data={fusedForRender}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const qty = Number(item.quantity || 0);
              const basePrice = parseFloat(item.price || 0);
              const discountThreshold = parseFloat(item.discountQuantity ?? Infinity);
              const discounted = item.priceAfterDiscount != null ? parseFloat(item.priceAfterDiscount) : null;
              const unitPrice = discounted !== null && qty >= discountThreshold ? discounted : basePrice;
              return (
                <TouchableOpacity 
                  style={styles.cartItem}
                  onPress={() => openEditModal(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cartItemRow}>
                    <Image
                      source={{
                        uri:
                          item.productimages?.[0]?.imageUrl ||
                          item.imageUrl ||
                          'https://via.placeholder.com/150',
                      }}
                      style={styles.cartItemImage}
                    />
                    <View style={styles.cartItemDetails}>
                      <Text style={styles.itemName}>{item.name || 'Product'}</Text>
                      <View style={styles.itemDetails}>
                        <Text>Qty: {qty}</Text>
                        <Text>Price: KSH {unitPrice.toFixed(2)}</Text>
                        <Text style={styles.itemTotal}>
                          Total: KSH {(unitPrice * qty).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    <FontAwesome name="edit" size={20} color="#5a2428" />
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.totalContainer}>
            <Text style={styles.totalText}>Total: KSH {total.toFixed(2)}</Text>
            <TouchableOpacity style={styles.checkoutButton} onPress={openCheckoutModal}>
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Edit Item Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={closeEditModal}>
              <FontAwesome name="close" size={24} color="#333" />
            </TouchableOpacity>

            {selectedItem && (
              <>
                <Text style={styles.editModalTitle}>Edit Item</Text>
                
                <Image
                  source={{
                    uri:
                      selectedItem.productimages?.[0]?.imageUrl ||
                      selectedItem.imageUrl ||
                      'https://via.placeholder.com/150',
                  }}
                  style={styles.editItemImage}
                />

                <Text style={styles.editItemName}>{selectedItem.name || 'Product'}</Text>

                <View style={styles.quantityContainer}>
                  <Text style={styles.quantityLabel}>Quantity:</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => handleUpdateQuantity(selectedItem.quantity - 1)}
                    >
                      <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityValue}>{selectedItem.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => handleUpdateQuantity(selectedItem.quantity + 1)}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.removeButton} onPress={handleRemoveItem}>
                  <FontAwesome name="trash" size={16} color="#fff" />
                  <Text style={styles.removeButtonText}>Remove from Cart</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.doneButton} onPress={closeEditModal}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

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
              <View style={styles.successContainer}>
                <FontAwesome name="check-circle" size={56} color="#4caf50" />
                <Text style={styles.successTitle}>Payment Request Sent!</Text>
                <Text style={styles.successMessage}>
                  Check your phone for the M-Pesa prompt and complete the payment.
                </Text>
                <Text style={styles.successNote}>
                  Orders will be automatically created when payment is received on our end.
                </Text>
                <TouchableOpacity style={styles.secondaryButton} onPress={closeCheckoutModal}>
                  <Text style={styles.secondaryButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalTitle}>Checkout</Text>

                <View style={styles.summaryTable}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderCell}>Image</Text>
                    <Text style={styles.tableHeaderCell}>Product</Text>
                    <Text style={styles.tableHeaderCell}>Qty</Text>
                    <Text style={styles.tableHeaderCell}>Unit</Text>
                    <Text style={styles.tableHeaderCell}>Total</Text>
                  </View>

                  {fusedForRender.map((item) => {
                    const qty = Number(item.quantity || 0);
                    const basePrice = parseFloat(item.price || 0);
                    const discountThreshold = parseFloat(item.discountQuantity ?? Infinity);
                    const discounted = item.priceAfterDiscount != null ? parseFloat(item.priceAfterDiscount) : null;
                    const unit = discounted !== null && qty >= discountThreshold ? discounted : basePrice;
                    return (
                      <View style={styles.tableRow} key={String(item.id)}>
                        <Image
                          source={{
                            uri:
                              item.productimages?.[0]?.imageUrl ||
                              item.imageUrl ||
                              'https://via.placeholder.com/150',
                          }}
                          style={styles.tableImage}
                        />
                        <Text style={styles.tableCell} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.tableCell}>{qty}</Text>
                        <Text style={styles.tableCell}>KSH {unit.toFixed(2)}</Text>
                        <Text style={styles.tableCell}>KSH {(unit * qty).toFixed(2)}</Text>
                      </View>
                    );
                  })}

                  <View style={styles.tableTotalRow}>
                    <Text style={styles.tableTotalLabel}>TOTAL</Text>
                    <Text style={styles.tableTotalValue}>KSH {total.toFixed(2)}</Text>
                  </View>
                </View>

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

                <View style={styles.locationContainer}>
                  <Text style={styles.locationLabel}>Delivery Location:</Text>
                  <Text style={styles.locationText}>
                    {location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Not set'}
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

      <Modal visible={loading} transparent>
        <View style={styles.backdrop}>
          <ActivityIndicator size="large" color="#5a2428" />
          <Text style={styles.backdropText}>Processing order...</Text>
        </View>
      </Modal>

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
  clearCartText: { color: '#d32f2f', fontSize: 14, fontWeight: 'bold' },
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
  editModalContent: { width: '85%', backgroundColor: '#FFF8E1', borderRadius: 10, padding: 20 },
  modalScroll: { maxHeight: '100%' },
  closeButton: { position: 'absolute', top: 10, right: 10, padding: 5, zIndex: 10 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  editModalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, marginTop: 10 },
  editItemImage: { width: 120, height: 120, borderRadius: 8, alignSelf: 'center', marginBottom: 15 },
  editItemName: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  quantityContainer: { marginBottom: 20 },
  quantityLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  quantityControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  quantityButton: { width: 50, height: 50, backgroundColor: '#5a2428', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginHorizontal: 15 },
  quantityButtonText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  quantityValue: { fontSize: 20, fontWeight: 'bold', minWidth: 40, textAlign: 'center' },
  removeButton: { flexDirection: 'row', backgroundColor: '#d32f2f', padding: 15, borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  removeButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  doneButton: { backgroundColor: '#5a2428', padding: 15, borderRadius: 5, alignItems: 'center' },
  doneButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  backdropText: { color: 'white', marginTop: 10 },
  successContainer: { alignItems: 'center', padding: 20 },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: '#222', marginTop: 15, marginBottom: 10, textAlign: 'center' },
  successMessage: { fontSize: 15, color: '#333', textAlign: 'center', marginBottom: 15, lineHeight: 22 },
  successNote: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20, fontStyle: 'italic', lineHeight: 20 },
  secondaryButton: { backgroundColor: '#5a2428', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8, marginTop: 10 },
  secondaryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  bottomNavigation: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: 50, borderTopWidth: 1, borderTopColor: '#ccc', backgroundColor: '#FFF8E1' },
  navItem: { alignItems: 'center' },
  errorText: { color: 'red', marginTop: -10, marginBottom: 10, fontSize: 13 },
});

export default Checkout;