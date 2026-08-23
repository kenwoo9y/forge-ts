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
  it('taskDefFamilyはenv-app名形式（小文字）を返す', () => {
    expect(taskDefFamily('Api', 'dev')).toBe('dev-api');
    expect(taskDefFamily('Web', 'prod')).toBe('prod-web');
  });

  it('crossAccountRoleNameはpipeline-cross-account-envを返す', () => {
    expect(crossAccountRoleName('stg')).toBe('pipeline-cross-account-stg');
  });

  it('crossAccountRoleArnはIAMロールのARNを組み立てる', () => {
    expect(crossAccountRoleArn('123456789012', 'prod')).toBe(
      'arn:aws:iam::123456789012:role/pipeline-cross-account-prod'
    );
  });

  it('codeDeployAppNameはAppName+Env接尾辞（先頭大文字）を返す', () => {
    expect(codeDeployAppName('Api', 'dev')).toBe('ApiDev');
    expect(codeDeployAppName('Web', 'prod')).toBe('WebProd');
  });

  it('codeDeployGroupNameはcodeDeployAppName+DeploymentGroupを返す', () => {
    expect(codeDeployGroupName('Api', 'stg')).toBe('ApiStgDeploymentGroup');
  });

  it('migrateProjectNameはAppNameMigrateEnv接尾辞を返す', () => {
    expect(migrateProjectName('Api', 'dev')).toBe('ApiMigrateDev');
    expect(migrateProjectName('Web', 'prod')).toBe('WebMigrateProd');
  });

  it('ecrRepoNameはforge-ts/app名-env形式（小文字）を返す', () => {
    expect(ecrRepoName('Api', 'dev')).toBe('forge-ts/api-dev');
    expect(ecrRepoName('Web', 'prod')).toBe('forge-ts/web-prod');
  });

  it('ecrRepoArnはECRリポジトリのARNを組み立てる', () => {
    expect(ecrRepoArn('123456789012', 'ap-northeast-1', 'forge-ts/api-dev')).toBe(
      'arn:aws:ecr:ap-northeast-1:123456789012:repository/forge-ts/api-dev'
    );
  });
});
