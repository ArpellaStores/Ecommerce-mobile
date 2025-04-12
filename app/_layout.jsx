import React, { Component } from 'react';
import { Text, StatusBar, SafeAreaView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Stack } from "expo-router";
import { Provider, useSelector } from 'react-redux';
import store from '../redux/store';
import { ToastProvider } from 'react-native-toast-notifications';

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
  const isLoading = useSelector((state) => state.auth.isLoading);
  if (!isLoading) return null; 
  return(
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#4B2C20" />
    </View>
  );
};

export default function RootLayout() {
  return (
    <Provider store={store}> 
      <ToastProvider>
        <ErrorBoundary>
          <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
          <View style={styles.fullScreen}>
            <SafeAreaView style={styles.container}>
              {/* ✅ Global Spinner */}
              <Stack screenOptions={{ headerShown: false }} />
            </SafeAreaView>
          </View>
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
