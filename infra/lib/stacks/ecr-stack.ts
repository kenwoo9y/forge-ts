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
   * DEV アカウントのID。指定時のみDEVリポジトリにクロスアカウントpull権限を付与する
   * （PipelineアカウントとDevアカウントが異なる、すなわち`PIPELINE_ACCOUNT_ID`が
   * 指定されている場合にのみ渡す。通常はPipelineとDevが同居するため未指定でよい）
   */
  devAccountId?: string;
  /** STG アカウントのID。指定時のみSTGリポジトリを作成し、クロスアカウントpull権限を付与する */
  stgAccountId?: string;
  /** PROD アカウントのID。指定時のみPRODリポジトリを作成し、クロスアカウントpull権限を付与する */
  prodAccountId?: string;
}

/**
 * ECRリポジトリスタック
 * 環境ごとに api / web のリポジトリペアを管理する
 * DEV は常に作成。STG/PROD は対応するアカウントIDが指定されている場合のみ作成する
 * （DEV/STG/PRODは別アカウントにデプロイするため、アカウントIDの有無がそのまま「そのアカウントが用意され、利用可能か」を表す唯一のフラグになる）
 *
 * ECRはこのスタックのアカウント（Pipelineアカウント。デフォルトはDevと同居）に集約する。
 * STG/PROD（および必要であればDEV）のECSタスク実行ロールは`AmazonECSTaskExecutionRolePolicy`（Resource: "*"）でpullのIAM権限自体は持っているため、
 * リポジトリ側のリソースポリシーで対象アカウントを許可プリンシパルに追加するだけでクロスアカウントpullが可能になる
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
