import { CapacitorConfig } from '@capacitor/cli';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';

declare let _platformsService: PlatformService


const config: CapacitorConfig = {
  appId: 'com.kalsym.deliverin',
  appName: 'DeliverIn',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    hostname: 'deliverin.pk',
    androidScheme: "https",
    iosScheme: "https",
    // url: "capacitor://dev.geckse.de/webrtc",
    // allowNavigation: ["*.geckse.de"]
  },
  ios: {
    contentInset: "always",
  }
};

export default config;
