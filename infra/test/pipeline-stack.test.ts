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

// PipelineStack のテスト用セットアップ
// account/region を指定することで ARN 組み立てを確定的にする
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

  // DEV のみ作成（stg/prod は指定しない）
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
  // 重いセットアップを一度だけ実行する
  const template = buildPipelineStack();

  // ─── GitHub OIDC ────────────────────────────────────────────────────────────

  describe('GitHub OIDC プロバイダー', () => {
    it('OIDCプロバイダーが1つ作成される', () => {
      template.resourceCountIs('Custom::AWSCDKOpenIdConnectProvider', 1);
    });

    it('GitHub Actions のエンドポイントが設定される', () => {
      template.hasResourceProperties('Custom::AWSCDKOpenIdConnectProvider', {
        Url: 'https://token.actions.githubusercontent.com',
      });
    });

    it('aud クレームに sts.amazonaws.com が設定される', () => {
      template.hasResourceProperties('Custom::AWSCDKOpenIdConnectProvider', {
        ClientIDList: Match.arrayWith(['sts.amazonaws.com']),
      });
    });
  });

  // ─── OIDC ロール ─────────────────────────────────────────────────────────────

  describe('アプリデプロイ用 OIDC ロール', () => {
    it('ロールが正しい名前で作成される', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'github-actions-app-deploy',
      });
    });

    it('main ブランチへの push に限定した信頼ポリシーが設定される', () => {
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

    it('ECR push 権限が付与される', () => {
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

    it('GetAuthorizationToken 権限が付与される', () => {
      // 単一アクションは CDK が文字列として生成する
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

  describe('インフラデプロイ用 OIDC ロール', () => {
    it('ロールが正しい名前で作成される', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'github-actions-infra-deploy',
      });
    });

    it('main Environment にスコープされた信頼ポリシーが設定される', () => {
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

    it('CDK bootstrap ロールへの AssumeRole 権限が付与される', () => {
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

  describe('パイプライン', () => {
    it('パイプラインが2つ作成される（API・Web）', () => {
      template.resourceCountIs('AWS::CodePipeline::Pipeline', 2);
    });

    it('アプリパイプラインがDEVの3ステージで構成される（Source→GenerateDev→DeployDev）', () => {
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Name: 'ApiAppPipeline',
        Stages: Match.arrayWith([
          Match.objectLike({ Name: 'Source' }),
          Match.objectLike({ Name: 'GenerateDev' }),
          Match.objectLike({ Name: 'DeployDev' }),
        ]),
      });
    });

    it('MigrateDevステージはApiパイプラインのみに存在し、Webパイプラインには存在しない', () => {
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Name: 'ApiAppPipeline',
        Stages: Match.arrayWith([Match.objectLike({ Name: 'MigrateDev' })]),
      });
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Name: 'WebAppPipeline',
        Stages: Match.not(Match.arrayWith([Match.objectLike({ Name: 'MigrateDev' })])),
      });
    });

    it('ECRソースアクションが設定される（APIパイプライン）', () => {
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

  describe('CodeBuild プロジェクト', () => {
    it('インフラデプロイOIDCロールが CDK bootstrap ロールへの AssumeRole 権限を持つ', () => {
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

    it('Generate プロジェクトが ECS describe 権限を持つ', () => {
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
    it('ECSアプリケーションが2つ作成される（API・Web）', () => {
      template.hasResourceProperties('AWS::CodeDeploy::Application', {
        ComputePlatform: 'ECS',
      });
      // API と Web で合計2つ
      const apps = template.findResources('AWS::CodeDeploy::Application');
      expect(Object.keys(apps).length).toBe(2);
    });

    it('デプロイメントグループが2つ作成される（API・Web）', () => {
      const groups = template.findResources('AWS::CodeDeploy::DeploymentGroup');
      expect(Object.keys(groups).length).toBe(2);
    });

    it('段階的デプロイ設定が使用される（LINEAR_10PERCENT_EVERY_1MINUTES）', () => {
      template.hasResourceProperties('AWS::CodeDeploy::DeploymentGroup', {
        DeploymentConfigName: 'CodeDeployDefault.ECSLinear10PercentEvery1Minutes',
      });
    });

    it('デプロイ失敗時の自動ロールバックが有効化される', () => {
      template.hasResourceProperties('AWS::CodeDeploy::DeploymentGroup', {
        AutoRollbackConfiguration: {
          Enabled: true,
          Events: Match.arrayWith(['DEPLOYMENT_FAILURE']),
        },
      });
    });

    it('Blue/Green デプロイスタイルが設定される', () => {
      template.hasResourceProperties('AWS::CodeDeploy::DeploymentGroup', {
        DeploymentStyle: {
          DeploymentOption: 'WITH_TRAFFIC_CONTROL',
          DeploymentType: 'BLUE_GREEN',
        },
      });
    });
  });
});

// ─── STG 昇格ありのテスト ──────────────────────────────────────────────────────

describe('PipelineStack (stgAccountId指定)', () => {
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

    // STGはDevとは別アカウント。ECRのみDevアカウントに集約される
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

    // STGのデプロイ実行リソース（DeploymentGroup・マイグレーション用CodeBuild）は
    // STGアカウントの DeployTargetStack 側に作成されるため、PipelineStack のテストでは
    // アカウントIDのみを渡す（詳細は deploy-target-stack.test.ts で検証する）
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

  it('APIパイプラインにSTG承認・昇格・デプロイステージが追加される', () => {
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

  it('PipelineStack自体にはDEV用の2つのデプロイメントグループのみ作成される（STG分はDeployTargetStack側）', () => {
    const groups = template.findResources('AWS::CodeDeploy::DeploymentGroup');
    expect(Object.keys(groups).length).toBe(2);
  });

  it('DEV→STG昇格用の CodeBuild プロジェクトが作成される', () => {
    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Name: 'ApiPromoteToStg',
    });
    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Name: 'WebPromoteToStg',
    });
  });

  it('DeployStgアクションが命名規則から導出したDeploymentGroupを参照する', () => {
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

  it('MigrateStgアクションがクロスアカウントロールでCodeBuildプロジェクトを起動する', () => {
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

  it('MigrateStgステージはWebパイプラインには存在しない', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'WebAppPipeline',
      Stages: Match.not(Match.arrayWith([Match.objectLike({ Name: 'MigrateStg' })])),
    });
  });

  it('アーティファクトバケットのKMSキーがクロスアカウント用に作成される（crossAccountKeys: true、Api/Web各パイプライン分で2つ）', () => {
    template.resourceCountIs('AWS::KMS::Key', 2);
  });
});

// ─── PROD 昇格ありのテスト ────────────────────────────────────────────────────

describe('PipelineStack (prodAccountId指定)', () => {
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

    // STG/PRODはDevとは別アカウント。ECRのみDevアカウントに集約される
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

    // STG/PRODのデプロイ実行リソースはそれぞれのアカウントのDeployTargetStack側に作成されるため、
    // PipelineStackのテストではアカウントIDのみを渡す
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

  it('APIパイプラインにPROD承認・昇格・デプロイステージが追加される', () => {
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

  it('STG→PROD昇格用の CodeBuild プロジェクトが作成される', () => {
    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Name: 'ApiPromoteToProd',
    });
    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Name: 'WebPromoteToProd',
    });
  });

  it('DeployProdアクションが命名規則から導出したDeploymentGroup・クロスアカウントロールを参照する', () => {
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

  it('MigrateProdアクションがクロスアカウントロールでCodeBuildプロジェクトを起動する', () => {
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

  it('MigrateProdステージはWebパイプラインには存在しない', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'WebAppPipeline',
      Stages: Match.not(Match.arrayWith([Match.objectLike({ Name: 'MigrateProd' })])),
    });
  });

  it('PipelineStack自体にはDEV用の2つのデプロイメントグループのみ作成される（STG/PROD分はDeployTargetStack側）', () => {
    const groups = template.findResources('AWS::CodeDeploy::DeploymentGroup');
    expect(Object.keys(groups).length).toBe(2);
  });
});

// ─── Devがクロスアカウント（PIPELINE_ACCOUNT_ID指定）のテスト ──────────────────

describe('PipelineStack (devがcross-account)', () => {
  const PIPELINE_ACCOUNT_ID = '333333333333';
  const DEV_ACCOUNT_ID = TEST_ENV.account;
  const PIPELINE_ENV = { account: PIPELINE_ACCOUNT_ID, region: TEST_ENV.region };

  const template = (() => {
    const app = new cdk.App();
    // Dev環境のインフラはDevアカウント（TEST_ENV）に配置
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

    // PipelineStack自体はapiStack/webStackを参照しない（devがcross-accountのため）が、
    // Devアカウント側に実際のECSリソースが存在する状態を再現するために作成しておく
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

    // ECRはPipelineアカウントに集約される（Devとは別アカウント）
    const ecrStack = new EcrStack(app, 'TestEcrStack', {
      env: PIPELINE_ENV,
      devAccountId: DEV_ACCOUNT_ID,
    });

    // PipelineStackはPipelineアカウントに配置。Devのデプロイ実行リソースは
    // DevアカウントのDeployTargetStack側に作成されるため、accountIdのみ渡す
    const pipelineStack = new PipelineStack(app, 'TestPipelineStack', {
      env: PIPELINE_ENV,
      githubOrg: 'acme',
      githubRepo: 'forge',
      ecrStack,
      dev: { kind: 'cross-account', accountId: DEV_ACCOUNT_ID },
    });
    return Template.fromStack(pipelineStack);
  })();

  it('CDK bootstrapロールへのAssumeRoleが、Pipeline自身とDevアカウントの両方を対象にする', () => {
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

  it('PipelineStack自体にはDeploymentGroupが作成されない（Dev分もDeployTargetStack側）', () => {
    const groups = template.findResources('AWS::CodeDeploy::DeploymentGroup');
    expect(Object.keys(groups).length).toBe(0);
  });

  it('DeployDevアクションが命名規則から導出したクロスアカウントロール・DeploymentGroupを参照する', () => {
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

  it('MigrateDevアクションがクロスアカウントロールでCodeBuildプロジェクトを起動する', () => {
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

  it('MigrateDevステージはWebパイプラインには存在しない', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'WebAppPipeline',
      Stages: Match.not(Match.arrayWith([Match.objectLike({ Name: 'MigrateDev' })])),
    });
  });

  it('アーティファクトバケットのKMSキーがクロスアカウント用に作成される', () => {
    template.resourceCountIs('AWS::KMS::Key', 2);
  });
});
