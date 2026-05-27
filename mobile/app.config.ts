/// <reference types="node" />
import "dotenv/config";

type AppEnv = "development" | "preview" | "production";
const ENV = (process.env.APP_ENV ?? "development") as AppEnv;

const envConfig = {
  development: {
    name: "Hunty (Dev)",
    bundleId: "com.yourorg.hunty.dev",
    androidPackage: "com.yourorg.hunty.dev",
    icon: "./assets/icon-dev.png",
    apiUrl: process.env.API_URL ?? "https://dev-api.hunty.com",
  },
  preview: {
    name: "Hunty (Preview)",
    bundleId: "com.yourorg.hunty.staging",
    androidPackage: "com.yourorg.hunty.staging",
    icon: "./assets/icon-preview.png",
    apiUrl: process.env.API_URL ?? "https://staging-api.hunty.com",
  },
  production: {
    name: "Hunty",
    bundleId: "com.yourorg.hunty",
    androidPackage: "com.yourorg.hunty",
    icon: "./assets/icon.png",
    apiUrl: process.env.API_URL ?? "https://api.hunty.com",
  },
};

const config = envConfig[ENV];

export default {
  expo: {
    name: config.name,
    slug: "hunty",
    version: "1.0.0",
    orientation: "portrait",
    icon: config.icon,
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      bundleIdentifier: config.bundleId,
      supportsTablet: true,
    },
    android: {
      package: config.androidPackage,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
    },
    updates: {
      url: "https://u.expo.dev/YOUR_EAS_PROJECT_ID",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: {
      appEnv: ENV,
      apiUrl: config.apiUrl,
      eas: {
        projectId: "YOUR_EAS_PROJECT_ID",
      },
    },
  },
};
