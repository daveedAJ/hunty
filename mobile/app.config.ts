/// <reference types="node" />
import "dotenv/config";

type AppEnv = "development" | "preview" | "production";
const ENV = (process.env.APP_ENV ?? "development") as AppEnv;

const envConfig = {
  development: {
    name: "Hunty (Dev)",
    bundleId: "com.yourorg.hunty.dev",
    androidPackage: "com.yourorg.hunty.dev",
    icon: "./assets/icon.png",
    apiUrl: process.env.API_URL ?? "https://dev-api.hunty.com",
  },
  preview: {
    name: "Hunty (Preview)",
    bundleId: "com.yourorg.hunty.staging",
    androidPackage: "com.yourorg.hunty.staging",
    icon: "./assets/icon.png",
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
    scheme: "hunty",
    version: "1.0.0",
    orientation: "portrait",
    icon: config.icon,
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#1f2937",
    },
    ios: {
      bundleIdentifier: config.bundleId,
      supportsTablet: true,
      infoPlist: {
        UIViewControllerBasedStatusBarAppearance: true,
        LSApplicationQueriesSchemes: [
          "wc",
          "rainbow",
          "metamask",
          "trust",
          "safe",
          "uniswap",
          "lobstr",
          "freighter",
        ],
      },
    },
    android: {
      package: config.androidPackage,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1f2937",
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [{ scheme: "hunty" }, { scheme: "wc" }],
          category: ["DEFAULT", "BROWSABLE"],
        },
      ],
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
      walletConnectProjectId: process.env.WALLETCONNECT_PROJECT_ID ?? "",
      eas: {
        projectId: "YOUR_EAS_PROJECT_ID",
      },
    },
  },
};
