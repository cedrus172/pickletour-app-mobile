import { withNotificationHeader } from "@/components/GlobalNotificationShell";
import { Stack } from "expo-router";

export default function PlayLayout() {
  return <Stack screenOptions={{
        headerRight: withNotificationHeader(), headerShown: false }} />;
}
