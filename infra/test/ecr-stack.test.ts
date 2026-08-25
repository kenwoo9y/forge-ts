import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { EcrStack } from '../lib/stacks/ecr-stack';

describe('EcrStack', () => {
  const app = new cdk.App();
  const stack = new EcrStack(app, 'TestEcrStack');
  const template = Template.fromStack(stack);

  it('creates 2 ECR repositories', () => {
    template.resourceCountIs('AWS::ECR::Repository', 2);
  });

  it('creates the DEV API repository with the correct name', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/api-dev',
    });
  });

  it('creates the DEV Web repository with the correct name', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/web-dev',
    });
  });

  it('enables image scanning on push', () => {
    const repos = template.findResources('AWS::ECR::Repository');
    for (const repo of Object.values(repos)) {
      expect(repo.Properties?.ImageScanningConfiguration?.ScanOnPush).toBe(true);
    }
  });

  it('sets a lifecycle policy (keep the last 20 images)', () => {
    const repos = template.findResources('AWS::ECR::Repository');
    for (const repo of Object.values(repos)) {
      const policyText: string = repo.Properties?.LifecyclePolicy?.LifecyclePolicyText ?? '';
      expect(policyText).toContain('"countNumber":20');
    }
  });

  it('sets deletion protection (RETAIN)', () => {
    template.hasResource('AWS::ECR::Repository', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  });

  it('sets tag mutability to MUTABLE', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      ImageTagMutability: 'MUTABLE',
    });
  });
});

describe('EcrStack (stgAccountId specified)', () => {
  const app = new cdk.App();
  const stack = new EcrStack(app, 'TestEcrStackCrossAccount', {
    stgAccountId: '222222222222',
  });
  const template = Template.fromStack(stack);

  it('creates 4 repositories for DEV+STG', () => {
    template.resourceCountIs('AWS::ECR::Repository', 4);
  });

  it('creates the STG API repository', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/api-stg',
    });
  });

  it('creates the STG Web repository', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/web-stg',
    });
  });

  it('grants the STG repository a resource policy allowing pull from the STG account', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/api-stg',
      RepositoryPolicyText: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'CrossAccountPull',
            // AccountPrincipal is stack-independent, so the partition is built with `Fn::Join`
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

  it('does not grant the DEV repository a cross-account resource policy', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/api-dev',
      RepositoryPolicyText: Match.absent(),
    });
  });
});

describe('EcrStack (devAccountId specified, when using PIPELINE_ACCOUNT_ID)', () => {
  const app = new cdk.App();
  const stack = new EcrStack(app, 'TestEcrStackDevCrossAccount', {
    devAccountId: '444444444444',
  });
  const template = Template.fromStack(stack);

  it('grants the DEV repository a resource policy allowing pull from the Dev account', () => {
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

describe('EcrStack (stgAccountId + prodAccountId specified)', () => {
  const app = new cdk.App();
  const stack = new EcrStack(app, 'TestEcrStackFull', {
    stgAccountId: '222222222222',
    prodAccountId: '333333333333',
  });
  const template = Template.fromStack(stack);

  it('creates 6 repositories for DEV+STG+PROD', () => {
    template.resourceCountIs('AWS::ECR::Repository', 6);
  });

  it('creates the PROD API repository', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/api-prod',
    });
  });

  it('creates the PROD Web repository', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'forge-ts/web-prod',
    });
  });
});
