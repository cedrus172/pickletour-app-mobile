import { withNotificationHeader } from "@/components/GlobalNotificationShell";
import { Stack } from "expo-router";

export default function MarketplaceLayout() {
  return <Stack screenOptions={{
        headerRight: withNotificationHeader(), headerShown: false }} />;
}
