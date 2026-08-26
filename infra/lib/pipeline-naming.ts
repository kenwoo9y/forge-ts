import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type EnvName = 'dev' | 'stg' | 'prod';
export type AppName = 'Api' | 'Web';

/**
 * The project name, read from the repo root's package.json so that renaming the
 * project (see scripts/rename-project.sh) doesn't require editing this file.
 */
export const projectName: string = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
).name;

function envSuffix(envName: EnvName): string {
  return envName.charAt(0).toUpperCase() + envName.slice(1);
}

/**
 * The family name of the ECS task definition. Cross-account `ecs describe-task-definition`
 * cannot resolve a revision-qualified ARN (token) across accounts, so we standardize on
 * the family name without a revision (which refers to the latest ACTIVE revision instead).
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
  return `${projectName}/${appName.toLowerCase()}-${envName}`;
}

export function ecrRepoArn(accountId: string, region: string, repositoryName: string): string {
  return `arn:aws:ecr:${region}:${accountId}:repository/${repositoryName}`;
}
