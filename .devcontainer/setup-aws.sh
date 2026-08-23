#!/bin/bash
set -e

required_vars=(SSO_SESSION SSO_START_URL SSO_REGION SSO_ACCOUNT_ID SSO_ROLE_NAME)
missing=()
for var in "${required_vars[@]}"; do
  [ -z "${!var}" ] && missing+=("$var")
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "Warning: AWS SSO variables not set (${missing[*]}), skipping ~/.aws/config generation"
  exit 0
fi

mkdir -p ~/.aws/sso/cache
sudo chown -R "$(whoami)" ~/.aws/sso

cat > ~/.aws/config << EOF
[sso-session ${SSO_SESSION}]
sso_start_url = ${SSO_START_URL}
sso_region = ${SSO_REGION}
sso_registration_scopes = sso:account:access

[profile default]
sso_session = ${SSO_SESSION}
sso_account_id = ${SSO_ACCOUNT_ID}
sso_role_name = ${SSO_ROLE_NAME}
region = ${SSO_REGION}
output = json
EOF

echo "AWS config generated at ~/.aws/config"
