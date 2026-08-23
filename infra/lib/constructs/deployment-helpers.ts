import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import type * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';
import type { ApiStack } from '../stacks/api-stack';
import type { EnvResources, LocalAppEnvConfig } from '../stacks/pipeline-types';
import type { WebStack } from '../stacks/web-stack';

/** ApiStack/WebStackのライブ参照から`LocalAppEnvConfig`を組み立てる */
export function buildAppEnvConfig(
  appStack: ApiStack | WebStack,
  repository: ecr.IRepository,
  taskDefFamily: string,
  containerPort: string
): LocalAppEnvConfig {
  const svc = appStack.ecsFargateService;
  if (!svc.greenTargetGroup) {
    throw new Error('AppStack must use CODE_DEPLOY deployment controller');
  }
  return {
    repository,
    fargateService: svc.fargateService,
    taskDefFamily,
    blueTargetGroup: svc.blueTargetGroup,
    greenTargetGroup: svc.greenTargetGroup,
    productionListener: svc.productionListener,
    testListener: svc.testListener,
    containerPort,
  };
}

/** CodeDeployのデプロイメントグループ（Blue/Green）を作成する */
export function buildDeploymentGroup(
  scope: Construct,
  id: string,
  config: Pick<
    LocalAppEnvConfig,
    | 'fargateService'
    | 'blueTargetGroup'
    | 'greenTargetGroup'
    | 'productionListener'
    | 'testListener'
  >,
  overrides?: { application?: codedeploy.IEcsApplication; deploymentGroupName?: string }
): codedeploy.EcsDeploymentGroup {
  const blueGreenConfig: codedeploy.EcsBlueGreenDeploymentConfig = {
    blueTargetGroup: config.blueTargetGroup,
    greenTargetGroup: config.greenTargetGroup,
    listener: config.productionListener,
    terminationWaitTime: cdk.Duration.minutes(0),
    ...(config.testListener ? { testListener: config.testListener } : {}),
  };
  return new codedeploy.EcsDeploymentGroup(scope, `${id}DeploymentGroup`, {
    service: config.fargateService,
    blueGreenDeploymentConfig: blueGreenConfig,
    deploymentConfig: codedeploy.EcsDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTES,
    autoRollback: { failedDeployment: true, stoppedDeployment: false },
    ...(overrides?.application ? { application: overrides.application } : {}),
    ...(overrides?.deploymentGroupName
      ? { deploymentGroupName: overrides.deploymentGroupName }
      : {}),
  });
}

/**
 * Prisma マイグレーション用 CodeBuild プロジェクト。
 * RDSはECSのセキュリティグループ以外からの接続を許可していないため、CodeBuildを同じVPC内に配置してRDSに直接到達させる。
 * ECRからのpullはIAM側（プロジェクトのロール）に直接許可を付与する形にしており、
 * リポジトリ側（`ecr-stack.ts`）のリソースポリシーと組み合わせることで、
 * 同一アカウント・クロスアカウントいずれの`repository`でも動作する。
 */
export function buildMigrateProject(
  scope: Construct,
  id: string,
  env: EnvResources,
  repository: ecr.IRepository
): codebuild.PipelineProject {
  const migrationSg = new ec2.SecurityGroup(scope, `${id}Sg`, {
    vpc: env.vpc,
    description: `Security group for ${id} Prisma migration CodeBuild`,
    allowAllOutbound: true,
  });
  new ec2.CfnSecurityGroupIngress(scope, `${id}Ingress`, {
    groupId: env.rdsSecurityGroup.securityGroupId,
    ipProtocol: 'tcp',
    fromPort: 5432,
    toPort: 5432,
    sourceSecurityGroupId: migrationSg.securityGroupId,
  });

  const project = new codebuild.PipelineProject(scope, `${id}Project`, {
    projectName: id,
    vpc: env.vpc,
    subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    securityGroups: [migrationSg],
    environment: {
      buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2023_STANDARD_3_0,
      privileged: true,
      environmentVariables: {
        DB_HOST: { value: env.database.dbInstanceEndpointAddress },
        DB_PORT: { value: env.database.dbInstanceEndpointPort },
        DB_NAME: { value: env.dbName },
        DB_USERNAME: {
          type: codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
          value: `${env.databaseCredentials.secretArn}:username`,
        },
        DB_PASSWORD: {
          type: codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
          value: `${env.databaseCredentials.secretArn}:password`,
        },
      },
    },
    buildSpec: codebuild.BuildSpec.fromObject({
      version: '0.2',
      phases: {
        install: {
          'runtime-versions': { nodejs: 22 },
        },
        build: {
          commands: [
            "IMAGE_URI=$(python3 -c \"import json; print(json.load(open('imageDetail.json'))['ImageURI'])\")",
            'REGISTRY=$(echo "$IMAGE_URI" | cut -d/ -f1)',
            'aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY"',
            'docker pull "$IMAGE_URI"',
            // デプロイ対象イメージから db パッケージ（schema.prisma / migrations）を取り出す
            // イメージ側は非rootで動くため、バインドマウント先への書き込み用にrootで実行する
            'docker run --rm --user root --entrypoint sh -v "$(pwd)":/out "$IMAGE_URI" -c "cp -rL /app/node_modules/db /out/db-package"',
            'cd db-package',
            // CodeBuildは環境変数を直接注入するのでdotenv自体不要なため、dotenv依存のない最小構成で上書きする
            'printf \'import { defineConfig, env } from "prisma/config";\\nexport default defineConfig({\\n  schema: "./prisma/schema.prisma",\\n  migrations: { path: "./prisma/migrations" },\\n  datasource: { url: env("DATABASE_URL") },\\n});\\n\' > prisma.config.ts',
            'PRISMA_VERSION=$(node -e "console.log(require(\'./package.json\').devDependencies.prisma)")',
            'npm install --no-save "prisma@$PRISMA_VERSION"',
            'DATABASE_URL="postgresql://$DB_USERNAME:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" npx prisma migrate deploy',
          ],
        },
      },
    }),
  });

  project.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['ecr:GetAuthorizationToken'],
      resources: ['*'],
    })
  );
  project.addToRolePolicy(
    new iam.PolicyStatement({
      actions: [
        'ecr:BatchGetImage',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchCheckLayerAvailability',
      ],
      resources: [repository.repositoryArn],
    })
  );
  env.databaseCredentials.grantRead(project);

  return project;
}
