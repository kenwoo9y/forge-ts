import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import type * as rds from 'aws-cdk-lib/aws-rds';
import type * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';
import { EcsFargateService } from '../constructs/ecs-fargate-service';

export interface ApiStackProps extends cdk.StackProps {
  /** NetworkStackで定義したVPC */
  vpc: ec2.Vpc;
  /** NetworkStackで定義したRDS用セキュリティグループ（ECS→RDSの接続許可に使用） */
  rdsSecurityGroup: ec2.SecurityGroup;
  /** DatabaseStackで作成したRDSインスタンス */
  database: rds.DatabaseInstance;
  /** DatabaseStackで作成したDB認証情報（Secrets Manager） */
  databaseCredentials: rds.DatabaseSecret;
  /** Secrets ManagerにあるJWT署名シークレット */
  jwtSecret: secretsmanager.ISecret;
  /** PostgreSQL データベース名 */
  dbName: string;
  /** コンテナイメージ（デフォルト: apps/apiのDockerfileからビルド） */
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
  /** ALBをインターネット向けにするか（デフォルト: false） */
  internetFacing?: boolean;
  /** タスク定義のfamily名（デプロイコントローラーが CODE_DEPLOY の場合のみ使用） */
  family?: string;
}

/**
 * APIバックエンド層のスタック
 * HonoアプリをECS Fargateでホストし、RDS PostgreSQLに接続する
 */
export class ApiStack extends cdk.Stack {
  /** ECS Fargateサービスのコンストラクト */
  public readonly ecsFargateService: EcsFargateService;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const {
      vpc,
      rdsSecurityGroup,
      database,
      databaseCredentials,
      jwtSecret,
      dbName,
      image = ecs.ContainerImage.fromAsset('../apps/api'),
      command,
      cpu = 256,
      memoryLimitMiB = 512,
      desiredCount = 1,
      deploymentController,
      internetFacing = false,
      family,
    } = props;

    this.ecsFargateService = new EcsFargateService(this, 'ApiService', {
      vpc,
      image,
      containerPort: 3000,
      command,
      internetFacing,
      family,
      environment: {
        DB_HOST: database.dbInstanceEndpointAddress,
        DB_PORT: database.dbInstanceEndpointPort,
        DB_NAME: dbName,
        NODE_ENV: 'production',
      },
      secrets: {
        DB_USERNAME: ecs.Secret.fromSecretsManager(databaseCredentials, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(databaseCredentials, 'password'),
        JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
      },
      cpu,
      memoryLimitMiB,
      desiredCount,
      deploymentController,
    });

    // ECSサービスのSG → RDSのSG へのポート5432インバウンドルールを追加
    new ec2.CfnSecurityGroupIngress(this, 'EcsToRdsIngress', {
      groupId: rdsSecurityGroup.securityGroupId,
      ipProtocol: 'tcp',
      fromPort: 5432,
      toPort: 5432,
      sourceSecurityGroupId:
        this.ecsFargateService.fargateService.connections.securityGroups[0].securityGroupId,
    });

    const executionRole = this.ecsFargateService.taskDefinition.executionRole;
    if (executionRole) {
      databaseCredentials.grantRead(executionRole);
      jwtSecret.grantRead(executionRole);
    }
  }
}
