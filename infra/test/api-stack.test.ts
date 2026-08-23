import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { describe, it } from 'vitest';

process.env.POSTGRES_DB = 'test_db';

import { ApiStack } from '../lib/stacks/api-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { NetworkStack } from '../lib/stacks/network-stack';

function buildApiStack(
  app: cdk.App,
  suffix: string,
  opts: { deploymentController?: ecs.DeploymentControllerType } = {}
) {
  const networkStack = new NetworkStack(app, `TestNetworkStack${suffix}`);
  const databaseStack = new DatabaseStack(app, `TestDatabaseStack${suffix}`, {
    vpc: networkStack.vpc,
    rdsSecurityGroup: networkStack.rdsSecurityGroup,
    dbName: 'test_db',
  });
  const sharedStack = new cdk.Stack(app, `TestSharedStack${suffix}`);
  const jwtSecret = new secretsmanager.Secret(sharedStack, 'JwtSecret');
  const stack = new ApiStack(app, `TestApiStack${suffix}`, {
    vpc: networkStack.vpc,
    rdsSecurityGroup: networkStack.rdsSecurityGroup,
    database: databaseStack.database,
    databaseCredentials: databaseStack.credentials,
    jwtSecret,
    image: ecs.ContainerImage.fromRegistry('nginx'),
    dbName: 'test_db',
    ...opts,
  });
  return Template.fromStack(stack);
}

describe('ApiStack', () => {
  const template = buildApiStack(new cdk.App(), 'Ecs');

  it('ECSクラスターが作成される', () => {
    template.resourceCountIs('AWS::ECS::Cluster', 1);
  });

  it('Fargateサービスが作成される', () => {
    template.resourceCountIs('AWS::ECS::Service', 1);
  });

  it('タスク定義が作成される', () => {
    template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
  });

  it('ALBが作成される', () => {
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
  });

  it('コンテナがポート3000を使用する', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          PortMappings: Match.arrayWith([Match.objectLike({ ContainerPort: 3000 })]),
        }),
      ]),
    });
  });

  it('タスクがプライベートサブネットに配置される', () => {
    template.hasResourceProperties('AWS::ECS::Service', {
      NetworkConfiguration: Match.objectLike({
        AwsvpcConfiguration: Match.objectLike({
          AssignPublicIp: 'DISABLED',
        }),
      }),
    });
  });

  it('DB_HOSTが環境変数に設定される', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Environment: Match.arrayWith([Match.objectLike({ Name: 'DB_HOST' })]),
        }),
      ]),
    });
  });

  it('DB_NAMEがPOSTGRES_DBの値に設定される', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Environment: Match.arrayWith([Match.objectLike({ Name: 'DB_NAME', Value: 'test_db' })]),
        }),
      ]),
    });
  });

  it('DB_PASSWORDがSecretsManagerから注入される', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Secrets: Match.arrayWith([Match.objectLike({ Name: 'DB_PASSWORD' })]),
        }),
      ]),
    });
  });

  it('JWT_SECRETがSecretsManagerから注入される', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Secrets: Match.arrayWith([Match.objectLike({ Name: 'JWT_SECRET' })]),
        }),
      ]),
    });
  });

  it('NODE_ENV=productionが設定される', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Environment: Match.arrayWith([
            Match.objectLike({ Name: 'NODE_ENV', Value: 'production' }),
          ]),
        }),
      ]),
    });
  });
});

describe('ApiStack (CODE_DEPLOY)', () => {
  const template = buildApiStack(new cdk.App(), 'CodeDeploy', {
    deploymentController: ecs.DeploymentControllerType.CODE_DEPLOY,
  });

  it('CODE_DEPLOYデプロイコントローラーが設定される', () => {
    template.hasResourceProperties('AWS::ECS::Service', {
      DeploymentController: { Type: 'CODE_DEPLOY' },
    });
  });

  it('タスクがプライベートサブネットに配置される', () => {
    template.hasResourceProperties('AWS::ECS::Service', {
      NetworkConfiguration: Match.objectLike({
        AwsvpcConfiguration: Match.objectLike({ AssignPublicIp: 'DISABLED' }),
      }),
    });
  });

  it('ブルー・グリーン用に2つのターゲットグループが作成される', () => {
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 2);
  });

  it('本番用(80)とテスト用(8080)の2つのリスナーが作成される', () => {
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::Listener', 2);
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', { Port: 80 });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', { Port: 8080 });
  });

  it('コンテナがポート3000を使用する', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          PortMappings: Match.arrayWith([Match.objectLike({ ContainerPort: 3000 })]),
        }),
      ]),
    });
  });

  it('CloudWatch Logsへのログ出力が設定される', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          LogConfiguration: Match.objectLike({ LogDriver: 'awslogs' }),
        }),
      ]),
    });
  });
});
