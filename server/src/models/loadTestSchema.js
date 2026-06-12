const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  total: { type: Number, required: true },
  completed: { type: Number, required: true, default: 0 },
  successful: { type: Number, required: true, default: 0 },
  failed: { type: Number, required: true, default: 0 },
  percentage: { type: Number, required: true, default: 0 },
}, { _id: false });

const metricsSchema = new mongoose.Schema({
  minResponseTimeMs: { type: Number, default: null },
  maxResponseTimeMs: { type: Number, default: null },
  averageResponseTimeMs: { type: Number, default: null },
  p95ResponseTimeMs: { type: Number, default: null },
  statusCodes: { type: Map, of: Number, default: {} },
  errorRate: { type: Number, default: 0 },
  throughput: { type: Number, default: 0 },
  totalDurationMs: { type: Number, default: 0 },
}, { _id: false });

const errorSchema = new mongoose.Schema({
  statusCode: { type: Number, default: null },
  message: { type: String, required: true },
  responseTimeMs: { type: Number, default: null },
  occurredAt: { type: Date, default: Date.now },
}, { _id: false });

const loadTestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  targetUrl: { type: String, required: true, index: true },
  method: { type: String, required: true, index: true },
  headers: { type: mongoose.Schema.Types.Mixed, default: {} },
  payload: { type: mongoose.Schema.Types.Mixed, default: null },
  requestCount: { type: Number, required: true },
  concurrency: { type: Number, required: true },
  rateLimitPerSecond: { type: Number, required: true, default: 0 },
  status: {
    type: String,
    enum: ['queued', 'running', 'completed', 'failed'],
    default: 'queued',
    index: true,
  },
  progress: { type: progressSchema, required: true },
  metrics: { type: metricsSchema, required: true },
  requestErrors: { type: [errorSchema], default: [] },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
}, {
  timestamps: true,
  versionKey: false,
});

loadTestSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret._id;
    if (ret.metrics?.statusCodes instanceof Map) {
      ret.metrics.statusCodes = Object.fromEntries(ret.metrics.statusCodes);
    }
    return ret;
  },
});

module.exports = mongoose.model('LoadTest', loadTestSchema);
