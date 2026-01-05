# Production Readiness: The "CTO's Final Checklist"

Here is the **complete production hardening layer** for `subtextd`. This is what separates a research prototype from a fund-grade system that can handle real users, real money, and real liability.

---

## **1. Security Layer**

### **1.1 TLS & mTLS for All Communications**

```go
// internal/protocol/tls.go
package protocol

import (
    "crypto/tls"
    "crypto/x509"
    "os"
)

// LoadTLSConfig creates production-grade TLS config
func LoadTLSConfig(certPath, keyPath, caPath string) (*tls.Config, error) {
    // Load server certificate
    cert, err := tls.LoadX509KeyPair(certPath, keyPath)
    if err != nil {
        return nil, fmt.Errorf("failed to load server cert: %w", err)
    }

    // Load CA for mTLS
    caCert, err := os.ReadFile(caPath)
    if err != nil {
        return nil, fmt.Errorf("failed to load CA: %w", err)
    }
    caPool := x509.NewCertPool()
    caPool.AppendCertsFromPEM(caCert)

    return &tls.Config{
        Certificates: []tls.Certificate{cert},
        ClientCAs:    caPool,
        ClientAuth:   tls.RequireAndVerifyClientCert, // mTLS
        MinVersion:   tls.VersionTLS13,
        CipherSuites: []uint16{
            tls.TLS_AES_256_GCM_SHA384,
            tls.TLS_CHACHA20_POLY1305_SHA256,
        },
    }, nil
}

// In server.go, use TLS listener:
func (s *Server) ServeTLS(addr, certPath, keyPath, caPath string) error {
    tlsConfig, err := LoadTLSConfig(certPath, keyPath, caPath)
    if err != nil {
        return err
    }

    listener, err := tls.Listen("tcp", addr, tlsConfig)
    if err != nil {
        return err
    }

    grpcServer := grpc.NewServer(
        grpc.Creds(credentials.NewTLS(tlsConfig)),
        grpc.UnaryInterceptor(auth.UnaryServerInterceptor()),
        grpc.StreamInterceptor(auth.StreamServerInterceptor()),
    )
    
    return grpcServer.Serve(listener)
}
```

**Generate certificates:**
```bash
# scripts/gen-certs.sh
#!/bin/bash

mkdir -p certs

# CA certificate
openssl genrsa -out certs/ca.key 4096
openssl req -new -x509 -days 365 -key certs/ca.key -out certs/ca.crt \
  -subj "/CN=subtextd-ca"

# Server certificate
openssl genrsa -out certs/server.key 4096
openssl req -new -key certs/server.key -out certs/server.csr \
  -subj "/CN=localhost"
openssl x509 -req -in certs/server.csr -CA certs/ca.crt -CAkey certs/ca.key \
  -CAcreateserial -out certs/server.crt -days 365

# Client certificate
openssl genrsa -out certs/client.key 4096
openssl req -new -key certs/client.key -out certs/client.csr \
  -subj "/CN=subtext-client"
openssl x509 -req -in certs/client.csr -CA certs/ca.crt -CAkey certs/ca.key \
  -CAcreateserial -out certs/client.crt -days 365

echo "Certificates generated in ./certs/"
```

---

### **1.2 Authentication & Authorization**

```go
// internal/auth/jwt.go
package auth

import (
    "context"
    "time"

    "github.com/golang-jwt/jwt/v5"
    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/metadata"
    "google.golang.org/grpc/status"
)

// Claims structure
type Claims struct {
    UserID    string   `json:"user_id"`
    Tier      string   `json:"tier"` // free, pro, enterprise
    RateLimit int      `json:"rate_limit"`
    jwt.RegisteredClaims
}

var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

// GenerateToken for new users
func GenerateToken(userID string, tier string) (string, error) {
    claims := Claims{
        UserID: userID,
        Tier:   tier,
        RateLimit: getRateLimit(tier),
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(jwtSecret)
}

// UnaryServerInterceptor validates JWT for gRPC
func UnaryServerInterceptor() grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        // Skip auth for health checks
        if info.FullMethod == "/health.Health/Check" {
            return handler(ctx, req)
        }

        md, ok := metadata.FromIncomingContext(ctx)
        if !ok {
            return nil, status.Error(codes.Unauthenticated, "missing metadata")
        }

        token := extractToken(md)
        claims, err := validateToken(token)
        if err != nil {
            return nil, status.Error(codes.Unauthenticated, err.Error())
        }

        // Add claims to context
        ctx = context.WithValue(ctx, "claims", claims)
        return handler(ctx, req)
    }
}

// Rate limit by tier
func getRateLimit(tier string) int {
    switch tier {
    case "enterprise":
        return 1000 // req/sec
    case "pro":
        return 100
    default:
        return 10 // free tier
    }
}
```

