# Arpella Ecommerce Mobile

Welcome to the **Arpella Ecommerce Mobile** project! This is a robust, cross-platform mobile application built using [Expo](https://expo.dev/) and React Native, tailored for the Arpella Stores e-commerce ecosystem.

## 🛠 Tech Stack

- **Framework**: [Expo](https://expo.dev) / [React Native](https://reactnative.dev)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) & [RTK Query](https://redux-toolkit.js.org/rtk-query/overview)
- **Form Handling**: [React Hook Form](https://react-hook-form.com/)
- **Storage**: [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) & [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- **UI Icons**: React Native Vector Icons / FontAwesome

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- `npm` or `yarn`
- [Expo CLI](https://docs.expo.dev/workflow/expo-cli/)
- **Expo Go** app installed on your physical device, or a configured Android Emulator / iOS Simulator.

## 🚀 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Arpella-Ecommerce-mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run start
   # or
   npx expo start --dev-client
   ```

4. **Run on a device/emulator:**
   - Scan the QR code in the terminal using the **Expo Go** app on your phone.
   - Press `i` to open in the iOS simulator.
   - Press `a` to open in the Android emulator.

## 🏗 Project Workflow & Architecture

- **File-Based Routing (`/app`)**: Screens are automatically routed based on their file path within the `app/` directory. Core screens include `Home.jsx`, `Login.jsx`, `Profile.jsx`, and `Package.jsx`.
- **State & Data Fetching (`/redux`)**: 
  - **Slices**: Local state (like auth, cart, products) is managed in `redux/slices/`.
  - **APIs (RTK Query)**: Network requests are centrally managed in `redux/api/` (e.g., `ordersApi.js`, `productsApi.js`, `authApi.js`). This provides automatic caching, background fetching, and polling out of the box.
- **Component Design (`/components`)**: Reusable UI components (like `ProductImage`, `BottomNav`) are kept in the `components/` directory to maintain DRY principles.
- **Authentication Flow**: Managed via JWT tokens and OTP verification. User sessions are persisted locally using `expo-secure-store` and `redux-persist`.

## 📦 Building for Production

When you are ready to create a standalone build for iOS or Android, you can use Expo Application Services (EAS):

```bash
# For Android
npm run android

# For iOS
npm run ios
```

For detailed guides on EAS builds, check the [Expo Development Builds documentation](https://docs.expo.dev/develop/development-builds/introduction/).

## 🤝 Support & Community
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
