import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.meditrack.app',
  appName: 'MediTrack',
  webDir: 'dist',
  server: {
    url: 'https://meditrack-2-tvck.onrender.com',
    cleartext: true
  }
};

export default config;
