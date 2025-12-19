# Security Guardrails Specification

## EARS Format Requirements

**WHEN** application starts  
**THE SYSTEM SHALL** load all secrets from environment variables only

**WHEN** code is committed  
**THE SYSTEM SHALL** prevent any hardcoded secrets via pre-commit hooks

**WHEN** API calls are made  
**THE SYSTEM SHALL** use least privilege IAM roles and validate all inputs

**WHEN** deployed to cloud  
**THE SYSTEM SHALL** integrate with cloud-native secret management services

## Security Requirements

### Secret Management
- **NO** hardcoded API keys, tokens, or credentials
- **ALL** secrets via environment variables
- **USE** AWS Secrets Manager, Google Secret Manager, Vercel Environment Variables
- **ROTATE** secrets automatically where possible

### Input Validation
- Sanitize all user inputs (keyboard, mouse)
- Validate API request payloads
- Rate limiting on all endpoints (100 req/min per IP)
- CORS configuration for allowed origins

### Infrastructure Security
- TLS 1.3+ for all communications
- Least privilege IAM roles
- Network security groups with minimal access
- Regular dependency vulnerability scanning

## Implementation Checklist

```javascript
// ✅ Correct - Environment variables
const apiKey = process.env.BEDROCK_API_KEY;

// ❌ Wrong - Hardcoded secrets
const apiKey = "sk-1234567890abcdef";
```

### Pre-commit Hooks
- Secret scanning with detect-secrets
- Dependency vulnerability check
- Linting and code quality
- Test coverage validation

### Cloud Security Configurations

**AWS**:
- IAM roles with minimal permissions
- Secrets Manager integration
- CloudTrail logging
- VPC security groups

**Google Cloud**:
- Service accounts with least privilege
- Secret Manager integration
- Cloud Audit Logs
- Firewall rules

**Vercel**:
- Environment variables encryption
- Edge function security headers
- Rate limiting middleware
- CORS configuration

## Compliance Requirements

- OWASP Top 10 mitigation
- SOC 2 Type II controls
- GDPR data protection (if applicable)
- Regular security audits