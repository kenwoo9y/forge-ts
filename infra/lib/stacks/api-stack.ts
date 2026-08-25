import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import type * as rds from 'aws-cdk-lib/aws-rds';
import type * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';
import { EcsFargateService } from '../constructs/ecs-fargate-service';

export interface ApiStackProps extends cdk.StackProps {
  /** VPC defined in NetworkStack */
  vpc: ec2.Vpc;
  /** Security group for RDS defined in NetworkStack (used to allow ECS -> RDS connections) */
  rdsSecurityGroup: ec2.SecurityGroup;
  /** RDS instance created in DatabaseStack */
  database: rds.DatabaseInstance;
  /** DB credentials created in DatabaseStack (Secrets Manager) */
  databaseCredentials: rds.DatabaseSecret;
  /** JWT signing secret in Secrets Manager */
  jwtSecret: secretsmanager.ISecret;
  /** PostgreSQL database name */
  dbName: string;
  /** Container image (default: built from apps/api's Dockerfile) */
  image?: ecs.ContainerImage;
  /** Container start command override (for placeholder use) */
  command?: string[];
  /** Task CPU units (default: 256) */
  cpu?: number;
  /** Task memory in MiB (default: 512) */
  memoryLimitMiB?: number;
  /** Desired task count (default: 1) */
  desiredCount?: number;
  /** Deployment controller (default: ECS) */
  deploymentController?: ecs.DeploymentControllerType;
  /** Whether the ALB is internet-facing (default: false) */
  internetFacing?: boolean;
  /** Task definition family name (used only when the deployment controller is CODE_DEPLOY) */
  family?: string;
}

/**
 * API backend layer stack.
 * Hosts the Hono app on ECS Fargate and connects it to RDS PostgreSQL.
 */
export class ApiStack extends cdk.Stack {
  /** ECS Fargate service construct */
  public readonly ecsFargateService: EcsFargateService;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const {
      vpc,
      rdsSecurityGroup,
      database,
      databaseCredentials,
      jwtSecret,
      dbName,
      image = ecs.ContainerImage.fromAsset('../apps/api'),
      command,
      cpu = 256,
      memoryLimitMiB = 512,
      desiredCount = 1,
      deploymentController,
      internetFacing = false,
      family,
    } = props;

    this.ecsFargateService = new EcsFargateService(this, 'ApiService', {
      vpc,
      image,
      containerPort: 3000,
      command,
      internetFacing,
      family,
      environment: {
        DB_HOST: database.dbInstanceEndpointAddress,
        DB_PORT: database.dbInstanceEndpointPort,
        DB_NAME: dbName,
        NODE_ENV: 'production',
      },
      secrets: {
        DB_USERNAME: ecs.Secret.fromSecretsManager(databaseCredentials, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(databaseCredentials, 'password'),
        JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
      },
      cpu,
      memoryLimitMiB,
      desiredCount,
      deploymentController,
    });

    // Add an inbound rule on port 5432 from the ECS service's SG to the RDS SG
    new ec2.CfnSecurityGroupIngress(this, 'EcsToRdsIngress', {
      groupId: rdsSecurityGroup.securityGroupId,
      ipProtocol: 'tcp',
      fromPort: 5432,
      toPort: 5432,
      sourceSecurityGroupId:
        this.ecsFargateService.fargateService.connections.securityGroups[0].securityGroupId,
    });

    const executionRole = this.ecsFargateService.taskDefinition.executionRole;
    if (executionRole) {
      databaseCredentials.grantRead(executionRole);
      jwtSecret.grantRead(executionRole);
    }
  }
}
