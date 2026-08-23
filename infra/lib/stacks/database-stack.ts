import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import type { Construct } from 'constructs';

export interface DatabaseStackProps extends cdk.StackProps {
  /** NetworkStackで定義したVPC */
  vpc: ec2.Vpc;
  /** NetworkStackで定義したRDS用セキュリティグループ */
  rdsSecurityGroup: ec2.SecurityGroup;
  /** PostgreSQL データベース名 */
  dbName: string;
  /** RDSインスタンスタイプ（デフォルト: t3.micro） */
  instanceType?: ec2.InstanceType;
  /** 初期ストレージ容量 GB（デフォルト: 20） */
  allocatedStorage?: number;
  /** 自動スケール上限 GB（デフォルト: 100） */
  maxAllocatedStorage?: number;
}

/**
 * データベース層のスタック
 * RDS PostgreSQLインスタンスとSecrets Managerの認証情報を定義する
 */
export class DatabaseStack extends cdk.Stack {
  /** RDS PostgreSQLインスタンス */
  public readonly database: rds.DatabaseInstance;
  /** Secrets Managerに保存されたDB認証情報 */
  public readonly credentials: rds.DatabaseSecret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const {
      vpc,
      rdsSecurityGroup,
      dbName,
      instanceType = ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      allocatedStorage = 20,
      maxAllocatedStorage = 100,
    } = props;

    // DB認証情報をSecrets Managerに保存
    this.credentials = new rds.DatabaseSecret(this, 'DbCredentials', {
      username: 'postgres',
    });

    // RDS PostgreSQLインスタンス: プライベートサブネットに配置
    this.database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [rdsSecurityGroup],
      credentials: rds.Credentials.fromSecret(this.credentials),
      databaseName: dbName,
      multiAz: false,
      allocatedStorage,
      maxAllocatedStorage,
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}
