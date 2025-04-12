import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { toast } from 'react-native-toast-notifications'; // Corrected import

const Package = ({ parcelLocation }) => {
  const router = useRouter();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Get current device location
  useEffect(() => {
    const getLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location.coords);
        toast.show({
          type: 'success',
          text1: 'Location acquired!',
          text2: `Latitude: ${location.coords.latitude}, Longitude: ${location.coords.longitude}`,
        });
      } else {
        setErrorMsg('Permission to access location was denied');
        // Show error toast
        toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Unable to access your location.',
        });
      }
    };
    getLocation();
  }, []);

  // Default coordinates for Nairobi if location is not available
  const initialCoordinates = {
    latitude: -1.286389,
    longitude: 37.9062,
  };

  // If the currentLocation is not yet available, use default coordinates
  const initialRegion = {
    latitude: currentLocation?.latitude || initialCoordinates.latitude,
    longitude: currentLocation?.longitude || initialCoordinates.longitude,
    latitudeDelta: 0.012,  
    longitudeDelta: 0.012, 
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-left" size={24} color="#000" />
      </TouchableOpacity>

      {errorMsg ? (
        <Text>{errorMsg}</Text>
      ) : (
        <>
          <Text style={styles.title}>Package Tracking</Text>
          {/* Only show the map once the currentLocation is available */}
          {currentLocation ? (
            <MapView
              style={styles.map}
              region={initialRegion}  // Use 'region' instead of 'initialRegion' for dynamic updates
              showsUserLocation={true}
            >
              <Marker
                coordinate={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                title="Your Location"
                description="This is where you are"
              />
            </MapView>
          ) : (
            <Text>Loading Location...</Text>
          )}

          {/* Tracking Details */}
          <View style={styles.details}>
            <Text style={styles.detailText}>
              Your package is in transit. We will notify you once it arrives at your destination.
            </Text>
          </View>

          <View style={styles.bottomNavigation}>
            <TouchableOpacity style={styles.navItem} onPress={() => router.back()}>
              <Icon name="home" size={24} color="black" />
              <Text>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Package')}>
              <Icon name="ticket" size={24} color="black" />
              <Text>My Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Profile')}>
              <Icon name="user" size={24} color="black" />
              <Text>Profile</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#FFF8E1',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
  },
  map: {
    width: '100%',
    height: Dimensions.get('window').height * 0.55,
  },
  details: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  detailText: {
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 16,
    zIndex: 1,
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
  },
});

export default Package;
