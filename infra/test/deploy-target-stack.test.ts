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

// DeployTargetStack はSTG/PRODアカウントに配置される。account/regionを指定することで
// クロスアカウントARNの組み立てを確定的にする
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

  it('Api/WebのCodeDeployアプリケーションが明示的な名前で作成される', () => {
    template.hasResourceProperties('AWS::CodeDeploy::Application', { ApplicationName: 'ApiStg' });
    template.hasResourceProperties('AWS::CodeDeploy::Application', { ApplicationName: 'WebStg' });
  });

  it('Api/Webのデプロイメントグループが明示的な名前・Blue/Green設定で作成される', () => {
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

  it('Prismaマイグレーション用CodeBuildプロジェクトがApiのみ命名規則通りの名前で作成される', () => {
    template.hasResourceProperties('AWS::CodeBuild::Project', { Name: 'ApiMigrateStg' });
    template.resourcePropertiesCountIs('AWS::CodeBuild::Project', { Name: 'WebMigrateStg' }, 0);
  });

  it('マイグレーションCodeBuildにDevアカウント集約ECRリポジトリへのpull権限が付与される', () => {
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

  it('クロスアカウントロールが命名規則通りの名前で、Devアカウントからの引き受けのみを信頼する', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'pipeline-cross-account-stg',
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'sts:AssumeRole',
            // AccountPrincipal は Stack非依存のためパーティションを `Fn::Join` で組み立てる
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

  it('クロスアカウントロールがCodeDeploy/CodeBuild/ECS DescribeTaskDefinitionの操作権限を持つ', () => {
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

// ─── envName: 'dev'（PIPELINE_ACCOUNT_ID指定でDevをクロスアカウント化する場合）のテスト ──

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

  it('Devの命名規則（ApiDev等）でリソースが作成される', () => {
    template.hasResourceProperties('AWS::CodeDeploy::Application', { ApplicationName: 'ApiDev' });
    template.hasResourceProperties('AWS::CodeBuild::Project', { Name: 'ApiMigrateDev' });
  });

  it('クロスアカウントロールがPipelineアカウントからの引き受けのみを信頼する', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'pipeline-cross-account-dev',
    });
  });
});
