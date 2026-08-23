import * as cdk from 'aws-cdk-lib';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';
import {
  buildAppEnvConfig,
  buildDeploymentGroup,
  buildMigrateProject,
} from '../constructs/deployment-helpers';
import {
  codeDeployAppName,
  codeDeployGroupName,
  crossAccountRoleName,
  type EnvName,
  migrateProjectName,
  taskDefFamily,
} from '../pipeline-naming';
import type { EnvResources } from './pipeline-types';

export interface DeployTargetStackProps extends cdk.StackProps {
  /** 'dev'は`PIPELINE_ACCOUNT_ID`でPipelineをDevと別アカウントに切り出した場合のみ使用する */
  envName: EnvName;
  /** Pipelineアカウント（`PipelineStack`が配置されているアカウント。デフォルトはDevと同居）のID */
  pipelineAccountId: string;
  /** このアカウント内のApi/WebStack等（同一アカウントのためライブCDK参照をそのまま使える） */
  envResources: EnvResources;
  /** Pipelineアカウントに集約されたECRリポジトリのARN（`ecr-stack.ts`のリソースポリシーで本アカウントへのpullが許可されている） */
  ecrRepoArns: { api: string; web: string };
}

/**
 * Dev/Stg/Prodアカウント側に配置する、パイプライン実行用リソース。
 * PipelineアカウントのCodePipeline（`PipelineStack`）とこのスタックのアカウントが異なる場合
 * （Stg/Prodは常に該当。Devは`PIPELINE_ACCOUNT_ID`指定時のみ該当）に使用する。
 * CloudFormationのクロスアカウント参照ができないため、これらのリソースをアカウントID＋
 * 命名規則（`pipeline-naming.ts`）から逆算して`fromXxxAttributes`でインポートし、
 * `PipelineCrossAccountRole`を引き受けて操作する。
 */
export class DeployTargetStack extends cdk.Stack {
  public readonly crossAccountRole: iam.Role;

  constructor(scope: Construct, id: string, props: DeployTargetStackProps) {
    super(scope, id, props);

    const { envName, pipelineAccountId, envResources, ecrRepoArns } = props;

    const apiRepo = ecr.Repository.fromRepositoryArn(this, 'ApiRepo', ecrRepoArns.api);
    const webRepo = ecr.Repository.fromRepositoryArn(this, 'WebRepo', ecrRepoArns.web);

    const apiConfig = buildAppEnvConfig(
      envResources.apiStack,
      apiRepo,
      taskDefFamily('Api', envName),
      '3000'
    );
    const webConfig = buildAppEnvConfig(
      envResources.webStack,
      webRepo,
      taskDefFamily('Web', envName),
      '3001'
    );

    const apiApplication = new codedeploy.EcsApplication(this, 'ApiApplication', {
      applicationName: codeDeployAppName('Api', envName),
    });
    const webApplication = new codedeploy.EcsApplication(this, 'WebApplication', {
      applicationName: codeDeployAppName('Web', envName),
    });

    const apiDeploymentGroup = buildDeploymentGroup(this, 'Api', apiConfig, {
      application: apiApplication,
      deploymentGroupName: codeDeployGroupName('Api', envName),
    });
    const webDeploymentGroup = buildDeploymentGroup(this, 'Web', webConfig, {
      application: webApplication,
      deploymentGroupName: codeDeployGroupName('Web', envName),
    });

    // Prismaマイグレーションが必要なのはDBに接続するApiのみ。Webは静的なため不要
    const apiMigrateProject = buildMigrateProject(
      this,
      migrateProjectName('Api', envName),
      envResources,
      apiRepo
    );

    // ─── クロスアカウント実行ロール（Devアカウントのパイプラインが引き受ける） ─────────
    this.crossAccountRole = new iam.Role(this, 'PipelineCrossAccountRole', {
      roleName: crossAccountRoleName(envName),
      assumedBy: new iam.AccountPrincipal(pipelineAccountId),
      description: `Assumed by the pipeline account (${pipelineAccountId}) to deploy to ${envName}`,
    });

    this.crossAccountRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CodeDeploy',
        actions: [
          'codedeploy:CreateDeployment',
          'codedeploy:GetApplication',
          'codedeploy:GetApplicationRevision',
          'codedeploy:GetDeployment',
          'codedeploy:GetDeploymentConfig',
          'codedeploy:RegisterApplicationRevision',
        ],
        resources: [
          apiApplication.applicationArn,
          webApplication.applicationArn,
          apiDeploymentGroup.deploymentGroupArn,
          webDeploymentGroup.deploymentGroupArn,
          `arn:aws:codedeploy:${this.region}:${this.account}:deploymentconfig:*`,
        ],
      })
    );
    this.crossAccountRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CodeBuildMigrate',
        actions: ['codebuild:StartBuild', 'codebuild:StopBuild', 'codebuild:BatchGetBuilds'],
        resources: [apiMigrateProject.projectArn],
      })
    );
    // タスク定義はrevisionごとにARNが変わり、GenerateステージはCDK deployのたびに
    // 更新されるfamily名の「最新ACTIVE」を都度引くため、familyを絞り込めず`*`とする
    this.crossAccountRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'EcsDescribeTaskDefinition',
        actions: ['ecs:DescribeTaskDefinition'],
        resources: ['*'],
      })
    );
  }
}
