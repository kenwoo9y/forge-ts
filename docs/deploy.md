# Deploy

## アカウント構成

DEV・STG・PROD はそれぞれ別々のAWSアカウントにデプロイする（詳細は [infra-architecture.md](./infra-architecture.md) の「アカウント構成」を参照）。CI/CDパイプラインとECRは「Pipelineアカウント」に同居し、STG・PROD（およびPipelineを切り出した場合のDEV）へはクロスアカウントでデプロイする。デフォルトではPipelineアカウント＝DEVアカウントで追加設定不要。`cdk synth`/`cdk deploy` は常にPipelineアカウントの認証情報で実行する（デフォルトではDEVアカウントの認証情報。IDは認証情報からCDK CLIが自動的に読み取るため明示指定は不要）。

## 初回セットアップ（AWSアカウントへの初回デプロイ）

DEV から始めて、段階的に STG・PROD を追加できる。

```bash
# 1. AWS SSO でログイン（DEVアカウント）
make aws-login

# 2. CDK bootstrap（初回のみ）
make cdk-bootstrap

# 3. ECR・DEV インフラ・パイプラインをデプロイ
#    POSTGRES_DB（.devcontainer/.env で設定済み）が RDS のデータベース名として使用される
#    JWT シークレット（dev/jwt-secret）は CDK が自動作成する
cd infra
pnpm exec cdk deploy --all \
  -c githubOrg=<GitHub ユーザー名または組織名> \
  -c githubRepo=<リポジトリ名>

# 4. JWT シークレットに値を設定
#    CDK がランダム値でシークレットを作成するため、実際に使用する値に更新する
aws secretsmanager put-secret-value \
  --secret-id dev/jwt-secret \
  --secret-string "$(openssl rand -base64 32)"

# 5. GitHub Actions のシークレット・変数、GitHub Environment を設定
#    必要な項目は下記「事前準備（GitHub / AWS 設定）」を参照

# 6. アプリデプロイワークフローを有効化
#    CDK デプロイ完了後、PR を作成してワークフローを workflows に移動する
#    （main はブランチ保護のため直接 push 不可）
git checkout -b enable-deployment-workflows
mv .github/disabled-workflows/app-deploy.yaml .github/workflows/app-deploy.yaml
mv .github/disabled-workflows/infra-deploy.yaml .github/workflows/infra-deploy.yaml
git add .github/workflows
git commit -m "ci: enable deployment workflows"
git push -u origin enable-deployment-workflows
# GitHub 上で PR を作成して main にマージする

# 7. main ブランチに push すると GitHub Actions が DEV へ自動デプロイ
```

### STG 環境の追加

STGは別AWSアカウントにデプロイするため、事前にアカウントを用意し、DEVアカウントからの信頼設定が必要。

```bash
# 0. STGアカウントを作成した上で、STGアカウントの認証情報でCDK bootstrapを実行
#    （DEVアカウントからのcdk deploy/パイプラインを信頼させる）
cdk bootstrap aws://<STGアカウントID>/<リージョン> --trust <DEVアカウントID>

# 1. DEVアカウントの認証情報に戻り、STG_ACCOUNT_ID を設定して再デプロイ
#    （stg/jwt-secret は CDK が自動作成）
cd infra
STG_ACCOUNT_ID=<STGアカウントID> pnpm exec cdk deploy --all \
  -c githubOrg=<GitHub ユーザー名または組織名> \
  -c githubRepo=<リポジトリ名>
```

デプロイ後、次回の main push から CodePipeline に STG 承認・昇格ステージが追加される。`STG_ACCOUNT_ID` は今後の全デプロイ（CI含む）で継続して設定しておく必要がある（`.env` に設定するか、CI側の環境変数として登録する）。

### PROD 環境の追加

PRODも同様に別AWSアカウントを用意する。

```bash
# 0. PRODアカウントの認証情報でCDK bootstrapを実行
cdk bootstrap aws://<PRODアカウントID>/<リージョン> --trust <DEVアカウントID>

# 1. DEVアカウントの認証情報に戻り、STG_ACCOUNT_ID/PROD_ACCOUNT_ID を設定して再デプロイ
#    （prod/jwt-secret は CDK が自動作成）
cd infra
STG_ACCOUNT_ID=<STGアカウントID> PROD_ACCOUNT_ID=<PRODアカウントID> pnpm exec cdk deploy --all \
  -c githubOrg=<GitHub ユーザー名または組織名> \
  -c githubRepo=<リポジトリ名>
```

