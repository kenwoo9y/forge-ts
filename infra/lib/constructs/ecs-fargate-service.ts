import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface EcsFargateServiceProps {
  vpc: ec2.Vpc;
  image: ecs.ContainerImage;
  containerPort: number;
  environment?: Record<string, string>;
  secrets?: Record<string, ecs.Secret>;
  command?: string[];
  cpu?: number;
  memoryLimitMiB?: number;
  desiredCount?: number;
  deploymentController?: ecs.DeploymentControllerType;
  /** ALBをインターネット向けにするか（デフォルト: true）。APIなど内部通信専用の場合は false を指定 */
  internetFacing?: boolean;
  /**
   * タスク定義のfamily名（deploymentController が CODE_DEPLOY の場合のみ使用）。
   * 未指定時はCDKが構築パスから自動生成する。クロスアカウントパイプラインからの
   * `ecs describe-task-definition`（revisionを省略してfamily名で最新ACTIVEを引く）が安定して機能するよう、明示的な指定を推奨する
   */
  family?: string;
}

/**
 * ALB + ECS Fargateサービスの再利用可能なコンストラクト
 * APIサーバー・Webアプリなど複数のサービスで共通利用する
 * deploymentController に CODE_DEPLOY を指定するとBlue/Green構成になる
 */
export class EcsFargateService extends Construct {
  public readonly cluster: ecs.Cluster;
  public readonly taskDefinition: ecs.TaskDefinition;
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly fargateService: ecs.FargateService;
  public readonly productionListener: elbv2.ApplicationListener;
  public readonly blueTargetGroup: elbv2.ApplicationTargetGroup;
  public readonly greenTargetGroup?: elbv2.ApplicationTargetGroup;
  public readonly testListener?: elbv2.ApplicationListener;

  constructor(scope: Construct, id: string, props: EcsFargateServiceProps) {
    super(scope, id);

    const {
      vpc,
      image,
      containerPort,
      environment,
      secrets,
      command,
      cpu = 256,
      memoryLimitMiB = 512,
      desiredCount = 1,
      deploymentController = ecs.DeploymentControllerType.ECS,
      internetFacing = true,
      family,
    } = props;

    this.cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    if (deploymentController === ecs.DeploymentControllerType.CODE_DEPLOY) {
      const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
        cpu,
        memoryLimitMiB,
        family,
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.ARM64,
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        },
      });
      taskDef.addContainer('Container', {
        image,
        portMappings: [{ containerPort }],
        environment,
        secrets,
        command,
        logging: ecs.LogDrivers.awsLogs({ streamPrefix: id }),
      });
      this.taskDefinition = taskDef;

      // The placeholder image is from public.ecr.aws, so CDK does not automatically
      // grant private ECR pull permissions to the execution role. Add them explicitly
      // so CodeDeploy can pull the real image when it replaces the placeholder.
      taskDef.addToExecutionRolePolicy(
        new iam.PolicyStatement({
          actions: [
            'ecr:GetAuthorizationToken',
            'ecr:BatchCheckLayerAvailability',
            'ecr:GetDownloadUrlForLayer',
            'ecr:BatchGetImage',
          ],
          resources: ['*'],
        })
      );

      this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
        vpc,
        internetFacing,
      });

      const healthCheck: elbv2.HealthCheck = {
        path: '/',
        healthyHttpCodes: '200-399',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      };

      this.blueTargetGroup = new elbv2.ApplicationTargetGroup(this, 'BlueTargetGroup', {
        vpc,
        port: containerPort,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP,
        healthCheck,
        deregistrationDelay: cdk.Duration.seconds(30),
      });

      this.greenTargetGroup = new elbv2.ApplicationTargetGroup(this, 'GreenTargetGroup', {
        vpc,
        port: containerPort,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP,
        healthCheck,
        deregistrationDelay: cdk.Duration.seconds(30),
      });

      this.productionListener = this.loadBalancer.addListener('ProductionListener', {
        port: 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
        defaultTargetGroups: [this.blueTargetGroup],
      });

      this.testListener = this.loadBalancer.addListener('TestListener', {
        port: 8080,
        protocol: elbv2.ApplicationProtocol.HTTP,
        defaultTargetGroups: [this.greenTargetGroup],
      });

      this.fargateService = new ecs.FargateService(this, 'Service', {
        cluster: this.cluster,
        taskDefinition: taskDef,
        deploymentController: { type: ecs.DeploymentControllerType.CODE_DEPLOY },
        desiredCount,
        assignPublicIp: false,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        enableExecuteCommand: true,
        healthCheckGracePeriod: cdk.Duration.minutes(5),
      });

      this.fargateService.attachToApplicationTargetGroup(this.blueTargetGroup);
    } else {
      const svc = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'Service', {
        cluster: this.cluster,
        taskImageOptions: { image, containerPort, environment, secrets, command },
        cpu,
        memoryLimitMiB,
        desiredCount,
        publicLoadBalancer: internetFacing,
        assignPublicIp: false,
        taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        circuitBreaker: { rollback: true },
        enableExecuteCommand: true,
        healthCheckGracePeriod: cdk.Duration.minutes(5),
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.ARM64,
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        },
      });

      svc.targetGroup.configureHealthCheck({
        path: '/',
        healthyHttpCodes: '200-399',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      });
      svc.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');

      this.taskDefinition = svc.taskDefinition;
      this.loadBalancer = svc.loadBalancer;
      this.fargateService = svc.service;
      this.blueTargetGroup = svc.targetGroup;
      this.productionListener = svc.listener;
    }
  }
}
