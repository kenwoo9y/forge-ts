import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, it } from 'vitest';

process.env.POSTGRES_DB = 'test_db';

import { DatabaseStack } from '../lib/stacks/database-stack';
import { NetworkStack } from '../lib/stacks/network-stack';

describe('DatabaseStack', () => {
  const app = new cdk.App();
  const networkStack = new NetworkStack(app, 'TestNetworkStack');
  const stack = new DatabaseStack(app, 'TestDatabaseStack', {
    vpc: networkStack.vpc,
    rdsSecurityGroup: networkStack.rdsSecurityGroup,
    dbName: 'test_db',
  });
  const template = Template.fromStack(stack);

  it('creates one RDS instance', () => {
    template.resourceCountIs('AWS::RDS::DBInstance', 1);
  });

  it('the RDS instance uses PostgreSQL 16', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'postgres',
      EngineVersion: Match.stringLikeRegexp('^16'),
    });
  });

  it('the RDS instance uses t3.micro', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DBInstanceClass: 'db.t3.micro',
    });
  });

  it('creates a DB subnet group', () => {
    template.resourceCountIs('AWS::RDS::DBSubnetGroup', 1);
  });

  it('stores DB credentials in Secrets Manager', () => {
    template.resourceCountIs('AWS::SecretsManager::Secret', 1);
  });

  it('sets the database name to the value of POSTGRES_DB', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DBName: 'test_db',
    });
  });

  it('sets storage to 20GB', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      AllocatedStorage: '20',
    });
  });

  it('sets max storage to 100GB', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      MaxAllocatedStorage: 100,
    });
  });

  it('disables MultiAZ', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      MultiAZ: false,
    });
  });
});
