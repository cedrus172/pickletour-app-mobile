import { Redirect, router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSelector } from "react-redux";
import { WebView } from "react-native-webview";
import { useStartArcadeSessionMutation } from "@/slices/usersApiSlice";

const origin = "https://pickletour.vn";
const path = "/pickleball-game";

export default function GameHotScreen() {
  const account = useSelector((state: { auth?: { userInfo?: { _id?: string; id?: string; token?: string } } }) =>
    state.auth?.userInfo);
  const accountId = account?._id ?? account?.id;
  const signedIn = !!account;
  const [startSession] = useStartArcadeSessionMutation();
  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState<{ ticket: string; accountId?: string; attempt: number }>();
  const [failed, setFailed] = useState(false);

  useFocusEffect(useCallback(() => {
    if (Platform.OS !== "android" || !signedIn) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, [signedIn]));

  useEffect(() => {
    if (!signedIn) return;
    const request = startSession(undefined);
    let active = true;
    request.unwrap().then((result) => {
      if (active) setSession({ ticket: result.ticket, accountId, attempt });
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; request.abort(); };
  }, [signedIn, accountId, account?.token, attempt, startSession]);

  function renew() {
    setFailed(false);
    setSession(undefined);
    setAttempt((value) => value + 1);
  }

  function closeGame() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  if (!signedIn) return <Redirect href={{ pathname: "/login", params: { returnTo: "/game-hot" } }} />;
  const ready = session && session.accountId === accountId && session.attempt === attempt;

  return <View style={styles.screen}>
    <Stack.Screen options={{ headerShown: false, gestureEnabled: false, navigationBarHidden: true }} />
    {failed ? <View style={styles.center}>
      <Text accessibilityRole="alert" style={styles.text}>Chưa mở được Game Hot.</Text>
      <Pressable accessibilityRole="button" onPress={renew} style={styles.retry}>
        <Text style={styles.text}>Thử lại</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={closeGame} style={styles.retry}>
        <Text style={styles.text}>Thoát game</Text>
      </Pressable>
    </View> : ready ? <WebView
      key={attempt}
      source={{ uri: `${origin}${path}#arcade=${encodeURIComponent(session.ticket)}` }}
      originWhitelist={[origin]}
      allowsInlineMediaPlayback
      allowsBackForwardNavigationGestures={false}
      automaticallyAdjustContentInsets={false}
      contentInsetAdjustmentBehavior="never"
      setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={({ url }) => url === "about:blank" || /^https:\/\/pickletour\.vn\/pickleball-game(?:[?#]|$)/.test(url)}
      onMessage={({ nativeEvent }) => {
        if (nativeEvent.data === "arcade-renew") renew();
        if (nativeEvent.data === "arcade-close") closeGame();
      }}
      onError={() => setFailed(true)}
      onHttpError={({ nativeEvent }) => {
        if (nativeEvent.url.split(/[?#]/)[0] === `${origin}${path}`) setFailed(true);
      }}
      style={styles.screen}
    /> : <View style={styles.center}>
      <ActivityIndicator color="#22c1d6" accessibilityLabel="Đang kết nối Game Hot" />
      <Pressable accessibilityRole="button" onPress={closeGame} style={styles.retry}>
        <Text style={styles.text}>Thoát game</Text>
      </Pressable>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#061320" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  text: { color: "#eef9ff", fontSize: 16 },
  retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#123346" },
});
