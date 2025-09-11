import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.wedsync.supplier',
  appName: 'WedSync',
  webDir: 'out',

  server: {
    androidScheme: 'https'
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#6366F1",
      showSpinner: false,
      spinnerColor: "#FFFFFF"
    },
    
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },

    LocalNotifications: {
      smallIcon: "ic_stat_notification",
      iconColor: "#6366F1"
    },

    StatusBar: {
      style: "default",
      backgroundColor: "#6366F1"
    },

    Camera: {
      permissions: {
        camera: "WedSync needs camera access to capture wedding photos"
      }
    }
  },

  ios: {
    scheme: 'WedSync',
    contentInset: 'automatic',
    backgroundColor: '#ffffff'
  },

  android: {
    buildOptions: {
      keystorePath: 'android/app/wedsync-release.keystore',
      keystoreAlias: 'wedsync-key',
      releaseType: 'APK'
    }
  }
};

export default config;