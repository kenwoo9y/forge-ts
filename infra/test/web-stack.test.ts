import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { describe, it } from 'vitest';
import { NetworkStack } from '../lib/stacks/network-stack';
import { WebStack } from '../lib/stacks/web-stack';

function buildWebStack(
  app: cdk.App,
  suffix: string,
  opts: { deploymentController?: ecs.DeploymentControllerType } = {}
) {
  const networkStack = new NetworkStack(app, `TestNetworkStack${suffix}`);
  const sharedStack = new cdk.Stack(app, `TestSharedStack${suffix}`);
  const authSecret = new secretsmanager.Secret(sharedStack, 'AuthSecret');
  const stack = new WebStack(app, `TestWebStack${suffix}`, {
    vpc: networkStack.vpc,
    apiUrl: 'http://api.example.com',
    authSecret,
    image: ecs.ContainerImage.fromRegistry('nginx'),
    ...opts,
  });
  return Template.fromStack(stack);
}

describe('WebStack', () => {
  const template = buildWebStack(new cdk.App(), 'Ecs');

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

  it('コンテナがポート3001を使用する', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          PortMappings: Match.arrayWith([Match.objectLike({ ContainerPort: 3001 })]),
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

  it('API_URLが環境変数に設定される', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Environment: Match.arrayWith([
            Match.objectLike({ Name: 'API_URL', Value: 'http://api.example.com' }),
          ]),
        }),
      ]),
    });
  });
});

describe('WebStack (CODE_DEPLOY)', () => {
  const template = buildWebStack(new cdk.App(), 'CodeDeploy', {
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

  it('コンテナがポート3001を使用する', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          PortMappings: Match.arrayWith([Match.objectLike({ ContainerPort: 3001 })]),
        }),
      ]),
    });
  });
});
