import { Text, View } from 'react-native';
import { useAuth } from '@/providers';

export default function HomeScreen() {
  const { username } = useAuth();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-lg text-gray-900">ようこそ{username ? `、${username}さん` : ''}</Text>
    </View>
  );
}
