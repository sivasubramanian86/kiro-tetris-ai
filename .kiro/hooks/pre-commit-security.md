# Pre-Commit Security Hook

## Purpose
Prevent security vulnerabilities and secret exposure before code commits.

## Security Checks

### Secret Detection
```bash
# detect-secrets scan
detect-secrets scan --all-files --baseline .secrets.baseline

# Custom patterns
grep -r "sk-[a-zA-Z0-9]" src/ && exit 1  # OpenAI keys
grep -r "AKIA[0-9A-Z]" src/ && exit 1    # AWS keys
grep -r "AIza[0-9A-Za-z]" src/ && exit 1 # Google API keys
```

### Dependency Scanning
```bash
# npm audit for vulnerabilities
npm audit --audit-level moderate

# Snyk security scan
snyk test --severity-threshold=medium
```

### Code Quality
```bash
# ESLint security rules
eslint --config .eslintrc.security.js src/

# Semgrep security patterns
semgrep --config=auto src/
```

### Environment Validation
```javascript
// Validate all required env vars are present
const requiredEnvVars = [
  'BEDROCK_API_KEY',
  'AWS_REGION',
  'DYNAMODB_TABLE_NAME'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

## Blocked Patterns
- Hardcoded API keys
- Database connection strings
- Private keys or certificates
- Internal URLs or endpoints
- Debug credentials

## Allowed Patterns
```javascript
// ✅ Environment variables
const apiKey = process.env.API_KEY;

// ✅ Placeholder examples
const example = "YOUR_API_KEY_HERE";

// ✅ Test mocks
const mockKey = "test-key-12345";
```

## Hook Configuration
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
  
  - repo: local
    hooks:
      - id: security-lint
        name: Security Linting
        entry: npm run security:lint
        language: system
```