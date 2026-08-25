import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';
import { type EnvName, ecrRepoName } from '../pipeline-naming';

export interface EcrRepos {
  api: ecr.Repository;
  web: ecr.Repository;
}

export interface EcrStackProps extends cdk.StackProps {
  /**
   * The DEV account's ID. When specified, cross-account pull permission is granted to the
   * DEV repository (pass this only when the Pipeline account and Dev account differ, i.e.
   * when `PIPELINE_ACCOUNT_ID` is specified; normally Pipeline and Dev share an account, so
   * this can be left unset).
   */
  devAccountId?: string;
  /** The STG account's ID. When specified, the STG repository is created and granted cross-account pull permission. */
  stgAccountId?: string;
  /** The PROD account's ID. When specified, the PROD repository is created and granted cross-account pull permission. */
  prodAccountId?: string;
}

/**
 * ECR repository stack.
 * Manages an api / web repository pair for each environment.
 * DEV is always created. STG/PROD are created only when the corresponding account ID is
 * specified (since DEV/STG/PROD deploy to separate accounts, whether an account ID is present
 * is the single flag indicating whether that account has been provisioned and is available).
 *
 * ECR is consolidated in this stack's account (the Pipeline account; by default, shared with Dev).
 * The ECS task execution roles for STG/PROD (and DEV, where applicable) already have the IAM
 * permission to pull via `AmazonECSTaskExecutionRolePolicy` (Resource: "*"), so cross-account
 * pull just requires adding the target account as an allowed principal in the repository's
 * resource policy.
 */
export class EcrStack extends cdk.Stack {
  public readonly dev: EcrRepos;
  public readonly stg?: EcrRepos;
  public readonly prod?: EcrRepos;

  constructor(scope: Construct, id: string, props?: EcrStackProps) {
    super(scope, id, props);

    this.dev = this.createRepos('dev', props?.devAccountId);

    if (props?.stgAccountId) {
      this.stg = this.createRepos('stg', props.stgAccountId);
    }
    if (props?.prodAccountId) {
      this.prod = this.createRepos('prod', props.prodAccountId);
    }
  }

  private createRepos(env: EnvName, crossAccountId?: string): EcrRepos {
    const suffix = env.charAt(0).toUpperCase() + env.slice(1);

    const api = new ecr.Repository(this, `ApiRepository${suffix}`, {
      repositoryName: ecrRepoName('Api', env),
      imageTagMutability: ecr.TagMutability.MUTABLE,
      imageScanOnPush: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    api.addLifecycleRule({
      rulePriority: 1,
      description: 'Keep only last 20 images',
      maxImageCount: 20,
      tagStatus: ecr.TagStatus.ANY,
    });

    const web = new ecr.Repository(this, `WebRepository${suffix}`, {
      repositoryName: ecrRepoName('Web', env),
      imageTagMutability: ecr.TagMutability.MUTABLE,
      imageScanOnPush: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    web.addLifecycleRule({
      rulePriority: 1,
      description: 'Keep only last 20 images',
      maxImageCount: 20,
      tagStatus: ecr.TagStatus.ANY,
    });

    if (crossAccountId) {
      for (const repo of [api, web]) {
        repo.addToResourcePolicy(
          new iam.PolicyStatement({
            sid: 'CrossAccountPull',
            principals: [new iam.AccountPrincipal(crossAccountId)],
            actions: [
              'ecr:BatchGetImage',
              'ecr:GetDownloadUrlForLayer',
              'ecr:BatchCheckLayerAvailability',
            ],
          })
        );
      }
    }

    return { api, web };
  }
}
