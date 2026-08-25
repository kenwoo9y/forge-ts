import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { describe, it } from 'vitest';
import { ApiStack } from '../lib/stacks/api-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { DeployTargetStack } from '../lib/stacks/deploy-target-stack';
import { NetworkStack } from '../lib/stacks/network-stack';
import { WebStack } from '../lib/stacks/web-stack';

// DeployTargetStack is deployed to STG/PROD accounts. Specifying account/region makes
// the construction of cross-account ARNs deterministic
const STG_ENV = { account: '222222222222', region: 'ap-northeast-1' };
const DEV_ACCOUNT_ID = '111111111111';

function buildDeployTargetStack() {
  const app = new cdk.App();

  const networkStack = new NetworkStack(app, 'TestStgNetworkStack', { env: STG_ENV });
  const databaseStack = new DatabaseStack(app, 'TestStgDatabaseStack', {
    env: STG_ENV,
    vpc: networkStack.vpc,
    rdsSecurityGroup: networkStack.rdsSecurityGroup,
    dbName: 'test_db',
  });
  const sharedStack = new cdk.Stack(app, 'TestStgSharedStack', { env: STG_ENV });
  const jwtSecret = new secretsmanager.Secret(sharedStack, 'JwtSecret');
  const image = ecs.ContainerImage.fromRegistry('nginx');

  const apiStack = new ApiStack(app, 'TestStgApiStack', {
    env: STG_ENV,
    vpc: networkStack.vpc,
    rdsSecurityGroup: networkStack.rdsSecurityGroup,
    database: databaseStack.database,
    databaseCredentials: databaseStack.credentials,
    jwtSecret,
    image,
    dbName: 'test_db',
    deploymentController: ecs.DeploymentControllerType.CODE_DEPLOY,
  });
  const webStack = new WebStack(app, 'TestStgWebStack', {
    env: STG_ENV,
    vpc: networkStack.vpc,
    apiUrl: 'http://api.example.com',
    authSecret: new secretsmanager.Secret(sharedStack, 'AuthSecret'),
    image,
    deploymentController: ecs.DeploymentControllerType.CODE_DEPLOY,
  });

  const stack = new DeployTargetStack(app, 'TestDeployTargetStack', {
    env: STG_ENV,
    envName: 'stg',
    pipelineAccountId: DEV_ACCOUNT_ID,
    envResources: {
      apiStack,
      webStack,
      vpc: networkStack.vpc,
      rdsSecurityGroup: networkStack.rdsSecurityGroup,
      database: databaseStack.database,
      databaseCredentials: databaseStack.credentials,
      dbName: 'test_db',
    },
    ecrRepoArns: {
      api: `arn:aws:ecr:ap-northeast-1:${DEV_ACCOUNT_ID}:repository/forge-ts/api-stg`,
      web: `arn:aws:ecr:ap-northeast-1:${DEV_ACCOUNT_ID}:repository/forge-ts/web-stg`,
    },
  });

  return Template.fromStack(stack);
}

describe('DeployTargetStack', () => {
  const template = buildDeployTargetStack();

  it('creates the Api/Web CodeDeploy applications with explicit names', () => {
    template.hasResourceProperties('AWS::CodeDeploy::Application', { ApplicationName: 'ApiStg' });
    template.hasResourceProperties('AWS::CodeDeploy::Application', { ApplicationName: 'WebStg' });
  });

  it('creates the Api/Web deployment groups with explicit names and a Blue/Green configuration', () => {
    template.hasResourceProperties('AWS::CodeDeploy::DeploymentGroup', {
      DeploymentGroupName: 'ApiStgDeploymentGroup',
      DeploymentStyle: {
        DeploymentOption: 'WITH_TRAFFIC_CONTROL',
        DeploymentType: 'BLUE_GREEN',
      },
    });
    template.hasResourceProperties('AWS::CodeDeploy::DeploymentGroup', {
      DeploymentGroupName: 'WebStgDeploymentGroup',
    });
  });

  it('creates the Prisma migration CodeBuild project, named per convention, only for Api', () => {
    template.hasResourceProperties('AWS::CodeBuild::Project', { Name: 'ApiMigrateStg' });
    template.resourcePropertiesCountIs('AWS::CodeBuild::Project', { Name: 'WebMigrateStg' }, 0);
  });

  it('grants the migration CodeBuild project pull permission on the Dev-account-consolidated ECR repository', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['ecr:BatchGetImage']),
            Resource: `arn:aws:ecr:ap-northeast-1:${DEV_ACCOUNT_ID}:repository/forge-ts/api-stg`,
          }),
        ]),
      },
    });
  });

  it('the cross-account role is named per convention and trusts only assumption from the Dev account', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'pipeline-cross-account-stg',
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'sts:AssumeRole',
            // AccountPrincipal is stack-independent, so the partition is built with `Fn::Join`
            Principal: Match.objectLike({
              AWS: Match.objectLike({
                'Fn::Join': Match.arrayWith([
                  Match.arrayWith([Match.stringLikeRegexp(DEV_ACCOUNT_ID)]),
                ]),
              }),
            }),
          }),
        ]),
      }),
    });
  });

  it('the cross-account role has permission to operate CodeDeploy/CodeBuild/ECS DescribeTaskDefinition', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'CodeDeploy',
            Action: Match.arrayWith(['codedeploy:CreateDeployment']),
          }),
        ]),
      },
    });
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'CodeBuildMigrate',
            Action: Match.arrayWith(['codebuild:StartBuild']),
          }),
        ]),
      },
    });
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'EcsDescribeTaskDefinition',
            Action: 'ecs:DescribeTaskDefinition',
          }),
        ]),
      },
    });
  });
});

