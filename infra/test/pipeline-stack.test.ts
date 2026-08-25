import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { describe, expect, it } from 'vitest';
import { ApiStack } from '../lib/stacks/api-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { EcrStack } from '../lib/stacks/ecr-stack';
import { NetworkStack } from '../lib/stacks/network-stack';
import { PipelineStack } from '../lib/stacks/pipeline-stack';
import { WebStack } from '../lib/stacks/web-stack';

// Test setup for PipelineStack
// Specifying account/region makes the construction of ARNs deterministic
const TEST_ENV = { account: '123456789012', region: 'ap-northeast-1' };

function buildPipelineStack() {
  const app = new cdk.App();

  const networkStack = new NetworkStack(app, 'TestNetworkStack', { env: TEST_ENV });
  const databaseStack = new DatabaseStack(app, 'TestDatabaseStack', {
    env: TEST_ENV,
    vpc: networkStack.vpc,
    rdsSecurityGroup: networkStack.rdsSecurityGroup,
    dbName: 'test_db',
  });
  const sharedStack = new cdk.Stack(app, 'TestSharedStack', { env: TEST_ENV });
  const jwtSecret = new secretsmanager.Secret(sharedStack, 'JwtSecret');

  // Create only DEV (don't specify stg/prod)
  const ecrStack = new EcrStack(app, 'TestEcrStack', { env: TEST_ENV });

  const image = ecs.ContainerImage.fromRegistry('nginx');

  const apiStack = new ApiStack(app, 'TestApiStack', {
    env: TEST_ENV,
    vpc: networkStack.vpc,
    rdsSecurityGroup: networkStack.rdsSecurityGroup,
    database: databaseStack.database,
    databaseCredentials: databaseStack.credentials,
    jwtSecret,
    image,
    dbName: 'test_db',
    deploymentController: ecs.DeploymentControllerType.CODE_DEPLOY,
  });

  const webStack = new WebStack(app, 'TestWebStack', {
    env: TEST_ENV,
    vpc: networkStack.vpc,
    apiUrl: 'http://api.example.com',
    authSecret: new secretsmanager.Secret(sharedStack, 'AuthSecret'),
    image,
    deploymentController: ecs.DeploymentControllerType.CODE_DEPLOY,
  });

  const pipelineStack = new PipelineStack(app, 'TestPipelineStack', {
    env: TEST_ENV,
    githubOrg: 'acme',
    githubRepo: 'forge',

    ecrStack,
    dev: {
      kind: 'local',
      resources: {
        apiStack,
        webStack,
        vpc: networkStack.vpc,
        rdsSecurityGroup: networkStack.rdsSecurityGroup,
        database: databaseStack.database,
        databaseCredentials: databaseStack.credentials,
        dbName: 'test_db',
      },
    },
  });

  return Template.fromStack(pipelineStack);
}

