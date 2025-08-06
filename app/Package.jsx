/**
 * Package Component - Order Management and Tracking
 * 
 * This component handles displaying user orders, their status, and provides 
 * functionality for viewing order details and tracking.
 * 
 * Features:
 * - Fetches and displays user orders filtered by user's phone number
 * - Order status visualization with interactive progress tracker
 * - Order details modal with item breakdown
 * - Bottom navigation for app-wide movement
 * 
 * @author YourName
 * @version 1.0.1
 */

import React, { useState, useEffect } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { baseUrl } from '../constants/const';
import { toast } from 'react-native-toast-notifications';

// Constants for app-wide use
const THEME_COLORS = {
  primary: '#D67D00', // Darker orange
  secondary: '#FFF8E1',
  border: '#E0E0E0',
  text: {
    primary: '#000000',
    secondary: '#757575'
  },
  status: {
    pending: '#D67D00',    // Darker orange
    processing: '#2196F3', // Blue
    delivering: '#8BC34A',  // Light green
    delivered: '#4CAF50'    // Green
  }
};

// Currently logged in user (should be fetched from a global state manager in real app)
const CURRENT_USER = '0768212567'; // Typically would come from auth context/store

/**
 * Status Progress Tracker Component
 * Visual indicator showing the current order status in the fulfillment process
 * 
 * @param {String} status - Current status of the order
 */