### Pipelineアカウントの切り出し（任意）

デフォルトではPipeline（CodePipeline・ECR）はDEVアカウントに同居する。専用のTooling/CI-CDアカウントに切り出したい場合、`PIPELINE_ACCOUNT_ID`を設定する。この場合、DEVもSTG/PROD同様にPipelineからのクロスアカウントデプロイ対象になる。

```bash
# 0. Pipeline用アカウントを作成した上で、そのアカウントの認証情報でCDK bootstrapを実行
#    （--trustにはこれまでcdkを実行してきたアカウント＝現在のDEVアカウントのIDを指定する）
cdk bootstrap aws://<Pipelineアカウント ID>/<リージョン> --trust <現在のDEVアカウントID>

# 1. DEVアカウントの認証情報のまま、PIPELINE_ACCOUNT_ID を設定して再デプロイ
#    （Pipeline・ECRがPipelineアカウントへ、CodeDeploy/マイグレーション用CodeBuild等が
#    DevDeployTargetStackとしてDEVアカウントへ作成される）
cd infra
PIPELINE_ACCOUNT_ID=<Pipelineアカウント ID> pnpm exec cdk deploy --all \
  -c githubOrg=<GitHub ユーザー名または組織名> \
  -c githubRepo=<リポジトリ名>
```

`PIPELINE_ACCOUNT_ID` は今後の全デプロイ（CI含む）で継続して設定しておく必要がある。また、GitHub Actionsが使うOIDCロール（`github-actions-app-deploy`・`github-actions-infra-deploy`）もPipelineアカウント側に作成されるため、GitHub Secretsの値をPipelineアカウントのロールARNに更新する必要がある。

---

## 事前準備（GitHub / AWS 設定）

`app-deploy.yaml` / `infra-deploy.yaml` を有効化する前に、以下がすべて設定されている必要がある。特に **GitHub Environment の設定を忘れると、承認なしで無人デプロイされてしまう**ため注意。

### 1. GitHub Environment: `main`

Settings → Environments → New environment → `main`

| 設定 | 値 | 必須度 |
|---|---|---|
| Required reviewers | 承認者を指定 | 必須（未設定だと承認ゲートが機能せず、pushされた瞬間に無人でデプロイされる） |
| Deployment branches | `main` のみ | 推奨 |

`app-deploy.yaml`（`approve` ジョブ）・`infra-deploy.yaml`（`cdk-deploy` ジョブ）の両方がこの Environment を参照する。IAM ロールのトラストポリシーもこの Environment 名にスコープされているため、設定を怠ると GitHub 側・AWS 側どちらの防御も効かない。

### 2. GitHub Secrets

Settings → Secrets and variables → Actions → Secrets

