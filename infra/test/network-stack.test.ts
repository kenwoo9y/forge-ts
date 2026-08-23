import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { NetworkStack } from '../lib/stacks/network-stack';

describe('NetworkStack', () => {
  const app = new cdk.App();
  const stack = new NetworkStack(app, 'TestNetworkStack');
  const template = Template.fromStack(stack);

  it('VPCが作成される', () => {
    template.resourceCountIs('AWS::EC2::VPC', 1);
  });

  it('パブリックサブネットとプライベートサブネットが2AZ分作成される', () => {
    template.resourceCountIs('AWS::EC2::Subnet', 4);
  });

  it('NATゲートウェイが1つ作成される', () => {
    template.resourceCountIs('AWS::EC2::NatGateway', 1);
  });

  it('インターネットゲートウェイが作成される', () => {
    template.resourceCountIs('AWS::EC2::InternetGateway', 1);
  });

  it('ALB用セキュリティグループが作成される', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for ALB',
    });
  });

  it('ECS用セキュリティグループが作成される', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for ECS Fargate',
    });
  });

  it('RDS用セキュリティグループが作成される', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for RDS PostgreSQL',
    });
  });

  it('ALBセキュリティグループがHTTP(80)を許可する', () => {
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

  it('ALBセキュリティグループがHTTPS(443)を許可する', () => {
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

  it('ECSセキュリティグループがALBからのポート3000を許可する', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      FromPort: 3000,
      ToPort: 3000,
      IpProtocol: 'tcp',
    });
  });

  it('RDSセキュリティグループがECSからのPostgreSQL(5432)を許可する', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      FromPort: 5432,
      ToPort: 5432,
      IpProtocol: 'tcp',
    });
  });

  it('S3のGatewayエンドポイントが作成される', () => {
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 1);
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      VpcEndpointType: 'Gateway',
      ServiceName: { 'Fn::Join': ['', Match.arrayWith([Match.stringLikeRegexp('s3$')])] },
    });
  });

  it('enableVpcEndpoints未指定時はInterfaceエンドポイントが作成されない', () => {
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 1);
  });

  it('デフォルトでは2AZ分のパブリック/プライベートサブネットが作成される', () => {
    template.resourceCountIs('AWS::EC2::Subnet', 4);
  });
});

describe('NetworkStack（maxAzs指定）', () => {
  // 環境非依存スタックはAZルックアップができずデフォルト2AZに固定されるため、
  // maxAzs=3を実際に反映させるにはcontextにAZ一覧を事前投入した具体的なenvが必要
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

  it('maxAzsで指定したAZ数分のサブネットが作成される（3AZ x 2種類 = 6）', () => {
    template.resourceCountIs('AWS::EC2::Subnet', 6);
  });
});

describe('NetworkStack（enableVpcEndpoints指定）', () => {
  const app = new cdk.App();
  const stack = new NetworkStack(app, 'TestNetworkStackEndpoints', {
    enableVpcEndpoints: true,
  });
  const template = Template.fromStack(stack);

  it('Gateway(S3)とInterface(ECR API/ECR Docker/Secrets Manager/CloudWatch Logs)の計5つのVPCエンドポイントが作成される', () => {
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 5);
  });

  it('Interfaceエンドポイントが4つ作成される', () => {
    const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
      Properties: { VpcEndpointType: 'Interface' },
    });
    expect(Object.keys(endpoints).length).toBe(4);
  });

  it('ECR API用のInterfaceエンドポイントが作成される', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      VpcEndpointType: 'Interface',
      ServiceName: { 'Fn::Join': ['', Match.arrayWith([Match.stringLikeRegexp('\\.ecr\\.api$')])] },
    });
  });

  it('ECR Docker用のInterfaceエンドポイントが作成される', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      VpcEndpointType: 'Interface',
      ServiceName: { 'Fn::Join': ['', Match.arrayWith([Match.stringLikeRegexp('\\.ecr\\.dkr$')])] },
    });
  });

  it('Secrets Manager用のInterfaceエンドポイントが作成される', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      VpcEndpointType: 'Interface',
      ServiceName: {
        'Fn::Join': ['', Match.arrayWith([Match.stringLikeRegexp('secretsmanager$')])],
      },
    });
  });

  it('CloudWatch Logs用のInterfaceエンドポイントが作成される', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      VpcEndpointType: 'Interface',
      ServiceName: { 'Fn::Join': ['', Match.arrayWith([Match.stringLikeRegexp('logs$')])] },
    });
  });

  it('Interfaceエンドポイントはプライベートサブネットに配置される', () => {
    const endpoints = template.findResources('AWS::EC2::VPCEndpoint', {
      Properties: { VpcEndpointType: 'Interface' },
    });
    for (const endpoint of Object.values(endpoints)) {
      expect(endpoint.Properties.SubnetIds).toBeDefined();
    }
  });
});
