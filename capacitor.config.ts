import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solum.newtontouch.mobile',
  appName: 'Newton Touch',
  webDir: 'www',
  plugins: {
    CapacitorHttp: { enabled: true }, // native HTTP for the Category API fetch
    SplashScreen: { launchShowDuration: 1200, showSpinner: false },
    Keyboard: { resize: 'native' },
  },
};

export default config;
