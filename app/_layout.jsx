import React, { Component } from 'react';
import { Text, StatusBar, SafeAreaView, StyleSheet, View } from 'react-native';
import { Stack } from "expo-router";
import { Provider } from 'react-redux';
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

export default function RootLayout() {
  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <ToastProvider>
        <ErrorBoundary>
          <Provider store={store}>
            {/* Use SafeAreaView inside a View to ensure full coverage */}
            <View style={styles.fullScreen}>
              <SafeAreaView style={styles.container}>
                <Stack
                  screenOptions={{
                    header: () => null, // Remove headers
                  }}
                >
                  <Stack.Screen name="Register" />
                  <Stack.Screen name="Login" />
                  <Stack.Screen name="Home" />
                  <Stack.Screen name="Profile" />
                  <Stack.Screen name="Cart" />
                </Stack>
              </SafeAreaView>
            </View>
          </Provider>
        </ErrorBoundary>
      </ToastProvider>
    </>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#FFF8E1', // Set your desired background color
  },
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 24,
  },
});
