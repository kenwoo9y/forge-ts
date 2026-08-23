import type * as ec2 from 'aws-cdk-lib/aws-ec2';
import type * as ecr from 'aws-cdk-lib/aws-ecr';
import type * as ecs from 'aws-cdk-lib/aws-ecs';
import type * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import type * as rds from 'aws-cdk-lib/aws-rds';
import type { ApiStack } from './api-stack';
import type { WebStack } from './web-stack';

export interface EnvResources {
  apiStack: ApiStack;
  webStack: WebStack;
  /** マイグレーション用CodeBuildをRDSと同じVPCに配置するために使用 */
  vpc: ec2.Vpc;
  /** マイグレーション用CodeBuildからのアクセスを許可するために使用 */
  rdsSecurityGroup: ec2.SecurityGroup;
  database: rds.DatabaseInstance;
  databaseCredentials: rds.DatabaseSecret;
  dbName: string;
}

/**
 * 同一アカウント内のライブCDK参照から組み立てるアプリ環境設定。
 * DEV（PipelineStackと同一アカウント）と、Stg/Prod（DeployTargetStackから見て同一アカウント）の双方で使用する。
 */
export interface LocalAppEnvConfig {
  repository: ecr.IRepository;
  fargateService: ecs.FargateService;
  /**
   * cdk deployのたびに最新化されるタスク定義のfamily名（revision省略で最新ACTIVEを指す）。
   * クロスアカウントの`ecs describe-task-definition`はrevision付きARN（デプロイ時に決まるトークン）をアカウントを跨いで参照できないため、
   * family名で統一する。
   */
  taskDefFamily: string;
  blueTargetGroup: elbv2.ApplicationTargetGroup;
  greenTargetGroup: elbv2.ApplicationTargetGroup;
  productionListener: elbv2.ApplicationListener;
  testListener?: elbv2.ApplicationListener;
  containerPort: string;
}
