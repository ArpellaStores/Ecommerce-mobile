import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/slices/authSlice';
import axios from 'axios';
import { showMessage } from "react-native-flash-message";
import { editUserData } from '../services/editUserData';

const baseUrl = process.env.EXPO_PUBLIC_BASE_API_URL;

const ProfilePage = () => {
  const { user, isAuthenticated, error } = useSelector((state) => state.auth);
  const products = useSelector((state) => state.products.products);
  const dispatch = useDispatch();
  const router = useRouter();
  
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isApiLoading, setIsApiLoading] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsApiLoading(true);
      try {
        const response = await axios.get(`${baseUrl}/orders`);
        console.log('Fetched Orders:', response.data);
        const userOrders = response.data.filter(order => order.userId === user?.phone);
        console.log('User Orders:', userOrders);
        setOrders(userOrders);
      } catch (err) {
        showMessage({
          message: "Error",
          description: "Failed to fetch orders.",
          type: "danger",
        });
        console.error('Error fetching orders:', err);
      } finally {
        setIsApiLoading(false);
      }
    };
    
    if (user?.phone) {
      fetchOrders();
    }
  }, [user]);

  const handleEditClick = (field, currentValue) => {
    setEditingField(field);
    setNewValue(currentValue);
    setShowEditModal(true);
  };

  const handleSubmit = async () => {
    setIsApiLoading(true);
    try {
      await editUserData(user.phone, editingField, newValue);
      setShowEditModal(false);
      router.replace('/Profile');
    } catch (error) {
      showMessage({
        message: "Error",
        description: error.toString(),
        type: "danger",
      });
    } finally {
      setIsApiLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    router.replace('/Login');
  };

  const renderOrderIcon = (status) => {
    if (status.toLowerCase() === 'pending') return <Icon name="hourglass" size={24} color="blue" />;
    if (status.toLowerCase() === 'in transit') return <Icon name="truck" size={24} color="black" />;
    if (status.toLowerCase() === 'fulfilled') return <Icon name="check-circle" size={24} color="green" />;
    return null;
  };

  const handleOrderClick = (order) => {
    console.log('Selected Order:', order);
    setSelectedOrder(order);
  };

  const handleCloseOrderModal = () => {
    setSelectedOrder(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Personal Details</Text>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-left" size={24} color="#000" />
      </TouchableOpacity>
      
      {isAuthenticated ? (
        <>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>First Name:</Text>
            <View style={styles.fieldValue}>
              <Text style={styles.fieldText}>{user?.firstName || 'N/A'}</Text>
              <TouchableOpacity onPress={() => handleEditClick('firstName', user?.firstName)}>
                <Icon name="pencil" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Last Name:</Text>
            <View style={styles.fieldValue}>
              <Text style={styles.fieldText}>{user?.lastName || 'N/A'}</Text>
              <TouchableOpacity onPress={() => handleEditClick('lastName', user?.lastName)}>
                <Icon name="pencil" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Email:</Text>
            <View style={styles.fieldValue}>
              <Text style={styles.fieldText}>{user?.email || 'N/A'}</Text>
              <TouchableOpacity onPress={() => handleEditClick('email', user?.email)}>
                <Icon name="pencil" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Phone:</Text>
            <View style={styles.fieldValue}>
              <Text style={styles.fieldText}>{user?.phone || 'N/A'}</Text>
              <TouchableOpacity onPress={() => handleEditClick('PhoneNumber', user?.phone)}>
                <Icon name="pencil" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Password:</Text>
            <View style={styles.fieldValue}>
              <Text style={styles.fieldText}>**********</Text>
              <TouchableOpacity onPress={() => handleEditClick('password', '')}>
                <Icon name="pencil" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.centeredText}>No user data available. Please log in.</Text>
      )}
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Order History</Text>
      
      {orders.length === 0 ? (
        <Text style={styles.centeredText}>No orders found.</Text>
      ) : (
        orders.map((order) => (
          <TouchableOpacity 
            key={order?.orderid || Math.random()} 
            style={styles.orderRow}
            onPress={() => handleOrderClick(order)}
          >
            <View style={styles.orderInfo}>
              <Text style={styles.orderText}>
                ORDER {order?.orderid ? order.orderid.toUpperCase() : 'N/A'}
              </Text>
              <Text>{order.status || 'N/A'}</Text>
            </View>
            <View style={styles.orderActions}>
              <Text style={styles.viewLink}>View Details</Text>
              <View style={styles.statusIcon}>{renderOrderIcon(order.status)}</View>
            </View>
          </TouchableOpacity>
        ))
      )}
      
      {user?.role !== 'Customer' && (
        <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/control')}>
          <Text style={styles.adminButtonText}>Admin Panel</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <FontAwesome name="home" size={24} color="black" />
          <Text>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/Package')}>
          <FontAwesome name="ticket" size={24} color="black" />
          <Text>My Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/Profile')}>
          <FontAwesome name="user" size={24} color="black" />
          <Text>Profile</Text>
        </TouchableOpacity>
      </View>
      
      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editing {editingField}</Text>
            
            {editingField === 'PasswordHash' ? (
              <>
                <TouchableOpacity style={styles.otpButton}>
                  <Text style={styles.otpButtonText}>Request OTP</Text>
                </TouchableOpacity>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  secureTextEntry
                  onChangeText={setNewValue}
                />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>New {editingField}</Text>
                <TextInput
                  style={styles.input}
                  value={newValue}
                  onChangeText={setNewValue}
                />
              </>
            )}
            
            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]} 
                onPress={handleSubmit}
              >
                <Text style={styles.modalButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Order Details Modal */}
      <Modal
        visible={!!selectedOrder}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseOrderModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Order Details - ORDER {selectedOrder?.orderid ? selectedOrder.orderid.toUpperCase() : 'N/A'}
            </Text>
            
            <ScrollView style={styles.orderItemsContainer}>
              {selectedOrder &&
              Array.isArray(selectedOrder.orderItems) &&
              selectedOrder.orderItems.length > 0 ? (
                selectedOrder.orderItems.map((item, index) => {
                  const product = products.find((prod) => prod.id === item.productId);
                  return (
                    <View key={index} style={styles.orderItemRow}>
                      <View style={styles.productImageContainer}>
                        {product?.productImage ? (
                          <Image
                            source={{ uri: product.productImage }}
                            style={styles.productImage}
                          />
                        ) : (
                          <View style={styles.placeholderImage}></View>
                        )}
                      </View>
                      <View style={styles.productDetails}>
                        <Text style={styles.productName}>{product?.name || 'Unnamed Product'}</Text>
                        <Text>
                          Price: KSH {product?.price ? parseFloat(product.price).toFixed(2) : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.quantityContainer}>
                        <Text>Qty: {item.quantity}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.centeredText}>No products found in this order.</Text>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleCloseOrderModal}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Loading Modal */}
      {isApiLoading && (
        <Modal
          visible={true}
          transparent={true}
          animationType="none"
        >
          <View style={styles.loadingModalContainer}>
            <View style={styles.loadingModalContent}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loadingText}>Fetching your orders...</Text>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 20, left: 16,
    zIndex: 1
  },
  container: {
    padding: 16,
    backgroundColor: '#FFF8E1',
    flexGrow: 1,
    paddingBottom: 60 // Space for bottom navigation
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    alignItems: 'center'
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 0.4
  },
  fieldValue: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.6,
    justifyContent: 'space-between'
  },
  fieldText: {
    fontSize: 16,
    marginRight: 8
  },
  centeredText: {
    textAlign: 'center',
    marginVertical: 10
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 10
  },
  logoutButton: {
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  adminButton: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20
  },
  adminButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  orderInfo: {
    flex: 1
  },
  orderText: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  orderActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusIcon: {
    marginLeft: 8,
    paddingHorizontal: 15,
  },
  viewLink: {
    color: 'blue',
    textDecorationLine: 'underline'
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#FFF8E1',
    paddingBottom: 8
  },
  navItem: {
    alignItems: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 5
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    marginLeft: 10
  },
  cancelButton: {
    backgroundColor: '#ccc'
  },
  submitButton: {
    backgroundColor: '#007bff'
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  otpButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    alignItems: 'center'
  },
  otpButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  // Order modal styles
  orderItemsContainer: {
    maxHeight: 400
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  productImageContainer: {
    width: 80,
    marginRight: 10
  },
  productImage: {
    width: 80,
    height: 80,
    resizeMode: 'cover'
  },
  placeholderImage: {
    width: 80,
    height: 80,
    backgroundColor: '#ccc'
  },
  productDetails: {
    flex: 1
  },
  productName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5
  },
  quantityContainer: {
    width: 60,
    alignItems: 'center'
  },
  closeButton: {
    backgroundColor: '#6c757d',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 15
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  // Loading modal
  loadingModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingModalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16
  }
});

export default ProfilePage;