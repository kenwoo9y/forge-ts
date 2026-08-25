import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import type { Construct } from 'constructs';

export interface NetworkStackProps extends cdk.StackProps {
  /** Number of AZs to use (default: 2) */
  maxAzs?: number;
  /** Whether to create VPC endpoints for ECR, Secrets Manager, and CloudWatch Logs (default: false)
   *  Recommended to set true for stg/prod (keeps traffic within AWS's internal network)
   *  For dev, a NAT Gateway can be used instead */
  enableVpcEndpoints?: boolean;
}

/**
 * Network layer stack.
 * Defines the VPC, subnets, and security groups.
 */
export class NetworkStack extends cdk.Stack {
  /** VPC shared across the whole application */
  public readonly vpc: ec2.Vpc;
  /** Security group for the ALB (allows HTTP/HTTPS from the internet) */
  public readonly albSecurityGroup: ec2.SecurityGroup;
  /** Security group for ECS Fargate (allows only traffic from the ALB) */
  public readonly ecsSecurityGroup: ec2.SecurityGroup;
  /** Security group for RDS (allows only PostgreSQL connections from ECS) */
  public readonly rdsSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: NetworkStackProps) {
    super(scope, id, props);

    // VPC: public/private subnets in each AZ, one NAT gateway
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

    // Security group for the ALB: allows HTTP(80)/HTTPS(443) from the internet
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

    // Security group for ECS: allows only port 3000 from the ALB
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

    // Security group for RDS: allows only PostgreSQL(5432) from ECS, outbound disabled
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

    // S3 (Gateway type: free) — used to fetch ECR image layers
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