describe('PipelineStack', () => {
  // Run the heavy setup only once
  const template = buildPipelineStack();

  // ─── GitHub OIDC ────────────────────────────────────────────────────────────

  describe('GitHub OIDC provider', () => {
    it('creates one OIDC provider', () => {
      template.resourceCountIs('Custom::AWSCDKOpenIdConnectProvider', 1);
    });

    it('sets the GitHub Actions endpoint', () => {
      template.hasResourceProperties('Custom::AWSCDKOpenIdConnectProvider', {
        Url: 'https://token.actions.githubusercontent.com',
      });
    });

    it('sets sts.amazonaws.com in the aud claim', () => {
      template.hasResourceProperties('Custom::AWSCDKOpenIdConnectProvider', {
        ClientIDList: Match.arrayWith(['sts.amazonaws.com']),
      });
    });
  });

  // ─── OIDC roles ──────────────────────────────────────────────────────────────

  describe('OIDC role for app deployment', () => {
    it('creates the role with the correct name', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'github-actions-app-deploy',
      });
    });

    it('sets a trust policy scoped to pushes to the main branch', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'github-actions-app-deploy',
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sts:AssumeRoleWithWebIdentity',
              Condition: Match.objectLike({
                StringEquals: Match.objectLike({
                  'token.actions.githubusercontent.com:sub': 'repo:acme/forge:ref:refs/heads/main',
                }),
              }),
            }),
          ]),
        }),
      });
    });

    it('grants ECR push permission', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['ecr:PutImage']),
            }),
          ]),
        },
        Roles: Match.arrayWith([Match.objectLike({ Ref: Match.anyValue() })]),
      });
    });

    it('grants GetAuthorizationToken permission', () => {
      // CDK generates a single action as a string
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'EcrAuth',
              Action: 'ecr:GetAuthorizationToken',
              Resource: '*',
            }),
          ]),
        },
      });
    });
  });

  describe('OIDC role for infra deployment', () => {
    it('creates the role with the correct name', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'github-actions-infra-deploy',
      });
    });

    it('sets a trust policy scoped to the main Environment', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'github-actions-infra-deploy',
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sts:AssumeRoleWithWebIdentity',
              Condition: Match.objectLike({
                StringEquals: Match.objectLike({
                  'token.actions.githubusercontent.com:sub': 'repo:acme/forge:environment:main',
                }),
              }),
            }),
          ]),
        }),
      });
    });

    it('grants AssumeRole permission on the CDK bootstrap role', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'CdkDeploy',
              Action: 'sts:AssumeRole',
              Resource: 'arn:aws:iam::123456789012:role/cdk-*',
            }),
          ]),
        },
        Roles: Match.arrayWith([
          Match.objectLike({ Ref: Match.stringLikeRegexp('InfraDeployOidcRole') }),
        ]),
      });
    });
  });

  // ─── CodePipeline ────────────────────────────────────────────────────────────

  describe('pipeline', () => {
    it('creates 2 pipelines (API, Web)', () => {
      template.resourceCountIs('AWS::CodePipeline::Pipeline', 2);
    });

    it('the app pipeline consists of 3 DEV stages (Source -> GenerateDev -> DeployDev)', () => {
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Name: 'ApiAppPipeline',
        Stages: Match.arrayWith([
          Match.objectLike({ Name: 'Source' }),
          Match.objectLike({ Name: 'GenerateDev' }),
          Match.objectLike({ Name: 'DeployDev' }),
        ]),
      });
    });

    it('the MigrateDev stage exists only in the Api pipeline, not the Web pipeline', () => {
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Name: 'ApiAppPipeline',
        Stages: Match.arrayWith([Match.objectLike({ Name: 'MigrateDev' })]),
      });
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Name: 'WebAppPipeline',
        Stages: Match.not(Match.arrayWith([Match.objectLike({ Name: 'MigrateDev' })])),
      });
    });

    it('sets the ECR source action (API pipeline)', () => {
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Name: 'ApiAppPipeline',
        Stages: Match.arrayWith([
          Match.objectLike({
            Name: 'Source',
            Actions: Match.arrayWith([
              Match.objectLike({
                ActionTypeId: Match.objectLike({
                  Category: 'Source',
                  Provider: 'ECR',
                }),
              }),
            ]),
          }),
        ]),
      });
    });
  });

  // ─── CodeBuild ───────────────────────────────────────────────────────────────

  describe('CodeBuild project', () => {
    it('the infra deploy OIDC role has AssumeRole permission on the CDK bootstrap role', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'CdkDeploy',
              Action: 'sts:AssumeRole',
              Resource: 'arn:aws:iam::123456789012:role/cdk-*',
            }),
          ]),
        },
      });
    });

    it('the Generate project has ECS describe permission', () => {
      const policies = template.findResources('AWS::IAM::Policy');
      const hasEcsDescribe = Object.values(policies).some((p) => {
        const statements = p.Properties?.PolicyDocument?.Statement ?? [];
        return statements.some((s: { Action: string | string[] }) =>
          Array.isArray(s.Action)
            ? s.Action.includes('ecs:DescribeTaskDefinition')
            : s.Action === 'ecs:DescribeTaskDefinition'
        );
      });
      expect(hasEcsDescribe).toBe(true);
    });
  });

  // ─── CodeDeploy ──────────────────────────────────────────────────────────────

  describe('CodeDeploy', () => {
    it('creates 2 ECS applications (API, Web)', () => {
      template.hasResourceProperties('AWS::CodeDeploy::Application', {
        ComputePlatform: 'ECS',
      });
      // 2 total, for API and Web
      const apps = template.findResources('AWS::CodeDeploy::Application');
      expect(Object.keys(apps).length).toBe(2);
    });

    it('creates 2 deployment groups (API, Web)', () => {
      const groups = template.findResources('AWS::CodeDeploy::DeploymentGroup');
      expect(Object.keys(groups).length).toBe(2);
    });

    it('uses the linear deployment configuration (LINEAR_10PERCENT_EVERY_1MINUTES)', () => {
      template.hasResourceProperties('AWS::CodeDeploy::DeploymentGroup', {
        DeploymentConfigName: 'CodeDeployDefault.ECSLinear10PercentEvery1Minutes',
      });
    });

    it('enables automatic rollback on deployment failure', () => {
      template.hasResourceProperties('AWS::CodeDeploy::DeploymentGroup', {
        AutoRollbackConfiguration: {
          Enabled: true,
          Events: Match.arrayWith(['DEPLOYMENT_FAILURE']),
        },
      });
    });

    it('sets the Blue/Green deployment style', () => {
      template.hasResourceProperties('AWS::CodeDeploy::DeploymentGroup', {
        DeploymentStyle: {
          DeploymentOption: 'WITH_TRAFFIC_CONTROL',
          DeploymentType: 'BLUE_GREEN',
        },
      });
    });
  });
});

