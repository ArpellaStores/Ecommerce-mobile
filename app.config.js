import 'dotenv/config';

export default ({ config }) => ({
  expo: {
    name: "Arpella",
    slug: "Arpella",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/images/logo.jpeg",
    scheme: "arpella",
    userInterfaceStyle: "automatic",

    splash: {
      image: "./assets/images/logo.jpeg",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },

    assetBundlePatterns: [
      "**/*"
    ],

    android: {
      package: "com.mgachanja.arpella",
      versionCode: 2,
      hermesEnabled: false,

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
          // Fallback to process.env if provided by EAS; hardcoded key is present per request
          apiKey: process.env.GOOGLE_MAPS_API_KEY || "AIzaSyD-YPpUWHXNzvQjjXjqj7mvO2Idi72jREc"
        }
      }
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mgachanja.arpella",
      buildNumber: "2",
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
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
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
        projectId: "74e626eb-21e5-44ef-b9e4-dc59288ad740"
      },
      router: {
        origin: false
      }
    }
  }
});