---

### **1.3 Secrets Management**

```yaml
# kubernetes/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: subtextd-secrets
type: Opaque
stringData:
  stripe-secret-key: "sk_live_..."
  jwt-secret: "super-secret-jwt-key-change-in-production"
  encryption-key: "32-byte-encryption-key-here"
  anthropic-key: "sk-ant-..."
  openai-key: "sk-..."
```

**Access in Go:**
```go
// internal/secrets/kubernetes.go
package secrets

import (
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

// LoadFromK8s fetches secrets from Kubernetes
func LoadFromK8s(secretName string) (map[string]string, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    secret, err := clientset.CoreV1().Secrets("default").Get(context.TODO(), secretName, metav1.GetOptions{})
    if err != nil {
        return nil, err
    }

    result := make(map[string]string)
    for k, v := range secret.Data {
        result[k] = string(v)
    }
    return result, nil
}
```

---

## **2. Reliability & Observability**

### **2.1 Health Checks & Readiness Probes**

```go
// internal/health/service.go
package health

import (
    "context"
    "net/http"

    "google.golang.org/grpc/health/grpc_health_v1"
)

type Service struct {
    checks map[string]Checker
    mu     sync.RWMutex
}

type Checker func(ctx context.Context) error

// RegisterCheck adds a component health check
func (s *Service) RegisterCheck(name string, check Checker) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.checks[name] = check
}

// Check implements gRPC health check
func (s *Service) Check(ctx context.Context, req *grpc_health_v1.HealthCheckRequest) (*grpc_health_v1.HealthCheckResponse, error) {
    if req.Service == "" {
        // Overall health
        return s.checkAll(ctx)
    }

    // Specific service health
    s.mu.RLock()
    check, exists := s.checks[req.Service]
    s.mu.RUnlock()

    if !exists {
        return nil, status.Error(codes.NotFound, "service not found")
    }

    if err := check(ctx); err != nil {
        return &grpc_health_v1.HealthCheckResponse{
            Status: grpc_health_v1.HealthCheckResponse_NOT_SERVING,
        }, nil
    }

    return &grpc_health_v1.HealthCheckResponse{
        Status: grpc_health_v1.HealthCheckResponse_SERVING,
    }, nil
}

func (s *Service) checkAll(ctx context.Context) (*grpc_health_v1.HealthCheckResponse, error) {
    s.mu.RLock()
    checks := s.checks
    s.mu.RUnlock()

    for name, check := range checks {
        if err := check(ctx); err != nil {
            logger.With("service", name).Errorf("Health check failed: %v", err)
            return &grpc_health_v1.HealthCheckResponse{
                Status: grpc_health_v1.HealthCheckResponse_NOT_SERVING,
            }, nil
        }
    }

    return &grpc_health_v1.HealthCheckResponse{
        Status: grpc_health_v1.HealthCheckResponse_SERVING,
    }, nil
}
```

**Register health checks in main.go:**
```go
healthSvc := health.NewService()

// Register component checks
healthSvc.RegisterCheck("audio", func(ctx context.Context) error {
    return audioService.Ping()
})

healthSvc.RegisterCheck("models", func(ctx context.Context) error {
    return orchestrator.ValidateModels()
})

// Add to gRPC server
grpc_health_v1.RegisterHealthServer(grpcServer, healthSvc)
```

---

### **2.2 Circuit Breaker for Cloud Calls**