| 名前 | 使用ワークフロー | 説明 |
|---|---|---|
| `AWS_APP_DEPLOY_ROLE_ARN` | `app-deploy.yaml` | OIDC ロール ARN（DEV ECR push 専用、ECS/CodePipeline 操作不可） |
| `AWS_INFRA_DEPLOY_ROLE_ARN` | `infra-deploy.yaml` | OIDC ロール ARN（CDK deploy 用） |
| `E2E_USERNAME` / `E2E_PASSWORD` | `e2e.yaml` | E2E テスト用アカウント（必須。詳細は [ci.md](./ci.md)） |
| `JWT_SECRET` / `AUTH_SECRET` | `e2e.yaml` | 任意。未設定時はワークフロー内の固定値で代替 |
| `PIPELINE_ACCOUNT_ID` | `infra-deploy.yaml` | 任意。Pipelineアカウントを切り出した場合のみ設定（[Pipelineアカウントの切り出し](#pipelineアカウントの切り出し任意)参照） |
| `STG_ACCOUNT_ID` | `infra-deploy.yaml` | 任意。STG環境を追加した場合のみ設定（[STG 環境の追加](#stg-環境の追加)参照） |
| `PROD_ACCOUNT_ID` | `infra-deploy.yaml` | 任意。PROD環境を追加した場合のみ設定（[PROD 環境の追加](#prod-環境の追加)参照） |

上記2つの OIDC ロールは **CDK（`PipelineStack`）自身が作成する** 。ローカルの強い権限を持つ AWS 認証情報で一度 `cdk deploy --all` を実行し、出力されたロール ARN をここに設定する（初回セットアップの全手順は [README.md](../README.md) を参照）。

### 3. GitHub Variables

Settings → Secrets and variables → Actions → Variables

| 名前 | 使用ワークフロー | 説明 |
|---|---|---|
| `AWS_REGION` | 全ワークフロー | 例: `ap-northeast-1` |
| `POSTGRES_DB` | `infra-deploy.yaml` | RDS のデータベース名（`cdk synth`/`deploy` の実行に必須。未設定だとエラーで停止する） |

> `PIPELINE_ACCOUNT_ID` / `STG_ACCOUNT_ID` / `PROD_ACCOUNT_ID` はAWSアカウントIDのため、Variablesではなく上記「GitHub Secrets」に設定する。

### 4. ブランチ保護ルール（`main`）

Settings → Branches → Branch protection rules

| 設定 | 値 |
|---|---|
| Require status checks to pass before merging | `CI - API` / `CI - Web` / `CI - Infra` 等を必須化 |
| Require a pull request before merging | 推奨（`main` への直接 push を防ぐ） |

`app-deploy.yaml` はワークフロー内で CI 通過を検証していないため、この設定が実質的な担保になる。

---

## アプリデプロイの流れ

```mermaid
flowchart TD
    PR[PR作成] --> CI["CI - API / CI - Web / Playwright Tests"]
    CI --> Merge[main にマージ]
    Merge --> AppDeploy["app-deploy.yaml\npush: main"]
    AppDeploy --> ApproveApp{GitHub Environment\nmain 承認}
    ApproveApp --> Build["Docker Build & ECR Push\napi / web 並列"]
    Build --> Scan[ECR Image Scan]
    Scan -->|CRITICAL 検出| Stop[デプロイ停止]
    Scan -->|問題なし| Pipeline[CodePipeline 起動]
    Pipeline --> DEV[DEV 自動デプロイ]
    DEV --> ApproveSTG{承認}
    ApproveSTG --> STG[STG デプロイ]
    STG --> ApprovePROD{承認}
    ApprovePROD --> PROD[PROD デプロイ]
```

`app-deploy.yaml` と `infra-deploy.yaml` は `concurrency` グループ（`infra-app-deploy-lock`）を共有しており、片方の実行中はもう片方が待機する（CDKによるインフラ更新とアプリのビルド・ECS Blue/Greenデプロイが同時に走ることで生じ得る不整合を防ぐため）。

---

## インフラデプロイの流れ

```mermaid
flowchart TD
    PR[PR作成] --> CIInfra[CI - Infra]
    CIInfra --> Merge[main にマージ]
    Merge --> InfraDeploy["infra-deploy.yaml\npush: main, infra/**"]
    InfraDeploy --> Approve{GitHub Environment\nmain 承認}
    Approve --> Synth[cdk synth]
    Synth --> Deploy[cdk deploy --all]
```

---

## アプリデプロイ (`.github/workflows/app-deploy.yaml`)

### 概要

`main` ブランチへの push（PR マージ）で `apps/api/**`・`apps/web/**`・`packages/**`・`pnpm-lock.yaml` に変更があった場合に起動するワークフロー。ブランチ保護ルールにより CI 通過済みであることが保証された状態で Docker イメージをビルドして DEV 環境の ECR へ push する。push が CodePipeline のトリガーとなり、DEV→STG→PROD の昇格パイプラインが起動する。

CI 通過の保証はワークフロー内ではなく GitHub の **Required status checks**（ブランチ保護ルール）で行う。`infra-deploy.yaml` と `concurrency` グループ（`infra-app-deploy-lock`）を共有しており、CDKによるインフラ更新中はキャンセルされず待機する。

### 処理フロー

```
approve（GitHub Environment main 承認）
  └─ build-push-scan (api)
     build-push-scan (web)  ← 並列実行
```

### ジョブ一覧

| ジョブ | 内容 |
|---|---|
| `approve` | GitHub Environment `main` の承認ゲート（`infra-deploy.yaml` と同様） |
| `build-push-scan` | `approve` 完了後、OIDC 認証 → Docker ビルド → ECR push → スキャン結果確認（api / web の matrix） |

### ECR push とスキャンゲート

- `:${GITHUB_SHA}` と `:latest` の 2 タグを push する
- `imageScanOnPush: true` のためプッシュ直後にスキャンが実行される
- `CRITICAL` 脆弱性が 1 件でも検出された場合はワークフローが失敗し、パイプラインは起動しない

### 必要な GitHub Secrets / Variables

| 名前 | 種別 | 説明 |
|---|---|---|
| `AWS_APP_DEPLOY_ROLE_ARN` | Secret | OIDC ロール ARN（ECR push 専用、ECS/CodePipeline 操作不可） |
| `AWS_REGION` | Variable | AWS リージョン（例: `ap-northeast-1`） |

---

## インフラデプロイ (`.github/workflows/infra-deploy.yaml`)

### 概要

`main` ブランチへの push（PR マージ）で `infra/**` に変更があった場合に起動するワークフロー。GitHub Environment（`main`）の承認ゲートを経てから OIDC 認証で AWS に接続し、CDK スタックを自動デプロイする。`app-deploy.yaml` と `concurrency` グループ（`infra-app-deploy-lock`）を共有しており、アプリのビルド・デプロイ中はキャンセルされず待機する。

CodePipeline + CodeStar Connections を使わず GitHub Actions + OIDC に統一することで、すべての CI/CD をコードで管理し手動セットアップを排除している。

### 処理フロー

1. AWS OIDC 認証（`main` Environment にスコープされた IAM ロール）
2. `npx cdk synth --no-notices`
3. `npx cdk deploy --all --require-approval never --no-notices`

### 承認ゲート

GitHub Environment `main` に以下を設定することで、デプロイ前の手動承認と実行ブランチの制限を行う。

| 設定 | 値 |
|---|---|
| Required reviewers | 承認者を指定 |
| Deployment branches | `main` のみ |

### OIDC トラストポリシー

IAM ロールのトラストポリシーは Environment（`main`）に紐づけることで、この Environment を経由しない Assume を AWS 側でもブロックする。

```json
"StringEquals": {
  "token.actions.githubusercontent.com:sub": "repo:<org>/<repo>:environment:main"
}
```

### 必要な GitHub Secrets / Variables

| 名前 | 種別 | 説明 |
|---|---|---|
| `AWS_INFRA_DEPLOY_ROLE_ARN` | Secret | OIDC ロール ARN（CDK deploy 用） |
| `AWS_REGION` | Variable | AWS リージョン |
| `POSTGRES_DB` | Variable | RDS のデータベース名 |
| `PIPELINE_ACCOUNT_ID` | Secret | 任意。Pipelineアカウントを切り出した場合のみ設定（[Pipelineアカウントの切り出し](#pipelineアカウントの切り出し任意)参照） |
| `STG_ACCOUNT_ID` | Secret | 任意。STG環境を追加した場合のみ設定（[STG 環境の追加](#stg-環境の追加)参照） |
| `PROD_ACCOUNT_ID` | Secret | 任意。PROD環境を追加した場合のみ設定（[PROD 環境の追加](#prod-環境の追加)参照） |

---

## マニュアルアプリデプロイ手順

CDK デプロイ直後や GitHub Actions ワークフローを使用せずに手動でアプリをデプロイする場合の手順。

### 前提条件

- AWS CLI がインストール・設定済みであること
- Docker がインストール・起動済みであること
- 以下の IAM 権限を持つ AWS 認証情報が設定済みであること
  - `ecr:GetAuthorizationToken`
  - `ecr:BatchCheckLayerAvailability`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`, `ecr:PutImage`（`forge-ts/api-dev` / `forge-ts/web-dev` リポジトリ）
  - `ecr:DescribeImageScanFindings`, `ecr:DescribeImages`（スキャン結果確認用）

### 1. 環境変数の設定

`.env.template` をコピーして値を設定後、読み込む。

```bash
cp .env.template .env
# .env を編集して AWS_REGION, AWS_ACCOUNT_ID, IMAGE_TAG を設定
set -a && source .env && set +a
```

`REGISTRY` はシェル上で動的に組み立てる。

```bash
export REGISTRY=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

### 2. ECR ログイン

```bash
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $REGISTRY
```

### 3. API イメージのビルド & プッシュ

ビルドコンテキストはモノレポルート（`apps/api/Dockerfile` を参照）。

```bash
docker build \
  --platform linux/arm64 \
  -t $REGISTRY/forge-ts/api-dev:$IMAGE_TAG \
  -f apps/api/Dockerfile \
  .

docker push $REGISTRY/forge-ts/api-dev:$IMAGE_TAG
```

### 4. Web イメージのビルド & プッシュ

```bash
docker build \
  --platform linux/arm64 \
  -t $REGISTRY/forge-ts/web-dev:$IMAGE_TAG \
  -f apps/web/Dockerfile \
  .

docker push $REGISTRY/forge-ts/web-dev:$IMAGE_TAG
```

### 5. ECR スキャン結果の確認

CRITICAL 脆弱性が検出された場合は `:latest` タグのプッシュを行わず、脆弱性を修正してから再ビルドする。

```bash
for REPO in forge-ts/api-dev forge-ts/web-dev; do
  echo "=== $REPO ==="
  aws ecr wait image-scan-complete \
    --repository-name "$REPO" \
    --image-id "imageTag=$IMAGE_TAG" \
    --region "$AWS_REGION"

  aws ecr describe-image-scan-findings \
    --repository-name "$REPO" \
    --image-id "imageTag=$IMAGE_TAG" \
    --region "$AWS_REGION" \
    --query 'imageScanFindings.findingSeverityCounts' \
    --output table
done
```

### 6. `:latest` タグでプッシュ（CodePipeline トリガー）

CRITICAL 脆弱性がないことを確認後、`:latest` タグをプッシュする。このプッシュが EventBridge 経由で `ApiAppPipeline` / `WebAppPipeline` を起動する。

```bash
# API
docker tag $REGISTRY/forge-ts/api-dev:$IMAGE_TAG $REGISTRY/forge-ts/api-dev:latest
docker push $REGISTRY/forge-ts/api-dev:latest

# Web
docker tag $REGISTRY/forge-ts/web-dev:$IMAGE_TAG $REGISTRY/forge-ts/web-dev:latest
docker push $REGISTRY/forge-ts/web-dev:latest
```

## アプリパイプライン（CodePipeline: `ApiAppPipeline` / `WebAppPipeline`）

### 概要

ECR の `:latest` タグ更新を EventBridge で検知して起動するパイプライン（Pipelineアカウントに配置。デフォルトはDEVと同居）。DEV への自動デプロイ後、承認を経て STG・PROD へ順番にイメージを昇格させる。STG・PROD（およびPipelineを切り出した場合のDEV）の実行（デプロイ・マイグレーション）はPipelineアカウントからのクロスアカウントアクションになる（詳細は [infra-architecture.md](./infra-architecture.md) の `PipelineStack`/`DeployTargetStack` を参照）。

### 昇格モデル

```
ECR forge-ts/api-dev:latest push（常にPipelineアカウント内のリポジトリ）
  └─ DEV 自動デプロイ（Blue/Green, LINEAR_10PERCENT_EVERY_1MINUTES）
       └─ 承認（STG_ACCOUNT_ID 設定時）
            └─ forge-ts/api-stg:latest へ昇格（同一イメージダイジェスト、Pipelineアカウント内で完結）
                 └─ STGアカウントへクロスアカウントデプロイ
                      └─ 承認（PROD_ACCOUNT_ID 設定時）
                           └─ forge-ts/api-prod:latest へ昇格
                                └─ PRODアカウントへクロスアカウントデプロイ
```

昇格はイメージの**再ビルドなし**でマニフェストをコピーするため、DEV で検証済のバイナリがそのまま PROD に届く。

### ステージ構成

`Migrate*` ステージは Prisma マイグレーションを実行するステージで、`ApiAppPipeline` にのみ存在する（`WebAppPipeline` には無い）。

| ステージ | 常時 | STG_ACCOUNT_ID | PROD_ACCOUNT_ID | 対象 |
|---|---|---|---|---|
| Source | ✓ | ✓ | ✓ | 両方 |
| GenerateDev | ✓ | ✓ | ✓ | 両方 |
| MigrateDev | ✓ | ✓ | ✓ | ApiAppPipelineのみ |
| DeployDev | ✓ | ✓ | ✓ | 両方 |
| ApproveStg | | ✓ | ✓ | 両方 |
| PromoteToStg | | ✓ | ✓ | 両方 |
| GenerateStg | | ✓ | ✓ | 両方 |
| MigrateStg | | ✓ | ✓ | ApiAppPipelineのみ |
| DeployStg | | ✓ | ✓ | 両方 |
| ApproveProd | | | ✓ | 両方 |
| PromoteToProd | | | ✓ | 両方 |
| GenerateProd | | | ✓ | 両方 |
| MigrateProd | | | ✓ | ApiAppPipelineのみ |
| DeployProd | | | ✓ | 両方 |

### デプロイ設定

| 設定 | 値 |
|---|---|
| デプロイ戦略 | `LINEAR_10PERCENT_EVERY_1MINUTES`（段階的トラフィック移行） |
| 失敗時 | 自動ロールバック |
| 旧タスク削除 | デプロイ成功直後に自動削除 |
| ALB リスナー | 本番用 :80 / テスト用 :8080 |
