export type EnvName = 'dev' | 'stg' | 'prod';
export type AppName = 'Api' | 'Web';

function envSuffix(envName: EnvName): string {
  return envName.charAt(0).toUpperCase() + envName.slice(1);
}

/**
 * ECSタスク定義のfamily名。クロスアカウントの`ecs describe-task-definition`は
 * revision付きARN（トークン）をアカウントを跨いで参照できないため、
 * revisionを省略できるfamily名（＝最新のACTIVEリビジョンを指す）で統一する。
 */
export function taskDefFamily(appName: AppName, envName: EnvName): string {
  return `${envName}-${appName.toLowerCase()}`;
}

export function crossAccountRoleName(envName: EnvName): string {
  return `pipeline-cross-account-${envName}`;
}

export function crossAccountRoleArn(accountId: string, envName: EnvName): string {
  return `arn:aws:iam::${accountId}:role/${crossAccountRoleName(envName)}`;
}

export function codeDeployAppName(appName: AppName, envName: EnvName): string {
  return `${appName}${envSuffix(envName)}`;
}

export function codeDeployGroupName(appName: AppName, envName: EnvName): string {
  return `${codeDeployAppName(appName, envName)}DeploymentGroup`;
}

export function migrateProjectName(appName: AppName, envName: EnvName): string {
  return `${appName}Migrate${envSuffix(envName)}`;
}

export function ecrRepoName(appName: AppName, envName: EnvName): string {
  return `forge-ts/${appName.toLowerCase()}-${envName}`;
}

export function ecrRepoArn(accountId: string, region: string, repositoryName: string): string {
  return `arn:aws:ecr:${region}:${accountId}:repository/${repositoryName}`;
}