```go
// internal/cloud/circuit.go
package cloud

import (
    "errors"
    "sync"
    "time"

    "github.com/sony/gobreaker"
)

// CloudClient with circuit breaker
type Client struct {
    anthropicBreaker *gobreaker.CircuitBreaker
    openaiBreaker    *gobreaker.CircuitBreaker
}

func NewClient() *Client {
    settings := gobreaker.Settings{
        Name:        "anthropic",
        MaxRequests: 3,                    // Half-open state max requests
        Interval:    10 * time.Second,    // Reset closed->open after this
        Timeout:     30 * time.Second,    // Open->half-open after this
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            return counts.ConsecutiveFailures > 5
        },
        OnStateChange: func(name string, from, to gobreaker.State) {
            logger.With("circuit", name).Infof("State change: %v -> %v", from, to)
        },
    }

    return &Client{
        anthropicBreaker: gobreaker.NewCircuitBreaker(settings),
    }
}

func (c *Client) CallAnthropic(ctx context.Context, prompt string) (string, error) {
    result, err := c.anthropicBreaker.Execute(func() (interface{}, error) {
        return actualAnthropicCall(ctx, prompt)
    })
    
    if err != nil {
        if errors.Is(err, gobreaker.ErrOpenState) {
            // Fallback to local LLM
            return localLLM.Generate(prompt, maxTokens=500), nil
        }
        return "", err
    }
    
    return result.(string), nil
}
```

---

### **2.3 Distributed Tracing with OpenTelemetry**

```go
// internal/tracing/tracer.go
package tracing

import (
    "context"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

// Init initializes Jaeger/OTLP exporter
func Init(serviceName string, otlpEndpoint string) (*trace.TracerProvider, error) {
    ctx := context.Background()

    // Create exporter
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint(otlpEndpoint),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    // Create resource
    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion("1.0.0"),
        ),
    )
    if err != nil {
        return nil, err
    }

    // Create tracer provider
    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithResource(res),
        trace.WithSampler(trace.TraceIDRatioBased(0.1)), // 10% sampling
    )

    otel.SetTracerProvider(tp)
    return tp, nil
}

// In servers, wrap handlers:
func (s *Server) StartListening(ctx context.Context, req *pb.StartRequest) (*pb.Status, error) {
    tracer := otel.Tracer("subtextd")
    ctx, span := tracer.Start(ctx, "StartListening")
    defer span.End()

    // ... implementation ...
    span.SetAttributes(attribute.Bool("success", true))
    return &pb.Status{Status: "listening"}, nil
}
```

**Deploy Jaeger:**
```yaml
# kubernetes/jaeger.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:1.52
        ports:
        - containerPort: 16686 # UI
        - containerPort: 14250 # gRPC
```

---

### **2.4 Structured Logging with Context**

```go
// internal/logger/structured.go
package logger

import (
    "context"

    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

type contextKey string

const requestIDKey contextKey = "request_id"
const userIDKey contextKey = "user_id"

// WithContext adds request-scoped fields
func WithContext(ctx context.Context) *zap.SugaredLogger {
    base := globalLogger.Desugar()
    
    if reqID := ctx.Value(requestIDKey); reqID != nil {
        base = base.With(zap.String("request_id", reqID.(string)))
    }
    
    if userID := ctx.Value(userIDKey); userID != nil {
        base = base.With(zap.String("user_id", userID.(string)))
    }
    
    return base.Sugar()
}

// Middleware for gRPC
func LoggingInterceptor() grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        start := time.Now()
        
        // Extract metadata
        if md, ok := metadata.FromIncomingContext(ctx); ok {
            if reqIDs := md.Get("x-request-id"); len(reqIDs) > 0 {
                ctx = context.WithValue(ctx, requestIDKey, reqIDs[0])
            }
        }
        
        // Log request
        logger := WithContext(ctx)
        logger.With("method", info.FullMethod).Info("RPC started")
        
        // Call handler
        resp, err := handler(ctx, req)
        
        // Log response
        duration := time.Since(start)
        logger.With(
            "duration_ms", duration.Milliseconds(),
            "error", err != nil,
        ).Info("RPC completed")
        
        return resp, err
    }
}
```

