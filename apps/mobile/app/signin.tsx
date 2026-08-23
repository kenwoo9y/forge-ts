import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { z } from 'zod';
import { signIn } from '@/lib/auth';
import { useAuth } from '@/providers';

const signinSchema = z.object({
  username: z
    .string()
    .min(1, 'ユーザー名を入力してください')
    .max(30, 'ユーザー名は30文字以内で入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

type SigninInput = z.infer<typeof signinSchema>;

export default function SigninScreen() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SigninInput>({
    resolver: zodResolver(signinSchema),
    defaultValues: { username: '', password: '' },
  });

  async function onSubmit(data: SigninInput) {
    setError(null);
    try {
      await signIn(data.username, data.password);
      const { storage } = await import('@/lib/storage');
      const [token, username] = await Promise.all([storage.getToken(), storage.getUsername()]);
      if (token && username) {
        setAuth(token, username);
        router.replace('/(app)/todos');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '予期しないエラーが発生しました');
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-100"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-3xl font-bold text-gray-900 mb-8">ログイン</Text>

        <View className="w-full bg-white rounded-2xl p-6 shadow-sm">
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">ユーザー名</Text>
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900"
                  placeholder="ユーザー名を入力"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.username && (
              <Text className="text-xs text-red-500 mt-1">{errors.username.message}</Text>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">パスワード</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900"
                  placeholder="パスワードを入力"
                  secureTextEntry
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.password && (
              <Text className="text-xs text-red-500 mt-1">{errors.password.message}</Text>
            )}
          </View>

          {error && <Text className="text-sm text-red-500 text-center mb-4">{error}</Text>}

          <TouchableOpacity
            className="w-full h-12 rounded-xl bg-blue-600 items-center justify-center disabled:opacity-50"
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-medium text-base">ログイン</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
