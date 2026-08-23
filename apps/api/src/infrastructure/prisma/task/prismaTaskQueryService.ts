import type { PrismaClient } from 'db/generated/prisma/index.js';
import type {
  ITaskQueryService,
  TaskReadModel,
} from '../../../application/task/query/queryService.js';

/**
 * Prismaを使ったタスククエリサービスの実装クラス。
 * `ITaskQueryService` インターフェースに従い、読み取り専用のタスク検索を行う。
 */
export class PrismaTaskQueryService implements ITaskQueryService {
  /**
   * @param prisma Prismaクライアント
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 公開IDでタスクを取得する。
   * @param publicId 検索するタスクの公開ID
   * @returns 該当するタスクの読み取りモデル。存在しない場合は `null`
   */
  async findByPublicId(publicId: string): Promise<TaskReadModel | null> {
    const found = await this.prisma.task.findUnique({
      where: { publicId },
    });
    if (!found) return null;
    return this.toReadModel(found);
  }

  /**
   * 所有者IDでタスク一覧を取得する。
   * @param ownerId 検索する所有者のユーザーID
   * @returns 該当するタスクの読み取りモデルの配列
   */
  async findByOwnerId(ownerId: bigint): Promise<TaskReadModel[]> {
    const tasks = await this.prisma.task.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return tasks.map((task) => this.toReadModel(task));
  }

  /**
   * Prismaのレコードをタスクの読み取りモデルに変換する。
   * @param record Prismaから取得したタスクレコード
   * @returns 変換されたタスクの読み取りモデル
   */
  private toReadModel(record: {
    publicId: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
    status: string;
    ownerId: bigint;
    createdAt: Date;
    updatedAt: Date;
  }): TaskReadModel {
    return {
      publicId: record.publicId,
      title: record.title,
      description: record.description,
      dueDate: record.dueDate,
      status: record.status,
      ownerId: record.ownerId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