---

## **3. Deployment & Infrastructure**

### **3.1 Kubernetes Manifests**

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: subtextd
spec:
  replicas: 3
  selector:
    matchLabels:
      app: subtextd
  template:
    metadata:
      labels:
        app: subtextd
    spec:
      serviceAccountName: subtextd
      containers:
      - name: subtextd
        image: pasp/subtextd:latest
        ports:
        - containerPort: 8765
          name: grpc
        - containerPort: 8766
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: STRIPE_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: subtextd-secrets
              key: stripe-secret-key
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: subtextd-secrets
              key: jwt-secret
        volumeMounts:
        - name: models
          mountPath: /var/lib/subtextd/models
        - name: data
          mountPath: /var/lib/subtextd/data
        startupProbe:
          httpGet:
            path: /healthz
            port: 8766
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 6
        livenessProbe:
          grpc:
            port: 8765
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8766
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            cpu: "1000m"
            memory: "4Gi"
            nvidia.com/gpu: "1"  # GPU requirement
          limits:
            cpu: "4000m"
            memory: "8Gi"
            nvidia.com/gpu: "1"
      volumes:
      - name: models
        persistentVolumeClaim:
          claimName: subtextd-models-pvc
      - name: data
        persistentVolumeClaim:
          claimName: subtextd-data-pvc
---
# Service for internal gRPC
apiVersion: v1
kind: Service
metadata:
  name: subtextd-grpc
spec:
  selector:
    app: subtextd
  ports:
  - port: 8765
    targetPort: 8765
  clusterIP: None  # Headless for gRPC load balancing
---
# Ingress for HTTP/WebSocket
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: subtextd-ingress
  annotations:
    nginx.ingress.kubernetes.io/websocket-services: "subtextd-http"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.subtext.app
    secretName: subtextd-tls
  rules:
  - host: api.subtext.app
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: subtextd-http
            port:
              number: 8766
```

### **3.2 Horizontal Pod Autoscaler (HPA)**

```yaml
# kubernetes/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: subtextd-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: subtextd
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: subtext_phi_embedding_seconds
      target:
        type: AverageValue
        averageValue: "100m"  # 100ms p99 latency
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

---

### **3.3 Database Migrations**

```go
// internal/db/migrate.go
package db

import (
    "database/sql"
    "embed"

    "github.com/golang-migrate/migrate/v4"
    "github.com/golang-migrate/migrate/v4/database/postgres"
    "github.com/golang-migrate/migrate/v4/source/iofs"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func Migrate(databaseURL string) error {
    db, err := sql.Open("postgres", databaseURL)
    if err != nil {
        return err
    }

    driver, err := postgres.WithInstance(db, &postgres.Config{})
    if err != nil {
        return err
    }

    sourceDriver, err := iofs.New(migrationsFS, "migrations")
    if err != nil {
        return err
    }

    m, err := migrate.NewWithInstance(
        "iofs", sourceDriver,
        "postgres", driver,
    )
    if err != nil {
        return err
    }

    if err := m.Up(); err != nil && err != migrate.ErrNoChange {
        return err
    }

    return nil
}
```

**Migration example:**
```sql
-- migrations/001_create_users.sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    tier VARCHAR(20) NOT NULL DEFAULT 'free',
    token_balance DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tier ON users(tier);
```

---

## **4. Compliance & Governance**

### **4.1 Audit Logging**

