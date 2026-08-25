import { describe, expect, it } from 'vitest';
import {
  codeDeployAppName,
  codeDeployGroupName,
  crossAccountRoleArn,
  crossAccountRoleName,
  ecrRepoArn,
  ecrRepoName,
  migrateProjectName,
  taskDefFamily,
} from '../lib/pipeline-naming';

describe('pipeline-naming', () => {
  it('taskDefFamily returns env-appName form (lowercase)', () => {
    expect(taskDefFamily('Api', 'dev')).toBe('dev-api');
    expect(taskDefFamily('Web', 'prod')).toBe('prod-web');
  });

  it('crossAccountRoleName returns pipeline-cross-account-env', () => {
    expect(crossAccountRoleName('stg')).toBe('pipeline-cross-account-stg');
  });

  it('crossAccountRoleArn builds the IAM role ARN', () => {
    expect(crossAccountRoleArn('123456789012', 'prod')).toBe(
      'arn:aws:iam::123456789012:role/pipeline-cross-account-prod'
    );
  });

  it('codeDeployAppName returns AppName+Env suffix (capitalized)', () => {
    expect(codeDeployAppName('Api', 'dev')).toBe('ApiDev');
    expect(codeDeployAppName('Web', 'prod')).toBe('WebProd');
  });

  it('codeDeployGroupName returns codeDeployAppName+DeploymentGroup', () => {
    expect(codeDeployGroupName('Api', 'stg')).toBe('ApiStgDeploymentGroup');
  });

  it('migrateProjectName returns AppNameMigrateEnv suffix', () => {
    expect(migrateProjectName('Api', 'dev')).toBe('ApiMigrateDev');
    expect(migrateProjectName('Web', 'prod')).toBe('WebMigrateProd');
  });

  it('ecrRepoName returns forge-ts/appName-env form (lowercase)', () => {
    expect(ecrRepoName('Api', 'dev')).toBe('forge-ts/api-dev');
    expect(ecrRepoName('Web', 'prod')).toBe('forge-ts/web-prod');
  });

  it('ecrRepoArn builds the ECR repository ARN', () => {
    expect(ecrRepoArn('123456789012', 'ap-northeast-1', 'forge-ts/api-dev')).toBe(
      'arn:aws:ecr:ap-northeast-1:123456789012:repository/forge-ts/api-dev'
    );
  });
});
