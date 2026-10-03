import { Company, CompanyApiMethod, ConnectionHealthRecord, HourlyHealthMetric, WebhookTestRecord } from '../types';
import { generateDefaultCompanyApiMethods } from '../data/defaultApiMethods';

const STORAGE_KEY = 'vex_api_health_telemetry_v1';
const WEBHOOK_HISTORY_KEY = 'vex_webhook_tester_history_v1';

export interface HealthTelemetryStore {
  lastUpdated: number;
  connectionStats: Record<string, {
    successCount: number;
    failureCount: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    lastStatusCode: number;
    lastStatusMessage: string;
    lastCheckedAt: string;
    errorBreakdown: {
      badRequest: number;
      unauthorized: number;
      rateLimited: number;
      gatewayError: number;
      timeout: number;
    };
  }>;
}

/**
 * Generate 24 hourly buckets ending at current time
 */
export function generate24HourBuckets(): { hourLabel: string; timestamp: number }[] {
  const buckets: { hourLabel: string; timestamp: number }[] = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600 * 1000);
    const hour = d.getHours().toString().padStart(2, '0') + ':00';
    buckets.push({
      hourLabel: hour,
      timestamp: d.getTime(),
    });
  }
  return buckets;
}

/**
 * Load or initialize telemetry store
 */
export function getStoredTelemetry(): HealthTelemetryStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // If within 24 hours, use it
      if (Date.now() - parsed.lastUpdated < 86400000) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading health telemetry store:', e);
  }

  const initialStore: HealthTelemetryStore = {
    lastUpdated: Date.now(),
    connectionStats: {},
  };
  return initialStore;
}

/**
 * Save telemetry store
 */
export function saveStoredTelemetry(store: HealthTelemetryStore) {
  try {
    store.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('Error saving health telemetry store:', e);
  }
}

/**
 * Deterministic pseudorandom generator based on seed string
 */
function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash++) * 10000;
  return x - Math.floor(x);
}

/**
 * Compute 24h health records for all companies and their API methods
 */
export function computeConnectionsHealth(companies: Company[]): ConnectionHealthRecord[] {
  const store = getStoredTelemetry();
  let storeModified = false;

  // Read webhook test records from tester
  let webhookRecords: WebhookTestRecord[] = [];
  try {
    const raw = localStorage.getItem(WEBHOOK_HISTORY_KEY);
    if (raw) {
      webhookRecords = JSON.parse(raw);
    }
  } catch {
    webhookRecords = [];
  }

  const now = Date.now();
  const records: ConnectionHealthRecord[] = [];

  companies.forEach((company) => {
    const methods: CompanyApiMethod[] =
      company.api_methods && company.api_methods.length > 0
        ? company.api_methods
        : generateDefaultCompanyApiMethods(company);

    methods.forEach((method) => {
      const key = `${company.id}_${method.id}`;
      let stat = store.connectionStats[key];

      if (!stat) {
        // Generate realistic baseline stats based on method attributes
        const rand = seededRandom(key);
        const rand2 = seededRandom(key + '_latency');
        const rand3 = seededRandom(key + '_traffic');

        // Most connections are healthy (96% - 99.8%)
        const totalCalls = Math.floor(800 + rand3 * 3200);
        let failureRate = 0.008 + rand * 0.025; // 0.8% - 3.3% failure
        if (!method.enabled) {
          failureRate = 0;
        }

        const failedCalls = method.enabled ? Math.max(1, Math.round(totalCalls * failureRate)) : 0;
        const successCalls = totalCalls - failedCalls;
        const avgLatency = Math.floor(45 + rand2 * 85); // 45ms - 130ms

        stat = {
          successCount: successCalls,
          failureCount: failedCalls,
          avgLatencyMs: avgLatency,
          p95LatencyMs: Math.round(avgLatency * 1.8),
          lastStatusCode: method.enabled ? 200 : 0,
          lastStatusMessage: method.enabled ? '200 OK - Active Gateway' : 'Connection Disabled',
          lastCheckedAt: new Date(now - Math.floor(rand * 3600 * 1000 * 3)).toISOString(),
          errorBreakdown: {
            badRequest: Math.floor(failedCalls * 0.2),
            unauthorized: Math.floor(failedCalls * 0.1),
            rateLimited: Math.floor(failedCalls * 0.35),
            gatewayError: Math.floor(failedCalls * 0.25),
            timeout: Math.floor(failedCalls * 0.1),
          },
        };
        store.connectionStats[key] = stat;
        storeModified = true;
      }

      // Check if there are real test logs in webhook history for this company
      const matchingWebhookLogs = webhookRecords.filter(
        (log) =>
          log.companyId === company.id &&
          now - new Date(log.executedAt).getTime() < 86400000
      );

      let totalSuccess = stat.successCount;
      let totalFailed = stat.failureCount;
      let latestCheckedAt = stat.lastCheckedAt;
      let latestStatusCode = stat.lastStatusCode;
      let latestStatusMessage = stat.lastStatusMessage;

      if (matchingWebhookLogs.length > 0) {
        const lastLog = matchingWebhookLogs[0];
        latestCheckedAt = lastLog.executedAt;
        latestStatusCode = lastLog.responseStatus;
        latestStatusMessage = `${lastLog.responseStatus} ${lastLog.success ? 'OK' : 'Error'}`;
        matchingWebhookLogs.forEach((l) => {
          if (l.success) totalSuccess += 1;
          else totalFailed += 1;
        });
      }

      const totalCalls = totalSuccess + totalFailed;
      const successRate = totalCalls > 0 ? (totalSuccess / totalCalls) * 100 : 100;

      let status: 'healthy' | 'degraded' | 'down' | 'untested' = 'healthy';
      if (!method.enabled) {
        status = 'untested';
      } else if (successRate >= 98) {
        status = 'healthy';
      } else if (successRate >= 90) {
        status = 'degraded';
      } else {
        status = 'down';
      }

      records.push({
        methodId: method.id,
        methodName: method.name,
        methodNameAr: method.name_ar,
        companyId: company.id,
        companyName: company.name,
        companyColor: company.color,
        promoCode: company.promo_code,
        methodType: method.method_type,
        endpointUrl: method.endpoint_url || 'https://api.partner.com/v1',
        enabled: method.enabled,
        isPrimary: method.is_primary,
        successRate24h: Math.round(successRate * 10) / 10,
        totalCalls24h: totalCalls,
        successCalls24h: totalSuccess,
        failedCalls24h: totalFailed,
        avgLatencyMs: stat.avgLatencyMs,
        p95LatencyMs: stat.p95LatencyMs,
        status,
        lastCheckedAt: latestCheckedAt,
        lastStatusCode: latestStatusCode,
        lastStatusMessage: latestStatusMessage,
        errorBreakdown: stat.errorBreakdown,
      });
    });
  });

  if (storeModified) {
    saveStoredTelemetry(store);
  }

  return records;
}

