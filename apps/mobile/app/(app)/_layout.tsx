import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, Alert, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@/providers';

export default function AppLayout() {
  const { token, isLoading, clearAuth } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/signin" />;
  }

  function handleLogout() {
    const doLogout = () => clearAuth();

    if (Platform.OS === 'web') {
      if (window.confirm('Log out?')) {
        doLogout();
      }
    } else {
      Alert.alert('Log out', 'Log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive', onPress: doLogout },
      ]);
    }
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#2563eb' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Home',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLogout}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-white text-sm">Log out</Text>
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
