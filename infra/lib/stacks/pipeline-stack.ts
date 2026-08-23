import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as cpactions from 'aws-cdk-lib/aws-codepipeline-actions';
import type * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';
import {
  buildAppEnvConfig,
  buildDeploymentGroup,
  buildMigrateProject,
} from '../constructs/deployment-helpers';
import {
  type AppName,
  codeDeployAppName,
  codeDeployGroupName,
  crossAccountRoleArn,
  type EnvName,
  migrateProjectName,
  taskDefFamily,
} from '../pipeline-naming';
import type { EcrStack } from './ecr-stack';
import type { EnvResources, LocalAppEnvConfig } from './pipeline-types';

export type { EnvResources } from './pipeline-types';

/** Stg/Prodアカウント（`DeployTargetStack`が配置されているアカウント）への参照 */
interface CrossAccountEnv {
  accountId: string;
}

/**
 * Devの配置方法。`PIPELINE_ACCOUNT_ID`未指定（デフォルト）ならPipelineと同一アカウントのため
 * ライブCDK参照（`local`）、指定時はStg/Prodと同様にクロスアカウント（`cross-account`）になる。
 */
type DevTarget =
  | { kind: 'local'; resources: EnvResources }
  | { kind: 'cross-account'; accountId: string };

export interface PipelineStackProps extends cdk.StackProps {
  githubOrg: string;
  githubRepo: string;
  ecrStack: EcrStack;
  dev: DevTarget;
  stg?: CrossAccountEnv;
  prod?: CrossAccountEnv;
}

/** Stg/Prod・クロスアカウントDev向けのタスク定義生成CodeBuildに渡す最小限の設定 */
interface GenerateProjectConfig {
  taskDefFamily: string;
  containerPort: string;
  /** 指定時、buildspec内で`sts assume-role`してからECS APIを呼ぶ（クロスアカウント用） */
  crossAccountRoleArn?: string;
}

/** DEVステージで使う設定。Pipelineと同一アカウントなら`local`、別アカウントなら`cross-account` */
type DevPipelineTarget =
  | { kind: 'local'; config: LocalAppEnvConfig; envResources: EnvResources }
  | {
      kind: 'cross-account';
      accountId: string;
      repository: ecr.IRepository;
      containerPort: string;
    };

/**
 * CI/CDパイプラインスタック（Pipelineアカウントに配置。デフォルトはDevと同居、
 * `PIPELINE_ACCOUNT_ID`指定時は別アカウント）
 * - GitHub Actions OIDC ロール（ECR push・cdk deploy・cdk diff 用）
 * - アプリパイプライン（DEV→STG→PROD の昇格モデル）
 *
 * Stg/Prod、および（Pipelineと別アカウントの場合の）DevはPipelineとは別アカウントにデプロイされるため、
 * CloudFormationのクロススタック参照は使えない。
 * それらのデプロイ実行リソース（CodeDeployのDeploymentGroup・Prismaマイグレーション用CodeBuild）は
 * `DeployTargetStack`として各アカウントに作成し、ここでは`pipeline-naming.ts`の命名規則からARN/名前を逆算して
 * `fromXxxAttributes`でインポートし、`DeployTargetStack`が公開するクロスアカウントロールを`role`propで渡して呼び出す。
 */
