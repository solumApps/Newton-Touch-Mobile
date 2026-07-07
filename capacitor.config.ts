import type { CapacitorConfig } from '@capacitor/cli';

const launchColor = '#2F006D';

const config: CapacitorConfig = {
  appId: 'com.solum.newtontouch.mobile',
  appName: 'Newton Touch',
  webDir: 'www',
  android: {
    backgroundColor: launchColor,
  },
  plugins: {
    CapacitorHttp: { enabled: true }, // native HTTP for the Category API fetch
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: launchColor,
      showSpinner: false,
    },
    Keyboard: { resize: 'native' },
  },
};

export default config;