const StatusProgressTracker = ({ status }) => {
  // Convert status to lowercase for consistent comparison
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
              {/* Connect line between circles */}
              {index > 0 && (
                <View 
                  style={[
                    trackerStyles.line, 
                    isActive ? trackerStyles.activeLine : trackerStyles.inactiveLine
                  ]}
                />
              )}
              
              {/* Status Circle */}
              <View 
                style={[
                  trackerStyles.circle, 
                  isActive ? trackerStyles.activeCircle : trackerStyles.inactiveCircle
                ]}
              >
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
      
      {/* Status Labels */}
      <View style={trackerStyles.labelsContainer}>
        {statuses.map((step, index) => (
          <View key={`label-${step}`} style={trackerStyles.labelWrapper}>
            <Text 
              style={[
                trackerStyles.label, 
                index <= currentIndex ? trackerStyles.activeLabel : trackerStyles.inactiveLabel
              ]}
            >
              {step.charAt(0).toUpperCase() + step.slice(1)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * Order Detail Modal Component
 * Displays comprehensive details for a selected order
 * 
 * @param {Boolean} visible - Controls modal visibility
 * @param {Object} order - Order data object to display
 * @param {Function} onClose - Handler function to close modal
 */
const OrderDetailModal = ({ visible, order, onClose }) => {
  if (!order) return null;
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="times" size={20} color="#000" />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>Order #{order.orderid || order.orderId}</Text>
          
          {/* Status Tracker */}
          <StatusProgressTracker status={order.status} />
          
          <View style={styles.orderDetailsSection}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderInfoLabel}>Status:</Text>
              <Text style={styles.orderInfoValue}>
                {order.status && (order.status.charAt(0).toUpperCase() + order.status.slice(1))}
              </Text>
            </View>
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderInfoLabel}>Total:</Text>
              <Text style={styles.orderInfoValue}>Ksh {order.total ? order.total.toLocaleString() : '0'}</Text>
            </View>
          </View>
          
          <View style={styles.orderDetailsSection}>
            <Text style={styles.sectionTitle}>Items</Text>
            {order.orderItems && order.orderItems.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product?.name || 'Unknown Product'}</Text>
                  <Text style={styles.itemPrice}>
                    Ksh {item.product?.price || 0} x {item.quantity || 1}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  Ksh {((item.product?.price || 0) * (item.quantity || 1)).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Order Item Component
 * Renders individual order card in the list
 * 
 * @param {Object} order - Order data object
 * @param {Function} onTrackOrder - Handler to open order details modal
 */
const OrderItem = ({ order, onTrackOrder }) => {
  // Safely access orderid/orderId
  const displayOrderId = order.orderid || order.orderId;
  
  // Convert status to lowercase for consistent comparison
  const statusLower = order.status ? order.status.toLowerCase() : 'pending';
  
  // Determine status color
  const statusColor = THEME_COLORS.status[statusLower] || THEME_COLORS.status.pending;
  
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
        <Text style={styles.orderItemsText}>
          {(order.orderItems && order.orderItems.length > 0) 
            ? order.orderItems.map(item => item.product?.name || 'Product').join(', ')
            : 'No items'
          }
        </Text>
        <Text style={styles.totalText}>Ksh {order.total ? order.total.toLocaleString() : '0'}</Text>
      </View>
      
      <View style={styles.orderCardFooter}>
        {statusLower === 'pending' && (
          <TouchableOpacity 
            style={styles.trackButton} 
            onPress={() => onTrackOrder(order)}
          >
            <Icon name="map-marker" size={14} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.trackButtonText}>Track Order</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.viewDetailsButton}
          onPress={() => onTrackOrder(order)}
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Loading Indicator Component
 * Displayed while fetching order data
 */
const BackdropLoader = () => (
  <View style={styles.backdropContainer}>
    <View style={styles.loaderBox}>
      <ActivityIndicator size="large" color={THEME_COLORS.primary} />
      <Text style={styles.loadingText}>Loading orders...</Text>
    </View>
  </View>
);

/**
 * Main Package Component
 * Handles orders list, navigation, and state management
 */
const Package = () => {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch orders data on component mount
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${baseUrl}/orders`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        
        const data = await response.json();
        
        // Filter orders for the current user only
        const userOrders = data.filter(order => 
          (order.userId === CURRENT_USER)
        );
        
        setOrders(userOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.show('Failed to load orders. Please try again later.', {
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  /**
   * Handler for opening the order details modal
   * @param {Object} order - Selected order to display details for
   */
  const handleTrackOrder = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  /**
   * Handler for closing the order details modal
   */
  const closeModal = () => {
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Back Navigation */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-left" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>My Orders</Text>

      {loading ? (
        <BackdropLoader />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => (item.orderid || item.orderId || Math.random().toString())}
          renderItem={({ item }) => (
            <OrderItem order={item} onTrackOrder={handleTrackOrder} />
          )}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="shopping-cart" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          }
        />
      )}

      {/* Order Tracking Modal */}
      <OrderDetailModal 
        visible={modalVisible} 
        order={selectedOrder} 
        onClose={closeModal} 
      />

      {/* Bottom Navigation */}
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

// Tracker Styles
const trackerStyles = StyleSheet.create({
  container: {
    paddingVertical: 30,
    width: '100%',
  },
  progressLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    paddingHorizontal: 15,
  },
  line: {
    position: 'absolute',
    height: 3,
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -1.5,
    zIndex: 1,
  },
  activeLine: {
    backgroundColor: THEME_COLORS.primary,
  },
  inactiveLine: {
    backgroundColor: THEME_COLORS.border,
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  activeCircle: {
    backgroundColor: THEME_COLORS.primary,
  },
  inactiveCircle: {
    backgroundColor: THEME_COLORS.border,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 8,
  },
  labelWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    textAlign: 'center',
  },
  activeLabel: {
    color: THEME_COLORS.text.primary,
    fontWeight: 'bold',
  },
  inactiveLabel: {
    color: THEME_COLORS.text.secondary,
  },
});

// Main Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: THEME_COLORS.secondary,
    paddingBottom: 60, // Space for bottom navigation
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
    marginTop: 40,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 16,
    zIndex: 1,
  },
  listContainer: {
    paddingBottom: 20,
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
    shadowRadius: 2.22,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderCardBody: {
    marginBottom: 10,
  },
  orderItemsText: {
    color: THEME_COLORS.text.secondary,
    marginBottom: 5,
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
    paddingTop: 10,
  },
  trackButton: {
    backgroundColor: THEME_COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  buttonIcon: {
    marginRight: 5,
  },
  trackButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  viewDetailsButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  viewDetailsText: {
    color: THEME_COLORS.primary,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: THEME_COLORS.text.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  orderDetailsSection: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
    paddingTop: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  orderInfoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  orderInfoLabel: {
    width: 80,
    color: THEME_COLORS.text.secondary,
  },
  orderInfoValue: {
    flex: 1,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: '500',
  },
  itemPrice: {
    color: THEME_COLORS.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  itemTotal: {
    fontWeight: 'bold',
  },
  backdropContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
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
    shadowRadius: 3.84,
  },
  loadingText: {
    marginTop: 10,
    color: '#333',
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
    backgroundColor: THEME_COLORS.secondary,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  activeNavItem: {
    borderBottomWidth: 2,
    borderBottomColor: THEME_COLORS.primary,
  },
});

export default Package;