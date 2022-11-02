import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kalsym.deliverin',
  appName: 'DeliverIn',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    hostname: "deliverin.my",
    androidScheme: "https"
  }
};

export default config;
