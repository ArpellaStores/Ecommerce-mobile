import React, { Component, useEffect, useState } from 'react';
import { Text, StatusBar, SafeAreaView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Stack, Slot, Redirect } from 'expo-router';
import { Provider, useSelector } from 'react-redux';
import store from '../redux/store';
import { ToastProvider } from 'react-native-toast-notifications';
import * as SecureStore from 'expo-secure-store';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.log('Error caught in ErrorBoundary', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <Text>An error occurred.</Text>;
    }
    return this.props.children;
  }
}

const GlobalLoader = () => {
  const isLoading = useSelector((state) => state.auth.loading);
  if (!isLoading) return null;
  return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#FF9800" />
    </View>
  );
};

const AuthGate = ({ children }) => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  
  return (
    <>
      <GlobalLoader />
      {children}
    </>
  );
};

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const checkCredentials = async () => {
      try {
        const storedData = await SecureStore.getItemAsync('userToken');
        setInitialRoute(storedData ? 'Home' : 'Login');
      } catch (error) {
        console.error('SecureStore Error:', error);
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkCredentials();
  }, []);

  // Show loading indicator while checking credentials
  if (isLoading) {
    return (
      <SafeAreaView style={styles.fullScreen}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
          <Text style={{ marginTop: 10, color: "#FFF" }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Provider store={store}>
      <ToastProvider>
        <ErrorBoundary>
          <SafeAreaView style={styles.fullScreen}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.container}>
              <AuthGate>
                {initialRoute && <Redirect href={`/${initialRoute}`} />}
                <Slot />
              </AuthGate>
            </View>
          </SafeAreaView>
        </ErrorBoundary>
      </ToastProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#FFF8E1',
  },
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 24,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});