import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.territoryjogger.app',
  appName: 'Territory Jogger',
  webDir: 'dist',
  // Web mode: no native platform sync needed yet
  server: {
    // Allow cleartext traffic for local dev
    androidScheme: 'https',
  },
}

export default config
