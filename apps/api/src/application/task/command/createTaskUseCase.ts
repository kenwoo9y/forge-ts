import { Task } from '../../../domain/task/entity.js';
import type { ITaskRepository } from '../../../domain/task/repository.js';
import { TaskStatus } from '../../../domain/task/value/taskStatus.js';
import type { CreateTaskInput, CreateTaskOutput } from '../dto.js';

/**
 * タスク作成ユースケースのインターフェース。
 */
export interface ICreateTaskUseCase {
  /**
   * タスクを作成する。
   * @param input タスク作成に必要な入力データ
   * @returns 作成されたタスクの出力データ
   */
  execute(input: CreateTaskInput): Promise<CreateTaskOutput>;
}

/**
 * タスク作成ユースケースの実装クラス。
 * ステータスを値オブジェクトに変換してタスクを保存する。
 */
export class CreateTaskUseCase implements ICreateTaskUseCase {
  /**
   * @param taskRepository タスクリポジトリ
   */
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * タスクを作成する。
   * @param input タスク作成に必要な入力データ
   * @returns 作成されたタスクの出力データ
   */
  async execute(input: CreateTaskInput): Promise<CreateTaskOutput> {
    const status = TaskStatus.create(input.status);
    const task = new Task(
      BigInt(0),
      '',
      input.title,
      input.description,
      input.dueDate,
      status,
      input.ownerId,
      new Date(),
      new Date()
    );
    const saved = await this.taskRepository.save(task);
    return {
      publicId: saved.publicId,
      title: saved.title,
      description: saved.description,
      dueDate: saved.dueDate,
      status: saved.status.toString(),
      ownerId: saved.ownerId,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }
}
