import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { EcrStack } from '../lib/stacks/ecr-stack';

describe('EcrStack', () => {
  const app = new cdk.App();
  const stack = new EcrStack(app, 'TestEcrStack');
  const template = Template.fromStack(stack);

  it('ECRリポジトリが2つ作成される', () => {
    template.resourceCountIs('AWS::ECR::Repository', 2);
  });

  it('DEV APIリポジトリが正しい名前で作成される', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/api-dev',
    });
  });

  it('DEV Webリポジトリが正しい名前で作成される', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/web-dev',
    });
  });

  it('プッシュ時のイメージスキャンが有効化される', () => {
    const repos = template.findResources('AWS::ECR::Repository');
    for (const repo of Object.values(repos)) {
      expect(repo.Properties?.ImageScanningConfiguration?.ScanOnPush).toBe(true);
    }
  });

  it('ライフサイクルポリシーが設定される（最新20件保持）', () => {
    const repos = template.findResources('AWS::ECR::Repository');
    for (const repo of Object.values(repos)) {
      const policyText: string = repo.Properties?.LifecyclePolicy?.LifecyclePolicyText ?? '';
      expect(policyText).toContain('"countNumber":20');
    }
  });

  it('削除保護が設定される（RETAIN）', () => {
    template.hasResource('AWS::ECR::Repository', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  });

  it('タグのミュータビリティがMUTABLEに設定される', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      ImageTagMutability: 'MUTABLE',
    });
  });
});

describe('EcrStack (stgAccountId指定)', () => {
  const app = new cdk.App();
  const stack = new EcrStack(app, 'TestEcrStackCrossAccount', {
    stgAccountId: '222222222222',
  });
  const template = Template.fromStack(stack);

  it('DEV+STGで4つのリポジトリが作成される', () => {
    template.resourceCountIs('AWS::ECR::Repository', 4);
  });

  it('STG APIリポジトリが作成される', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/api-stg',
    });
  });

  it('STG Webリポジトリが作成される', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/web-stg',
    });
  });

  it('STGリポジトリにSTGアカウントからのpullを許可するリソースポリシーが付与される', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/api-stg',
      RepositoryPolicyText: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'CrossAccountPull',
            // AccountPrincipal は Stack非依存のためパーティションを `Fn::Join` で組み立てる
            Principal: Match.objectLike({
              AWS: Match.objectLike({
                'Fn::Join': Match.arrayWith([
                  Match.arrayWith([Match.stringLikeRegexp('222222222222')]),
                ]),
              }),
            }),
            Action: Match.arrayWith(['ecr:BatchGetImage']),
          }),
        ]),
      }),
    });
  });

  it('DEVリポジトリにはクロスアカウントのリソースポリシーが付与されない', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/api-dev',
      RepositoryPolicyText: Match.absent(),
    });
  });
});

describe('EcrStack (devAccountId指定、PIPELINE_ACCOUNT_ID使用時)', () => {
  const app = new cdk.App();
  const stack = new EcrStack(app, 'TestEcrStackDevCrossAccount', {
    devAccountId: '444444444444',
  });
  const template = Template.fromStack(stack);

  it('DEVリポジトリにDevアカウントからのpullを許可するリソースポリシーが付与される', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/api-dev',
      RepositoryPolicyText: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'CrossAccountPull',
            Principal: Match.objectLike({
              AWS: Match.objectLike({
                'Fn::Join': Match.arrayWith([
                  Match.arrayWith([Match.stringLikeRegexp('444444444444')]),
                ]),
              }),
            }),
            Action: Match.arrayWith(['ecr:BatchGetImage']),
          }),
        ]),
      }),
    });
  });
});

describe('EcrStack (stgAccountId + prodAccountId指定)', () => {
  const app = new cdk.App();
  const stack = new EcrStack(app, 'TestEcrStackFull', {
    stgAccountId: '222222222222',
    prodAccountId: '333333333333',
  });
  const template = Template.fromStack(stack);

  it('DEV+STG+PRODで6つのリポジトリが作成される', () => {
    template.resourceCountIs('AWS::ECR::Repository', 6);
  });

  it('PROD APIリポジトリが作成される', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/api-prod',
    });
  });

  it('PROD Webリポジトリが作成される', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/web-prod',
    });
  });
});
