export default ({ config }) => ({
  expo: {
    name: "Arpella",
    slug: "Arpella",
    version: "1.1.3",
    orientation: "portrait",
    icon: "./assets/images/logo.jpeg",
    scheme: "arpella",
    userInterfaceStyle: "automatic",

    splash: {
      image: "./assets/images/logo.jpeg",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },

    assetBundlePatterns: ["**/*"],

    runtimeVersion: "1.0.1",

    updates: {
      fallbackToCacheTimeout: 0
    },

    jsEngine: "hermes",  // Hermes enabled globally

    android: {
      package: "com.mgachanja.Arpella",  // ✅ Correct package name
      versionCode: 31,
      // REMOVE hermesEnabled: false - let it use the global jsEngine setting

      adaptiveIcon: {
        foregroundImage: "./assets/images/logo.jpeg",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "INTERNET",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || "AIzaSyD-YPpUWHXNzvQjjXjqj7mvO2Idi72jREc"
        }
      }
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mgachanja.arpella",
      buildNumber: "30",
      // jsEngine: "hermes" is inherited from root level
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true
        },
        NSLocationWhenInUseUsageDescription: "We need your location to show your current position on the map",
        NSLocationAlwaysUsageDescription: "We need your location to show your current position on the map"
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "AIzaSyD-YPpUWHXNzvQjjXjqj7mvO2Idi72jREc"
      }
    },

    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },

    plugins: [
      "expo-updates",
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      "expo-secure-store"
    ],

    experiments: {
      typedRoutes: true
    },

    extra: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "AIzaSyD-YPpUWHXNzvQjjXjqj7mvO2Idi72jREc",
      eas: {
        projectId: "d30882e6-d17b-402b-a507-482d317253e2"
      },
      router: {
        origin: false
      }
    }
  }
});