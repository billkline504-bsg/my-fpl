import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "./src/hooks/useAuth";
import { AuthScreen } from "./src/screens/AuthScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LeagueDetailScreen } from "./src/screens/LeagueDetailScreen";
import type { RootStackParamList } from "./src/navigation/types";

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator<RootStackParamList>();

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LeagueDetail" component={LeagueDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Root />
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
