import { useRouter } from 'expo-router';
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useDeleteTodo } from '../api/delete-todo';
import { useTodo } from '../api/get-todo';
import type { Todo } from '../types';
import { formatDate, formatDateTime } from '../utils';
import { StatusBadge } from './status-badge';

type DetailRowProps = {
  label: string;
  children: React.ReactNode;
};

function DetailRow({ label, children }: DetailRowProps) {
  return (
    <View className="flex-row border-b border-gray-100 last:border-0">
      <View className="w-24 bg-gray-50 px-3 py-4 justify-center">
        <Text className="text-xs text-gray-500 font-medium">{label}</Text>
      </View>
      <View className="flex-1 px-4 py-4 justify-center">{children}</View>
    </View>
  );
}

function DetailSkeleton() {
  const labels = ['タイトル', '詳細', '期日', 'ステータス', '作成日時', '更新日時'];
  return (
    <View className="bg-white rounded-lg mx-4 shadow-sm overflow-hidden">
      {labels.map((label) => (
        <View key={label} className="flex-row border-b border-gray-100">
          <View className="w-24 bg-gray-50 px-3 py-4 justify-center">
            <Text className="text-xs text-gray-500 font-medium">{label}</Text>
          </View>
          <View className="flex-1 px-4 py-4 justify-center">
            <View className="h-4 w-40 bg-gray-200 rounded" />
          </View>
        </View>
      ))}
    </View>
  );
}

type TodoDetailProps = {
  publicId: string;
  onEditPress: (todo: Todo) => void;
};

export function TodoDetail({ publicId, onEditPress }: TodoDetailProps) {
  const router = useRouter();
  const { data: todo, isLoading, isError } = useTodo(publicId);
  const { mutate: deleteTodo, isPending: isDeleting } = useDeleteTodo(publicId);

  function handleDelete() {
    const doDelete = () => {
      deleteTodo(undefined, {
        onSuccess: () => router.replace('/(app)/todos'),
        onError: (error) => {
          Alert.alert('削除失敗', error.message ?? 'エラーが発生しました');
        },
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm('このToDoを削除しますか？')) {
        doDelete();
      }
    } else {
      Alert.alert('削除確認', 'このToDoを削除しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ paddingVertical: 16, paddingBottom: 32 }}>
        {isLoading && <DetailSkeleton />}

        {isError && (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-gray-400">データの取得に失敗しました</Text>
          </View>
        )}

        {todo && (
          <View className="bg-white rounded-lg mx-4 shadow-sm overflow-hidden">
            <DetailRow label="タイトル">
              <Text className="text-sm text-gray-900">{todo.title ?? '-'}</Text>
            </DetailRow>
            <DetailRow label="詳細">
              <Text className="text-sm text-gray-900">{todo.description ?? '-'}</Text>
            </DetailRow>
            <DetailRow label="期日">
              <Text className="text-sm text-gray-900">{formatDate(todo.dueDate)}</Text>
            </DetailRow>
            <DetailRow label="ステータス">
              <StatusBadge status={todo.status} />
            </DetailRow>
            <DetailRow label="作成日時">
              <Text className="text-sm text-gray-900">{formatDateTime(todo.createdAt)}</Text>
            </DetailRow>
            <DetailRow label="更新日時">
              <Text className="text-sm text-gray-900">{formatDateTime(todo.updatedAt)}</Text>
            </DetailRow>
          </View>
        )}
      </ScrollView>

      {todo && (
        <View className="flex-row gap-3 px-4 pb-8 pt-3 bg-white border-t border-gray-100">
          <TouchableOpacity
            className="flex-1 h-11 rounded-lg border border-orange-400 items-center justify-center"
            onPress={() => todo && onEditPress(todo)}
          >
            <Text className="text-orange-500 text-sm font-medium">編集</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 h-11 rounded-lg border border-red-400 items-center justify-center disabled:opacity-50"
            onPress={handleDelete}
            disabled={isDeleting}
          >
            <Text className="text-red-500 text-sm font-medium">
              {isDeleting ? '削除中...' : '削除'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