```go
// internal/audit/logger.go
package audit

import (
    "encoding/json"
    "os"
    "time"
)

// AuditLogger writes immutable compliance logs
type Logger struct {
    file *os.File
}

// LogEvent records a non-repudiable audit event
func (l *Logger) LogEvent(eventType string, userID string, details interface{}) error {
    entry := AuditEntry{
        Timestamp:   time.Now().UTC(),
        EventType:   eventType,
        UserID:      userID,
        Details:     details,
        SourceIP:    getSourceIP(),
        UserAgent:   getUserAgent(),
    }

    // Sign the entry (for non-repudiation)
    signature, err := signEntry(entry)
    if err != nil {
        return err
    }
    entry.Signature = signature

    // Write to append-only log
    data, err := json.Marshal(entry)
    if err != nil {
        return err
    }

    _, err = l.file.WriteString(string(data) + "\n")
    if err != nil {
        return err
    }

    return l.file.Sync() // Ensure written to disk
}

type AuditEntry struct {
    Timestamp time.Time   `json:"timestamp"`
    EventType string      `json:"event_type"` // "cloud_call", "data_export", "model_download"
    UserID    string      `json:"user_id"`
    Details   interface{} `json:"details"`
    SourceIP  string      `json:"source_ip"`
    UserAgent string      `json:"user_agent"`
    Signature string      `json:"signature"` // HMAC-SHA256
}

// Required audit events
const (
    EventCloudCall    = "cloud_call"
    EventDataExport   = "data_export"
    EventModelDownload = "model_download"
    EventUserLogin    = "user_login"
    EventTokenPurchase = "token_purchase"
)
```

---

### **4.2 Data Retention Policy**

```go
// internal/retention/manager.go
package retention

import (
    "time"
)

// Manager enforces retention policies
type Manager struct {
    policies map[string]RetentionPolicy
}

type RetentionPolicy struct {
    DataType    string
    Duration    time.Duration
    Action      string // "delete", "anonymize", "archive"
}

// Default policies (GDPR/CCPA compliant)
var defaultPolicies = []RetentionPolicy{
    {DataType: "audio_buffer", Duration: 24 * time.Hour, Action: "delete"},
    {DataType: "phi_embedding", Duration: 7 * 24 * time.Hour, Action: "anonymize"},
    {DataType: "transcript", Duration: 30 * 24 * time.Hour, Action: "archive"},
    {DataType: "audit_log", Duration: 365 * 24 * time.Hour, Action: "archive"},
    {DataType: "cloud_request", Duration: 90 * 24 * time.Hour, Action: "delete"},
}

// Enforce runs retention policy for a user
func (m *Manager) Enforce(userID string) error {
    for _, policy := range m.policies {
        cutoff := time.Now().Add(-policy.Duration)
        
        switch policy.Action {
        case "delete":
            if err := m.deleteData(userID, policy.DataType, cutoff); err != nil {
                return err
            }
        case "anonymize":
            if err := m.anonymizeData(userID, policy.DataType, cutoff); err != nil {
                return err
            }
        case "archive":
            if err := m.archiveData(userID, policy.DataType, cutoff); err != nil {
                return err
            }
        }
    }
    return nil
}

// Run as cron job
func (m *Manager) StartCron() {
    ticker := time.NewTicker(24 * time.Hour)
    go func() {
        for range ticker.C {
            users := m.getAllUsers()
            for _, userID := range users {
                if err := m.Enforce(userID); err != nil {
                    logger.Errorf("Retention enforcement failed for %s: %v", userID, err)
                }
            }
        }
    }()
}
```

---

### **4.3 SOC 2 Controls**

```markdown
# security/soc2-controls.md

## CC6: Logical Access Controls

### Implementation Status

**1. Multi-Factor Authentication**
- [x] Enforce MFA for all admin access via Okta
- [x] Hardware tokens for production access (YubiKey)
- [ ] Customer MFA (GA target: Q3 2025)

**2. Least Privilege Access**
- [x] Service accounts with minimal permissions
- [x] AWS IAM roles for pods (IRSA)
- [ ] Quarterly access reviews (next: May 2025)

**3. Secrets Management**
- [x] HashiCorp Vault for secrets
- [x] Automatic rotation (30 days for API keys)
- [ ] Integration with subtextd (ETA: April 2025)

## CC7: System Operations

**1. Logging**
- [x] Structured JSON logs
- [x] Centralized to Datadog
- [x] 1-year retention (hot), 7-year (cold S3)

**2. Incident Response**
- [x] PagerDuty integration
- [x] Runbooks documented
- [x] Quarterly drills (last: Jan 2025)

**3. Change Management**
- [x] GitHub PR required
- [x] 2 approvals for core modules
- [x] Blue-green deployment
```