/**
 * Generate 24-hour timeline metrics across all active connections
 */
export function computeHourlyMetrics(connections: ConnectionHealthRecord[]): HourlyHealthMetric[] {
  const buckets = generate24HourBuckets();
  const totalEnabled = connections.filter((c) => c.enabled).length || 1;

  return buckets.map((bucket, index) => {
    // Determine realistic diurnal curve (peak at afternoon/evening hours)
    const hourNum = parseInt(bucket.hourLabel.split(':')[0], 10);
    const diurnalMultiplier = 0.5 + 0.5 * Math.sin(((hourNum - 6) / 24) * 2 * Math.PI + Math.PI / 2);
    
    // Aggregate base from all connections
    let totalSuccess = 0;
    let totalFailure = 0;
    let latencySum = 0;

    connections.forEach((conn) => {
      if (!conn.enabled) return;
      const hourlyBase = (conn.totalCalls24h / 24) * (0.6 + diurnalMultiplier * 0.8);
      const connSuccessRatio = conn.successRate24h / 100;

      // Add a slight variance per hour
      const hourVariance = 0.95 + seededRandom(conn.methodId + index) * 0.1;
      const hourlySuccess = Math.round(hourlyBase * connSuccessRatio * hourVariance);
      const hourlyFailed = Math.round(hourlyBase * (1 - connSuccessRatio) * hourVariance);

      totalSuccess += hourlySuccess;
      totalFailure += hourlyFailed;
      latencySum += conn.avgLatencyMs;
    });

    const totalCount = totalSuccess + totalFailure;
    const rate = totalCount > 0 ? (totalSuccess / totalCount) * 100 : 100;
    const avgLatency = Math.round(latencySum / totalEnabled);

    return {
      hour: bucket.hourLabel,
      timestamp: bucket.timestamp,
      successCount: totalSuccess,
      failureCount: totalFailure,
      totalCount,
      avgLatencyMs: avgLatency,
      successRate: Math.round(rate * 10) / 10,
    };
  });
}

/**
 * Record a live ping test into the telemetry store
 */
export function recordLivePing(
  companyId: string,
  methodId: string,
  success: boolean,
  latencyMs: number,
  statusCode: number,
  statusMessage: string
) {
  const store = getStoredTelemetry();
  const key = `${companyId}_${methodId}`;
  const existing = store.connectionStats[key] || {
    successCount: 100,
    failureCount: 2,
    avgLatencyMs: latencyMs,
    p95LatencyMs: Math.round(latencyMs * 1.5),
    lastStatusCode: statusCode,
    lastStatusMessage: statusMessage,
    lastCheckedAt: new Date().toISOString(),
    errorBreakdown: {
      badRequest: 0,
      unauthorized: 0,
      rateLimited: 0,
      gatewayError: 0,
      timeout: 0,
    },
  };

  if (success) {
    existing.successCount += 1;
  } else {
    existing.failureCount += 1;
    if (statusCode === 429) existing.errorBreakdown.rateLimited += 1;
    else if (statusCode === 401 || statusCode === 403) existing.errorBreakdown.unauthorized += 1;
    else if (statusCode === 400) existing.errorBreakdown.badRequest += 1;
    else if (statusCode >= 500) existing.errorBreakdown.gatewayError += 1;
    else existing.errorBreakdown.timeout += 1;
  }

  // Update running average
  existing.avgLatencyMs = Math.round((existing.avgLatencyMs * 9 + latencyMs) / 10);
  existing.lastStatusCode = statusCode;
  existing.lastStatusMessage = statusMessage;
  existing.lastCheckedAt = new Date().toISOString();

  store.connectionStats[key] = existing;
  saveStoredTelemetry(store);
}

/**
 * Reset telemetry store to fresh baseline
 */
export function resetTelemetryStore() {
  localStorage.removeItem(STORAGE_KEY);
}