// ─── Tests with STG promotion ─────────────────────────────────────────────────

describe('PipelineStack (stgAccountId specified)', () => {
  const STG_ACCOUNT_ID = '222222222222';

  const template = (() => {
    const app = new cdk.App();
    const networkStack = new NetworkStack(app, 'TestNetworkStack', { env: TEST_ENV });
    const databaseStack = new DatabaseStack(app, 'TestDatabaseStack', {
      env: TEST_ENV,
      vpc: networkStack.vpc,
      rdsSecurityGroup: networkStack.rdsSecurityGroup,
      dbName: 'test_db',
    });
    const sharedStack = new cdk.Stack(app, 'TestSharedStack', { env: TEST_ENV });
    const jwtSecret = new secretsmanager.Secret(sharedStack, 'JwtSecret');

    // STG is a separate account from Dev. Only ECR is consolidated in the Dev account
    const ecrStack = new EcrStack(app, 'TestEcrStack', {
      env: TEST_ENV,
      stgAccountId: STG_ACCOUNT_ID,
    });
    const image = ecs.ContainerImage.fromRegistry('nginx');

    const apiStack = new ApiStack(app, 'TestApiStack', {
      env: TEST_ENV,
      vpc: networkStack.vpc,
      rdsSecurityGroup: networkStack.rdsSecurityGroup,
      database: databaseStack.database,
      databaseCredentials: databaseStack.credentials,
      jwtSecret,
      image,
      dbName: 'test_db',
      deploymentController: ecs.DeploymentControllerType.CODE_DEPLOY,
    });
    const webStack = new WebStack(app, 'TestWebStack', {
      env: TEST_ENV,
      vpc: networkStack.vpc,
      apiUrl: 'http://api.example.com',
      authSecret: new secretsmanager.Secret(sharedStack, 'AuthSecret'),
      image,
      deploymentController: ecs.DeploymentControllerType.CODE_DEPLOY,
    });

    // STG's deployment-execution resources (DeploymentGroup, the migration CodeBuild project)
    // are created on the STG account's DeployTargetStack side, so the PipelineStack test only
    // passes the account ID (details are verified in deploy-target-stack.test.ts)
    const pipelineStack = new PipelineStack(app, 'TestPipelineStack', {
      env: TEST_ENV,
      githubOrg: 'acme',
      githubRepo: 'forge',

      ecrStack,
      dev: {
        kind: 'local',
        resources: {
          apiStack,
          webStack,
          vpc: networkStack.vpc,
          rdsSecurityGroup: networkStack.rdsSecurityGroup,
          database: databaseStack.database,
          databaseCredentials: databaseStack.credentials,
          dbName: 'test_db',
        },
      },
      stg: { accountId: STG_ACCOUNT_ID },
    });
    return Template.fromStack(pipelineStack);
  })();

  it('adds STG approval, promotion, and deploy stages to the API pipeline', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'ApiAppPipeline',
      Stages: Match.arrayWith([
        Match.objectLike({ Name: 'Source' }),
        Match.objectLike({ Name: 'GenerateDev' }),
        Match.objectLike({ Name: 'DeployDev' }),
        Match.objectLike({ Name: 'ApproveStg' }),
        Match.objectLike({ Name: 'PromoteToStg' }),
        Match.objectLike({ Name: 'GenerateStg' }),
        Match.objectLike({ Name: 'DeployStg' }),
      ]),
    });
  });

  it('PipelineStack itself creates only the 2 deployment groups for DEV (STG lives on the DeployTargetStack side)', () => {
    const groups = template.findResources('AWS::CodeDeploy::DeploymentGroup');
    expect(Object.keys(groups).length).toBe(2);
  });

  it('creates the DEV -> STG promotion CodeBuild project', () => {
    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Name: 'ApiPromoteToStg',
    });
    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Name: 'WebPromoteToStg',
    });
  });

  it('the DeployStg action references a DeploymentGroup derived from the naming convention', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'ApiAppPipeline',
      Stages: Match.arrayWith([
        Match.objectLike({
          Name: 'DeployStg',
          Actions: Match.arrayWith([
            Match.objectLike({
              Configuration: Match.objectLike({
                ApplicationName: 'ApiStg',
                DeploymentGroupName: 'ApiStgDeploymentGroup',
              }),
              RoleArn: `arn:aws:iam::${STG_ACCOUNT_ID}:role/pipeline-cross-account-stg`,
            }),
          ]),
        }),
      ]),
    });
  });

  it('the MigrateStg action starts the CodeBuild project with the cross-account role', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'ApiAppPipeline',
      Stages: Match.arrayWith([
        Match.objectLike({
          Name: 'MigrateStg',
          Actions: Match.arrayWith([
            Match.objectLike({
              Configuration: Match.objectLike({ ProjectName: 'ApiMigrateStg' }),
              RoleArn: `arn:aws:iam::${STG_ACCOUNT_ID}:role/pipeline-cross-account-stg`,
            }),
          ]),
        }),
      ]),
    });
  });

  it('the MigrateStg stage does not exist in the Web pipeline', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'WebAppPipeline',
      Stages: Match.not(Match.arrayWith([Match.objectLike({ Name: 'MigrateStg' })])),
    });
  });

  it('creates a KMS key for the artifact bucket for cross-account use (crossAccountKeys: true, 2 total for the Api/Web pipelines)', () => {
    template.resourceCountIs('AWS::KMS::Key', 2);
  });
});

