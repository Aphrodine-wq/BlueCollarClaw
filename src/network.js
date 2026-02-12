const mqtt = require('mqtt');
const crypto = require('crypto');
const { nanoid } = require('nanoid');

class BlueCollarClawNetwork {
  constructor(brokerUrl = 'mqtt://localhost:1883', contractorId, onMessageCallback) {
    this.brokerUrl = brokerUrl;
    this.contractorId = contractorId;
    this.client = null;
    this.onMessageCallback = onMessageCallback;
    this.subscriptions = new Set();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(this.brokerUrl, {
        clientId: `BlueCollarClaw_${this.contractorId}_${nanoid(6)}`,
        clean: true,
        reconnectPeriod: 1000,
      });

      this.client.on('connect', () => {
        console.log(`Connected to BlueCollarClaw network: ${this.brokerUrl}`);

        // Re-subscribe to all topics on (re)connect
        if (this.subscriptions.size > 0) {
          console.log(`Restoring ${this.subscriptions.size} subscriptions...`);
          this.subscriptions.forEach(topic => {
            this.client.subscribe(topic, (err) => {
              if (err) console.error(`Failed to resubscribe to ${topic}:`, err);
            });
          });
        }

        resolve();
      });

      this.client.on('reconnect', () => {
        console.log('Reconnecting to BlueCollarClaw network...');
      });

      this.client.on('error', (err) => {
        console.error('MQTT connection error:', err);
        // Don't reject the promise here if we want to allow retries, 
        // but if it's the *initial* connection failure, we might want to.
        // For now, we log it.
      });

      this.client.on('message', (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());

          // Verify signature
          if (this.verifyMessage(payload)) {
            this.onMessageCallback(topic, payload);
          } else {
            console.warn('Invalid message signature, ignoring');
          }
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      });
    });
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      console.log('Disconnected from BlueCollarClaw network');
    }
  }

  // Subscribe to trade and region channels
  subscribe(trade, region = 'all') {
    const topic = `BlueCollarClaw/${region}/${trade}`;

    if (!this.subscriptions.has(topic)) {
      this.client.subscribe(topic, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          this.subscriptions.add(topic);
          console.log(`Subscribed to ${topic}`);
        }
      });
    }
  }

  unsubscribe(trade, region = 'all') {
    const topic = `BlueCollarClaw/${region}/${trade}`;

    if (this.subscriptions.has(topic)) {
      this.client.unsubscribe(topic, (err) => {
        if (err) {
          console.error(`Failed to unsubscribe from ${topic}:`, err);
        } else {
          this.subscriptions.delete(topic);
          console.log(`Unsubscribed from ${topic}`);
        }
      });
    }
  }

  // Broadcast a job request
  broadcastRequest(request, privateKey) {
    const topic = `BlueCollarClaw/${request.region || 'all'}/${request.trade}`;

    const message = {
      type: 'REQUEST',
      id: request.id,
      requesterId: this.contractorId,
      trade: request.trade,
      location: request.location,
      latitude: request.latitude,
      longitude: request.longitude,
      startDate: request.startDate,
      endDate: request.endDate,
      minRate: request.minRate,
      maxRate: request.maxRate,
      scope: request.scope,
      requirements: request.requirements,
      timestamp: Date.now(),
      expiresAt: Date.now() + (request.ttl || 24 * 60 * 60 * 1000), // Default 24h expiry
    };

    // Sign the message
    const signature = this.signMessage(message, privateKey);
    message.signature = signature;

    this.client.publish(topic, JSON.stringify(message), { qos: 1 }, (err) => {
      if (err) {
        console.error('Failed to broadcast request:', err);
      } else {
        console.log(`Broadcasted request ${request.id} to ${topic}`);
      }
    });
  }

  // Send an offer
  sendOffer(offer, privateKey) {
    const topic = `BlueCollarClaw/offers/${offer.requesterId}`;

    const message = {
      type: 'OFFER',
      id: offer.id,
      requestId: offer.requestId,
      contractorId: this.contractorId,
      rate: offer.rate,
      startDate: offer.startDate,
      endDate: offer.endDate,
      message: offer.message,
      round: offer.round || 1,
      timestamp: Date.now(),
    };

    const signature = this.signMessage(message, privateKey);
    message.signature = signature;

    this.client.publish(topic, JSON.stringify(message), { qos: 1 }, (err) => {
      if (err) {
        console.error('Failed to send offer:', err);
      } else {
        console.log(`Sent offer ${offer.id} for request ${offer.requestId}`);
      }
    });
  }

  // Send counter-offer
  sendCounter(counter, privateKey) {
    const topic = `BlueCollarClaw/counters/${counter.contractorId}`;

    const message = {
      type: 'COUNTER',
      id: counter.id,
      offerId: counter.offerId,
      requestId: counter.requestId,
      requesterId: this.contractorId,
      rate: counter.rate,
      startDate: counter.startDate,
      endDate: counter.endDate,
      message: counter.message,
      round: counter.round,
      timestamp: Date.now(),
    };

    const signature = this.signMessage(message, privateKey);
    message.signature = signature;

    this.client.publish(topic, JSON.stringify(message), { qos: 1 }, (err) => {
      if (err) {
        console.error('Failed to send counter:', err);
      } else {
        console.log(`Sent counter-offer for request ${counter.requestId}`);
      }
    });
  }

  // Accept an offer
  sendAcceptance(acceptance, privateKey) {
    const topic = `BlueCollarClaw/accepts/${acceptance.contractorId}`;

    const message = {
      type: 'ACCEPT',
      id: acceptance.id,
      offerId: acceptance.offerId,
      requestId: acceptance.requestId,
      requesterId: this.contractorId,
      timestamp: Date.now(),
    };

    const signature = this.signMessage(message, privateKey);
    message.signature = signature;

    this.client.publish(topic, JSON.stringify(message), { qos: 1 }, (err) => {
      if (err) {
        console.error('Failed to send acceptance:', err);
      } else {
        console.log(`Accepted offer ${acceptance.offerId}`);
      }
    });
  }

  // Decline an offer
  sendDecline(decline, privateKey) {
    const topic = `BlueCollarClaw/declines/${decline.contractorId}`;

    const message = {
      type: 'DECLINE',
      id: decline.id,
      offerId: decline.offerId,
      requestId: decline.requestId,
      requesterId: this.contractorId,
      reason: decline.reason,
      timestamp: Date.now(),
    };

    const signature = this.signMessage(message, privateKey);
    message.signature = signature;

    this.client.publish(topic, JSON.stringify(message), { qos: 1 }, (err) => {
      if (err) {
        console.error('Failed to send decline:', err);
      } else {
        console.log(`Declined offer ${decline.offerId}`);
      }
    });
  }

  // Confirm booking (final step)
  sendConfirmation(confirmation, privateKey) {
    const topic = `BlueCollarClaw/confirmations/${confirmation.recipientId}`;

    const message = {
      type: 'CONFIRM',
      id: confirmation.id,
      bookingId: confirmation.bookingId,
      senderId: this.contractorId,
      contractUrl: confirmation.contractUrl,
      calendarEventId: confirmation.calendarEventId,
      timestamp: Date.now(),
    };

    const signature = this.signMessage(message, privateKey);
    message.signature = signature;

    this.client.publish(topic, JSON.stringify(message), { qos: 1 }, (err) => {
      if (err) {
        console.error('Failed to send confirmation:', err);
      } else {
        console.log(`Sent booking confirmation ${confirmation.bookingId}`);
      }
    });
  }

  // Subscribe to personal channels (offers, counters, accepts, etc.)
  subscribeToPersonalChannels() {
    const channels = [
      `BlueCollarClaw/offers/${this.contractorId}`,
      `BlueCollarClaw/counters/${this.contractorId}`,
      `BlueCollarClaw/accepts/${this.contractorId}`,
      `BlueCollarClaw/declines/${this.contractorId}`,
      `BlueCollarClaw/confirmations/${this.contractorId}`,
    ];

    channels.forEach(topic => {
      this.client.subscribe(topic, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          console.log(`Subscribed to ${topic}`);
        }
      });
    });
  }

  // Cryptographic signing
  signMessage(message, privateKey) {
    const messageString = JSON.stringify({
      type: message.type,
      id: message.id,
      timestamp: message.timestamp,
    });

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(messageString);
    return sign.sign(privateKey, 'base64');
  }

  verifyMessage(message) {
    // For now, basic validation - in production, verify against public key
    return message.signature && message.timestamp && message.id;
  }

  // Generate keypair for new contractor
  static generateKeypair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { publicKey, privateKey };
  }
}

module.exports = BlueCollarClawNetwork;
