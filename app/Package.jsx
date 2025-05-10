import React, { useState, useEffect } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  ActivityIndicator,
  ScrollView,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { BASEURL } from '../constants/const';
import { toast } from 'react-native-toast-notifications';

// Status Progress Tracker Component
const StatusProgressTracker = ({ status }) => {
  const statuses = ['pending', 'processing', 'delivering', 'delivered'];
  const currentIndex = statuses.indexOf(status);

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

// Order Detail Modal Component
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
          
          <Text style={styles.modalTitle}>Order #{order.orderId}</Text>
          
          {/* Status Tracker */}
          <StatusProgressTracker status={order.status} />
          
          <View style={styles.orderDetailsSection}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderInfoLabel}>Status:</Text>
              <Text style={styles.orderInfoValue}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Text>
            </View>
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderInfoLabel}>Total:</Text>
              <Text style={styles.orderInfoValue}>Ksh {order.total.toLocaleString()}</Text>
            </View>
          </View>
          
          <View style={styles.orderDetailsSection}>
            <Text style={styles.sectionTitle}>Items</Text>
            {order.orderItems.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  <Text style={styles.itemPrice}>Ksh {item.product.price} x {item.quantity}</Text>
                </View>
                <Text style={styles.itemTotal}>
                  Ksh {(item.product.price * item.quantity).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Order Item Component for the FlatList
const OrderItem = ({ order, onTrackOrder }) => {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderCardHeader}>
        <Text style={styles.orderNumber}>Order #{order.orderId}</Text>
        <View style={[
          styles.statusBadge, 
          {
            backgroundColor: 
              order.status === 'pending' ? '#FFA000' : 
              order.status === 'processing' ? '#2196F3' : 
              order.status === 'delivering' ? '#8BC34A' : '#4CAF50'
          }
        ]}>
          <Text style={styles.statusText}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <View style={styles.orderCardBody}>
        <Text style={styles.orderItemsText}>
          {order.orderItems.map(item => item.product.name).join(', ')}
        </Text>
        <Text style={styles.totalText}>Ksh {order.total.toLocaleString()}</Text>
      </View>
      
      <View style={styles.orderCardFooter}>
        {order.status === 'pending' && (
          <TouchableOpacity 
            style={styles.trackButton} 
            onPress={() => onTrackOrder(order)}
          >
            <Icon name="map-marker" size={14} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.trackButtonText}>Track Order</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.viewDetailsButton}>
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Backdrop Loader Component
const BackdropLoader = () => (
  <View style={styles.backdropContainer}>
    <View style={styles.loaderBox}>
      <ActivityIndicator size="large" color="#FFA000" />
      <Text style={styles.loadingText}>Loading orders...</Text>
    </View>
  </View>
);

// Main Component
const Package = () => {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch orders data
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${BASEURL}/orders`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        
        const data = await response.json();
        setOrders(data);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load orders. Please try again later.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleTrackOrder = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-left" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>My Orders</Text>

      {loading ? (
        <BackdropLoader />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.orderId.toString()}
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
          <Icon name="home" size={24} color="black" />
          <Text>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <Icon name="ticket" size={24} color="black" />
          <Text>My Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Profile')}>
          <Icon name="user" size={24} color="black" />
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
    backgroundColor: '#FFA000',
  },
  inactiveLine: {
    backgroundColor: '#E0E0E0',
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
    backgroundColor: '#FFA000',
  },
  inactiveCircle: {
    backgroundColor: '#E0E0E0',
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
    color: '#000',
    fontWeight: 'bold',
  },
  inactiveLabel: {
    color: '#757575',
  },
});

// Main Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFF8E1',
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
    color: '#757575',
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
    borderTopColor: '#e0e0e0',
    paddingTop: 10,
  },
  trackButton: {
    backgroundColor: '#FFA000',
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
    color: '#FFA000',
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
    color: '#757575',
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
    borderTopColor: '#e0e0e0',
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
    color: '#757575',
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
    color: '#757575',
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
    backgroundColor: '#FFF8E1',
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  activeNavItem: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFA000',
  },
});

export default Package;