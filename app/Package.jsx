// src/screens/Package.js

import React, { useState, useEffect, useMemo } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Image,
  ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { baseUrl } from '../constants/const';
import { toast } from 'react-native-toast-notifications';
import { useSelector } from 'react-redux';

const THEME_COLORS = {
  primary: '#D67D00',
  secondary: '#FFF8E1',
  border: '#E0E0E0',
  text: { primary: '#000000', secondary: '#757575' },
  status: {
    pending: '#D67D00',
    processing: '#2196F3',
    delivering: '#8BC34A',
    delivered: '#4CAF50'
  }
};

const getOrderItems = (order) => {
  if (!order) return [];
  return (
    order.orderitem ||
    order.orderItems ||
    order.order_item ||
    order.items ||
    order.itemsOrdered ||
    []
  );
};

const computeUnitPriceForItem = (item, productFromRedux) => {
  const productFromOrder = item.product || null;
  const unitPrice = Number(
    productFromOrder?.price ??
    productFromOrder?.unitPrice ??
    productFromRedux?.price ??
    item.price ??
    0
  ) || 0;
  return unitPrice;
};

const computeItemSubtotal = (item, productFromRedux) => {
  const unitPrice = computeUnitPriceForItem(item, productFromRedux);
  const qty = Number(item.quantity || 0);
  return unitPrice * qty;
};

const computeOrderTotal = (order, lookupProductFromRedux) => {
  const items = getOrderItems(order);
  return items.reduce((acc, it) => {
    const productFromRedux = lookupProductFromRedux(it.productId);
    return acc + computeItemSubtotal(it, productFromRedux);
  }, 0);
};

