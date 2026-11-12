type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

type RuntimeConfig = {
  apiBaseUrl?: string;
  decartApiKey?: string;
  stripePublishableKey?: string;
  firebase?: Partial<FirebaseConfig>;
  firebaseVapidKey?: string;
};

declare global {
  interface Window {
    __runtimeConfig?: RuntimeConfig;
  }
}

const runtimeConfig = (typeof window !== 'undefined' ? window.__runtimeConfig : undefined) ?? {};

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0');

const defaultFirebaseConfig: FirebaseConfig = {
  apiKey: 'AIzaSyCT2Zw540aDdCnnJKu15KvzuvqRhY66mC8',
  authDomain: 'universidad-app-3b08b.firebaseapp.com',
  projectId: 'universidad-app-3b08b',
  storageBucket: 'universidad-app-3b08b.firebasestorage.app',
  messagingSenderId: '652934622748',
  appId: '1:652934622748:web:4e1c1d3da90245010ef9d9',
};

export const environment = {

  apiBaseUrl:
    runtimeConfig.apiBaseUrl ||
    (isLocalhost ? 'http://localhost:8000/api' : 'https://ecommerce-si2.onrender.com/api'),
  decartApiKey:
    runtimeConfig.decartApiKey ||
    'dct_ecommerce_QZtgfQYtsNcdcedjtHBqrfDMqkUMCFVEwKSzqdzTkVTgSPLlqGPwlOzXrDoxQFyX',
  stripePublishableKey:
    runtimeConfig.stripePublishableKey ||
    'pk_live_51UTOELGmMrXC5go2i4whWZEscqPnR0l6YXCJ77TMSQhsA1S09BxmjecK8HlH4BuTCdsGeOVAsQ67NYiq16lSIDCJ00bXKMjXZ7',

  firebase: { ...defaultFirebaseConfig, ...runtimeConfig.firebase },
  firebaseVapidKey:
    runtimeConfig.firebaseVapidKey ||
    'BEdsfVaDFcWM77gFckoEXc8hKJAce1UGViKnvX7zehZEOrACIf6ILsRKIxg6ze7550wwI8guRHQ6EmhWmoPjqSE',
};
