#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { type EnvName, ecrRepoArn, ecrRepoName, taskDefFamily } from '../lib/pipeline-naming';
import { ApiStack } from '../lib/stacks/api-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { DeployTargetStack } from '../lib/stacks/deploy-target-stack';
import { EcrStack } from '../lib/stacks/ecr-stack';
import { NetworkStack } from '../lib/stacks/network-stack';
import { type EnvResources, PipelineStack } from '../lib/stacks/pipeline-stack';
import { WebStack } from '../lib/stacks/web-stack';

// ─── ユーティリティ ─────────────────────────────────────────────────────────

function envInt(key: string, defaultValue: number): number {
  const val = process.env[key];
  return val !== undefined ? parseInt(val, 10) : defaultValue;
}

function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} environment variable is required`);
  return value;
}

// ─── デフォルト設定（全環境共通・最小コスト）────────────────────────────────
// 環境ごとに増強する場合は DEV_API_CPU / STG_API_CPU / PROD_API_CPU 等の環境変数で上書きする

const DEFAULT_API_CPU = 256;
const DEFAULT_API_MEMORY = 512;
const DEFAULT_API_COUNT = 1;
const DEFAULT_WEB_CPU = 256;
const DEFAULT_WEB_MEMORY = 512;
const DEFAULT_WEB_COUNT = 1;
const DEFAULT_DB_TYPE = 't3.micro';
const DEFAULT_DB_STORAGE = 20;
const DEFAULT_DB_MAX_STORAGE = 100;

// ─── 環境インフラ生成ファクトリ ──────────────────────────────────────────────

const placeholderImage = ecs.ContainerImage.fromRegistry(
  'public.ecr.aws/nginx/nginx:stable-alpine'
);

// nginx のデフォルト設定（ポート80）を指定ポートで上書きして起動する
// Docker ビルド不要でヘルスチェックを通過させるためのシェルコマンド
function placeholderCommand(port: number): string[] {
  return [
    '/bin/sh',
    '-c',
    `echo 'server{listen ${port};location /{return 200;}}' > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'`,
  ];
}

function createEnvInfra(app: cdk.App, envName: EnvName, env: cdk.Environment): EnvResources {
  const E = envName.toUpperCase();
  const P = envName.charAt(0).toUpperCase() + envName.slice(1); // 'Dev' | 'Stg' | 'Prod'

  const dbName = process.env.POSTGRES_DB;
  if (!dbName) throw new Error('POSTGRES_DB environment variable is required');

  const networkStack = new NetworkStack(app, `${P}NetworkStack`, {
    env,
    enableVpcEndpoints: envName !== 'dev',
  });
  const databaseStack = new DatabaseStack(app, `${P}DatabaseStack`, {
    env,
    vpc: networkStack.vpc,
    rdsSecurityGroup: networkStack.rdsSecurityGroup,
    dbName,
    instanceType: new ec2.InstanceType(process.env[`${E}_DB_INSTANCE_TYPE`] ?? DEFAULT_DB_TYPE),
    allocatedStorage: envInt(`${E}_DB_ALLOCATED_STORAGE`, DEFAULT_DB_STORAGE),
    maxAllocatedStorage: envInt(`${E}_DB_MAX_ALLOCATED_STORAGE`, DEFAULT_DB_MAX_STORAGE),
  });

  const jwtSecret = new secretsmanager.Secret(networkStack, `${P}JwtSecret`, {
    secretName: `${envName}/jwt-secret`,
  });

  const authSecret = new secretsmanager.Secret(networkStack, `${P}AuthSecret`, {
    secretName: `${envName}/auth-secret`,
  });

  const apiStack = new ApiStack(app, `${P}ApiStack`, {
    env,
    vpc: networkStack.vpc,
    rdsSecurityGroup: networkStack.rdsSecurityGroup,
    database: databaseStack.database,
    databaseCredentials: databaseStack.credentials,
    jwtSecret,
    dbName,
    image: placeholderImage,
    command: placeholderCommand(3000),
    cpu: envInt(`${E}_API_CPU`, DEFAULT_API_CPU),
    memoryLimitMiB: envInt(`${E}_API_MEMORY_MIB`, DEFAULT_API_MEMORY),
    desiredCount: envInt(`${E}_API_DESIRED_COUNT`, DEFAULT_API_COUNT),
    deploymentController: ecs.DeploymentControllerType.CODE_DEPLOY,
    family: taskDefFamily('Api', envName),
  });

  const webStack = new WebStack(app, `${P}WebStack`, {
    env,
    vpc: networkStack.vpc,
    apiUrl: `http://${apiStack.ecsFargateService.loadBalancer.loadBalancerDnsName}`,
    authSecret,
    image: placeholderImage,
    command: placeholderCommand(3001),
    cpu: envInt(`${E}_WEB_CPU`, DEFAULT_WEB_CPU),
    memoryLimitMiB: envInt(`${E}_WEB_MEMORY_MIB`, DEFAULT_WEB_MEMORY),
    desiredCount: envInt(`${E}_WEB_DESIRED_COUNT`, DEFAULT_WEB_COUNT),
    deploymentController: ecs.DeploymentControllerType.CODE_DEPLOY,
    family: taskDefFamily('Web', envName),
  });

  return {
    apiStack,
    webStack,
    vpc: networkStack.vpc,
    rdsSecurityGroup: networkStack.rdsSecurityGroup,
    database: databaseStack.database,
    databaseCredentials: databaseStack.credentials,
    dbName,
  };
}

