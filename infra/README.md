# infra

AWS CDK（TypeScript）によるインフラ定義。VPC・RDS・ECS Fargate を複数スタックで管理する。スタック構成・使用しているAWSサービスの詳細は [インフラアーキテクチャ](../docs/infra-architecture.md) を参照。

## 事前準備

AWS SSO でログインする（`.devcontainer/.env` に SSO 設定が必要）。

```bash
make aws-login
```

CDK を初めて使う環境ではブートストラップが必要。

```bash
make cdk-bootstrap
```

## デプロイコマンド

DEV・STG・PROD は別々のAWSアカウントにデプロイする。CI/CDパイプライン（`PipelineStack`）とECRは「Pipelineアカウント」に同居し、デフォルトはDEVアカウントと同居する（`PIPELINE_ACCOUNT_ID`で別アカウントに切り出し可能）。`cdk` は常にPipelineアカウントの認証情報で実行し、STG・PROD（・Pipelineを切り出した場合のDEV）はアカウントIDを環境変数で指定した場合のみ対象になる。

| コマンド | 内容 |
|---|---|
| `pnpm exec cdk deploy --all -c githubOrg=<org> -c githubRepo=<repo>` | 全スタックをデプロイ（初回・DEV のみ、PipelineはDEVと同居） |
| `STG_ACCOUNT_ID=<accountId> pnpm exec cdk deploy --all -c githubOrg=<org> -c githubRepo=<repo>` | STG を追加してデプロイ（事前にSTGアカウントでの`cdk bootstrap --trust`が必要） |
| `STG_ACCOUNT_ID=<accountId> PROD_ACCOUNT_ID=<accountId> pnpm exec cdk deploy --all -c githubOrg=<org> -c githubRepo=<repo>` | PROD を追加してデプロイ（事前にPRODアカウントでの`cdk bootstrap --trust`が必要） |
| `PIPELINE_ACCOUNT_ID=<accountId> pnpm exec cdk deploy --all -c githubOrg=<org> -c githubRepo=<repo>` | Pipeline・ECRをDEVとは別アカウント（Tooling等）に切り出してデプロイ（事前にそのアカウントでの`cdk bootstrap --trust`が必要） |
| `pnpm cdk deploy DevNetworkStack` | 指定スタックのみデプロイ |
| `pnpm cdk destroy` | 全スタックを削除 |
