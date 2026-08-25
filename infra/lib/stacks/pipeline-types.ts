import type * as ec2 from 'aws-cdk-lib/aws-ec2';
import type * as ecr from 'aws-cdk-lib/aws-ecr';
import type * as ecs from 'aws-cdk-lib/aws-ecs';
import type * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import type * as rds from 'aws-cdk-lib/aws-rds';
import type { ApiStack } from './api-stack';
import type { WebStack } from './web-stack';

export interface EnvResources {
  apiStack: ApiStack;
  webStack: WebStack;
  /** Used to place the migration CodeBuild project in the same VPC as RDS */
  vpc: ec2.Vpc;
  /** Used to allow access from the migration CodeBuild project */
  rdsSecurityGroup: ec2.SecurityGroup;
  database: rds.DatabaseInstance;
  databaseCredentials: rds.DatabaseSecret;
  dbName: string;
}

/**
 * App environment configuration built from live CDK references within the same account.
 * Used both for DEV (same account as PipelineStack) and for Stg/Prod (same account, from
 * DeployTargetStack's point of view).
 */
export interface LocalAppEnvConfig {
  repository: ecr.IRepository;
  fargateService: ecs.FargateService;
  /**
   * The task definition's family name, kept up to date on every cdk deploy (omitting the
   * revision refers to the latest ACTIVE). Cross-account `ecs describe-task-definition` cannot
   * resolve a revision-qualified ARN (a token determined at deploy time) across accounts, so
   * we standardize on the family name instead.
   */
  taskDefFamily: string;
  blueTargetGroup: elbv2.ApplicationTargetGroup;
  greenTargetGroup: elbv2.ApplicationTargetGroup;
  productionListener: elbv2.ApplicationListener;
  testListener?: elbv2.ApplicationListener;
  containerPort: string;
}
