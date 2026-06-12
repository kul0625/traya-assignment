import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  BarChart3,
  Clock,
  Filter,
  Gauge,
  Play,
  RefreshCw,
  Server,
  ShieldAlert,
} from 'lucide-react';
import './styles.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').trim();
const terminalStatuses = new Set(['completed', 'failed']);

const defaultForm = {
  targetUrl: 'https://jsonplaceholder.typicode.com/posts',
  method: 'GET',
  requestCount: 50,
  concurrency: 10,
  rateLimitPerSecond: 0,
  headers: '{}',
  payload: '',
};

const defaultFilters = {
  method: '',
  url: '',
  minErrorRate: '',
  maxErrorRate: '',
  minThroughput: '',
  maxThroughput: '',
};

function App() {
  const [form, setForm] = useState(defaultForm);
  const [filters, setFilters] = useState(defaultFilters);
  const [tests, setTests] = useState([]);
  const [activeTestId, setActiveTestId] = useState('');
  const [activeTest, setActiveTest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const filteredQuery = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '') {
        params.set(key, value);
      }
    });
    return params.toString();
  }, [filters]);

  async function fetchTests() {
    const response = await fetch(`${API_BASE_URL}/api/tests?${filteredQuery}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to fetch tests');
    }

    setTests(data.tests);
  }

  async function fetchActiveTest(id = activeTestId) {
    if (!id) {
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/tests/${id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to fetch test');
    }

    setActiveTest(data);
  }

  useEffect(() => {
    fetchTests().catch((error) => setMessage(error.message));
  }, [filteredQuery]);

  useEffect(() => {
    if (!activeTestId) {
      return undefined;
    }

    let closed = false;
    let fallbackTimer = null;

    const upsertTest = (test) => {
      setActiveTest(test);
      setTests((currentTests) => {
        const exists = currentTests.some((currentTest) => currentTest.id === test.id);

        if (!exists) {
          return [test, ...currentTests];
        }

        return currentTests.map((currentTest) => (currentTest.id === test.id ? test : currentTest));
      });
    };

    const pollUntilFinished = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/tests/${activeTestId}`);
        const test = await response.json();

        if (!response.ok) {
          throw new Error(test.error || 'Unable to fetch test');
        }

        upsertTest(test);

        if (!terminalStatuses.has(test.status) && !closed) {
          fallbackTimer = window.setTimeout(pollUntilFinished, 1200);
        }
      } catch (error) {
        setMessage(error.message);
      }
    };

    fetchActiveTest(activeTestId).catch((error) => setMessage(error.message));

    const events = new EventSource(`${API_BASE_URL}/api/tests/${activeTestId}/events`);

    events.addEventListener('test-update', (event) => {
      const test = JSON.parse(event.data);
      upsertTest(test);

      if (terminalStatuses.has(test.status)) {
        closed = true;
        events.close();
      }
    });

    events.onerror = () => {
      if (closed) {
        return;
      }

      events.close();
      pollUntilFinished();
    };

    return () => {
      closed = true;
      events.close();

      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
      }
    };
  }, [activeTestId]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  async function submitTest(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const headers = form.headers.trim() ? JSON.parse(form.headers) : {};
      const payload = form.payload.trim() ? JSON.parse(form.payload) : null;

      const response = await fetch(`${API_BASE_URL}/api/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: form.targetUrl,
          method: form.method,
          headers,
          payload,
          requestCount: Number(form.requestCount),
          concurrency: Number(form.concurrency),
          rateLimitPerSecond: Number(form.rateLimitPerSecond),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to create test');
      }

      setActiveTestId(data.test.id);
      setActiveTest(data.test);
      setMessage('Load test accepted and queued.');
      await fetchTests();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  const totalRequests = tests.reduce((sum, test) => sum + test.progress.completed, 0);
  const runningCount = tests.filter((test) => test.status === 'running' || test.status === 'queued').length;
  const completedCount = tests.filter((test) => test.status === 'completed').length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Distributed Load Testing Platform</p>
          <h1>Load test control center</h1>
        </div>
        <button className="icon-button" type="button" onClick={() => fetchTests()} title="Refresh">
          <RefreshCw size={18} />
        </button>
      </header>

      <section className="stat-grid">
        <Stat icon={<Server />} label="Total tests" value={tests.length} />
        <Stat icon={<Activity />} label="Queued or running" value={runningCount} />
        <Stat icon={<BarChart3 />} label="Completed" value={completedCount} />
        <Stat icon={<Gauge />} label="Requests observed" value={totalRequests} />
      </section>

      <section className="workspace">
        <form className="panel form-panel" onSubmit={submitTest}>
          <div className="panel-title">
            <Play size={18} />
            <h2>Create test</h2>
          </div>

          <label>
            Target URL
            <input value={form.targetUrl} onChange={(event) => updateForm('targetUrl', event.target.value)} required />
          </label>

          <div className="field-row">
            <label>
              Method
              <select value={form.method} onChange={(event) => updateForm('method', event.target.value)}>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </label>
            <label>
              Requests
              <input type="number" min="1" value={form.requestCount} onChange={(event) => updateForm('requestCount', event.target.value)} />
            </label>
          </div>

          <div className="field-row">
            <label>
              Concurrency
              <input type="number" min="1" value={form.concurrency} onChange={(event) => updateForm('concurrency', event.target.value)} />
            </label>
            <label>
              Rate limit / sec
              <input type="number" min="0" value={form.rateLimitPerSecond} onChange={(event) => updateForm('rateLimitPerSecond', event.target.value)} />
            </label>
          </div>

          <label>
            Headers JSON
            <textarea
              rows="4"
              value={form.headers}
              onChange={(event) => updateForm('headers', event.target.value)}
              spellCheck="false"
            />
          </label>

          <label>
            Payload JSON
            <textarea
              rows="5"
              value={form.payload}
              placeholder='{"name":"test"}'
              onChange={(event) => updateForm('payload', event.target.value)}
              spellCheck="false"
            />
          </label>

          <button className="primary-button" type="submit" disabled={loading}>
            <Play size={17} />
            {loading ? 'Submitting' : 'Run load test'}
          </button>

          {message && <p className="message">{message}</p>}
        </form>

        <section className="panel status-panel">
          <div className="panel-title">
            <Clock size={18} />
            <h2>Current status</h2>
          </div>

          {activeTest ? (
            <StatusDetails test={activeTest} />
          ) : (
            <div className="empty-state">Submit or select a test to monitor progress.</div>
          )}
        </section>
      </section>

      <section className="panel results-panel">
        <div className="panel-title">
          <Filter size={18} />
          <h2>Results</h2>
        </div>

        <div className="filters">
          <select value={filters.method} onChange={(event) => updateFilter('method', event.target.value)}>
            <option value="">All methods</option>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
              <option key={method}>{method}</option>
            ))}
          </select>
          <input placeholder="URL contains" value={filters.url} onChange={(event) => updateFilter('url', event.target.value)} />
          <input type="number" placeholder="Min error %" value={filters.minErrorRate} onChange={(event) => updateFilter('minErrorRate', event.target.value)} />
          <input type="number" placeholder="Max error %" value={filters.maxErrorRate} onChange={(event) => updateFilter('maxErrorRate', event.target.value)} />
          <input type="number" placeholder="Min throughput" value={filters.minThroughput} onChange={(event) => updateFilter('minThroughput', event.target.value)} />
          <input type="number" placeholder="Max throughput" value={filters.maxThroughput} onChange={(event) => updateFilter('maxThroughput', event.target.value)} />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Method</th>
                <th>URL</th>
                <th>Progress</th>
                <th>Error %</th>
                <th>Throughput</th>
                <th>P95</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id} onClick={() => setActiveTestId(test.id)}>
                  <td><StatusBadge status={test.status} /></td>
                  <td>{test.method}</td>
                  <td className="url-cell">{test.targetUrl}</td>
                  <td>{test.progress.completed}/{test.progress.total}</td>
                  <td>{test.metrics.errorRate}%</td>
                  <td>{test.metrics.throughput}/s</td>
                  <td>{test.metrics.p95ResponseTimeMs ?? '-'} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tests.length === 0 && <div className="empty-state">No tests match the current filters.</div>}
        </div>
      </section>
    </main>
  );
}

function Stat({ icon, label, value }) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function StatusDetails({ test }) {
  const requestErrors = test.requestErrors || test.errors || [];

  return (
    <div className="status-details">
      <div className="status-heading">
        <StatusBadge status={test.status} />
        <span>{test.method}</span>
      </div>
      <p className="target-url">{test.targetUrl}</p>

      <div className="progress-track">
        <span style={{ width: `${test.progress.percentage}%` }} />
      </div>
      <div className="progress-meta">
        <span>{test.progress.percentage}% complete</span>
        <span>{test.progress.completed}/{test.progress.total}</span>
      </div>

      <div className="metric-grid">
        <Metric label="Success" value={test.progress.successful} />
        <Metric label="Failed" value={test.progress.failed} />
        <Metric label="Avg latency" value={`${test.metrics.averageResponseTimeMs ?? '-'} ms`} />
        <Metric label="Max latency" value={`${test.metrics.maxResponseTimeMs ?? '-'} ms`} />
        <Metric label="Error rate" value={`${test.metrics.errorRate}%`} />
        <Metric label="Throughput" value={`${test.metrics.throughput}/s`} />
      </div>

      <div className="status-codes">
        <h3>Status codes</h3>
        {Object.keys(test.metrics.statusCodes).length ? (
          <div className="code-list">
            {Object.entries(test.metrics.statusCodes).map(([code, count]) => (
              <span key={code}>{code}: {count}</span>
            ))}
          </div>
        ) : (
          <p>No status codes recorded yet.</p>
        )}
      </div>

      {requestErrors.length > 0 && (
        <div className="error-list">
          <h3><ShieldAlert size={16} /> Recent errors</h3>
          {requestErrors.map((error, index) => (
            <p key={`${error.message}-${index}`}>{error.statusCode || 'Network'} - {error.message}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

createRoot(document.getElementById('root')).render(<App />);