// ─── Tests for envName: 'dev' (when PIPELINE_ACCOUNT_ID makes Dev cross-account) ──

describe('DeployTargetStack (envName: dev)', () => {
  const PIPELINE_ACCOUNT_ID = '333333333333';

  const template = (() => {
    const app = new cdk.App();

    const networkStack = new NetworkStack(app, 'TestDevNetworkStack', { env: STG_ENV });
    const databaseStack = new DatabaseStack(app, 'TestDevDatabaseStack', {
      env: STG_ENV,
      vpc: networkStack.vpc,
      rdsSecurityGroup: networkStack.rdsSecurityGroup,
      dbName: 'test_db',
    });
    const sharedStack = new cdk.Stack(app, 'TestDevSharedStack', { env: STG_ENV });
    const jwtSecret = new secretsmanager.Secret(sharedStack, 'JwtSecret');
    const image = ecs.ContainerImage.fromRegistry('nginx');

    const apiStack = new ApiStack(app, 'TestDevApiStack', {
      env: STG_ENV,
      vpc: networkStack.vpc,
      rdsSecurityGroup: networkStack.rdsSecurityGroup,
      database: databaseStack.database,
      databaseCredentials: databaseStack.credentials,
      jwtSecret,
      image,
      dbName: 'test_db',
      deploymentController: ecs.DeploymentControllerType.CODE_DEPLOY,
    });
    const webStack = new WebStack(app, 'TestDevWebStack', {
      env: STG_ENV,
      vpc: networkStack.vpc,
      apiUrl: 'http://api.example.com',
      authSecret: new secretsmanager.Secret(sharedStack, 'AuthSecret'),
      image,
      deploymentController: ecs.DeploymentControllerType.CODE_DEPLOY,
    });

    const stack = new DeployTargetStack(app, 'TestDevDeployTargetStack', {
      env: STG_ENV,
      envName: 'dev',
      pipelineAccountId: PIPELINE_ACCOUNT_ID,
      envResources: {
        apiStack,
        webStack,
        vpc: networkStack.vpc,
        rdsSecurityGroup: networkStack.rdsSecurityGroup,
        database: databaseStack.database,
        databaseCredentials: databaseStack.credentials,
        dbName: 'test_db',
      },
      ecrRepoArns: {
        api: `arn:aws:ecr:ap-northeast-1:${PIPELINE_ACCOUNT_ID}:repository/forge-ts/api-dev`,
        web: `arn:aws:ecr:ap-northeast-1:${PIPELINE_ACCOUNT_ID}:repository/forge-ts/web-dev`,
      },
    });

    return Template.fromStack(stack);
  })();

  it('creates resources following the Dev naming convention (ApiDev, etc.)', () => {
    template.hasResourceProperties('AWS::CodeDeploy::Application', { ApplicationName: 'ApiDev' });
    template.hasResourceProperties('AWS::CodeBuild::Project', { Name: 'ApiMigrateDev' });
  });

  it('the cross-account role trusts only assumption from the Pipeline account', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'pipeline-cross-account-dev',
    });
  });
});
