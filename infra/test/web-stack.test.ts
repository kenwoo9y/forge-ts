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

  it('creates an ECS cluster', () => {
    template.resourceCountIs('AWS::ECS::Cluster', 1);
  });

  it('creates a Fargate service', () => {
    template.resourceCountIs('AWS::ECS::Service', 1);
  });

  it('creates a task definition', () => {
    template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
  });

  it('creates an ALB', () => {
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
  });

  it('the container uses port 3001', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          PortMappings: Match.arrayWith([Match.objectLike({ ContainerPort: 3001 })]),
        }),
      ]),
    });
  });

  it('places the task in a private subnet', () => {
    template.hasResourceProperties('AWS::ECS::Service', {
      NetworkConfiguration: Match.objectLike({
        AwsvpcConfiguration: Match.objectLike({
          AssignPublicIp: 'DISABLED',
        }),
      }),
    });
  });

  it('sets NODE_ENV=production', () => {
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

  it('sets API_URL as an environment variable', () => {
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

  it('sets the CODE_DEPLOY deployment controller', () => {
    template.hasResourceProperties('AWS::ECS::Service', {
      DeploymentController: { Type: 'CODE_DEPLOY' },
    });
  });

  it('places the task in a private subnet', () => {
    template.hasResourceProperties('AWS::ECS::Service', {
      NetworkConfiguration: Match.objectLike({
        AwsvpcConfiguration: Match.objectLike({ AssignPublicIp: 'DISABLED' }),
      }),
    });
  });

  it('creates two target groups for blue/green', () => {
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 2);
  });

  it('creates two listeners, for production (80) and test (8080)', () => {
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::Listener', 2);
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', { Port: 80 });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', { Port: 8080 });
  });

  it('the container uses port 3001', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          PortMappings: Match.arrayWith([Match.objectLike({ ContainerPort: 3001 })]),
        }),
      ]),
    });
  });
});
