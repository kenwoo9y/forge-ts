import * as cdk from 'aws-cdk-lib';
import type * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import type * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';
import { EcsFargateService } from '../constructs/ecs-fargate-service';

export interface WebStackProps extends cdk.StackProps {
  /** VPC defined in NetworkStack */
  vpc: ec2.Vpc;
  /** URL of the backend API */
  apiUrl: string;
  /** Auth.js signing secret in Secrets Manager */
  authSecret: secretsmanager.ISecret;
  /** Container image (default: built from apps/web's Dockerfile) */
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
  /** Task definition family name (used only when the deployment controller is CODE_DEPLOY) */
  family?: string;
}

/**
 * Web frontend layer stack.
 * Hosts the Next.js app on ECS Fargate.
 */
export class WebStack extends cdk.Stack {
  /** ECS Fargate service construct */
  public readonly ecsFargateService: EcsFargateService;

  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const {
      vpc,
      apiUrl,
      authSecret,
      image = ecs.ContainerImage.fromAsset('../apps/web'),
      command,
      cpu = 256,
      memoryLimitMiB = 512,
      desiredCount = 1,
      deploymentController,
      family,
    } = props;

    this.ecsFargateService = new EcsFargateService(this, 'WebService', {
      vpc,
      image,
      containerPort: 3001,
      command,
      family,
      environment: {
        API_URL: apiUrl,
        NODE_ENV: 'production',
      },
      secrets: {
        AUTH_SECRET: ecs.Secret.fromSecretsManager(authSecret),
      },
      cpu,
      memoryLimitMiB,
      desiredCount,
      deploymentController,
    });

    // Pass AUTH_URL explicitly so we don't rely on Auth.js's URL guessing
    // Since the ALB's DNS name refers to this service itself (WebService), it's added after the container is created
    this.ecsFargateService.taskDefinition.defaultContainer?.addEnvironment(
      'AUTH_URL',
      `http://${this.ecsFargateService.loadBalancer.loadBalancerDnsName}`
    );

    const executionRole = this.ecsFargateService.taskDefinition.executionRole;
    if (executionRole) {
      authSecret.grantRead(executionRole);
    }
  }
}
