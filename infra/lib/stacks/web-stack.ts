import * as cdk from 'aws-cdk-lib';
import type * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import type * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';
import { EcsFargateService } from '../constructs/ecs-fargate-service';

export interface WebStackProps extends cdk.StackProps {
  /** NetworkStackで定義したVPC */
  vpc: ec2.Vpc;
  /** バックエンドAPIのURL */
  apiUrl: string;
  /** Secrets ManagerにあるAuth.js署名シークレット */
  authSecret: secretsmanager.ISecret;
  /** コンテナイメージ（デフォルト: apps/webのDockerfileからビルド） */
  image?: ecs.ContainerImage;
  /** コンテナ起動コマンド上書き（プレースホルダ用途） */
  command?: string[];
  /** タスクのCPUユニット数（デフォルト: 256） */
  cpu?: number;
  /** タスクのメモリ (MiB)（デフォルト: 512） */
  memoryLimitMiB?: number;
  /** 起動タスク数（デフォルト: 1） */
  desiredCount?: number;
  /** デプロイコントローラー（デフォルト: ECS） */
  deploymentController?: ecs.DeploymentControllerType;
  /** タスク定義のfamily名（デプロイコントローラーが CODE_DEPLOY の場合のみ使用） */
  family?: string;
}

/**
 * Webフロントエンド層のスタック
 * Next.jsアプリをECS Fargateでホストする
 */
export class WebStack extends cdk.Stack {
  /** ECS Fargateサービスのコンストラクト */
  public readonly ecsFargateService: EcsFargateService;

  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const {
      vpc,
      apiUrl,
      authSecret,
      image = ecs.ContainerImage.fromAsset('../apps/web'),
      command,
      cpu = 256,
      memoryLimitMiB = 512,
      desiredCount = 1,
      deploymentController,
      family,
    } = props;

    this.ecsFargateService = new EcsFargateService(this, 'WebService', {
      vpc,
      image,
      containerPort: 3001,
      command,
      family,
      environment: {
        API_URL: apiUrl,
        NODE_ENV: 'production',
      },
      secrets: {
        AUTH_SECRET: ecs.Secret.fromSecretsManager(authSecret),
      },
      cpu,
      memoryLimitMiB,
      desiredCount,
      deploymentController,
    });

    // AUTH_URLを明示的に渡すことでAuth.jsのURL推測に依存しないようにする
    // ALBのDNS名は自分自身（WebService）のものを参照するため、コンテナ生成後に追加する
    this.ecsFargateService.taskDefinition.defaultContainer?.addEnvironment(
      'AUTH_URL',
      `http://${this.ecsFargateService.loadBalancer.loadBalancerDnsName}`
    );

    const executionRole = this.ecsFargateService.taskDefinition.executionRole;
    if (executionRole) {
      authSecret.grantRead(executionRole);
    }
  }
}
