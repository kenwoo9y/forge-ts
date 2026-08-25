import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import type { Construct } from 'constructs';

export interface DatabaseStackProps extends cdk.StackProps {
  /** VPC defined in NetworkStack */
  vpc: ec2.Vpc;
  /** Security group for RDS defined in NetworkStack */
  rdsSecurityGroup: ec2.SecurityGroup;
  /** PostgreSQL database name */
  dbName: string;
  /** RDS instance type (default: t3.micro) */
  instanceType?: ec2.InstanceType;
  /** Initial storage capacity in GB (default: 20) */
  allocatedStorage?: number;
  /** Auto-scaling storage limit in GB (default: 100) */
  maxAllocatedStorage?: number;
}

/**
 * Database layer stack.
 * Defines the RDS PostgreSQL instance and its Secrets Manager credentials.
 */
export class DatabaseStack extends cdk.Stack {
  /** RDS PostgreSQL instance */
  public readonly database: rds.DatabaseInstance;
  /** DB credentials stored in Secrets Manager */
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

    // Store DB credentials in Secrets Manager
    this.credentials = new rds.DatabaseSecret(this, 'DbCredentials', {
      username: 'postgres',
    });

    // RDS PostgreSQL instance: placed in a private subnet
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
