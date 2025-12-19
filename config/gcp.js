// Google Cloud Platform Configuration
const { Firestore } = require('@google-cloud/firestore');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { Storage } = require('@google-cloud/storage');

class GCPCloudAdapter {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || 'tetris-game-project';
    this.firestore = null;
    this.secretManager = null;
    this.storage = null;
    
    this.initialize();
  }

  initialize() {
    // Initialize Firestore
    this.firestore = new Firestore({
      projectId: this.projectId,
      // Use service account key file in development
      ...(process.env.GOOGLE_APPLICATION_CREDENTIALS && {
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      })
    });

    // Initialize Secret Manager
    this.secretManager = new SecretManagerServiceClient({
      projectId: this.projectId
    });

    // Initialize Cloud Storage
    this.storage = new Storage({
      projectId: this.projectId
    });
  }

  // Game State Management
  async saveGameState(playerId, gameState) {
    try {
      const docRef = this.firestore.collection('gameStates').doc(playerId);
      
      await docRef.set({
        gameState: gameState,
        timestamp: new Date(),
        ttl: new Date(Date.now() + 86400000) // 24 hours
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to save game state:', error);
      return { success: false, error: error.message };
    }
  }

  async loadGameState(playerId) {
    try {
      const docRef = this.firestore.collection('gameStates').doc(playerId);
      const doc = await docRef.get();

      if (doc.exists) {
        const data = doc.data();
        
        // Check TTL
        if (data.ttl && data.ttl.toDate() < new Date()) {
          await docRef.delete();
          return { success: false, error: 'Game state expired' };
        }

        return {
          success: true,
          gameState: data.gameState
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
    try {
      const scoresRef = this.firestore.collection('leaderboard');
      
      await scoresRef.add({
        playerId,
        score,
        level,
        lines,
        timestamp: new Date(),
        replay: replay
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to save score:', error);
      return { success: false, error: error.message };
    }
  }

  async getLeaderboard(limit = 10) {
    try {
      const scoresRef = this.firestore.collection('leaderboard');
      const snapshot = await scoresRef
        .orderBy('score', 'desc')
        .limit(limit)
        .get();

      const leaderboard = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        leaderboard.push({
          id: doc.id,
          playerId: data.playerId,
          score: data.score,
          level: data.level,
          lines: data.lines,
          timestamp: data.timestamp.toMillis()
        });
      });

      return { success: true, leaderboard };
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return { success: false, error: error.message };
    }
  }

  // Replay Storage
  async saveReplay(replayId, replayData) {
    try {
      const bucket = this.storage.bucket(process.env.GCS_REPLAY_BUCKET || 'tetris-replays');
      const file = bucket.file(`replays/${replayId}.json`);

      await file.save(JSON.stringify(replayData), {
        metadata: {
          contentType: 'application/json',
          metadata: {
            gameVersion: '1.0',
            uploadTime: Date.now().toString()
          }
        }
      });

      return { 
        success: true, 
        replayUrl: `gs://${bucket.name}/${file.name}` 
      };
    } catch (error) {
      console.error('Failed to save replay:', error);
      return { success: false, error: error.message };
    }
  }

  async loadReplay(replayId) {
    try {
      const bucket = this.storage.bucket(process.env.GCS_REPLAY_BUCKET || 'tetris-replays');
      const file = bucket.file(`replays/${replayId}.json`);

      const [contents] = await file.download();
      const replayData = JSON.parse(contents.toString());

      return { success: true, replayData };
    } catch (error) {
      console.error('Failed to load replay:', error);
      return { success: false, error: error.message };
    }
  }

  // Secret Management
  async getSecret(secretName) {
    try {
      const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
      const [version] = await this.secretManager.accessSecretVersion({ name });
      
      const secretValue = version.payload.data.toString();
      
      try {
        return { success: true, secret: JSON.parse(secretValue) };
      } catch {
        return { success: true, secret: secretValue };
      }
    } catch (error) {
      console.error('Failed to get secret:', error);
      return { success: false, error: error.message };
    }
  }

  // AI Integration (Vertex AI)
  async getAIPrediction(prompt, modelName = 'text-bison') {
    try {
      const { PredictionServiceClient } = require('@google-cloud/aiplatform');
      
      const client = new PredictionServiceClient({
        apiEndpoint: `${process.env.VERTEX_AI_REGION || 'us-central1'}-aiplatform.googleapis.com`
      });

      const endpoint = `projects/${this.projectId}/locations/${process.env.VERTEX_AI_REGION || 'us-central1'}/publishers/google/models/${modelName}`;

      const instanceValue = {
        prompt: prompt,
        temperature: 0.1,
        maxOutputTokens: 1000,
        topP: 0.9,
        topK: 40
      };

      const instance = {
        structValue: {
          fields: Object.fromEntries(
            Object.entries(instanceValue).map(([key, value]) => [
              key,
              typeof value === 'string' 
                ? { stringValue: value }
                : { numberValue: value }
            ])
          )
        }
      };

      const request = {
        endpoint,
        instances: [instance]
      };

      const [response] = await client.predict(request);
      const prediction = response.predictions[0].structValue.fields.content.stringValue;

      return { success: true, prediction };
    } catch (error) {
      console.error('Failed to get AI prediction:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time Updates (Firestore listeners)
  subscribeToLeaderboard(callback) {
    const unsubscribe = this.firestore
      .collection('leaderboard')
      .orderBy('score', 'desc')
      .limit(10)
      .onSnapshot(snapshot => {
        const leaderboard = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          leaderboard.push({
            id: doc.id,
            playerId: data.playerId,
            score: data.score,
            level: data.level,
            lines: data.lines,
            timestamp: data.timestamp.toMillis()
          });
        });
        
        callback({ success: true, leaderboard });
      }, error => {
        callback({ success: false, error: error.message });
      });

    return unsubscribe;
  }

  // Health Check
  async healthCheck() {
    const checks = [];

    // Firestore health
    try {
      await this.firestore.collection('health').limit(1).get();
      checks.push({ service: 'Firestore', status: 'healthy' });
    } catch (error) {
      checks.push({ service: 'Firestore', status: 'unhealthy', error: error.message });
    }

    // Cloud Storage health
    try {
      await this.storage.getBuckets({ maxResults: 1 });
      checks.push({ service: 'CloudStorage', status: 'healthy' });
    } catch (error) {
      checks.push({ service: 'CloudStorage', status: 'unhealthy', error: error.message });
    }

    // Secret Manager health
    try {
      await this.secretManager.listSecrets({
        parent: `projects/${this.projectId}`,
        pageSize: 1
      });
      checks.push({ service: 'SecretManager', status: 'healthy' });
    } catch (error) {
      checks.push({ service: 'SecretManager', status: 'unhealthy', error: error.message });
    }

    const allHealthy = checks.every(check => check.status === 'healthy');
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      projectId: this.projectId,
      timestamp: Date.now()
    };
  }

  // Cloud Function Handler
  static createCloudFunctionHandler() {
    const adapter = new GCPCloudAdapter();
    
    return async (req, res) => {
      try {
        // Enable CORS
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.status(204).send('');
          return;
        }

        const { method, path } = req;
        const body = req.body || {};
        const query = req.query || {};

        let response;

        // Route requests
        if (method === 'POST' && path === '/api/game-state') {
          response = await adapter.saveGameState(query.playerId, body);
        } else if (method === 'GET' && path === '/api/game-state') {
          response = await adapter.loadGameState(query.playerId);
        } else if (method === 'POST' && path === '/api/scores') {
          response = await adapter.saveScore(
            body.playerId,
            body.score,
            body.level,
            body.lines,
            body.replay
          );
        } else if (method === 'GET' && path === '/api/leaderboard') {
          response = await adapter.getLeaderboard(parseInt(query.limit) || 10);
        } else if (method === 'POST' && path === '/api/replays') {
          response = await adapter.saveReplay(body.replayId, body.replayData);
        } else if (method === 'GET' && path === '/api/replays') {
          response = await adapter.loadReplay(query.replayId);
        } else if (method === 'GET' && path === '/api/health') {
          response = await adapter.healthCheck();
        } else {
          response = { success: false, error: 'Not found' };
        }

        res.status(response.success ? 200 : 400).json(response);
      } catch (error) {
        console.error('Cloud Function error:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    };
  }

  // Pub/Sub Integration for real-time features
  async publishGameEvent(eventType, eventData) {
    try {
      const { PubSub } = require('@google-cloud/pubsub');
      const pubsub = new PubSub({ projectId: this.projectId });
      
      const topicName = process.env.PUBSUB_GAME_EVENTS_TOPIC || 'tetris-game-events';
      const topic = pubsub.topic(topicName);

      const message = {
        eventType,
        eventData,
        timestamp: Date.now()
      };

      await topic.publishMessage({
        data: Buffer.from(JSON.stringify(message))
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to publish game event:', error);
      return { success: false, error: error.message };
    }
  }

  // Cleanup expired data
  async cleanupExpiredData() {
    try {
      const now = new Date();
      
      // Clean up expired game states
      const expiredStates = await this.firestore
        .collection('gameStates')
        .where('ttl', '<', now)
        .get();

      const batch = this.firestore.batch();
      expiredStates.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      return { 
        success: true, 
        deletedStates: expiredStates.size 
      };
    } catch (error) {
      console.error('Failed to cleanup expired data:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = { GCPCloudAdapter };