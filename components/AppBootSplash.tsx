import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Animated,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

// Global flag: splash chỉ hiện đúng 1 lần duy nhất trong session
let __splashAlreadyShown__ = false;

interface AppBootSplashProps {
  isAppReady: boolean;
  isDark?: boolean;
}

export default function AppBootSplash({ isAppReady }: AppBootSplashProps) {
  const window = useWindowDimensions();
  const [frame, setFrame] = useState({ width: window.width, height: window.height });
  const [loadedArtwork, setLoadedArtwork] = useState(0);
  const [isAnimationComplete, setIsAnimationComplete] = useState(
    __splashAlreadyShown__,
  );
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const loadingMotion = useRef(new Animated.Value(0)).current;
  const { width, height } = frame;
  const landscape = width > height;
  const logoWidth = Math.min(width * 0.79, height * (landscape ? 0.5 : 0.4));
  const logoHeight = logoWidth * (1080 / 1238);
  const brandTop = height * (landscape ? 0.38 : 0.396) - logoHeight / 2;
  const loaderWidth = Math.min(width * 0.3, 160);

  useEffect(() => {
    if (isAnimationComplete) return;
    const animation = Animated.loop(
      Animated.timing(loadingMotion, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [isAnimationComplete, loadingMotion]);

  useEffect(() => {
    // Đợi cả hai ảnh tải xong (hoặc báo lỗi) để tránh nháy nền trống.
    if (isAppReady && loadedArtwork === 3) {
      SplashScreen.hideAsync().catch(() => {});

      if (__splashAlreadyShown__) {
        setIsAnimationComplete(true);
        return;
      }

      __splashAlreadyShown__ = true;

      // Giữ splash 1 giây rồi fade out
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsAnimationComplete(true);
      });
    }
  }, [isAppReady, loadedArtwork, containerOpacity]);

  if (isAnimationComplete) {
    return null;
  }

  return (
    <Animated.View
      style={[
        s.container,
        { opacity: containerOpacity },
      ]}
      pointerEvents="none"
      testID="app-boot-splash"
      onLayout={({ nativeEvent: { layout } }) => {
        if (layout.width > 0 && layout.height > 0) {
          setFrame((current) => current.width === layout.width && current.height === layout.height
            ? current
            : { width: layout.width, height: layout.height });
        }
      }}
    >
      <StatusBar style="light" />
      <Image
        source={require("../assets/images/splash-premium-v1/background.png")}
        style={StyleSheet.absoluteFillObject}
        contentFit="fill"
        accessible={false}
        onLoadEnd={() => setLoadedArtwork((loaded) => loaded | 1)}
      />
      <View style={[s.content, { top: brandTop }]} testID="boot-splash-brand">
        <Image
          source={require("../assets/images/logo-v2-badge.png")}
          style={{ width: logoWidth, height: logoHeight }}
          contentFit="contain"
          accessibilityLabel="PickleTour"
          onLoadEnd={() => setLoadedArtwork((loaded) => loaded | 2)}
        />
        <Text
          maxFontSizeMultiplier={1.15}
          style={[s.sloganText, {
            marginTop: Math.max(12, height * 0.02),
            fontSize: Math.max(12, Math.min(width * 0.047, 22)),
            lineHeight: Math.max(18, Math.min(width * 0.065, 30)),
          }]}
        >
          Cộng đồng Pickleball của bạn
        </Text>
      </View>
      <View style={[s.loading, { bottom: Math.max(24, height * 0.07) }]}>
        <View
          testID="boot-splash-loading-track"
          style={[s.loadingTrack, { width: loaderWidth }]}
          accessibilityRole="progressbar"
          accessibilityLabel="Đang khởi động"
          accessibilityState={{ busy: true }}
        >
          <Animated.View style={[s.loadingSegment, {
            width: loaderWidth * 0.58,
            transform: [{ translateX: loadingMotion.interpolate({
              inputRange: [0, 1],
              outputRange: [-loaderWidth * 0.58, loaderWidth],
            }) }],
          }]} />
        </View>
        <Text maxFontSizeMultiplier={1.15} style={s.loadingText}>
          Đang khởi động…
        </Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    alignItems: "center",
    justifyContent: "center",
    elevation: 99999,
    backgroundColor: "#040f20",
    overflow: "hidden",
  },
  content: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  sloganText: {
    color: "#b8d2f5",
    textAlign: "center",
    fontWeight: "400",
  },
  loading: {
    position: "absolute",
    alignItems: "center",
    alignSelf: "center",
  },
  loadingTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "#223f66",
    overflow: "hidden",
  },
  loadingSegment: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "#06bdec",
  },
  loadingText: {
    marginTop: 12,
    color: "#7e9fc9",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
