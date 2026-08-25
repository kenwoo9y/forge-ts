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

  it('the container uses port 3000', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          PortMappings: Match.arrayWith([Match.objectLike({ ContainerPort: 3000 })]),
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

  it('sets DB_HOST as an environment variable', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Environment: Match.arrayWith([Match.objectLike({ Name: 'DB_HOST' })]),
        }),
      ]),
    });
  });

  it('sets DB_NAME to the value of POSTGRES_DB', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Environment: Match.arrayWith([Match.objectLike({ Name: 'DB_NAME', Value: 'test_db' })]),
        }),
      ]),
    });
  });

  it('injects DB_PASSWORD from Secrets Manager', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Secrets: Match.arrayWith([Match.objectLike({ Name: 'DB_PASSWORD' })]),
        }),
      ]),
    });
  });

  it('injects JWT_SECRET from Secrets Manager', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Secrets: Match.arrayWith([Match.objectLike({ Name: 'JWT_SECRET' })]),
        }),
      ]),
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
});

describe('ApiStack (CODE_DEPLOY)', () => {
  const template = buildApiStack(new cdk.App(), 'CodeDeploy', {
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

  it('the container uses port 3000', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          PortMappings: Match.arrayWith([Match.objectLike({ ContainerPort: 3000 })]),
        }),
      ]),
    });
  });

  it('configures log output to CloudWatch Logs', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          LogConfiguration: Match.objectLike({ LogDriver: 'awslogs' }),
        }),
      ]),
    });
  });
});
