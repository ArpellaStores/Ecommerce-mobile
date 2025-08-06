import 'dotenv/config';

export default ({ config }) => ({
  expo: {
    name: "Arpella",
    slug: "Arpella",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/logo.jpeg",
    scheme: "Arpella",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/logo.jpeg",
        backgroundColor: "#ffffff",
      },
      package: "com.mgachanja.Arpella",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mgachanja.Arpella",
      infoPlist: {
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": true
        },
        NSLocationWhenInUseUsageDescription: "We need your location to show your current position on the map",
        NSLocationAlwaysUsageDescription: "We need your location to show your current position on the map",
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      "expo-secure-store",
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: "74e626eb-21e5-44ef-b9e4-dc59288ad740",
      },
    },
  },
});
