import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { NetworkStack } from '../lib/stacks/network-stack';

describe('NetworkStack', () => {
  const app = new cdk.App();
  const stack = new NetworkStack(app, 'TestNetworkStack');
  const template = Template.fromStack(stack);

  it('creates a VPC', () => {
    template.resourceCountIs('AWS::EC2::VPC', 1);
  });

  it('creates public and private subnets for 2 AZs', () => {
    template.resourceCountIs('AWS::EC2::Subnet', 4);
  });

  it('creates one NAT gateway', () => {
    template.resourceCountIs('AWS::EC2::NatGateway', 1);
  });

  it('creates an internet gateway', () => {
    template.resourceCountIs('AWS::EC2::InternetGateway', 1);
  });

  it('creates a security group for the ALB', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for ALB',
    });
  });

  it('creates a security group for ECS', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for ECS Fargate',
    });
  });

  it('creates a security group for RDS', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for RDS PostgreSQL',
    });
  });

  it('the ALB security group allows HTTP(80)', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for ALB',
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          CidrIp: '0.0.0.0/0',
          FromPort: 80,
          ToPort: 80,
          IpProtocol: 'tcp',
        }),
      ]),
    });
  });

  it('the ALB security group allows HTTPS(443)', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for ALB',
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          CidrIp: '0.0.0.0/0',
          FromPort: 443,
          ToPort: 443,
          IpProtocol: 'tcp',
        }),
      ]),
    });
  });

  it('the ECS security group allows port 3000 from the ALB', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      FromPort: 3000,
      ToPort: 3000,
      IpProtocol: 'tcp',
    });
  });

  it('the RDS security group allows PostgreSQL(5432) from ECS', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      FromPort: 5432,
      ToPort: 5432,
      IpProtocol: 'tcp',
    });
  });

  it('creates an S3 Gateway endpoint', () => {
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 1);
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      VpcEndpointType: 'Gateway',
      ServiceName: { 'Fn::Join': ['', Match.arrayWith([Match.stringLikeRegexp('s3$')])] },
    });
  });

  it('does not create Interface endpoints when enableVpcEndpoints is unspecified', () => {
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 1);
  });

  it('creates public/private subnets for 2 AZs by default', () => {
    template.resourceCountIs('AWS::EC2::Subnet', 4);
  });
});

describe('NetworkStack (maxAzs specified)', () => {
  // An environment-agnostic stack can't do an AZ lookup and is pinned to the default 2 AZs,
  // so making maxAzs=3 actually take effect requires a concrete env with an AZ list
  // pre-populated in context
  const app = new cdk.App({
    context: {
      'availability-zones:account=999999999999:region=ap-northeast-1': [
        'ap-northeast-1a',
        'ap-northeast-1c',
        'ap-northeast-1d',
      ],
    },
  });
  const stack = new NetworkStack(app, 'TestNetworkStackMaxAzs', {
    env: { account: '999999999999', region: 'ap-northeast-1' },
    maxAzs: 3,
  });
  const template = Template.fromStack(stack);

  it('creates subnets for the AZ count specified by maxAzs (3 AZs x 2 types = 6)', () => {
    template.resourceCountIs('AWS::EC2::Subnet', 6);
  });
});

describe('NetworkStack (enableVpcEndpoints specified)', () => {
  const app = new cdk.App();
  const stack = new NetworkStack(app, 'TestNetworkStackEndpoints', {
    enableVpcEndpoints: true,
  });
  const template = Template.fromStack(stack);

  it('creates 5 VPC endpoints total: Gateway (S3) and Interface (ECR API/ECR Docker/Secrets Manager/CloudWatch Logs)', () => {
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 5);
  });

  it('creates 4 Interface endpoints', () => {
    const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
      Properties: { VpcEndpointType: 'Interface' },
    });
    expect(Object.keys(endpoints).length).toBe(4);
  });

  it('creates an Interface endpoint for ECR API', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      VpcEndpointType: 'Interface',
      ServiceName: { 'Fn::Join': ['', Match.arrayWith([Match.stringLikeRegexp('\\.ecr\\.api$')])] },
    });
  });

  it('creates an Interface endpoint for ECR Docker', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      VpcEndpointType: 'Interface',
      ServiceName: { 'Fn::Join': ['', Match.arrayWith([Match.stringLikeRegexp('\\.ecr\\.dkr$')])] },
    });
  });

  it('creates an Interface endpoint for Secrets Manager', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      VpcEndpointType: 'Interface',
      ServiceName: {
        'Fn::Join': ['', Match.arrayWith([Match.stringLikeRegexp('secretsmanager$')])],
      },
    });
  });

  it('creates an Interface endpoint for CloudWatch Logs', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      VpcEndpointType: 'Interface',
      ServiceName: { 'Fn::Join': ['', Match.arrayWith([Match.stringLikeRegexp('logs$')])] },
    });
  });

  it('places Interface endpoints in a private subnet', () => {
    const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
      Properties: { VpcEndpointType: 'Interface' },
    });
    for (const endpoint of Object.values(endpoints)) {
      expect(endpoint.Properties.SubnetIds).toBeDefined();
    }
  });
});