// ─── Tests with PROD promotion ────────────────────────────────────────────────

describe('PipelineStack (prodAccountId specified)', () => {
  const STG_ACCOUNT_ID = '222222222222';
  const PROD_ACCOUNT_ID = '444444444444';

  const template = (() => {
    const app = new cdk.App();
    const networkStack = new NetworkStack(app, 'TestNetworkStack', { env: TEST_ENV });
    const databaseStack = new DatabaseStack(app, 'TestDatabaseStack', {
      env: TEST_ENV,
      vpc: networkStack.vpc,
      rdsSecurityGroup: networkStack.rdsSecurityGroup,
      dbName: 'test_db',
    });
    const sharedStack = new cdk.Stack(app, 'TestSharedStack', { env: TEST_ENV });
    const jwtSecret = new secretsmanager.Secret(sharedStack, 'JwtSecret');

    // STG/PROD are separate accounts from Dev. Only ECR is consolidated in the Dev account
    const ecrStack = new EcrStack(app, 'TestEcrStack', {
      env: TEST_ENV,
      stgAccountId: STG_ACCOUNT_ID,
      prodAccountId: PROD_ACCOUNT_ID,
    });
    const image = ecs.ContainerImage.fromRegistry('nginx');

    const apiStack = new ApiStack(app, 'TestApiStack', {
      env: TEST_ENV,
      vpc: networkStack.vpc,
      rdsSecurityGroup: networkStack.rdsSecurityGroup,
      database: databaseStack.database,
      databaseCredentials: databaseStack.credentials,
      jwtSecret,
      image,
      dbName: 'test_db',
      deploymentController: ecs.DeploymentControllerType.CODE_DEPLOY,
    });
    const webStack = new WebStack(app, 'TestWebStack', {
      env: TEST_ENV,
      vpc: networkStack.vpc,
      apiUrl: 'http://api.example.com',
      authSecret: new secretsmanager.Secret(sharedStack, 'AuthSecret'),
      image,
      deploymentController: ecs.DeploymentControllerType.CODE_DEPLOY,
    });

    // STG/PROD's deployment-execution resources are created on the DeployTargetStack side of
    // their respective accounts, so the PipelineStack test only passes the account IDs
    const pipelineStack = new PipelineStack(app, 'TestPipelineStack', {
      env: TEST_ENV,
      githubOrg: 'acme',
      githubRepo: 'forge',

      ecrStack,
      dev: {
        kind: 'local',
        resources: {
          apiStack,
          webStack,
          vpc: networkStack.vpc,
          rdsSecurityGroup: networkStack.rdsSecurityGroup,
          database: databaseStack.database,
          databaseCredentials: databaseStack.credentials,
          dbName: 'test_db',
        },
      },
      stg: { accountId: STG_ACCOUNT_ID },
      prod: { accountId: PROD_ACCOUNT_ID },
    });
    return Template.fromStack(pipelineStack);
  })();

  it('adds PROD approval, promotion, and deploy stages to the API pipeline', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'ApiAppPipeline',
      Stages: Match.arrayWith([
        Match.objectLike({ Name: 'ApproveProd' }),
        Match.objectLike({ Name: 'PromoteToProd' }),
        Match.objectLike({ Name: 'GenerateProd' }),
        Match.objectLike({ Name: 'MigrateProd' }),
        Match.objectLike({ Name: 'DeployProd' }),
      ]),
    });
  });

  it('creates the STG -> PROD promotion CodeBuild project', () => {
    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Name: 'ApiPromoteToProd',
    });
    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Name: 'WebPromoteToProd',
    });
  });

  it('the DeployProd action references a DeploymentGroup and cross-account role derived from the naming convention', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'ApiAppPipeline',
      Stages: Match.arrayWith([
        Match.objectLike({
          Name: 'DeployProd',
          Actions: Match.arrayWith([
            Match.objectLike({
              Configuration: Match.objectLike({
                ApplicationName: 'ApiProd',
                DeploymentGroupName: 'ApiProdDeploymentGroup',
              }),
              RoleArn: `arn:aws:iam::${PROD_ACCOUNT_ID}:role/pipeline-cross-account-prod`,
            }),
          ]),
        }),
      ]),
    });
  });

  it('the MigrateProd action starts the CodeBuild project with the cross-account role', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'ApiAppPipeline',
      Stages: Match.arrayWith([
        Match.objectLike({
          Name: 'MigrateProd',
          Actions: Match.arrayWith([
            Match.objectLike({
              Configuration: Match.objectLike({ ProjectName: 'ApiMigrateProd' }),
              RoleArn: `arn:aws:iam::${PROD_ACCOUNT_ID}:role/pipeline-cross-account-prod`,
            }),
          ]),
        }),
      ]),
    });
  });

  it('the MigrateProd stage does not exist in the Web pipeline', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'WebAppPipeline',
      Stages: Match.not(Match.arrayWith([Match.objectLike({ Name: 'MigrateProd' })])),
    });
  });

  it('PipelineStack itself creates only the 2 deployment groups for DEV (STG/PROD live on the DeployTargetStack side)', () => {
    const groups = template.findResources('AWS::CodeDeploy::DeploymentGroup');
    expect(Object.keys(groups).length).toBe(2);
  });
});