const StatusProgressTracker = ({ status }) => {
  const statusLower = status ? status.toLowerCase() : 'pending';
  const statuses = ['pending', 'processing', 'delivering', 'delivered'];
  const currentIndex = statuses.indexOf(statusLower);

  return (
    <View style={trackerStyles.container}>
      <View style={trackerStyles.progressLine}>
        {statuses.map((step, index) => {
          const isActive = index <= currentIndex;
          return (
            <React.Fragment key={step}>
              {index > 0 && (
                <View style={[trackerStyles.line, isActive ? trackerStyles.activeLine : trackerStyles.inactiveLine]} />
              )}
              <View style={[trackerStyles.circle, isActive ? trackerStyles.activeCircle : trackerStyles.inactiveCircle]}>
                {isActive && (
                  <Icon
                    name={
                      step === 'pending' ? 'clock-o' :
                      step === 'processing' ? 'cogs' :
                      step === 'delivering' ? 'truck' : 'check'
                    }
                    size={14}
                    color="#fff"
                  />
                )}
              </View>
            </React.Fragment>
          );
        })}
      </View>

      <View style={trackerStyles.labelsContainer}>
        {['Pending','Processing','Delivering','Delivered'].map((label, idx) => (
          <View key={label} style={trackerStyles.labelWrapper}>
            <Text style={[trackerStyles.label, idx <= (['pending','processing','delivering','delivered'].indexOf((status || '').toLowerCase()) ) ? trackerStyles.activeLabel : trackerStyles.inactiveLabel]}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const OrderDetailModal = ({ visible, order, onClose, lookupProductFromRedux }) => {
  if (!order) return null;

  const items = getOrderItems(order);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="times" size={20} color="#000" />
          </TouchableOpacity>

          <Text style={styles.modalTitle}>
            Order Details – ORDER {String(order?.orderid || order?.orderId || '').toUpperCase()}
          </Text>

          <StatusProgressTracker status={order.status} />

          <View style={{ height: 12 }} />

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={true}>
            {items && items.length > 0 ? (
              <>
                {items.map((item, i) => {
                  const productFromOrder = item.product || null;
                  const productFromRedux = lookupProductFromRedux(item.productId);
                  const name = productFromOrder?.name || productFromRedux?.name || productFromOrder?.title || `Product ${item.productId || i + 1}`;
                  const unitPrice = computeUnitPriceForItem(item, productFromRedux);
                  const qty = Number(item.quantity || 0);
                  const subtotal = unitPrice * qty;
                  const imageUri = productFromRedux?.productImage || productFromOrder?.imageUrl || productFromOrder?.productImage || null;

                  return (
                    <View key={String(i)} style={styles.modalRow}>
                      <View style={styles.modalColImage}>
                        {imageUri ? (
                          <Image source={{ uri: imageUri }} style={styles.productThumb} resizeMode="cover" />
                        ) : (
                          <View style={styles.noImageBox}>
                            <Text style={{ fontSize: 12, color: '#666' }}>No image</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.modalColDetails}>
                        <Text style={styles.itemName}>{name}</Text>
                        <Text style={styles.itemMeta}>Price: KSH {unitPrice.toFixed(2)}</Text>
                        {item.productId ? <Text style={styles.itemSmall}>ID: {item.productId}</Text> : null}
                      </View>

                      <View style={styles.modalColQty}>
                        <Text style={styles.itemMeta}>Qty: {qty}</Text>
                        <Text style={styles.itemSubtotal}>Subtotal: KSH {subtotal.toFixed(2)}</Text>
                      </View>
                    </View>
                  );
                })}

                <View style={styles.hr} />

                <View style={styles.totalRow}>
                  <Text style={{ fontWeight: '700' }}>Order Total</Text>
                  <Text style={{ fontWeight: '700' }}>KSH {computeOrderTotal(order, lookupProductFromRedux).toFixed(2)}</Text>
                </View>

                <View style={{ marginTop: 8 }}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Status:</Text>
                    <Text style={styles.metaValue}>{order.status || '—'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Placed:</Text>
                    <Text style={styles.metaValue}>{order.createdAt ? new Date(order.createdAt).toLocaleString() : (order.date ? new Date(order.date).toLocaleString() : '—')}</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={{ paddingVertical: 20 }}>
                <Text style={{ textAlign: 'center', color: '#666' }}>No items.</Text>
              </View>
            )}
          </ScrollView>

          <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const OrderItem = ({ order, onTrackOrder, lookupProductFromRedux }) => {
  const displayOrderId = order.orderid || order.orderId || '';
  const statusLower = order.status ? order.status.toLowerCase() : 'pending';
  const statusColor = THEME_COLORS.status[statusLower] || THEME_COLORS.status.pending;

  const items = getOrderItems(order);
  const itemsText = items && items.length > 0
    ? items.map(item => {
        const productFromOrder = item.product || null;
        const productFromRedux = lookupProductFromRedux(item.productId);
        return productFromOrder?.name || productFromRedux?.name || 'Product';
      }).join(', ')
    : 'No items';

  const total = computeOrderTotal(order, lookupProductFromRedux);

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderCardHeader}>
        <Text style={styles.orderNumber}>Order #{displayOrderId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>
            {order.status && (order.status.charAt(0).toUpperCase() + order.status.slice(1))}
          </Text>
        </View>
      </View>

      <View style={styles.orderCardBody}>
        <Text style={styles.orderItemsText}>{itemsText}</Text>
        <Text style={styles.totalText}>Ksh {total ? Number(total).toLocaleString() : '0'}</Text>
      </View>

      <View style={styles.orderCardFooter}>
        {statusLower === 'pending' && (
          <TouchableOpacity style={styles.trackButton} onPress={() => onTrackOrder(order)}>
            <Icon name="map-marker" size={14} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.trackButtonText}>Track Order</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.viewDetailsButton} onPress={() => onTrackOrder(order)}>
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const BackdropLoader = () => (
  <View style={styles.backdropContainer}>
    <View style={styles.loaderBox}>
      <ActivityIndicator size="large" color={THEME_COLORS.primary} />
      <Text style={styles.loadingText}>Loading orders...</Text>
    </View>
  </View>
);

const Package = () => {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const user = useSelector(s => s.auth?.user || {});
  const productsById = useSelector(s => s.products?.productsById || {});
  const productsArray = useSelector(s => s.products?.products || []);

  const currentUserPhone = (user?.phone || user?.phoneNumber || user?.id || '').toString();

  const lookupProductFromRedux = useMemo(() => {
    return (productId) => {
      if (!productId) return null;
      if (productsById && productsById[productId]) return productsById[productId];
      const found = Object.values(productsById || {}).find(p =>
        String(p.id) === String(productId) || String(p._id) === String(productId) || String(p.productId) === String(productId)
      );
      if (found) return found;
      return (productsArray || []).find(p => String(p.id) === String(productId) || String(p._id) === String(productId) || String(p.productId) === String(productId)) || null;
    };
  }, [productsById, productsArray]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${baseUrl}/orders`);
        const data = response?.data;
        if (!Array.isArray(data)) {
          setOrders([]);
          setLoading(false);
          return;
        }

        const userOrders = data.filter(order => {
          const orderUserId = (order.userId || order.user || '').toString();
          return orderUserId && currentUserPhone && (orderUserId === currentUserPhone || orderUserId === String(user?.id));
        });

        setOrders(userOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.show && toast.show('Failed to load orders. Please try again later.', { type: 'error' });
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    if (!currentUserPhone) {
      setOrders([]);
      setLoading(false);
      return;
    }

    fetchOrders();
  }, [currentUserPhone, user]);

  const handleTrackOrder = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>My Orders</Text>
      </View>

      {/* Scrollable Content */}
      {loading ? (
        <BackdropLoader />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => (item.orderid || item.orderId || Math.random().toString())}
          renderItem={({ item }) => (
            <OrderItem order={item} onTrackOrder={handleTrackOrder} lookupProductFromRedux={lookupProductFromRedux} />
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="shopping-cart" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          }
        />
      )}

      <OrderDetailModal
        visible={modalVisible}
        order={selectedOrder}
        onClose={closeModal}
        lookupProductFromRedux={lookupProductFromRedux}
      />

      {/* Fixed Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./')}>
          <Icon name="home" size={24} color="#000" />
          <Text>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <Icon name="ticket" size={24} color="#000" />
          <Text>My Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Profile')}>
          <Icon name="user" size={24} color="#000" />
          <Text>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const trackerStyles = StyleSheet.create({
  container: { paddingVertical: 18, width: '100%' },
  progressLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative', paddingHorizontal: 8 },
  line: { position: 'absolute', height: 3, left: 24, right: 24, top: '50%', marginTop: -1.5, zIndex: 1 },
  activeLine: { backgroundColor: THEME_COLORS.primary },
  inactiveLine: { backgroundColor: THEME_COLORS.border },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  activeCircle: { backgroundColor: THEME_COLORS.primary },
  inactiveCircle: { backgroundColor: THEME_COLORS.border },
  labelsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 8 },
  labelWrapper: { flex: 1, alignItems: 'center' },
  label: { fontSize: 12, textAlign: 'center' },
  activeLabel: { color: THEME_COLORS.text.primary, fontWeight: 'bold' },
  inactiveLabel: { color: THEME_COLORS.text.secondary },
});

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: THEME_COLORS.secondary,
  },
  headerContainer: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: THEME_COLORS.secondary,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginVertical: 16, 
    marginTop: 20,
  },
  backButton: { 
    position: 'absolute', 
    top: 20, 
    left: 16, 
    zIndex: 1 
  },
  listContainer: { 
    paddingBottom: 80,
    paddingHorizontal: 16,
  },
  orderCard: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    padding: 15, 
    marginBottom: 15, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.22, 
    shadowRadius: 2.22 
  },
  orderCardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  orderNumber: { fontSize: 16, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  orderCardBody: { marginBottom: 10 },
  orderItemsText: { color: THEME_COLORS.text.secondary, marginBottom: 5 },
  totalText: { fontSize: 16, fontWeight: 'bold' },
  orderCardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    borderTopWidth: 1, 
    borderTopColor: THEME_COLORS.border, 
    paddingTop: 10 
  },
  trackButton: { 
    backgroundColor: THEME_COLORS.primary, 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    borderRadius: 4, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginRight: 10 
  },
  buttonIcon: { marginRight: 5 },
  trackButtonText: { color: '#fff', fontWeight: 'bold' },
  viewDetailsButton: { paddingHorizontal: 15, paddingVertical: 8 },
  viewDetailsText: { color: THEME_COLORS.primary, fontWeight: 'bold' },
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 60 
  },
  emptyText: { 
    marginTop: 10, 
    fontSize: 16, 
    color: THEME_COLORS.text.secondary 
  },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    width: '92%', 
    maxHeight: '86%', 
    padding: 16 
  },
  closeButton: { alignSelf: 'flex-end' },
  modalTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 12, 
    textAlign: 'center' 
  },
  modalRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12, 
    paddingVertical: 6, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f2f2f2' 
  },
  modalColImage: { 
    width: 80, 
    height: 80, 
    marginRight: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  productThumb: { 
    width: 80, 
    height: 80, 
    borderRadius: 6, 
    backgroundColor: '#eee' 
  },
  noImageBox: { 
    width: 80, 
    height: 80, 
    borderRadius: 6, 
    backgroundColor: '#eee', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalColDetails: { flex: 1, paddingRight: 8 },
  modalColQty: { width: 110, alignItems: 'flex-end' },
  itemName: { fontWeight: '700', marginBottom: 4 },
  itemMeta: { color: THEME_COLORS.text.secondary, fontSize: 13 },
  itemSmall: { color: '#999', fontSize: 12, marginTop: 4 },
  itemSubtotal: { fontWeight: '700', marginTop: 8 },
  hr: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  totalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 6 
  },
  metaRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 6 
  },
  metaLabel: { color: THEME_COLORS.text.secondary },
  metaValue: { fontWeight: '600' },
  modalCloseBtn: { 
    backgroundColor: THEME_COLORS.primary, 
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 6 
  },

  backdropContainer: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(255,255,255,0.8)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 999 
  },
  loaderBox: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 8, 
    alignItems: 'center', 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 3.84 
  },
  loadingText: { marginTop: 10, color: '#333' },

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
    backgroundColor: THEME_COLORS.secondary,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navItem: { 
    alignItems: 'center', 
    flex: 1, 
    paddingVertical: 8 
  },
  activeNavItem: { 
    borderBottomWidth: 2, 
    borderBottomColor: THEME_COLORS.primary 
  },
});

export default Package;