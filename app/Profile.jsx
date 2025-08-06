// screens/ProfilePage.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useRouter, usePathname } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { logout } from '../redux/slices/authSlice';
import { clearCredentials, exitApp } from '../services/Auth';
import { baseUrl } from '../constants/const';

const ProfilePage = () => {
  const router = useRouter();
  const pathname = usePathname(); // current route path
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  const products = useSelector((s) => s.products.products);

  const [autoEnabled, setAutoEnabled] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Load rememberMe flag
  useEffect(() => {
    (async () => {
      const rem = await SecureStore.getItemAsync('rememberMe');
      setAutoEnabled(rem === 'true');
    })();
  }, []);

  // Fetch order history
  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const { data } = await axios.get(`${baseUrl}/orders`);
        const filtered = data.filter(o =>
          String(o.userId) === String(user.id || user.phone)
        );
        setOrders(filtered);
      } catch (e) {
        console.error('Fetch orders error', e);
      } finally {
        setLoadingOrders(false);
      }
    };
    if (isAuthenticated) fetchOrders();
  }, [user, isAuthenticated]);

  // Toggle auto‑login
  const onToggleAuto = async (value) => {
    setAutoEnabled(value);
    if (!value) {
      await clearCredentials();
    } else {
      await SecureStore.setItemAsync('rememberMe', 'true');
    }
  };

  // Logout & exit
  const onLogout = async () => {
    await clearCredentials();
    dispatch(logout());
    exitApp();
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => setSelectedOrder(item)}
    >
      <View style={styles.orderCardHeader}>
        <Text style={styles.orderId}>Order #{item.orderid.toUpperCase()}</Text>
        <Text style={styles.orderDate}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
      <View style={styles.orderCardBody}>
        <Text>
          Status:{' '}
          <Text style={styles.orderStatus}>{item.status || 'N/A'}</Text>
        </Text>
        <FontAwesome
          name={
            item.status === 'fulfilled'
              ? 'check-circle'
              : item.status === 'in transit'
              ? 'truck'
              : 'hourglass'
          }
          size={20}
          color="#4B2C20"
        />
      </View>
    </TouchableOpacity>
  );

  // Helper to render nav item
  const NavItem = ({ route, icon, label }) => {
    const isActive = pathname === route;
    return (
      <TouchableOpacity
        disabled={isActive}
        onPress={() => !isActive && router.replace(route)}
        style={styles.navItem}
      >
        <FontAwesome
          name={icon}
          size={24}
          color={isActive ? 'blue' : '#000'}
        />
        <Text style={[styles.navLabel, isActive && { color: 'blue' }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Personal Details */}
        <Text style={styles.header}>Personal Details</Text>
        {isAuthenticated ? (
          <>
            {['firstName','lastName','email','phone'].map(field => (
              <View key={field} style={styles.row}>
                <Text style={styles.label}>
                  {field === 'phone' ? 'Phone:' :
                   field === 'email' ? 'Email:' :
                   `${field.replace(/Name/, ' Name')}:`}
                </Text>
                <View style={styles.valueRow}>
                  <Text style={styles.valueText}>{user[field] || 'N/A'}</Text>
                </View>
              </View>
            ))}
            <View style={styles.row}>
              <Text style={styles.label}>Enable Auto‑login:</Text>
              <Switch value={autoEnabled} onValueChange={onToggleAuto} />
            </View>
          </>
        ) : (
          <Text style={styles.centerText}>No user data. Please log in.</Text>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout & Exit</Text>
        </TouchableOpacity>

        {/* Order History */}
        <Text style={styles.sectionHeader}>Order History</Text>
        {loadingOrders ? (
          <ActivityIndicator size="large" color="#4B2C20" />
        ) : orders.length === 0 ? (
          <Text style={styles.centerText}>You have no past orders.</Text>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrderItem}
            keyExtractor={item => item.orderid.toString()}
            contentContainerStyle={styles.orderList}
          />
        )}
      </ScrollView>

      {/* Order Details Modal */}
      <Modal
        visible={!!selectedOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              Order Details — #{selectedOrder?.orderid.toUpperCase()}
            </Text>
            <ScrollView style={styles.modalContent}>
              {selectedOrder?.orderItems?.map((item, idx) => {
                const prod = products.find(
                  (p) => String(p.id) === String(item.productId)
                ) || {};

                return (
                  <View key={idx} style={styles.itemRow}>
                    {prod.productImage ? (
                      <Image
                        source={{ uri: prod.productImage }}
                        style={styles.itemImage}
                      />
                    ) : (
                      <View style={styles.placeholderImage} />
                    )}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>
                        {prod.name || 'Unnamed'}
                      </Text>
                      <Text>Qty: {item.quantity}</Text>
                      <Text>
                        Price:{' '}
                        {prod.price != null
                          ? `KSH ${prod.price.toFixed(2)}`
                          : 'N/A'}
                      </Text>
                    </View>
                  </View>
                );
              }) || (
                <Text style={styles.centerText}>
                  No items in this order.
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedOrder(null)}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full-width Bottom Navigation */}
     <View style={styles.navbar}>
  <TouchableOpacity style={styles.navItem} onPress={() => router.replace('./Home')}>
    <FontAwesome name="home" size={24}  />
    <Text>Home</Text>
  </TouchableOpacity>
  <TouchableOpacity style={styles.navItem} onPress={() => router.replace('./Package')}>
    <FontAwesome name="ticket" size={24} />
    <Text>My Orders</Text>
  </TouchableOpacity>
  <TouchableOpacity style={styles.navItem} onPress={() => router.replace('./Profile')}>
    <FontAwesome name="user" size={24} color="blue" />
    <Text>Profile</Text>
  </TouchableOpacity>
</View>

    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFF8E1',
    paddingBottom: 80, // space for nav
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  label: { fontSize: 16, fontWeight: '600' },
  valueRow: { flexDirection: 'row', alignItems: 'center' },
  valueText: { fontSize: 16 },
  logoutBtn: {
    backgroundColor: 'red',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 4,
  },
  orderList: { paddingBottom: 20 },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    elevation: 2,
  },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  orderId: { fontWeight: '600' },
  orderDate: { color: '#777' },
  orderCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    alignItems: 'center',
  },
  orderStatus: { fontWeight: '600', textTransform: 'capitalize' },
  centerText: { textAlign: 'center', marginVertical: 16, color: '#555' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    width: '85%',
    borderRadius: 10,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalContent: { marginBottom: 12 },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#ccc',
  },
  itemInfo: { flex: 1 },
  itemName: { fontWeight: '600', marginBottom: 4 },
  closeBtn: {
    backgroundColor: '#4B2C20',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  closeText: { color: '#fff', fontWeight: '600' },

  // Full-width Bottom Nav
 navbar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: 50, borderTopWidth: 1, borderTopColor: '#ccc', backgroundColor: '#FFF8E1' },
  navItem: { alignItems: 'center' },
});

export default ProfilePage;
