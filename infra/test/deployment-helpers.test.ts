import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { describe, expect, it } from 'vitest';
import { buildAppEnvConfig } from '../lib/constructs/deployment-helpers';
import { NetworkStack } from '../lib/stacks/network-stack';
import { WebStack } from '../lib/stacks/web-stack';

describe('buildAppEnvConfig', () => {
  it('デプロイコントローラーがCODE_DEPLOYでない（greenTargetGroupが存在しない）場合はエラーを投げる', () => {
    const app = new cdk.App();
    const networkStack = new NetworkStack(app, 'TestNetworkStack');
    const sharedStack = new cdk.Stack(app, 'TestSharedStack');
    const authSecret = new secretsmanager.Secret(sharedStack, 'AuthSecret');

    // deploymentController未指定 = デフォルトのECS（CODE_DEPLOYではない）ため greenTargetGroup が存在しない
    const webStack = new WebStack(app, 'TestWebStack', {
      vpc: networkStack.vpc,
      apiUrl: 'http://api.example.com',
      authSecret,
      image: ecs.ContainerImage.fromRegistry('nginx'),
    });

    const repository = ecr.Repository.fromRepositoryName(sharedStack, 'DummyRepo', 'dummy-repo');

    expect(() => buildAppEnvConfig(webStack, repository, 'web-dev', '3001')).toThrow(
      'AppStack must use CODE_DEPLOY deployment controller'
    );
  });
});
