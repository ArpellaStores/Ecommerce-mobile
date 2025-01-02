import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, Modal, Button, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import Toast from 'react-native-toast-notifications';
import { StripeProvider, CardField, useStripe } from '@stripe/stripe-react-native';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome'; // Import FontAwesome Icon

// Initialize Stripe with your publishable key
const stripePublishableKey = 'your-publishable-key-here';

const CheckoutForm = ({ onClose, finalAmount}) => {
  const stripe = useStripe();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'Card',
    });

    if (error) {
      Toast.show({ type: 'error', text1: error.message });
    } else {
      Toast.show({ type: 'success', text1: 'Payment successful!' });
      console.log('[PaymentMethod]', paymentMethod);
      onClose(); // Close the modal on successful payment
    }
    setIsLoading(false);
  };

  return (
    <View style={styles.modalContent}>
      <CardField
        postalCodeEnabled={true}
        placeholders={{ number: '4242 4242 4242 4242' }}
        cardStyle={styles.card}
        style={styles.cardField}
      />
      <Text style={styles.finalAmount}>Total Amount: ${finalAmount.toFixed(2)}</Text>
      <TouchableOpacity onPress={handleSubmit} style={styles.payButton} disabled={isLoading}>
        <Text style={styles.buttonText}>{isLoading ? 'Processing...' : 'Pay Now'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const Index = ({}) => {
  const router = useRouter();
  const cart = useSelector((state) => state.cart.items);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(''); 
  const [deliveryCost] = useState(10); // Fixed delivery cost

  const totalPrice = Object.values(cart).reduce((total, item) => {
    return total + item.Price * item.quantity;
  }, 0);

  const finalAmount = totalPrice + deliveryCost;

  const handleCheckout = (method) => {
    setSelectedPaymentMethod(method);
    setShowCheckoutModal(false);

    if (method === 'mpesa') {
      Toast.show({ type: 'success', text1: 'Proceeding with Mpesa payment.' });
    } else if (method === 'airtel') {
      Toast.show({ type: 'success', text1: 'Proceeding with Airtel Money payment.' });
    } else if (method === 'visa') {
      Toast.show({ type: 'success', text1: 'Proceeding with Visa/Mastercard payment.' });
    }
  };

  return (
    <StripeProvider publishableKey={stripePublishableKey}>
      <View style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>Shopping Cart</Text>

        {Object.keys(cart).length === 0 ? (
          <Text style={styles.emptyCart}>Your cart is empty.</Text>
        ) : (
          <>
            <FlatList
              data={Object.values(cart)}
              keyExtractor={(item, index) => `${item.Name}-${index}`}
              renderItem={({ item }) => (
                <View style={styles.cartItem}>
                  <View>
                    <Text style={styles.itemName}>{item.Name}</Text>
                    <Text>Price: ${item.Price}</Text>
                    <Text>Quantity: {item.quantity}</Text>
                  </View>
                  <Image source={{ uri: item.Image }} style={styles.itemImage} />
                </View>
              )}
            />

            <Text style={styles.summary}>Total Price: ${totalPrice.toFixed(2)}</Text>
            <Text style={styles.summary}>Delivery Cost: ${deliveryCost}</Text>
            <Text style={styles.summary}>Final Cost: ${finalAmount.toFixed(2)}</Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.back('./Home')}>
                <Text style={styles.buttonText}>Back to Shopping</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setShowCheckoutModal(true)}>
                <Text style={styles.buttonText}>Proceed to Checkout</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Payment Method Modal */}
        <Modal visible={showCheckoutModal} transparent={true} animationType="slide">
          <View style={styles.modalBackground}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Select Payment Method</Text>
              <TouchableOpacity style={styles.paymentButton} onPress={() => handleCheckout('mpesa')}>
                <Text style={styles.buttonText}>Pay via Mpesa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.paymentButton} onPress={() => handleCheckout('airtel')}>
                <Text style={styles.buttonText}>Pay via Airtel Money</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.paymentButton} onPress={() => handleCheckout('visa')}>
                <Text style={styles.buttonText}>Pay via Visa/Mastercard</Text>
              </TouchableOpacity>
              <Button title="Close" onPress={() => setShowCheckoutModal(false)} />
            </View>
          </View>
        </Modal>

        {/* Card Payment Modal */}
        <Modal visible={selectedPaymentMethod === 'visa'} transparent={true} animationType="slide">
          <View style={styles.modalBackground}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Card Payment</Text>
              <CheckoutForm onClose={() => setSelectedPaymentMethod('')} finalAmount={finalAmount} />
              <Button title="Close" onPress={() => setSelectedPaymentMethod('')} />
            </View>
          </View>
        </Modal>
      </View>
      <Toast />
    </StripeProvider>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#FFF8E1', flex: 1 },
  backButton: { position: 'absolute', top: 16, left: 16, zIndex: 1 }, // Position the back button at the top-left
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }, // Center the title
  emptyCart: { fontSize: 16, textAlign: 'center', marginVertical: 20 },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  itemName: { fontSize: 16, fontWeight: 'bold' },
  itemImage: { width: 80, height: 80, borderRadius: 8 },
  summary: { fontSize: 16, marginVertical: 4 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  primaryButton: { backgroundColor: '#5a2428', padding: 10, borderRadius: 8 },
  secondaryButton: { backgroundColor: '#6C757D', padding: 10, borderRadius: 8 },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  modalBackground: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContainer: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  paymentButton: { padding: 12, backgroundColor: '#007BFF', borderRadius: 8, marginVertical: 8 },
  modalContent: { padding: 16 },
  cardField: { height: 50, marginVertical: 10 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 8 },
  finalAmount: { fontSize: 18, fontWeight: 'bold', marginVertical: 16 },
  payButton: { backgroundColor: '#007BFF', padding: 12, borderRadius: 8 },
});
