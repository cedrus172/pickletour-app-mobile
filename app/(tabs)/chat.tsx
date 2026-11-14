import { router } from "expo-router";
import React from "react";

import PikoraScreen from "@/components/chatbot/PikoraScreen";

export default function ChatScreen() {
  return <PikoraScreen onBack={() => router.canGoBack() ? router.back() : router.replace("/more")} />;
}
