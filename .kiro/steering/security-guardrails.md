# Security Guardrails

## Zero-Trust Security Model

### Environment Variable Security
```javascript
// Secure environment variable loading
class SecureConfig {
  constructor() {
    this.requiredVars = [
      'BEDROCK_API_KEY',
      'AWS_REGION',
      'DYNAMODB_TABLE_NAME',
      'JWT_SECRET'
    ];
    this.validateEnvironment();
  }
  
  validateEnvironment() {
    const missing = this.requiredVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
  
  get(key) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Environment variable ${key} is not set`);
    }
    return value;
  }
}
```

### Input Validation Framework
```javascript
// Comprehensive input validation
class InputValidator {
  static validateGameInput(input) {
    const schema = {
      action: { type: 'string', enum: ['move', 'rotate', 'drop'] },
      direction: { type: 'string', enum: ['left', 'right', 'down'], optional: true },
      playerId: { type: 'string', pattern: /^[a-zA-Z0-9-_]{1,50}$/ }
    };
    
    return this.validate(input, schema);
  }
  
  static validateAPIRequest(req) {
    // Rate limiting
    if (this.isRateLimited(req.ip)) {
      throw new SecurityError('Rate limit exceeded');
    }
    
    // CORS validation
    if (!this.isAllowedOrigin(req.headers.origin)) {
      throw new SecurityError('Invalid origin');
    }
    
    // Content-Type validation
    if (req.method === 'POST' && req.headers['content-type'] !== 'application/json') {
      throw new SecurityError('Invalid content type');
    }
  }
  
  static sanitizeInput(input) {
    if (typeof input === 'string') {
      return input.replace(/[<>\"'&]/g, '');
    }
    return input;
  }
}
```

### Secret Management Integration
```javascript
// Multi-cloud secret management
class SecretManager {
  constructor(provider) {
    this.provider = provider;
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }
  
  async getSecret(secretName) {
    const cached = this.cache.get(secretName);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value;
    }
    
    let secret;
    switch (this.provider) {
      case 'aws':
        secret = await this.getAWSSecret(secretName);
        break;
      case 'gcp':
        secret = await this.getGCPSecret(secretName);
        break;
      case 'vercel':
        secret = process.env[secretName];
        break;
      default:
        throw new Error(`Unsupported secret provider: ${this.provider}`);
    }
    
    this.cache.set(secretName, {
      value: secret,
      timestamp: Date.now()
    });
    
    return secret;
  }
  
  async getAWSSecret(secretName) {
    const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
    
    try {
      const response = await client.send(new GetSecretValueCommand({
        SecretId: secretName
      }));
      return JSON.parse(response.SecretString);
    } catch (error) {
      throw new SecurityError(`Failed to retrieve AWS secret: ${error.message}`);
    }
  }
}
```

### Authentication & Authorization
```javascript
// JWT-based authentication
class AuthManager {
  constructor(secretManager) {
    this.secretManager = secretManager;
  }
  
  async generateToken(playerId) {
    const secret = await this.secretManager.getSecret('JWT_SECRET');
    const payload = {
      playerId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    };
    
    return jwt.sign(payload, secret);
  }
  
  async verifyToken(token) {
    const secret = await this.secretManager.getSecret('JWT_SECRET');
    
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      throw new SecurityError('Invalid token');
    }
  }
  
  authorize(requiredRole) {
    return async (req, res, next) => {
      try {
        const token = this.extractToken(req);
        const payload = await this.verifyToken(token);
        
        if (requiredRole && !payload.roles?.includes(requiredRole)) {
          throw new SecurityError('Insufficient permissions');
        }
        
        req.user = payload;
        next();
      } catch (error) {
        res.status(401).json({ error: error.message });
      }
    };
  }
}
```

### Rate Limiting
```javascript
// Distributed rate limiting
class RateLimiter {
  constructor(redis) {
    this.redis = redis;
    this.limits = {
      gameActions: { requests: 100, window: 60 }, // 100 per minute
      apiCalls: { requests: 1000, window: 60 },   // 1000 per minute
      auth: { requests: 10, window: 60 }          // 10 per minute
    };
  }
  
  async checkLimit(key, type) {
    const limit = this.limits[type];
    if (!limit) return true;
    
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, limit.window);
    }
    
    return current <= limit.requests;
  }
  
  middleware(type) {
    return async (req, res, next) => {
      const key = `rate_limit:${type}:${req.ip}`;
      const allowed = await this.checkLimit(key, type);
      
      if (!allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: await this.redis.ttl(key)
        });
      }
      
      next();
    };
  }
}
```

### Security Headers
```javascript
// Security middleware
function securityHeaders(req, res, next) {
  // HTTPS enforcement
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Frame options
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; " +
    "connect-src 'self' wss: https:;"
  );
  
  next();
}
```

### Audit Logging
```javascript
// Security event logging
class SecurityLogger {
  constructor(logger) {
    this.logger = logger;
  }
  
  logAuthEvent(event, userId, ip, userAgent) {
    this.logger.info('AUTH_EVENT', {
      event,
      userId,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }
  
  logSecurityViolation(violation, details) {
    this.logger.warn('SECURITY_VIOLATION', {
      violation,
      details,
      timestamp: new Date().toISOString()
    });
  }
  
  logDataAccess(resource, userId, action) {
    this.logger.info('DATA_ACCESS', {
      resource,
      userId,
      action,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Vulnerability Scanning
```javascript
// Automated security scanning
class SecurityScanner {
  static async scanDependencies() {
    const { execSync } = require('child_process');
    
    try {
      // npm audit
      execSync('npm audit --audit-level moderate', { stdio: 'inherit' });
      
      // Snyk scan
      execSync('snyk test --severity-threshold=medium', { stdio: 'inherit' });
      
      return { status: 'passed' };
    } catch (error) {
      return { status: 'failed', error: error.message };
    }
  }
  
  static async scanSecrets() {
    const { execSync } = require('child_process');
    
    try {
      execSync('detect-secrets scan --all-files --baseline .secrets.baseline', 
        { stdio: 'inherit' });
      return { status: 'passed' };
    } catch (error) {
      return { status: 'failed', error: error.message };
    }
  }
}
```