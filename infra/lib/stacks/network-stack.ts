import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import type { Construct } from 'constructs';

export interface NetworkStackProps extends cdk.StackProps {
  /** 使用する AZ 数（デフォルト: 2） */
  maxAzs?: number;
  /** ECR・Secrets Manager・CloudWatch Logs の VPC エンドポイントを作成するか（デフォルト: false）
   *  stg/prod では true を推奨（AWS 内部通信に限定）
   *  dev では NAT Gateway で代替可能 */
  enableVpcEndpoints?: boolean;
}

/**
 * ネットワーク層のスタック
 * VPC・サブネット・セキュリティグループを定義する
 */
export class NetworkStack extends cdk.Stack {
  /** アプリケーション全体で共有するVPC */
  public readonly vpc: ec2.Vpc;
  /** ALB用セキュリティグループ（インターネットからのHTTP/HTTPSを許可） */
  public readonly albSecurityGroup: ec2.SecurityGroup;
  /** ECS Fargate用セキュリティグループ（ALBからのトラフィックのみ許可） */
  public readonly ecsSecurityGroup: ec2.SecurityGroup;
  /** RDS用セキュリティグループ（ECSからのPostgreSQL接続のみ許可） */
  public readonly rdsSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: NetworkStackProps) {
    super(scope, id, props);

    // VPC: パブリック/プライベートサブネット各AZ、NATゲートウェイ1つ
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: props?.maxAzs ?? 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // ALB用セキュリティグループ: インターネットからのHTTP(80)/HTTPS(443)を許可
    this.albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for ALB',
      allowAllOutbound: true,
    });
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP from internet'
    );
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS from internet'
    );

    // ECS用セキュリティグループ: ALBからのポート3000のみ許可
    this.ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for ECS Fargate',
      allowAllOutbound: true,
    });
    this.ecsSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(3000),
      'Allow traffic from ALB'
    );

    // RDS用セキュリティグループ: ECSからのPostgreSQL(5432)のみ許可、アウトバウンド禁止
    this.rdsSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS PostgreSQL',
      allowAllOutbound: false,
    });
    this.rdsSecurityGroup.addIngressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from ECS'
    );

    // S3 (Gatewayタイプ: 無料) — ECRイメージレイヤーの取得に使用
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    if (props?.enableVpcEndpoints) {
      const privateSubnets = { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS };

      this.vpc.addInterfaceEndpoint('EcrApiEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.ECR,
        subnets: privateSubnets,
      });

      this.vpc.addInterfaceEndpoint('EcrDkrEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
        subnets: privateSubnets,
      });

      this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        subnets: privateSubnets,
      });

      this.vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        subnets: privateSubnets,
      });
    }
  }
}