---

## **5. Performance & Optimization**

### **5.1 Benchmarking Suite**

```go
// test/bench/pipeline_test.go
package bench

import (
    "testing"
    "context"
    "time"
)

// BenchmarkFullPipeline measures end-to-end latency
func BenchmarkFullPipeline(b *testing.B) {
    // Setup
    orchestrator := models.NewOrchestrator()
    audio := generateTestAudio(64 * time.Millisecond)
    
    b.ResetTimer()
    
    for i := 0; i < b.N; i++ {
        // Measure full pipeline
        start := time.Now()
        
        phi, _ := orchestrator.InferJEPA(context.Background(), audio)
        text, _ := sttService.Transcribe(audio)
        annotations := annotator.GenerateAnnotations("w1", phi, nil)
        output.WriteSegment(&api.TranscriptSegment{
            ID: "bench", Text: text, Phi: phi, Annotations: annotations,
        })
        
        latency := time.Since(start)
        b.ReportMetric(float64(latency.Milliseconds()), "ms/op")
    }
}

// BenchmarkA2ATranslation measures translation overhead
func BenchmarkA2ATranslation(b *testing.B) {
    translator := translate.NewA2ATranslator(llm, privacy, context, 500)
    testPhi := api.PhiEmbedding{0.8, 0.2, 0.5, 0.9, 0.7}
    testText := "This stupid API is broken again!"
    
    b.ResetTimer()
    
    for i := 0; i < b.N; i++ {
        _, err := translator.Translate(testText, testPhi, api.TriggerEvent{
            Type: "send", AgentTarget: "claude",
        })
        if err != nil {
            b.Fatal(err)
        }
    }
}
```

**Run benchmarks:**
```bash
go test -bench=. -benchmem ./test/bench/ > bench.txt
```

---

### **5.2 GPU Optimization Guide**

```bash
# scripts/optimize-gpu.sh
#!/bin/bash

# NVIDIA GPU tuning for subtextd

# 1. Enable persistence mode
sudo nvidia-smi -pm 1

# 2. Set power limit to max (for Jetson, adjust accordingly)
sudo nvidia-smi -pl 250

# 3. Enable compute-exclusive mode (prevent other processes)
sudo nvidia-smi -c 3

# 4. Pin memory for faster transfers
echo "vm.zone_reclaim_mode = 1" | sudo tee -a /etc/sysctl.conf

# 5. Increase file descriptor limits
echo "* soft nofile 1048576" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 1048576" | sudo tee -a /etc/security/limits.conf

# 6. Disable SMT (if Intel)
echo off | sudo tee /sys/devices/system/cpu/smt/control

# 7. CPU governor to performance
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

echo "GPU optimizations applied. Reboot recommended."
```

---

### **5.3 Memory Profiling**

```go
// internal/debug/pprof.go
package debug

import (
    _ "net/http/pprof"
    "runtime"
)

// StartDebugServer exposes pprof endpoints
func StartDebugServer(addr string) {
    go func() {
        http.ListenAndServe(addr, nil)
    }()
}

// LogMemoryUsage periodically logs heap stats
func LogMemoryUsage(interval time.Duration) {
    ticker := time.NewTicker(interval)
    go func() {
        for range ticker.C {
            var m runtime.MemStats
            runtime.ReadMemStats(&m)
            
            logger.With(
                "alloc_mb", m.Alloc / 1024 / 1024,
                "sys_mb", m.Sys / 1024 / 1024,
                "gc_runs", m.NumGC,
            ).Info("Memory stats")
        }
    }()
}
```

**Profile during load test:**
```bash
# Terminal 1: Start daemon with debug
subtextd --debug-addr=:6060

# Terminal 2: Run load test
locust -f tests/load/pasp_load.py --host=http://localhost:8766

# Terminal 3: Capture heap profile
go tool pprof http://localhost:6060/debug/pprof/heap

# Generate flamegraph
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/profile?seconds=30
```

---

## **6. Production Runbook**

