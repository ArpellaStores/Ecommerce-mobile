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

const Checkout = () => {
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [userId, setUserId] = useState('');
  const [buyerPin, setBuyerPin] = useState('');
  const [location, setLocation] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorLogs, setErrorLogs] = useState([]);
  
  const dispatch = useDispatch();
  const router = useRouter();
  
  const cartItems = useSelector((state) => state.cart?.items || {});
  const products = useSelector((state) => state.products?.products || []);
  
  // Add log functionality
  const logError = (message, data = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      message,
      data,
    };
    console.error(`[${timestamp}] ${message}`, data);
    setErrorLogs(prev => [...prev, logEntry]);
  };
  
  useEffect(() => {
    // Get location permission when component mounts
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          logError('Location permission denied');
          Alert.alert('Permission Denied', 'Location permission is required for delivery');
          return;
        }
      } catch (error) {
        logError('Error requesting location permission', error);
      }
    })();
  }, []);

  // Get current location
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        logError('Location permission denied during location fetch');
        Alert.alert('Permission Denied', 'Location permission is required for delivery');
        setLocationLoading(false);
        return;
      }
      
      logError('Fetching current location...', { status });
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      logError('Location fetched successfully', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      setLocationLoading(false);
    } catch (error) {
      logError('Error getting location', error);
      Alert.alert('Location Error', 'Failed to get your current location. Please try again.');
      setLocationLoading(false);
    }
  };

  // Prepare cart items for order
  const getOrderItems = () => {
    return Object.entries(cartItems).map(([id, item]) => ({
      productId: parseInt(id, 10),
      quantity: item.quantity,
    }));
  };

  // Get product details from product ID
  const getProductById = (productId) => {
    return products.find(product => product.id === parseInt(productId, 10)) || {};
  };

  // Calculate total price
  const calculateTotal = () => {
    return Object.entries(cartItems).reduce((total, [productId, item]) => {
      const product = getProductById(productId);
      return total + (product.price || 0) * item.quantity;
    }, 0);
  };

  // Submit order
  const submitOrder = async () => {
    if (!userId) {
      Alert.alert('Missing Information', 'Phone number is required');
      return;
    }
    
    if (!location) {
      Alert.alert('Location Required', 'Please get your current location for delivery');
      return;
    }
    
    const orderItems = getOrderItems();
    if (orderItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty');
      return;
    }
    
    const orderData = {
      userId,
      buyerPin: buyerPin || 'N/A', // Make buyerPin optional
      latitude: location.latitude,
      longitude: location.longitude,
      orderitems: orderItems
    };
    
    logError('Preparing to submit order', orderData);
    
    try {
      setLoading(true);
      logError('Submitting order to server');
      
      const response = await fetch('http://arpella-001.runasp.net/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      const responseText = await response.text();
      logError('Raw server response', { status: response.status, body: responseText });
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        logError('Error parsing response JSON', { error: e, responseText });
        data = { message: 'Invalid response from server' };
      }
      
      if (response.ok) {
        logError('Order submitted successfully', data);
        setPaymentSuccess(true);
        dispatch(clearCart());
        setTimeout(() => {
          setShowModal(false);
          setPaymentSuccess(false);
          router.push('./home');
        }, 3000);
      } else {
        logError('Server returned error', { status: response.status, data });
        Alert.alert(
          'Order Failed', 
          `${data.message || 'Failed to process your order'}. Please check the logs for details.`
        );
      }
    } catch (error) {
      logError('Network or parsing error', error);
      Alert.alert(
        'Connection Error', 
        'Could not connect to payment server. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const openCheckoutModal = () => {
    setShowModal(true);
    // Get location when opening checkout
    if (!location) {
      getCurrentLocation();
    }
  };

  const closeCheckoutModal = () => {
    setShowModal(false);
  };

  // Show error logs for debugging
  const showErrorLogs = () => {
    Alert.alert(
      'Debug Logs',
      errorLogs.length > 0 
        ? errorLogs.map(log => `[${log.timestamp}] ${log.message}`).join('\n\n')
        : 'No logs available',
      [{ text: 'Close' }],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      {/* Cart Summary */}
      <View style={styles.cartSummary}>
        <View style={styles.headerRow}>
          <Text style={styles.cartTitle}>Shopping Cart</Text>
          <TouchableOpacity onPress={showErrorLogs} style={styles.debugButton}>
            <FontAwesome name="bug" size={20} color="#5a2428" />
          </TouchableOpacity>
        </View>
        
        {Object.keys(cartItems).length === 0 ? (
          <View style={styles.emptyCartContainer}>
            <FontAwesome name="shopping-cart" size={50} color="#aaa" />
            <Text style={styles.emptyCartText}>Your cart is empty</Text>
            <TouchableOpacity 
              style={styles.continueShopping}
              onPress={() => router.push('./')}
            >
              <Text style={styles.continueShoppingText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={Object.entries(cartItems)}
              keyExtractor={([id]) => id}
              renderItem={({ item }) => {
                const [productId, cartItem] = item;
                const product = getProductById(productId);
                return (
                  <View style={styles.cartItem}>
                    <View style={styles.cartItemRow}>
                      <Image
                        source={{
                          uri: product.productimages?.[0]?.imageUrl || 
                               product.imageUrl || 
                               product.Image || 
                               'https://via.placeholder.com/150',
                        }}
                        style={styles.cartItemImage}
                        defaultSource={require('../assets/images/logo.jpeg')}
                      />
                      <View style={styles.cartItemDetails}>
                        <Text style={styles.itemName}>{product.name || 'Unknown Product'}</Text>
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
      </View>
      
      {/* Checkout Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
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
                    <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Image</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Product</Text>
                    <Text style={styles.tableHeaderCell}>Qty</Text>
                    <Text style={styles.tableHeaderCell}>Price</Text>
                    <Text style={styles.tableHeaderCell}>Total</Text>
                  </View>
                  
                  {Object.entries(cartItems).map(([productId, cartItem]) => {
                    const product = getProductById(productId);
                    return (
                      <View style={styles.tableRow} key={productId}>
                        <View style={[styles.tableCell, { flex: 0.8 }]}>
                          <Image
                            source={{
                              uri: product.productimages?.[0]?.imageUrl || 
                                   product.imageUrl || 
                                   product.Image || 
                                   'https://via.placeholder.com/150',
                            }}
                            style={styles.tableImage}
                            defaultSource={require('../assets/images/logo.jpeg')}
                          />
                        </View>
                        <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
                          {product.name || 'Unknown'}
                        </Text>
                        <Text style={styles.tableCell}>{cartItem.quantity}</Text>
                        <Text style={styles.tableCell}>{product.price || 0}</Text>
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
                
                <View style={styles.paymentSection}>
                  <Text style={styles.sectionTitle}>Payment Method</Text>
                  <View style={styles.paymentOptions}>
                    <TouchableOpacity
                      style={[
                        styles.paymentOption,
                        paymentMethod === 'mpesa' && styles.paymentOptionActive,
                      ]}
                      onPress={() => setPaymentMethod('mpesa')}
                    >
                      <Text 
                        style={[
                          styles.paymentOptionText,
                          paymentMethod === 'mpesa' && styles.paymentOptionTextActive,
                        ]}
                      >
                        M-Pesa
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.formSection}>
                  <Text style={styles.inputLabel}>Phone Number (required)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 0712345678"
                    value={userId}
                    onChangeText={setUserId}
                    keyboardType="phone-pad"
                  />
                  
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
                
                <TouchableOpacity onPress={showErrorLogs} style={styles.debugLogButton}>
                  <Text style={styles.debugLogButtonText}>Show Debug Logs</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Global Loading Spinner for location */}
      {locationLoading && (
        <View style={styles.backdrop}>
          <ActivityIndicator size="large" color="#5a2428" />
          <Text style={styles.backdropText}>Getting your location...</Text>
        </View>
      )}
      
      {/* Global Loading Spinner for order submission */}
      {loading && (
        <View style={styles.backdrop}>
          <ActivityIndicator size="large" color="#5a2428" />
          <Text style={styles.backdropText}>Processing payment...</Text>
        </View>
      )}
      
      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./')}>
          <FontAwesome name="home" size={24} color="black" />
          <Text>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Package')}>
          <FontAwesome name="ticket" size={24} color="black" />
          <Text>My Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Profile')}>
          <FontAwesome name="user" size={24} color="black" />
          <Text>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 15,
    paddingTop: 30,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  debugButton: {
    padding: 8,
  },
  cartSummary: {
    flex: 1,
  },
  cartTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 18,
    color: '#888',
    marginTop: 20,
    marginBottom: 20,
  },
  continueShopping: {
    backgroundColor: '#5a2428',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  continueShoppingText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cartItem: {
    backgroundColor: 'white',
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartItemImage: {
    width: 60,
    height: 60,
    borderRadius: 5,
    marginRight: 10,
  },
  cartItemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  itemTotal: {
    fontWeight: 'bold',
  },
  totalContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'right',
  },
  checkoutButton: {
    backgroundColor: '#5a2428',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 20,
    position: 'relative',
  },
  modalScroll: {
    maxHeight: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  summaryTable: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableHeaderCell: {
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    padding: 10,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableImage: {
    width: 40,
    height: 40,
    borderRadius: 3,
  },
  tableTotalRow: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f9f9f9',
    justifyContent: 'space-between',
  },
  tableTotalLabel: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  tableTotalValue: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#5a2428',
  },
  paymentSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  paymentOptions: {
    flexDirection: 'row',
  },
  paymentOption: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginRight: 10,
  },
  paymentOptionActive: {
    backgroundColor: '#5a2428',
  },
  paymentOptionText: {
    fontWeight: 'bold',
  },
  paymentOptionTextActive: {
    color: 'white',
  },
  formSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    marginBottom: 15,
  },
  locationContainer: {
    marginTop: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  locationText: {
    marginBottom: 10,
  },
  locationButton: {
    backgroundColor: '#5a2428',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  locationButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  payButton: {
    backgroundColor: '#5a2428',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  payButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backdropText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 50,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#FFF8E1',
  },
  navItem: {
    alignItems: 'center',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'green',
    marginTop: 20,
  },
  successSubText: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  debugLogButton: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 30,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    backgroundColor: '#f8f8f8',
  },
  debugLogButtonText: {
    color: '#666',
    fontSize: 14,
  },
});

export default Checkout;