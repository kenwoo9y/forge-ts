import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { type TodoFormValues, todoFormSchema } from '../schemas';
import type { TodoStatus } from '../types';

const STATUS_OPTIONS: { value: TodoStatus; label: string }[] = [
  { value: 'todo', label: '未着手' },
  { value: 'doing', label: '進行中' },
  { value: 'done', label: '完了' },
];

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
  error?: string;
};

function FormField({ label, children, error }: FormFieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm text-gray-600 mb-1.5">{label}</Text>
      {children}
      {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}
    </View>
  );
}

type TodoFormModalProps = {
  visible: boolean;
  heading: string;
  submitLabel: string;
  submitColor: string;
  defaultValues?: Partial<TodoFormValues>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  onSubmit: (values: TodoFormValues) => void;
  onClose: () => void;
};

export function TodoFormModal({
  visible,
  heading,
  submitLabel,
  submitColor,
  defaultValues,
  isPending,
  isError,
  error,
  onSubmit,
  onClose,
}: TodoFormModalProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TodoFormValues>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: '',
      status: 'todo',
      ...defaultValues,
    },
  });

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ヘッダー */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
          <TouchableOpacity onPress={handleClose}>
            <Text className="text-base text-gray-500">キャンセル</Text>
          </TouchableOpacity>
          <Text className="text-base font-semibold text-gray-900">{heading}</Text>
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={isPending}
            className="disabled:opacity-50"
          >
            <Text className={`text-base font-semibold ${submitColor}`}>
              {isPending ? '送信中...' : submitLabel}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 pt-6" keyboardShouldPersistTaps="handled">
          {/* タイトル */}
          <FormField label="タイトル" error={errors.title?.message}>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900"
                  placeholder="タイトルを入力"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value ?? ''}
                />
              )}
            />
          </FormField>

          {/* 詳細 */}
          <FormField label="詳細" error={errors.description?.message}>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900"
                  placeholder="詳細を入力"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value ?? ''}
                />
              )}
            />
          </FormField>

          {/* 期日 */}
          <FormField label="期日" error={errors.dueDate?.message}>
            <Controller
              control={control}
              name="dueDate"
              render={({ field: { onChange, value } }) =>
                Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    style={{
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      padding: '12px 16px',
                      fontSize: 14,
                      color: value ? '#111827' : '#9ca3af',
                      width: '100%',
                      boxSizing: 'border-box',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                ) : (
                  <View>
                    <TouchableOpacity
                      className="border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between items-center"
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text className={`text-sm ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                        {value || '日付を選択'}
                      </Text>
                      {value && (
                        <TouchableOpacity
                          onPress={() => onChange('')}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text className="text-sm text-gray-400">✕</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={value ? new Date(value) : new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                          if (event.type === 'dismissed') {
                            setShowDatePicker(false);
                            return;
                          }
                          if (Platform.OS === 'android') setShowDatePicker(false);
                          if (selectedDate) onChange(selectedDate.toISOString().split('T')[0]);
                        }}
                      />
                    )}
                  </View>
                )
              }
            />
          </FormField>

          {/* ステータス */}
          <FormField label="ステータス" error={errors.status?.message}>
            <Controller
              control={control}
              name="status"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      className={`flex-1 py-2.5 rounded-lg border items-center ${
                        value === opt.value
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white border-gray-300'
                      }`}
                      onPress={() => onChange(opt.value)}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          value === opt.value ? 'text-white' : 'text-gray-600'
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </FormField>

          {isError && (
            <View className="bg-red-50 rounded-lg px-4 py-3 mb-4">
              <Text className="text-sm text-red-600">
                {error?.message ?? 'エラーが発生しました'}
              </Text>
            </View>
          )}

          <View className="h-8" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
