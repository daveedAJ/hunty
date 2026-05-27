type AppEnv = 'development' | 'preview' | 'production';

const APP_ENV = (process.env.APP_ENV ?? (__DEV__ ? 'development' : 'production')) as AppEnv;

const ENV: Record<AppEnv, { apiUrl: string; stellarRpcUrl: string; stellarNetwork: string }> = {
  development: {
    apiUrl: process.env.EXPO_PUBLIC_API_BASE_URL_DEVELOPMENT ?? 'http://localhost:3000/api',
    stellarRpcUrl: process.env.EXPO_PUBLIC_STELLAR_RPC_URL_DEVELOPMENT ?? 'https://soroban-testnet.stellar.org',
    stellarNetwork: process.env.EXPO_PUBLIC_STELLAR_NETWORK_DEVELOPMENT ?? 'testnet',
  },
  preview: {
    apiUrl: process.env.EXPO_PUBLIC_API_BASE_URL_PREVIEW ?? 'https://staging-api.hunty.app',
    stellarRpcUrl: process.env.EXPO_PUBLIC_STELLAR_RPC_URL_PREVIEW ?? 'https://soroban-testnet.stellar.org',
    stellarNetwork: process.env.EXPO_PUBLIC_STELLAR_NETWORK_PREVIEW ?? 'testnet',
  },
  production: {
    apiUrl: process.env.EXPO_PUBLIC_API_BASE_URL_PRODUCTION ?? 'https://api.hunty.app',
    stellarRpcUrl: process.env.EXPO_PUBLIC_STELLAR_RPC_URL_PRODUCTION ?? 'https://soroban-mainnet.stellar.org',
    stellarNetwork: process.env.EXPO_PUBLIC_STELLAR_NETWORK_PRODUCTION ?? 'mainnet',
  },
};

export default {
  ...ENV[APP_ENV],
  environment: APP_ENV,
const ENV = {
  dev: {
    apiUrl: 'http://localhost:3000/api',
    graphqlUrl: 'http://localhost:4000/graphql',
    stellarRpcUrl: 'https://soroban-testnet.stellar.org',
    stellarNetwork: 'testnet',
  },
  staging: {
    apiUrl: 'https://staging-api.hunty.app',
    graphqlUrl: 'https://staging-indexer.hunty.app/graphql',
    stellarRpcUrl: 'https://soroban-testnet.stellar.org',
    stellarNetwork: 'testnet',
  },
  prod: {
    apiUrl: 'https://api.hunty.app',
    graphqlUrl: 'https://indexer.hunty.app/graphql',
    stellarRpcUrl: 'https://soroban-mainnet.stellar.org',
    stellarNetwork: 'mainnet',
  },
};

const getEnvVars = () => {
  // Use the Expo-specific environment variables
  const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL_PRODUCTION || process.env.EXPO_PUBLIC_API_BASE_URL_DEVELOPMENT;
  const graphqlUrl = process.env.EXPO_PUBLIC_GRAPHQL_URL_PRODUCTION || process.env.EXPO_PUBLIC_GRAPHQL_URL_DEVELOPMENT;
  const stellarRpcUrl = process.env.EXPO_PUBLIC_STELLAR_RPC_URL_PRODUCTION || process.env.EXPO_PUBLIC_STELLAR_RPC_URL_DEVELOPMENT;
  const stellarNetwork = process.env.EXPO_PUBLIC_STELLAR_NETWORK_PRODUCTION || process.env.EXPO_PUBLIC_STELLAR_NETWORK_DEVELOPMENT;
  const environment = process.env.EXPO_PUBLIC_ENVIRONMENT || 'development';

  if (apiUrl && graphqlUrl && stellarRpcUrl && stellarNetwork) {
    return {
      apiUrl,
      graphqlUrl,
      stellarRpcUrl,
      stellarNetwork,
      environment,
    };
  }

  // Fallback to environment-based config
  const env = __DEV__ ? ENV.dev : ENV.prod;
  return {
    ...env,
    environment: __DEV__ ? 'development' : 'production',
  };
};