// ─── アプリ ──────────────────────────────────────────────────────────────────
// Dev/Stg/Prodはそれぞれ別のAWSアカウントにデプロイする。CI/CDパイプライン（PipelineStack）とECRは同じ「Pipelineアカウント」に同居する。
// Pipelineアカウントは PIPELINE_ACCOUNT_ID環境変数で明示指定でき、未指定時はDevアカウント（＝cdk実行時の認証情報から自動セットされるCDK_DEFAULT_ACCOUNT）と同居する（デフォルト・追加設定不要）。
// PIPELINE_ACCOUNT_ID を Dev と異なるアカウントに指定した場合、DevもStg/Prodと同様にクロスアカウントターゲット（DeployTargetStackが作成される）として扱われる。
// Stg/ProdアカウントIDは認証情報から自動判別できないため STG_ACCOUNT_ID / PROD_ACCOUNT_ID環境変数で明示指定する（.env.example 参照。実アカウント作成・cdk bootstrap --trust は別途運用作業として必要）。
// これらが設定されているかどうかが、そのまま「そのアカウントにデプロイするか」を表す唯一のフラグになる。

const app = new cdk.App();

const region = process.env.CDK_DEFAULT_REGION;
const devAccountId = process.env.CDK_DEFAULT_ACCOUNT;
const pipelineAccountId = process.env.PIPELINE_ACCOUNT_ID || devAccountId;
const stgAccountId = process.env.STG_ACCOUNT_ID;
const prodAccountId = process.env.PROD_ACCOUNT_ID;

const devIsCrossAccount = pipelineAccountId !== devAccountId;

if ((stgAccountId || prodAccountId || devIsCrossAccount) && !region) {
  throw new Error(
    'CDK_DEFAULT_REGION environment variable is required when STG_ACCOUNT_ID/PROD_ACCOUNT_ID/PIPELINE_ACCOUNT_ID is set'
  );
}

const devEnv: cdk.Environment = { account: devAccountId, region };
const pipelineEnv: cdk.Environment = { account: pipelineAccountId, region };

// ECRはPipelineアカウントに集約する（デフォルトはDevと同居）。
// Dev（別アカウントの場合）・Stg/Prodのリポジトリには、当該アカウントからのクロスアカウントpullを許可するリソースポリシーを付与する
const ecrStack = new EcrStack(app, 'EcrStack', {
  env: pipelineEnv,
  devAccountId: devIsCrossAccount ? devAccountId : undefined,
  stgAccountId,
  prodAccountId,
});

const dev = createEnvInfra(app, 'dev', devEnv);

if (devIsCrossAccount) {
  const resolvedPipelineAccountId = requireEnv(pipelineAccountId, 'PIPELINE_ACCOUNT_ID');
  const devRegion = requireEnv(region, 'CDK_DEFAULT_REGION');
  new DeployTargetStack(app, 'DevDeployTargetStack', {
    env: devEnv,
    envName: 'dev',
    pipelineAccountId: resolvedPipelineAccountId,
    envResources: dev,
    ecrRepoArns: {
      api: ecrRepoArn(resolvedPipelineAccountId, devRegion, ecrRepoName('Api', 'dev')),
      web: ecrRepoArn(resolvedPipelineAccountId, devRegion, ecrRepoName('Web', 'dev')),
    },
  });
}

if (stgAccountId) {
  const resolvedPipelineAccountId = requireEnv(
    pipelineAccountId,
    'PIPELINE_ACCOUNT_ID (or CDK_DEFAULT_ACCOUNT)'
  );
  const stgRegion = requireEnv(region, 'CDK_DEFAULT_REGION');
  const stgEnv: cdk.Environment = { account: stgAccountId, region: stgRegion };
  const stg = createEnvInfra(app, 'stg', stgEnv);
  new DeployTargetStack(app, 'StgDeployTargetStack', {
    env: stgEnv,
    envName: 'stg',
    pipelineAccountId: resolvedPipelineAccountId,
    envResources: stg,
    ecrRepoArns: {
      api: ecrRepoArn(resolvedPipelineAccountId, stgRegion, ecrRepoName('Api', 'stg')),
      web: ecrRepoArn(resolvedPipelineAccountId, stgRegion, ecrRepoName('Web', 'stg')),
    },
  });
}

if (prodAccountId) {
  const resolvedPipelineAccountId = requireEnv(
    pipelineAccountId,
    'PIPELINE_ACCOUNT_ID (or CDK_DEFAULT_ACCOUNT)'
  );
  const prodRegion = requireEnv(region, 'CDK_DEFAULT_REGION');
  const prodEnv: cdk.Environment = { account: prodAccountId, region: prodRegion };
  const prod = createEnvInfra(app, 'prod', prodEnv);
  new DeployTargetStack(app, 'ProdDeployTargetStack', {
    env: prodEnv,
    envName: 'prod',
    pipelineAccountId: resolvedPipelineAccountId,
    envResources: prod,
    ecrRepoArns: {
      api: ecrRepoArn(resolvedPipelineAccountId, prodRegion, ecrRepoName('Api', 'prod')),
      web: ecrRepoArn(resolvedPipelineAccountId, prodRegion, ecrRepoName('Web', 'prod')),
    },
  });
}

const githubOrg = (app.node.tryGetContext('githubOrg') as string | undefined) ?? '';
const githubRepo = (app.node.tryGetContext('githubRepo') as string | undefined) ?? '';

new PipelineStack(app, 'PipelineStack', {
  env: pipelineEnv,
  githubOrg,
  githubRepo,
  ecrStack,
  dev: devIsCrossAccount
    ? { kind: 'cross-account', accountId: requireEnv(devAccountId, 'CDK_DEFAULT_ACCOUNT') }
    : { kind: 'local', resources: dev },
  stg: stgAccountId ? { accountId: stgAccountId } : undefined,
  prod: prodAccountId ? { accountId: prodAccountId } : undefined,
});
