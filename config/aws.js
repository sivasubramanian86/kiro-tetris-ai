// AWS Cloud Configuration
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
const { S3Client } = require('@aws-sdk/client-s3');

class AWSCloudAdapter {
  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.dynamoClient = null;
    this.secretsClient = null;
    this.s3Client = null;
    
    this.initialize();
  }

  initialize() {
    const clientConfig = {
      region: this.region,
      // Use IAM roles in production, access keys only for local development
      ...(process.env.AWS_ACCESS_KEY_ID && {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      })
    };

    this.dynamoClient = new DynamoDBClient(clientConfig);
    this.secretsClient = new SecretsManagerClient(clientConfig);
    this.s3Client = new S3Client(clientConfig);
  }

  // Game State Management
  async saveGameState(playerId, gameState) {
    const { PutItemCommand } = require('@aws-sdk/client-dynamodb');
    
    const params = {
      TableName: process.env.DYNAMODB_GAME_STATE_TABLE || 'tetris-game-states',
      Item: {
        playerId: { S: playerId },
        gameState: { S: JSON.stringify(gameState) },
        timestamp: { N: Date.now().toString() },
        ttl: { N: Math.floor(Date.now() / 1000 + 86400).toString() } // 24 hour TTL
      }
    };

    try {
      await this.dynamoClient.send(new PutItemCommand(params));
      return { success: true };
    } catch (error) {
      console.error('Failed to save game state:', error);
      return { success: false, error: error.message };
    }
  }

  async loadGameState(playerId) {
    const { GetItemCommand } = require('@aws-sdk/client-dynamodb');
    
    const params = {
      TableName: process.env.DYNAMODB_GAME_STATE_TABLE || 'tetris-game-states',
      Key: {
        playerId: { S: playerId }
      }
    };

    try {
      const result = await this.dynamoClient.send(new GetItemCommand(params));
      
      if (result.Item) {
        return {
          success: true,
          gameState: JSON.parse(result.Item.gameState.S)
        };
      }
      
      return { success: false, error: 'Game state not found' };
    } catch (error) {
      console.error('Failed to load game state:', error);
      return { success: false, error: error.message };
    }
  }

  // Leaderboard Management
  async saveScore(playerId, score, level, lines, replay) {
    const { PutItemCommand } = require('@aws-sdk/client-dynamodb');
    
    const params = {
      TableName: process.env.DYNAMODB_LEADERBOARD_TABLE || 'tetris-leaderboard',
      Item: {
        playerId: { S: playerId },
        score: { N: score.toString() },
        level: { N: level.toString() },
        lines: { N: lines.toString() },
        timestamp: { N: Date.now().toString() },
        replay: { S: JSON.stringify(replay) }
      }
    };

    try {
      await this.dynamoClient.send(new PutItemCommand(params));
      return { success: true };
    } catch (error) {
      console.error('Failed to save score:', error);
      return { success: false, error: error.message };
    }
  }

  async getLeaderboard(limit = 10) {
    const { ScanCommand } = require('@aws-sdk/client-dynamodb');
    
    const params = {
      TableName: process.env.DYNAMODB_LEADERBOARD_TABLE || 'tetris-leaderboard',
      Limit: limit,
      ProjectionExpression: 'playerId, score, #level, lines, #timestamp',
      ExpressionAttributeNames: {
        '#level': 'level',
        '#timestamp': 'timestamp'
      }
    };

    try {
      const result = await this.dynamoClient.send(new ScanCommand(params));
      
      const scores = result.Items.map(item => ({
        playerId: item.playerId.S,
        score: parseInt(item.score.N),
        level: parseInt(item.level.N),
        lines: parseInt(item.lines.N),
        timestamp: parseInt(item.timestamp.N)
      }));

      // Sort by score descending
      scores.sort((a, b) => b.score - a.score);
      
      return { success: true, leaderboard: scores.slice(0, limit) };
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return { success: false, error: error.message };
    }
  }

  // Replay Storage
  async saveReplay(replayId, replayData) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    
    const params = {
      Bucket: process.env.S3_REPLAY_BUCKET || 'tetris-replays',
      Key: `replays/${replayId}.json`,
      Body: JSON.stringify(replayData),
      ContentType: 'application/json',
      Metadata: {
        gameVersion: '1.0',
        uploadTime: Date.now().toString()
      }
    };

    try {
      await this.s3Client.send(new PutObjectCommand(params));
      return { success: true, replayUrl: `s3://${params.Bucket}/${params.Key}` };
    } catch (error) {
      console.error('Failed to save replay:', error);
      return { success: false, error: error.message };
    }
  }

  async loadReplay(replayId) {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    
    const params = {
      Bucket: process.env.S3_REPLAY_BUCKET || 'tetris-replays',
      Key: `replays/${replayId}.json`
    };

    try {
      const result = await this.s3Client.send(new GetObjectCommand(params));
      const replayData = JSON.parse(await result.Body.transformToString());
      
      return { success: true, replayData };
    } catch (error) {
      console.error('Failed to load replay:', error);
      return { success: false, error: error.message };
    }
  }

  // Secret Management
  async getSecret(secretName) {
    const { GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
    
    const params = {
      SecretId: secretName
    };

    try {
      const result = await this.secretsClient.send(new GetSecretValueCommand(params));
      
      if (result.SecretString) {
        return { success: true, secret: JSON.parse(result.SecretString) };
      }
      
      return { success: false, error: 'Secret not found' };
    } catch (error) {
      console.error('Failed to get secret:', error);
      return { success: false, error: error.message };
    }
  }

  // AI Integration (Amazon Bedrock)
  async getAIPrediction(prompt, modelId = 'anthropic.claude-v2') {
    const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
    
    const bedrockClient = new BedrockRuntimeClient({
      region: this.region
    });

    const params = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
        max_tokens_to_sample: 1000,
        temperature: 0.1,
        top_p: 0.9
      })
    };

    try {
      const result = await bedrockClient.send(new InvokeModelCommand(params));
      const response = JSON.parse(new TextDecoder().decode(result.body));
      
      return { success: true, prediction: response.completion };
    } catch (error) {
      console.error('Failed to get AI prediction:', error);
      return { success: false, error: error.message };
    }
  }

  // Health Check
  async healthCheck() {
    const checks = [];

    // DynamoDB health
    try {
      const { ListTablesCommand } = require('@aws-sdk/client-dynamodb');
      await this.dynamoClient.send(new ListTablesCommand({ Limit: 1 }));
      checks.push({ service: 'DynamoDB', status: 'healthy' });
    } catch (error) {
      checks.push({ service: 'DynamoDB', status: 'unhealthy', error: error.message });
    }

    // S3 health
    try {
      const { ListBucketsCommand } = require('@aws-sdk/client-s3');
      await this.s3Client.send(new ListBucketsCommand({}));
      checks.push({ service: 'S3', status: 'healthy' });
    } catch (error) {
      checks.push({ service: 'S3', status: 'unhealthy', error: error.message });
    }

    // Secrets Manager health
    try {
      const { ListSecretsCommand } = require('@aws-sdk/client-secrets-manager');
      await this.secretsClient.send(new ListSecretsCommand({ MaxResults: 1 }));
      checks.push({ service: 'SecretsManager', status: 'healthy' });
    } catch (error) {
      checks.push({ service: 'SecretsManager', status: 'unhealthy', error: error.message });
    }

    const allHealthy = checks.every(check => check.status === 'healthy');
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      region: this.region,
      timestamp: Date.now()
    };
  }

  // Lambda Handler for serverless deployment
  static createLambdaHandler() {
    const adapter = new AWSCloudAdapter();
    
    return async (event, context) => {
      try {
        const { httpMethod, path, body, queryStringParameters } = event;
        
        // Parse request
        const requestBody = body ? JSON.parse(body) : {};
        const params = queryStringParameters || {};
        
        let response;
        
        // Route requests
        if (httpMethod === 'POST' && path === '/api/game-state') {
          response = await adapter.saveGameState(params.playerId, requestBody);
        } else if (httpMethod === 'GET' && path === '/api/game-state') {
          response = await adapter.loadGameState(params.playerId);
        } else if (httpMethod === 'POST' && path === '/api/scores') {
          response = await adapter.saveScore(
            requestBody.playerId,
            requestBody.score,
            requestBody.level,
            requestBody.lines,
            requestBody.replay
          );
        } else if (httpMethod === 'GET' && path === '/api/leaderboard') {
          response = await adapter.getLeaderboard(parseInt(params.limit) || 10);
        } else if (httpMethod === 'POST' && path === '/api/replays') {
          response = await adapter.saveReplay(requestBody.replayId, requestBody.replayData);
        } else if (httpMethod === 'GET' && path === '/api/replays') {
          response = await adapter.loadReplay(params.replayId);
        } else if (httpMethod === 'GET' && path === '/api/health') {
          response = await adapter.healthCheck();
        } else {
          response = { success: false, error: 'Not found' };
        }
        
        return {
          statusCode: response.success ? 200 : 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
          body: JSON.stringify(response)
        };
      } catch (error) {
        console.error('Lambda handler error:', error);
        
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        };
      }
    };
  }
}

module.exports = { AWSCloudAdapter };