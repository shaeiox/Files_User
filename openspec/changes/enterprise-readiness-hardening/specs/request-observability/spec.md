# Spec Delta

## Purpose

Lets operators follow a single request through the logs and watch the portal's traffic,
errors and latency over time, without logs or metrics leaking content names or credentials.

## ADDED Requirements

### Requirement: Request ID on every response
The portal SHALL return an `X-Request-Id` header on every response. When a trusted proxy (per
`TRUSTED_PROXIES`) sends an `X-Request-Id` of 1–128 characters from `[A-Za-z0-9._-]`, the
portal SHALL reuse it. Otherwise it SHALL generate a new random ID.

#### Scenario: Generated ID
- **WHEN** a client calls any endpoint without an `X-Request-Id` header
- **THEN** the response carries an `X-Request-Id` header with a newly generated value

#### Scenario: Trusted proxy ID kept
- **WHEN** a request from a trusted proxy carries `X-Request-Id: abc-123`
- **THEN** the response carries `X-Request-Id: abc-123`

#### Scenario: Untrusted or malformed ID replaced
- **WHEN** a direct client sends `X-Request-Id: abc-123`, or a trusted proxy sends a value with spaces or longer than 128 characters
- **THEN** the response carries a newly generated ID instead

### Requirement: Trace lines carry the request ID and duration
Every access line written to the JSON-lines trace (`LOG_FILE`) SHALL include `requestId` and
`durationMs` fields. Existing fields (`t`, `level`, `method`, `status`, `url`, `msg`) SHALL keep
their names and meaning, so the admin's Logs pane keeps working.

#### Scenario: Correlate a response with its log line
- **WHEN** a client receives a response with `X-Request-Id: R`
- **THEN** the trace holds exactly one access line with `"requestId":"R"` and a numeric `durationMs`

#### Scenario: Errors keep the ID
- **WHEN** a request ends in a `5xx`
- **THEN** its trace line has `"level":"error"` and the same `requestId` as the response header

### Requirement: Metrics endpoint
The portal SHALL serve `GET /metrics` in Prometheus text format, covering at least: request
count by route and status class, request duration by route, sign-in failures, lockouts, active
downloads, and the admin snapshot age in integration mode.

#### Scenario: Scrape from loopback
- **WHEN** a client on loopback requests `GET /metrics`
- **THEN** the portal answers `200` with `Content-Type: text/plain; version=0.0.4` and the listed series

#### Scenario: Route labels are templates
- **WHEN** clients have downloaded `/api/download/a/secret-name.tgz`
- **THEN** no metric label contains `secret-name` or any path segment; the route label is the route template (for example `/api/download/*`)

### Requirement: Metrics access restricted
`GET /metrics` SHALL only be served to loopback callers and callers whose socket address is in
`TRUSTED_PROXIES` and that send no `X-Forwarded-For`. Every other caller SHALL get the
same response the portal gives for an unknown path.

#### Scenario: Public request through nginx
- **WHEN** a request for `/metrics` arrives through the proxy carrying `X-Forwarded-For`
- **THEN** the response is identical to the one for an unknown path, so the endpoint is not revealed
