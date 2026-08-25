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
  /** 'dev' is only used when the Pipeline has been split off into an account separate from Dev via `PIPELINE_ACCOUNT_ID` */
  envName: EnvName;
  /** ID of the Pipeline account (the account where `PipelineStack` is deployed; defaults to sharing the Dev account) */
  pipelineAccountId: string;
  /** Api/WebStack etc. within this account (same account, so the live CDK references can be used directly) */
  envResources: EnvResources;
  /** ARN of the ECR repository consolidated in the Pipeline account (pulls to this account are allowed via the resource policy in `ecr-stack.ts`) */
  ecrRepoArns: { api: string; web: string };
}

/**
 * Pipeline-execution resources deployed on the Dev/Stg/Prod account side.
 * Used whenever the account of this stack differs from the account of the Pipeline's
 * CodePipeline (`PipelineStack`) — always true for Stg/Prod, and true for Dev only when
 * `PIPELINE_ACCOUNT_ID` is specified.
 * Since CloudFormation cannot make cross-account references, these resources are instead
 * imported via `fromXxxAttributes`, reconstructed from the account ID plus the naming
 * convention (`pipeline-naming.ts`), and operated on by assuming `PipelineCrossAccountRole`.
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

    // Only Api, which connects to the DB, needs a Prisma migration. Web is static, so it doesn't need one.
    const apiMigrateProject = buildMigrateProject(
      this,
      migrateProjectName('Api', envName),
      envResources,
      apiRepo
    );

    // ─── Cross-account execution role (assumed by the pipeline in the Dev account) ─────────
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
    // The task definition's ARN changes with every revision, and the Generate stage looks up
    // the "latest ACTIVE" for the family name — which is updated on every CDK deploy — each
    // time, so the family cannot be narrowed down and `*` is used instead
    this.crossAccountRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'EcsDescribeTaskDefinition',
        actions: ['ecs:DescribeTaskDefinition'],
        resources: ['*'],
      })
    );
  }
}
