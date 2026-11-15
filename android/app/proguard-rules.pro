# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# hot-updater: MainApplication.resolveHotUpdaterBundleFile() tìm com.hotupdater.HotUpdater
# bằng reflection. Bản 1.1.21 bị R8 xoá lớp này → app luôn chạy gói nhúng, OTA tải về
# không bao giờ được nạp → vòng "tải → reload → khôi phục". Giữ nguyên cả package.
-keep class com.hotupdater.** { *; }

# expo-camera still ships bytecode for CameraView.launchScanner in the
# Expo prebuilt AAR. The app uses inline CameraView barcode scanning instead,
# and play-services-code-scanner is excluded to avoid Google Play Services
# scanner activity crashes.
-dontwarn com.google.mlkit.vision.codescanner.GmsBarcodeScanner
-dontwarn com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions$Builder
-dontwarn com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
-dontwarn com.google.mlkit.vision.codescanner.GmsBarcodeScanning

# @generated begin expo-build-properties - expo prebuild (DO NOT MODIFY)
-keep class com.google.firebase.** { *; } -keep class com.crashlytics.** { *; }
# @generated end expo-build-properties