### **`docs/runbooks/oncall.md`**

```markdown
# On-Call Runbook

## Quick Reference

**Primary Oncall**: CTO (you)  
**Secondary**: ML Engineer  
**Escalation**: All engineers (P1 only)

**Tools**:
- PagerDuty: `subtext.app.pagerduty.com`
- Datadog: `app.datadoghq.com/dashboard/xyz`
- Grafana: `grafana.subtext.app`
- Logs: `datadog logs --service subtextd`

## Severity Levels

**P1 (Critical)**: System down, data breach, financial loss
- Response: < 5 minutes
- Action: Page immediately, start incident channel

**P2 (High)**: Degraded performance, partial outage
- Response: < 30 minutes
- Action: Slack #incidents, investigate

**P3 (Medium)**: Non-critical bug
- Response: < 4 hours
- Action: Jira ticket, address during work hours

## Common Incidents

### 1. GPU Memory Exhaustion

**Symptoms**:
- `CUDA_OUT_OF_MEMORY` errors in logs
- p99 latency spikes to > 500ms
- Models failing to load

**Immediate Actions**:
1. Check GPU usage: `kubectl exec -it <pod> -- nvidia-smi`
2. Restart pod: `kubectl delete pod <pod>`
3. HPA will replace automatically

**Fix**: Reduce model memory footprint via quantization or increase GPU memory.

### 2. Circuit Breaker Open (Cloud Unreachable)

**Symptoms**:
- `circuit breaker open` warnings
- Fallback to local LLM (degraded quality)
- Cloud cost drops to zero

**Actions**:
1. Verify cloud provider status (status.anthropic.com)
2. Check network: `kubectl exec -it <pod> -- curl https://api.anthropic.com`
3. If provider down, monitor; if network issue, restart pod

### 3. Phi-Embedding Drift

**Symptoms**:
- Annotations become "wrong" (users report inaccuracies)
- F1 score drops below 0.7

**Actions**:
1. Pause training: `subtextctl training pause`
2. Export corrections: `subtextctl corrections export`
3. Manual review of recent corrections
4. Rollback to previous model checkpoint
5. Retrain with corrected data

### 4. Token Balance Errors

**Symptoms**:
- Users unable to make cloud calls
- Stripe webhook failures

**Actions**:
1. Check Stripe dashboard for webhook failures
2. Verify webhook endpoint: `curl -X POST https://api.subtext.app/v1/stripe/webhook`
3. Replay failed webhooks from Stripe dashboard
4. Manually adjust balance if needed: `subtextctl admin adjust-balance <user> <amount>`

## Escalation

```
P1 detected
    ↓
Page oncall (you)
    ↓
If no ack in 5 min → Page secondary
    ↓
If no ack in 10 min → Page all engineers
    ↓
If no resolution in 1 hour → Executive escalation (CEO)
```

## Post-Incident Requirement

Within 24 hours of any P1/P2:
1. Write post-mortem (template in `docs/postmortem/template.md`)
2. Schedule review meeting
3. Create Jira tickets for action items
4. Update runbooks if needed
```

---

## **Final Production Readiness Checklist**

- [ ] **Security**: TLS/mTLS, JWT auth, secrets in Vault, encryption at rest
- [ ] **Observability**: Tracing, metrics, structured logs, alerts in PagerDuty
- [ ] **Reliability**: Health checks, circuit breakers, graceful degradations
- [ ] **Deployment**: Kubernetes manifests, HPA, blue-green deployment
- [ ] **Database**: PostgreSQL with migrations, retention policies
- [ ] **Compliance**: SOC 2 controls, audit logs, GDPR deletion
- [ ] **Performance**: Benchmarks, GPU optimization, memory profiling
- [ ] **Operations**: Runbooks, on-call rotation, incident response
- [ ] **Testing**: E2E tests, load tests, chaos engineering
- [ ] **Documentation**: API docs, SDKs, status page

**Timeline to Production**: **6-8 weeks** for a team of 3 engineers (you + ML + DevOps)

**Cost**: **$50K/month** at scale (AWS infra, cloud LLM, monitoring, on-call)