export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const { githubOrg, githubRepo, ecrStack, dev, stg, prod } = props;

    // ─── GitHub OIDC プロバイダー ────────────────────────────────────────────
    const githubOidcProvider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
    });

    // ─── OIDC ロール: アプリデプロイ用（DEV ECR push のみ） ─────────────────
    const appDeployOidcRole = new iam.Role(this, 'AppDeployOidcRole', {
      roleName: 'github-actions-app-deploy',
      assumedBy: new iam.WebIdentityPrincipal(githubOidcProvider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          'token.actions.githubusercontent.com:sub': `repo:${githubOrg}/${githubRepo}:ref:refs/heads/main`,
        },
      }),
      description: 'GitHub Actions: DEV ECR push only (app deploy)',
    });

    // GitHub Actions は DEV リポジトリにのみ push する
    ecrStack.dev.api.grantPush(appDeployOidcRole);
    ecrStack.dev.web.grantPush(appDeployOidcRole);

    appDeployOidcRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'EcrAuth',
        actions: ['ecr:GetAuthorizationToken'],
        resources: ['*'],
      })
    );
    appDeployOidcRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'EcrScan',
        actions: ['ecr:DescribeImageScanFindings', 'ecr:DescribeImages'],
        resources: [ecrStack.dev.api.repositoryArn, ecrStack.dev.web.repositoryArn],
      })
    );

    // ─── OIDC ロール: インフラデプロイ用（cdk deploy、main Environment にスコープ） ──
    const infraDeployOidcRole = new iam.Role(this, 'InfraDeployOidcRole', {
      roleName: 'github-actions-infra-deploy',
      assumedBy: new iam.WebIdentityPrincipal(githubOidcProvider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          'token.actions.githubusercontent.com:sub': `repo:${githubOrg}/${githubRepo}:environment:main`,
        },
      }),
      description: 'GitHub Actions: cdk deploy via infra-deploy.yaml (main environment only)',
    });

    // Dev（別アカウントの場合）・Stg/Prodアカウントで`cdk bootstrap --trust <Account ID>`済みであることが前提
    infraDeployOidcRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CdkDeploy',
        actions: ['sts:AssumeRole'],
        resources: [
          `arn:aws:iam::${this.account}:role/cdk-*`,
          ...(dev.kind === 'cross-account' ? [`arn:aws:iam::${dev.accountId}:role/cdk-*`] : []),
          ...(stg ? [`arn:aws:iam::${stg.accountId}:role/cdk-*`] : []),
          ...(prod ? [`arn:aws:iam::${prod.accountId}:role/cdk-*`] : []),
        ],
      })
    );

    // ─── アプリパイプライン（API・Web） ───────────────────────────────────────
    const devApiTarget: DevPipelineTarget =
      dev.kind === 'local'
        ? {
            kind: 'local',
            config: buildAppEnvConfig(
              dev.resources.apiStack,
              ecrStack.dev.api,
              taskDefFamily('Api', 'dev'),
              '3000'
            ),
            envResources: dev.resources,
          }
        : {
            kind: 'cross-account',
            accountId: dev.accountId,
            repository: ecrStack.dev.api,
            containerPort: '3000',
          };
    const devWebTarget: DevPipelineTarget =
      dev.kind === 'local'
        ? {
            kind: 'local',
            config: buildAppEnvConfig(
              dev.resources.webStack,
              ecrStack.dev.web,
              taskDefFamily('Web', 'dev'),
              '3001'
            ),
            envResources: dev.resources,
          }
        : {
            kind: 'cross-account',
            accountId: dev.accountId,
            repository: ecrStack.dev.web,
            containerPort: '3001',
          };

    this.createAppPipeline(
      'Api',
      devApiTarget,
      stg && ecrStack.stg ? { accountId: stg.accountId, repository: ecrStack.stg.api } : undefined,
      prod && ecrStack.prod
        ? { accountId: prod.accountId, repository: ecrStack.prod.api }
        : undefined
    );
    this.createAppPipeline(
      'Web',
      devWebTarget,
      stg && ecrStack.stg ? { accountId: stg.accountId, repository: ecrStack.stg.web } : undefined,
      prod && ecrStack.prod
        ? { accountId: prod.accountId, repository: ecrStack.prod.web }
        : undefined
    );
  }

  // ─── アプリパイプライン（昇格モデル） ─────────────────────────────────────

  private createAppPipeline(
    appName: AppName,
    dev: DevPipelineTarget,
    stg?: { accountId: string; repository: ecr.IRepository },
    prod?: { accountId: string; repository: ecr.IRepository }
  ): void {
    const devRepository = dev.kind === 'local' ? dev.config.repository : dev.repository;
    const containerPort = dev.kind === 'local' ? dev.config.containerPort : dev.containerPort;
    // Prismaマイグレーションが必要なのはDBに接続するApiのみ。Webは静的なため不要
    const needsMigration = appName === 'Api';

    const pipeline = new codepipeline.Pipeline(this, `${appName}AppPipeline`, {
      pipelineName: `${appName}AppPipeline`,
      restartExecutionOnUpdate: false,
      // Devが別アカウント、またはStg/Prodへのクロスアカウントアクションがある場合、
      // アーティファクトバケットを暗号化するカスタマー管理KMSキーが必要
      crossAccountKeys: dev.kind === 'cross-account' || Boolean(stg || prod),
    });

    // Source: DEV ECR の :latest をトリガーに起動（ECRは常にPipelineアカウントに集約されるため、
    // Devがクロスアカウントの場合でもこのステージ自体は常にPipelineアカウント内で完結する）
    const devSource = new codepipeline.Artifact(`${appName}DevSource`);
    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new cpactions.EcrSourceAction({
          actionName: 'ECR',
          repository: devRepository,
          imageTag: 'latest',
          output: devSource,
        }),
      ],
    });

    // DEV: デプロイメントアーティファクト生成 → Blue/Green デプロイ
    const devGen = new codepipeline.Artifact(`${appName}DevGen`);
    if (dev.kind === 'local') {
      pipeline.addStage({
        stageName: 'GenerateDev',
        actions: [
          new cpactions.CodeBuildAction({
            actionName: 'GenerateDeployArtifacts',
            project: this.buildGenerateProject(`${appName}GenDev`, dev.config),
            input: devSource,
            outputs: [devGen],
          }),
        ],
      });
      if (needsMigration) {
        pipeline.addStage({
          stageName: 'MigrateDev',
          actions: [
            new cpactions.CodeBuildAction({
              actionName: 'PrismaMigrateDeploy',
              project: buildMigrateProject(
                this,
                migrateProjectName(appName, 'dev'),
                dev.envResources,
                dev.config.repository
              ),
              input: devSource,
            }),
          ],
        });
      }
      pipeline.addStage({
        stageName: 'DeployDev',
        actions: [
          new cpactions.CodeDeployEcsDeployAction({
            actionName: 'CodeDeployBlueGreen',
            deploymentGroup: buildDeploymentGroup(this, `${appName}Dev`, dev.config),
            appSpecTemplateInput: devGen,
            taskDefinitionTemplateInput: devGen,
          }),
        ],
      });
    } else {
      const devRoleArn = crossAccountRoleArn(dev.accountId, 'dev');
      const devRole = iam.Role.fromRoleArn(this, `${appName}DevCrossAccountRole`, devRoleArn, {
        mutable: false,
      });
      pipeline.artifactBucket.grantRead(devRole);
      pipeline.artifactBucket.encryptionKey?.grantDecrypt(devRole);

      pipeline.addStage({
        stageName: 'GenerateDev',
        actions: [
          new cpactions.CodeBuildAction({
            actionName: 'GenerateDeployArtifacts',
            project: this.buildGenerateProject(`${appName}GenDev`, {
              taskDefFamily: taskDefFamily(appName, 'dev'),
              containerPort,
              crossAccountRoleArn: devRoleArn,
            }),
            input: devSource,
            outputs: [devGen],
          }),
        ],
      });
      if (needsMigration) {
        pipeline.addStage({
          stageName: 'MigrateDev',
          actions: [
            new cpactions.CodeBuildAction({
              actionName: 'PrismaMigrateDeploy',
              project: codebuild.PipelineProject.fromProjectName(
                this,
                `${appName}DevMigrateProject`,
                migrateProjectName(appName, 'dev')
              ),
              input: devSource,
              role: devRole,
            }),
          ],
        });
      }
      pipeline.addStage({
        stageName: 'DeployDev',
        actions: [
          new cpactions.CodeDeployEcsDeployAction({
            actionName: 'CodeDeployBlueGreen',
            deploymentGroup: this.importDeploymentGroup(appName, 'dev'),
            appSpecTemplateInput: devGen,
            taskDefinitionTemplateInput: devGen,
            role: devRole,
          }),
        ],
      });
    }

    // STG への昇格（stg指定時のみ）
    if (!stg) return;

    const stgRoleArn = crossAccountRoleArn(stg.accountId, 'stg');
    const stgRole = iam.Role.fromRoleArn(this, `${appName}StgCrossAccountRole`, stgRoleArn, {
      mutable: false,
    });
    pipeline.artifactBucket.grantRead(stgRole);
    pipeline.artifactBucket.encryptionKey?.grantDecrypt(stgRole);

    const stgSource = new codepipeline.Artifact(`${appName}StgSource`);

    pipeline.addStage({
      stageName: 'ApproveStg',
      actions: [new cpactions.ManualApprovalAction({ actionName: 'ApproveStg' })],
    });
    pipeline.addStage({
      stageName: 'PromoteToStg',
      actions: [
        new cpactions.CodeBuildAction({
          actionName: 'PromoteImage',
          project: this.buildPromoteProject(
            `${appName}PromoteToStg`,
            devRepository,
            stg.repository
          ),
          input: devSource,
          outputs: [stgSource],
        }),
      ],
    });

    const stgGen = new codepipeline.Artifact(`${appName}StgGen`);
    pipeline.addStage({
      stageName: 'GenerateStg',
      actions: [
        new cpactions.CodeBuildAction({
          actionName: 'GenerateDeployArtifacts',
          project: this.buildGenerateProject(`${appName}GenStg`, {
            taskDefFamily: taskDefFamily(appName, 'stg'),
            containerPort,
            crossAccountRoleArn: stgRoleArn,
          }),
          input: stgSource,
          outputs: [stgGen],
        }),
      ],
    });
    if (needsMigration) {
      pipeline.addStage({
        stageName: 'MigrateStg',
        actions: [
          new cpactions.CodeBuildAction({
            actionName: 'PrismaMigrateDeploy',
            project: codebuild.PipelineProject.fromProjectName(
              this,
              `${appName}StgMigrateProject`,
              migrateProjectName(appName, 'stg')
            ),
            input: stgSource,
            role: stgRole,
          }),
        ],
      });
    }
    pipeline.addStage({
      stageName: 'DeployStg',
      actions: [
        new cpactions.CodeDeployEcsDeployAction({
          actionName: 'CodeDeployBlueGreen',
          deploymentGroup: this.importDeploymentGroup(appName, 'stg'),
          appSpecTemplateInput: stgGen,
          taskDefinitionTemplateInput: stgGen,
          role: stgRole,
        }),
      ],
    });

    // PROD への昇格（prod指定時のみ）
    if (!prod) return;

    const prodRoleArn = crossAccountRoleArn(prod.accountId, 'prod');
    const prodRole = iam.Role.fromRoleArn(this, `${appName}ProdCrossAccountRole`, prodRoleArn, {
      mutable: false,
    });
    pipeline.artifactBucket.grantRead(prodRole);
    pipeline.artifactBucket.encryptionKey?.grantDecrypt(prodRole);

    const prodSource = new codepipeline.Artifact(`${appName}ProdSource`);

    pipeline.addStage({
      stageName: 'ApproveProd',
      actions: [new cpactions.ManualApprovalAction({ actionName: 'ApproveProd' })],
    });
    pipeline.addStage({
      stageName: 'PromoteToProd',
      actions: [
        new cpactions.CodeBuildAction({
          actionName: 'PromoteImage',
          project: this.buildPromoteProject(
            `${appName}PromoteToProd`,
            stg.repository,
            prod.repository
          ),
          input: stgSource,
          outputs: [prodSource],
        }),
      ],
    });

    const prodGen = new codepipeline.Artifact(`${appName}ProdGen`);
    pipeline.addStage({
      stageName: 'GenerateProd',
      actions: [
        new cpactions.CodeBuildAction({
          actionName: 'GenerateDeployArtifacts',
          project: this.buildGenerateProject(`${appName}GenProd`, {
            taskDefFamily: taskDefFamily(appName, 'prod'),
            containerPort,
            crossAccountRoleArn: prodRoleArn,
          }),
          input: prodSource,
          outputs: [prodGen],
        }),
      ],
    });
    if (needsMigration) {
      pipeline.addStage({
        stageName: 'MigrateProd',
        actions: [
          new cpactions.CodeBuildAction({
            actionName: 'PrismaMigrateDeploy',
            project: codebuild.PipelineProject.fromProjectName(
              this,
              `${appName}ProdMigrateProject`,
              migrateProjectName(appName, 'prod')
            ),
            input: prodSource,
            role: prodRole,
          }),
        ],
      });
    }
    pipeline.addStage({
      stageName: 'DeployProd',
      actions: [
        new cpactions.CodeDeployEcsDeployAction({
          actionName: 'CodeDeployBlueGreen',
          deploymentGroup: this.importDeploymentGroup(appName, 'prod'),
          appSpecTemplateInput: prodGen,
          taskDefinitionTemplateInput: prodGen,
          role: prodRole,
        }),
      ],
    });
  }

  // ─── ヘルパー: クロスアカウントの DeploymentGroup をインポート ───────────────

  private importDeploymentGroup(
    appName: AppName,
    envName: EnvName
  ): codedeploy.IEcsDeploymentGroup {
    const application = codedeploy.EcsApplication.fromEcsApplicationName(
      this,
      `${appName}${envName}ApplicationImport`,
      codeDeployAppName(appName, envName)
    );
    return codedeploy.EcsDeploymentGroup.fromEcsDeploymentGroupAttributes(
      this,
      `${appName}${envName}DeploymentGroupImport`,
      {
        application,
        deploymentGroupName: codeDeployGroupName(appName, envName),
        deploymentConfig: codedeploy.EcsDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTES,
      }
    );
  }

  // ─── ヘルパー: デプロイアーティファクト生成 CodeBuild ───────────────────────

  private buildGenerateProject(
    id: string,
    config: GenerateProjectConfig
  ): codebuild.PipelineProject {
    const project = new codebuild.PipelineProject(this, `${id}Project`, {
      projectName: id,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        environmentVariables: {
          // family名（revision省略）で常に最新ACTIVEリビジョンを引く。
          // クロスアカウントの場合、cdk deployのたびに変わるrevision付きARNは
          // アカウントを跨いで参照できないため、安定したfamily名を使う
          TASK_DEF_FAMILY: { value: config.taskDefFamily },
          CONTAINER_PORT: { value: config.containerPort },
          CONTAINER_NAME: { value: 'Container' },
          ...(config.crossAccountRoleArn
            ? { CROSS_ACCOUNT_ROLE_ARN: { value: config.crossAccountRoleArn } }
            : {}),
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              "IMAGE_URI=$(python3 -c \"import json; print(json.load(open('imageDetail.json'))['ImageURI'])\")",
              ...(config.crossAccountRoleArn
                ? [
                    'CREDENTIALS=$(aws sts assume-role --role-arn "$CROSS_ACCOUNT_ROLE_ARN" --role-session-name generate-taskdef --query Credentials --output json)',
                    'export AWS_ACCESS_KEY_ID=$(echo "$CREDENTIALS" | jq -r .AccessKeyId)',
                    'export AWS_SECRET_ACCESS_KEY=$(echo "$CREDENTIALS" | jq -r .SecretAccessKey)',
                    'export AWS_SESSION_TOKEN=$(echo "$CREDENTIALS" | jq -r .SessionToken)',
                  ]
                : []),
              'aws ecs describe-task-definition --task-definition "$TASK_DEF_FAMILY" --query taskDefinition --output json | jq \'del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.placementConstraints,.compatibilities,.registeredAt,.registeredBy,.deregisteredAt)\' > taskdef.json',
              'jq --arg img "$IMAGE_URI" --arg name "$CONTAINER_NAME" \'(.containerDefinitions[] | select(.name == $name)) |= (. + {image: $img} | del(.command))\' taskdef.json > taskdef_tmp.json && mv taskdef_tmp.json taskdef.json',
              'jq \'. + {"runtimePlatform": {"cpuArchitecture": "ARM64", "operatingSystemFamily": "LINUX"}}\' taskdef.json > taskdef_tmp.json && mv taskdef_tmp.json taskdef.json',
              'printf \'version: 0.0\\nResources:\\n  - TargetService:\\n      Type: AWS::ECS::Service\\n      Properties:\\n        TaskDefinition: <TASK_DEFINITION>\\n        LoadBalancerInfo:\\n          ContainerName: "%s"\\n          ContainerPort: %s\\n\' "$CONTAINER_NAME" "$CONTAINER_PORT" > appspec.yaml',
            ],
          },
        },
        artifacts: { files: ['taskdef.json', 'appspec.yaml'] },
      }),
    });
    project.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ecs:DescribeTaskDefinition'],
        resources: ['*'],
      })
    );
    if (config.crossAccountRoleArn) {
      project.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['sts:AssumeRole'],
          resources: [config.crossAccountRoleArn],
        })
      );
    }
    return project;
  }

  // ─── ヘルパー: 環境間イメージ昇格 CodeBuild ────────────────────────────────
  // ECRはDevアカウントに集約されているため、この昇格は常にDevアカウント内（同一レジストリ内のマニフェストコピー）で完結し、クロスアカウント対応は不要

  private buildPromoteProject(
    id: string,
    srcRepo: ecr.IRepository,
    dstRepo: ecr.IRepository
  ): codebuild.PipelineProject {
    const project = new codebuild.PipelineProject(this, `${id}Project`, {
      projectName: id,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        environmentVariables: {
          SRC_REPO: { value: srcRepo.repositoryName },
          DST_REPO: { value: dstRepo.repositoryName },
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              // 移行元イメージのダイジェストを取得
              "IMAGE_URI=$(python3 -c \"import json; print(json.load(open('imageDetail.json'))['ImageURI'])\")",
              "IMAGE_DIGEST=$(echo \"$IMAGE_URI\" | awk -F'@' '{print $2}')",
              // マニフェストを移行先リポジトリに書き込む（同一ダイジェストで :latest タグ）
              'MANIFEST=$(aws ecr batch-get-image --repository-name "$SRC_REPO" --image-ids imageDigest="$IMAGE_DIGEST" --query \'images[0].imageManifest\' --output text)',
              'aws ecr put-image --repository-name "$DST_REPO" --image-tag latest --image-manifest "$MANIFEST"',
              // 後続ステージ用に移行先の imageDetail.json を出力
              'REGISTRY=$(echo "$IMAGE_URI" | cut -d\'/\' -f1)',
              'echo "{\\"ImageURI\\":\\"$REGISTRY/$DST_REPO@$IMAGE_DIGEST\\"}" > imageDetail.json',
            ],
          },
        },
        artifacts: { files: ['imageDetail.json'] },
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
        actions: ['ecr:BatchGetImage', 'ecr:GetDownloadUrlForLayer'],
        resources: [srcRepo.repositoryArn],
      })
    );
    project.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'ecr:PutImage',
          'ecr:InitiateLayerUpload',
          'ecr:UploadLayerPart',
          'ecr:CompleteLayerUpload',
          'ecr:BatchCheckLayerAvailability',
        ],
        resources: [dstRepo.repositoryArn],
      })
    );
    return project;
  }
}
