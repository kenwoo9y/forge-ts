import type { PrismaClient } from 'db/generated/prisma/index.js';
import { Task } from '../../../domain/task/entity.js';
import type { ITaskRepository, TaskUpdateData } from '../../../domain/task/repository.js';
import { TaskStatus } from '../../../domain/task/value/taskStatus.js';

/**
 * Prismaを使ったタスクリポジトリの実装クラス。
 * `ITaskRepository` インターフェースに従い、データベースへのCRUD操作を行う。
 */
export class PrismaTaskRepository implements ITaskRepository {
  /**
   * @param prisma Prismaクライアント
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * タスクをデータベースに新規保存する。
   * @param task 保存するタスクエンティティ
   * @returns 保存されたタスクエンティティ
   */
  async save(task: Task): Promise<Task> {
    const created = await this.prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        status: task.status.toString(),
        ownerId: task.ownerId,
      },
    });
    return this.toEntity(created);
  }

  /**
   * タスクを更新する。
   * @param publicId 更新対象のタスクの公開ID
   * @param data 更新するフィールドのデータ
   * @returns 更新後のタスクエンティティ
   * @throws タスクが存在しない場合にエラーをスローする
   */
  async update(publicId: string, data: TaskUpdateData): Promise<Task> {
    const prismaData: Record<string, unknown> = {};
    if ('title' in data) prismaData.title = data.title;
    if ('description' in data) prismaData.description = data.description;
    if ('dueDate' in data) prismaData.dueDate = data.dueDate;
    if ('status' in data) prismaData.status = data.status?.toString();
    if ('ownerId' in data) prismaData.ownerId = data.ownerId;

    try {
      const updated = await this.prisma.task.update({
        where: { publicId },
        data: prismaData,
      });
      return this.toEntity(updated);
    } catch (e) {
      if (e instanceof Error && 'code' in e && (e as { code: string }).code === 'P2025') {
        throw new Error('Task not found');
      }
      throw e;
    }
  }

  /**
   * タスクを削除する。
   * @param publicId 削除対象のタスクの公開ID
   * @throws タスクが存在しない場合にエラーをスローする
   */
  async delete(publicId: string): Promise<void> {
    try {
      await this.prisma.task.delete({ where: { publicId } });
    } catch (e) {
      if (e instanceof Error && 'code' in e && (e as { code: string }).code === 'P2025') {
        throw new Error('Task not found');
      }
      throw e;
    }
  }

  /**
   * Prismaのレコードをタスクエンティティに変換する。
   * @param record Prismaから取得したタスクレコード
   * @returns 変換されたタスクエンティティ
   */
  private toEntity(record: {
    id: bigint;
    publicId: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
    status: string;
    ownerId: bigint;
    createdAt: Date;
    updatedAt: Date;
  }): Task {
    return new Task(
      record.id,
      record.publicId,
      record.title,
      record.description,
      record.dueDate,
      TaskStatus.create(record.status),
      record.ownerId,
      record.createdAt,
      record.updatedAt
    );
  }
}
