import { AppLayout } from "@/components/layouts/app-layout";
import { TodoDetail } from "@/features/todos/components/todo-detail";

type TodoDetailPageProps = {
  params: Promise<{ publicId: string }>;
};

export default async function TodoDetailPage({ params }: TodoDetailPageProps) {
  const { publicId } = await params;

  return (
    <AppLayout>
      <TodoDetail publicId={publicId} />
    </AppLayout>
  );
}
