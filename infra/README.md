# infra

Infrastructure defined with AWS CDK (TypeScript). Manages the VPC, RDS, and ECS Fargate across multiple stacks. See [Infrastructure Architecture](../docs/infra-architecture.md) for details on the stack composition and the AWS services used.

## Prerequisites

Log in via AWS SSO (requires SSO settings in `.devcontainer/.env`).

```bash
make aws-login
```

An environment using CDK for the first time needs to be bootstrapped.

```bash
make cdk-bootstrap
```

## Deploy commands

DEV, STG, and PROD are deployed to separate AWS accounts. The CI/CD pipeline (`PipelineStack`) and ECR live together in the "Pipeline account," which is co-located with the DEV account by default (it can be split out into a separate account via `PIPELINE_ACCOUNT_ID`). `cdk` always runs with the Pipeline account's credentials, and STG/PROD (and DEV, if the Pipeline is split out) are only targeted when their account ID is set via an environment variable.

| Command | Description |
|---|---|
| `pnpm exec cdk deploy --all -c githubOrg=<org> -c githubRepo=<repo>` | Deploy all stacks (first run, DEV only; Pipeline co-located with DEV) |
| `STG_ACCOUNT_ID=<accountId> pnpm exec cdk deploy --all -c githubOrg=<org> -c githubRepo=<repo>` | Add and deploy STG (requires running `cdk bootstrap --trust` in the STG account beforehand) |
| `STG_ACCOUNT_ID=<accountId> PROD_ACCOUNT_ID=<accountId> pnpm exec cdk deploy --all -c githubOrg=<org> -c githubRepo=<repo>` | Add and deploy PROD (requires running `cdk bootstrap --trust` in the PROD account beforehand) |
| `PIPELINE_ACCOUNT_ID=<accountId> pnpm exec cdk deploy --all -c githubOrg=<org> -c githubRepo=<repo>` | Split the Pipeline/ECR out into an account separate from DEV (e.g. Tooling) and deploy (requires running `cdk bootstrap --trust` in that account beforehand) |
| `pnpm cdk deploy DevNetworkStack` | Deploy only the specified stack |
| `pnpm cdk destroy` | Delete all stacks |
