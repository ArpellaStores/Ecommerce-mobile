import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useRouter } from 'expo-router';

const ProfilePage = () => {
    const router = useRouter();
  const [userDetails, setUserDetails] = useState({
    fName: 'John',
    sName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    password: '********'
  });

  const orders = [
    { id: 1, orderNumber: '#D245GT56', status: 'pending' },
    { id: 2, orderNumber: '#A123BC89', status: 'in transit' },
    { id: 3, orderNumber: '#Z987XY34', status: 'fulfilled' }
  ];

  const renderFieldLabel = (field) => {
    if (field === 'fName') return 'First Name';
    if (field === 'sName') return 'Last Name';
    if (field === 'email') return 'Email';
    if (field === 'phone') return 'Phone';
    if (field === 'password') return 'Password';
    return field;
  };

  const renderOrderIcon = (status) => {
    if (status === 'pending') return <Icon name="hourglass" size={24} color="blue" />;
    if (status === 'in transit') return <Icon name="truck" size={24} color="black" />;
    if (status === 'fulfilled') return <Icon name="check-circle" size={24} color="green" />;
    return null;
  };

  const handleEditField = (field) => {
    // Handle field editing, for example open a modal or navigation to edit screen
    console.log(`Editing ${field}`);
  };

  const handleAgentPanel = () => {
    // Navigate to agent panel or make the API call
    console.log('Navigating to agent panel');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Personal Details</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
      {['fName', 'sName', 'email', 'phone', 'password'].map((field) => (
        <View key={field} style={styles.fieldRow}>
          <Text style={styles.label}>{renderFieldLabel(field)}:</Text>
          <View style={styles.fieldValue}>
            <Text style={styles.fieldText}>{userDetails[field]}</Text>
            <TouchableOpacity style={styles.editButton} onPress={() => handleEditField(field)}>
              <Icon name="pencil" size={25}  />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Text style={styles.title}>Order History</Text>
      {orders.map((order) => (
        <View key={order.id} style={styles.orderRow}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderText}>Order {order.id}</Text>
            <Text style={styles.orderText}>{order.orderNumber}</Text>
          </View>
          <View style={styles.orderActions}>
            {order.status === 'in transit' && (
              <TouchableOpacity>
                <Text style={styles.viewLink}>View</Text>
              </TouchableOpacity>
            )}
            <View style={styles.statusIcon }>{renderOrderIcon(order.status)}</View>
          </View>
        </View>
      ))}
      <View style={styles.bottomNavigation}>
              <TouchableOpacity style={styles.navItem} onPress={() => router.back('./home')}>
                <FontAwesome name="home" size={24} color="black" />
                <Text>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem} onPress={() => router.push('./orders')}>
                <FontAwesome name="ticket" size={24} color="black" />
                <Text>My Orders</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Profile')}>
                <FontAwesome name="user" size={24} color="black" />
                <Text>Profile</Text>
              </TouchableOpacity>
            </View>

      
    </ScrollView>
  );
};

const styles = StyleSheet.create({
    backButton:
     { position: 'absolute', 
        top: 20, left: 16,
        zIndex: 1
      },
  container: {
    padding: 16,
    backgroundColor: '#FFF8E1',
    flexGrow: 1
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
    fontWeight: 'bold'
  },
  fieldValue: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  fieldText: {
    fontSize: 16,
    marginRight: 8
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
    fontSize: 16
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
  buttonContainer: {
    alignItems: 'center',
    marginTop: 16
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  editButton: {
    paddingHorizontal: 15,
    color: 'black'
  },
  OrderIcons:{
    paddingHorizontal: 15,
    color: 'black'
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center'
  },

bottomNavigation: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
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
}
});

export default ProfilePage;