// ─── Tests when Dev is cross-account (PIPELINE_ACCOUNT_ID specified) ─────────

describe('PipelineStack (dev is cross-account)', () => {
  const PIPELINE_ACCOUNT_ID = '333333333333';
  const DEV_ACCOUNT_ID = TEST_ENV.account;
  const PIPELINE_ENV = { account: PIPELINE_ACCOUNT_ID, region: TEST_ENV.region };

  const template = (() => {
    const app = new cdk.App();
    // The Dev environment's infrastructure is deployed to the Dev account (TEST_ENV)
    const networkStack = new NetworkStack(app, 'TestNetworkStack', { env: TEST_ENV });
    const databaseStack = new DatabaseStack(app, 'TestDatabaseStack', {
      env: TEST_ENV,
      vpc: networkStack.vpc,
      rdsSecurityGroup: networkStack.rdsSecurityGroup,
      dbName: 'test_db',
    });
    const sharedStack = new cdk.Stack(app, 'TestSharedStack', { env: TEST_ENV });
    const jwtSecret = new secretsmanager.Secret(sharedStack, 'JwtSecret');
    const image = ecs.ContainerImage.fromRegistry('nginx');

    // PipelineStack itself doesn't reference apiStack/webStack (since dev is cross-account),
    // but we create them anyway to reproduce a state where real ECS resources exist on the
    // Dev account side
    new ApiStack(app, 'TestApiStack', {
      env: TEST_ENV,
      vpc: networkStack.vpc,
      rdsSecurityGroup: networkStack.rdsSecurityGroup,
      database: databaseStack.database,
      databaseCredentials: databaseStack.credentials,
      jwtSecret,
      image,
      dbName: 'test_db',
      deploymentController: ecs.DeploymentControllerType.CODE_DEPLOY,
    });
    new WebStack(app, 'TestWebStack', {
      env: TEST_ENV,
      vpc: networkStack.vpc,
      apiUrl: 'http://api.example.com',
      authSecret: new secretsmanager.Secret(sharedStack, 'AuthSecret'),
      image,
      deploymentController: ecs.DeploymentControllerType.CODE_DEPLOY,
    });

    // ECR is consolidated in the Pipeline account (a separate account from Dev)
    const ecrStack = new EcrStack(app, 'TestEcrStack', {
      env: PIPELINE_ENV,
      devAccountId: DEV_ACCOUNT_ID,
    });

    // PipelineStack is deployed to the Pipeline account. Dev's deployment-execution resources
    // are created on the Dev account's DeployTargetStack side, so only accountId is passed
    const pipelineStack = new PipelineStack(app, 'TestPipelineStack', {
      env: PIPELINE_ENV,
      githubOrg: 'acme',
      githubRepo: 'forge',
      ecrStack,
      dev: { kind: 'cross-account', accountId: DEV_ACCOUNT_ID },
    });
    return Template.fromStack(pipelineStack);
  })();

  it('AssumeRole on the CDK bootstrap role targets both the Pipeline account itself and the Dev account', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'CdkDeploy',
            Action: 'sts:AssumeRole',
            Resource: Match.arrayWith([
              `arn:aws:iam::${PIPELINE_ACCOUNT_ID}:role/cdk-*`,
              `arn:aws:iam::${DEV_ACCOUNT_ID}:role/cdk-*`,
            ]),
          }),
        ]),
      },
    });
  });

  it('PipelineStack itself creates no DeploymentGroup (Dev also lives on the DeployTargetStack side)', () => {
    const groups = template.findResources('AWS::CodeDeploy::DeploymentGroup');
    expect(Object.keys(groups).length).toBe(0);
  });

  it('the DeployDev action references a cross-account role and DeploymentGroup derived from the naming convention', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'ApiAppPipeline',
      Stages: Match.arrayWith([
        Match.objectLike({
          Name: 'DeployDev',
          Actions: Match.arrayWith([
            Match.objectLike({
              Configuration: Match.objectLike({
                ApplicationName: 'ApiDev',
                DeploymentGroupName: 'ApiDevDeploymentGroup',
              }),
              RoleArn: `arn:aws:iam::${DEV_ACCOUNT_ID}:role/pipeline-cross-account-dev`,
            }),
          ]),
        }),
      ]),
    });
  });

  it('the MigrateDev action starts the CodeBuild project with the cross-account role', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'ApiAppPipeline',
      Stages: Match.arrayWith([
        Match.objectLike({
          Name: 'MigrateDev',
          Actions: Match.arrayWith([
            Match.objectLike({
              Configuration: Match.objectLike({ ProjectName: 'ApiMigrateDev' }),
              RoleArn: `arn:aws:iam::${DEV_ACCOUNT_ID}:role/pipeline-cross-account-dev`,
            }),
          ]),
        }),
      ]),
    });
  });

  it('the MigrateDev stage does not exist in the Web pipeline', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'WebAppPipeline',
      Stages: Match.not(Match.arrayWith([Match.objectLike({ Name: 'MigrateDev' })])),
    });
  });

  it('creates a KMS key for the artifact bucket for cross-account use', () => {
    template.resourceCountIs('AWS::KMS::Key', 2);
  });
});
