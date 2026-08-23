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

  it('RDSインスタンスが1つ作成される', () => {
    template.resourceCountIs('AWS::RDS::DBInstance', 1);
  });

  it('RDSインスタンスがPostgreSQL 16を使用する', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'postgres',
      EngineVersion: Match.stringLikeRegexp('^16'),
    });
  });

  it('RDSインスタンスがt3.microを使用する', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DBInstanceClass: 'db.t3.micro',
    });
  });

  it('DBサブネットグループが作成される', () => {
    template.resourceCountIs('AWS::RDS::DBSubnetGroup', 1);
  });

  it('DB認証情報がSecrets Managerに保存される', () => {
    template.resourceCountIs('AWS::SecretsManager::Secret', 1);
  });

  it('データベース名がPOSTGRES_DBの値に設定される', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DBName: 'test_db',
    });
  });

  it('ストレージが20GBで設定される', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      AllocatedStorage: '20',
    });
  });

  it('最大ストレージが100GBで設定される', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      MaxAllocatedStorage: 100,
    });
  });

  it('MultiAZが無効である', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      MultiAZ: false,
    });
  });
});
