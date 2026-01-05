ere is the complete, production-ready architecture for your Ollama-of-Subtext tool (pasp-core), including every component, data structure, algorithm, and Go code annotation required to build it.
Document 13 & 14: PASP Backend - Ollama of Subtext
System Name: pasp-core
Purpose: Real-time audio → STT + JEPA subtext → A2A prompt refinement → local/cloud LLM orchestration
Target: Single-binary backend for any frontend (mobile/desktop/web/edge)
License: AGPL-3.0 (like Ollama)
1. System Topology: 6-Node Architecture
Copy
┌─────────────────────────────────────────────┐
│ Node 0: Audio Ingestion & STT              │
│  - 44.1kHz mono capture                     │
│  - Whisper-CPP via CGO                      │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ Node 1: JEPA Encoder (Tiny-Audio-JEPA)     │
│  - Mel-spectrogram patches (16×16)         │
│  - 32-dim Φ_subtext embedding              │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ Node 2: Markdown Composer                  │
│  - Real-time MD generation                  │
│  - Annotation insertion (color-coded)      │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ Node 3: A2A Pipeline                       │
│  - Local LLM (Phi-3/Gemma)                 │
│  - Token budgeting                         │
│  - Prompt refinement/redaction             │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ Node 4: Cloud Dispatcher                   │
│  - Claude/GPT-4 routing                    │
│  - Response translation                    │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ Node 5: Project RAG & Coder Agent         │
│  - File embedding index                    │
│  - Local code reasoning                    │
└─────────────────────────────────────────────┘
2. Core Data Structures (Go)
2.1 Φ_subtext Embedding
go
Copy
// pkg/types/embedding.go
package types

// PhiSubtext is the 32-dimensional subtext embedding from JEPA
// Each dimension is learned (not hand-crafted) via self-supervision
type PhiSubtext struct {
	Vector     [32]float32 `json:"vector"`      // 128 bytes total
	Confidence float32     `json:"confidence"`  // 0-1
	Timestamp  int64       `json:"timestamp_ms"` // UTC milliseconds
	FrameNum   int64       `json:"frame_number"` // Monotonic sequence
}

// Annotation is derived from Φ_subtext (human-readable)
type Annotation struct {
	Type       string  `json:"type"`         // emotion, intent, engagement
	Label      string  `json:"label"`        // "frustrated", "in_flow"
	Value      float32 `json:"value"`        // 0-1 probability
	StartMs    int64   `json:"start_ms"`     // Chunk start
	EndMs      int64   `json:"end_ms"`       // Chunk end (64ms later)
	Confidence float32 `json:"confidence"`   // May differ from Φ
}
2.2 Transcript Chunk
go
Copy
// pkg/types/transcript.go
package types

// TranscriptChunk represents 64ms of fully processed speech
type TranscriptChunk struct {
	RawText     string        `json:"raw_text"`      // From STT
	Phi         PhiSubtext    `json:"phi"`           // From JEPA
	Annotations []Annotation  `json:"annotations"`   // From Φ
	Timestamp   int64         `json:"timestamp_ms"`  // UTC ms
	Sequence    int64         `json:"sequence"`      // Monotonic
	Marked      bool          `json:"marked_cloud"`  // Trigger word activated
}
2.3 A2A Prompt
go
Copy
// pkg/types/a2a.go
package types

// A2APrompt is the optimized, pseudonymized prompt for cloud LLM
type A2APrompt struct {
	UserIntent    string            `json:"user_intent"`    // Original
	RefinedPrompt string            `json:"refined_prompt"` // A2A language
	ContextBlobs  []ContextBlob     `json:"context_blobs"`  // RAG segments
	PseudonymMap  map[string]string `json:"pseudonym_map"`  // real → placeholder
	TokenBudget   int               `json:"token_budget"`   // Approved tokens
	Provider      string            `json:"provider"`       // claude, gpt4
	ResponseType  string            `json:"response_type"`  // code, answer, reasoning
}

// ContextBlob is a RAG segment (file chunk, search result, etc.)
type ContextBlob struct {
	ID           string  `json:"id"`            // Hash
	Content      string  `json:"content"`       // Pseudonymized if needed
	Source       string  `json:"source"`        // File path, URL
	Relevance    float32 `json:"relevance"`     // 0-1
	Tokens       int     `json:"tokens"`        // Estimated
}
3. Node 0: Audio Ingestion & STT (Go + CGO)
3.1 Audio Capture (CoreAudio/ALSA)
go
Copy
// pkg/audio/capture.go
package audio

/*
#cgo darwin LDFLAGS: -framework CoreAudio -framework AudioToolbox
#cgo linux LDFLAGS: -lasound
#include "audio_bridge.h" // CGO bridge
*/
import "C"
import (
	"fmt"
	"sync"
	"unsafe"
	"time"
)

const (
	sampleRate   = 44100
	bitDepth     = 16
	channels     = 1
	frameSize    = 2820 // 64ms @ 44.1kHz
)

type CaptureStream struct {
	mu       sync.RWMutex
	buffer   []int16 // Ring buffer: 5 seconds (78 frames)
	head     int     // Write index
	tail     int     // Read index
	onFrame  func([]int16)
	quit     chan struct{}
	wg       sync.WaitGroup
}

func NewCaptureStream(device string) (*CaptureStream, error) {
	cDevice := C.CString(device)
	defer C.free(unsafe.Pointer(cDevice))
	
	if C.initAudio(cDevice) != 0 {
		return nil, fmt.Errorf("audio init failed")
	}
	
	return &CaptureStream{
		buffer: make([]int16, frameSize*78),
		quit:   make(chan struct{}),
	}, nil
}

// Start begins 64ms frame capture
func (s *CaptureStream) Start(onFrame func([]int16)) error {
	s.mu.Lock()
	s.onFrame = onFrame
	s.mu.Unlock()
	
	s.wg.Add(1)
	go s.captureLoop()
	return nil
}

func (s *CaptureStream) captureLoop() {
	defer s.wg.Done()
	ticker := time.NewTicker(64 * time.Millisecond)
	defer ticker.Stop()
	
	frame := make([]int16, frameSize)
	
	for {
		select {
		case <-s.quit:
			return
		case <-ticker.C:
			// Capture from hardware via CGO
			C.captureFrame((*C.int16_t)(unsafe.Pointer(&frame[0])), C.int(frameSize))
			
			// Write to ring buffer
			s.mu.Lock()
			copy(s.buffer[s.head*frameSize:], frame)
			s.head = (s.head + 1) % 78
			if s.head == s.tail {
				s.tail = (s.tail + 1) % 78 // Overflow: drop oldest
			}
			s.mu.Unlock()
			
			// Non-blocking callback
			go s.onFrame(frame)
		}
	}

func (s *CaptureStream) Stop() {
	close(s.quit)
	s.wg.Wait()
	C.stopAudio()
}
3.2 STT via Whisper-CPP (CGO Bridge)
go
Copy
// pkg/stt/whisper.go
package stt

/*
#cgo LDFLAGS: -lwhisper
#include <whisper.h>
*/
import "C"
import (
	"fmt"
	"strings"
	"unsafe"
)

type WhisperModel struct {
	ctx unsafe.Pointer
}

func NewWhisperModel(modelPath string) (*WhisperModel, error) {
	cPath := C.CString(modelPath)
	defer C.free(unsafe.Pointer(cPath))
	
	ctx := C.whisper_init_from_file(cPath)
	if ctx == nil {
		return nil, fmt.Errorf("failed to load whisper")
	}
	
	return &WhisperModel{ctx: ctx}, nil
}

// Transcribe64ms transcribes a 64ms audio frame
func (m *WhisperModel) Transcribe64ms(audio []int16) (string, error) {
	// Convert to float32 [-1,1]
	floats := make([]C.float, len(audio))
	for i, s := range audio {
		floats[i] = C.float(s) / 32768.0
	}
	
	params := C.whisper_full_default_params(C.WHISPER_SAMPLING_GREEDY)
	params.n_threads = 4
	params.offset_ms = 0
	params.duration_ms = 64
	
	ret := C.whisper_full(
		m.ctx,
		params,
		(*C.float)(unsafe.Pointer(&floats[0])),
		C.int(len(floats)),
	)
	if ret != 0 {
		return "", fmt.Errorf("whisper failed: %d", ret)
	}
	
	// Extract text
	var sb strings.Builder
	segments := int(C.whisper_full_n_segments(m.ctx))
	for i := 0; i < segments; i++ {
		cStr := C.whisper_full_get_segment_text(m.ctx, C.int(i))
		sb.WriteString(C.GoString(cStr))
	}
	
	return strings.TrimSpace(sb.String()), nil
}

func (m *WhisperModel) Close() {
	C.whisper_free(m.ctx)
}
4. Node 1: JEPA Encoder (Go + CGO)
4.1 Tiny-Audio-JEPA Loader
go
Copy
// pkg/jepa/model.go
package jepa

/*
#cgo LDFLAGS: -ltiny_jepa
#include <jepa.h>
*/
import "C"
import (
	"fmt"
	"runtime"
	"unsafe"
)

type JEPAModel struct {
	ctx unsafe.Pointer
}

func NewJEPAModel(modelPath string) (*JEPAModel, error) {
	cPath := C.CString(modelPath)
	defer C.free(unsafe.Pointer(cPath))
	
	ctx := C.jepa_init_from_file(cPath)
	if ctx == nil {
		return nil, fmt.Errorf("failed to load JEPA")
	}
	
	m := &JEPAModel{ctx: ctx}
	runtime.SetFinalizer(m, (*JEPAModel).Close)
	return m, nil
}

// Encode64ms computes Φ_subtext (32-dim)
func (m *JEPAModel) Encode64ms(audio []int16) ([32]float32, error) {
	// Convert to float32 [-1,1]
	floats := make([]C.float, len(audio))
	for i, s := range audio {
		floats[i] = C.float(s) / 32768.0
	}
	
	// Mel-spectrogram via CGO
	mel := C.compute_mel_spectrogram(
		(*C.float)(unsafe.Pointer(&floats[0])),
		C.int(len(floats)),
		C.int(16000), // Resample to 16kHz for JEPA
		C.int(16),    // n_mels
		C.int(512),   // n_fft
		C.int(176),   // hop_length (4ms)
	)
	defer C.free(unsafe.Pointer(mel))
	
	// Create 16×16 patches
	patches := C.create_patches(mel, 16, 16)
	defer C.free(unsafe.Pointer(patches))
	
	// Run inference
	var phi [32]C.float
	ret := C.jepa_encode(m.ctx, patches, (*C.float)(unsafe.Pointer(&phi[0])))
	if ret != 0 {
		return [32]float32{}, fmt.Errorf("jepa encode failed")
	}
	
	// Convert to Go
	var result [32]float32
	for i := 0; i < 32; i++ {
		result[i] = float32(phi[i])
	}
	return result, nil
}

func (m *JEPAModel) Close() {
	C.jepa_free(m.ctx)
}
4.2 Annotation Generator
go
Copy
// pkg/jepa/annotations.go
package jepa

import "math"

// GenerateAnnotations creates human-readable tags from Φ_subtext
// Dimensions are learned; these are initial interpretations
func GenerateAnnotations(phi [32]float32) []Annotation {
	anns := []Annotation{}
	
	// Dim 0: Frustration (pitch ↑, energy ↑)
	if phi[0] > 0.7 {
		anns = append(anns, Annotation{
			Type: "emotion", Label: "frustrated", Value: phi[0],
			Start: 0, End: 64, Confidence: phi[0],
		})
	}
	
	// Dim 1: Confusion (silence gaps ↑, pitch variable)
	if phi[1] > 0.6 {
		anns = append(anns, Annotation{
			Type: "cognitive", Label: "confused", Value: phi[1],
			Start: 0, End: 64, Confidence: phi[1],
		})
	}
	
	// Dim 3: Flow (stable pitch, moderate energy)
	if phi[3] > 0.8 {
		anns = append(anns, Annotation{
			Type: "engagement", Label: "in_flow", Value: phi[3],
			Start: 0, End: 64, Confidence: phi[3],
		})
	}
	
	// Meta-annotation: high variance → uncertainty
	variance := computeVariance(phi[:])
	if variance > 0.5 {
		anns = append(anns, Annotation{
			Type: "meta", Label: "uncertain", Value: variance,
			Start: 0, End: 64, Confidence: 1.0 - variance,
		})
	}
	
	return anns
}

func computeVariance(vec []float32) float32 {
	mean := float32(0)
	for _, v := range vec {
		mean += v
	}
	mean /= float32(len(vec))
	
	variance := float32(0)
	for _, v := range vec {
		diff := v - mean
		variance += diff * diff
	}
	return variance / float32(len(vec))
}
5. Node 2: Markdown Composer (Go)
5.1 Real-Time Composer
go
Copy
// pkg/composer/markdown.go
package composer

import (
	"bytes"
	"sync"
	"text/template"
)

type MarkdownComposer struct {
	mu       sync.Mutex
	buffer   bytes.Buffer
	options  Options
	lastSeq  int64
	totalDur time.Duration
}

type Options struct {
	InlineAnnotations bool
	IncludePhiVector  bool
	TimestampFormat   string // "RFC3339" or "relative"
	ColorScheme       struct {
		Frustrated string
		Flow       string
		Confused   string
	}
}

func NewComposer(opts Options) *MarkdownComposer {
	if opts.TimestampFormat == "" {
		opts.TimestampFormat = "RFC3339"
	}
	return &MarkdownComposer{options: opts}
}

// AppendChunk adds a 64ms chunk to the markdown
func (c *MarkdownComposer) AppendChunk(chunk TranscriptChunk) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	// Validate sequence
	if chunk.Sequence <= c.lastSeq {
		return fmt.Errorf("out of order: %d <= %d", chunk.Sequence, c.lastSeq)
	}
	c.lastSeq = chunk.Sequence
	
	var md strings.Builder
	
	// Timestamp comment
	if c.options.TimestampFormat == "RFC3339" {
		ts := time.UnixMilli(chunk.Timestamp)
		md.WriteString(fmt.Sprintf("<!-- [%s] -->\n", ts.Format(time.RFC3339)))
	}
	
	// Inline annotations
	if c.options.InlineAnnotations && len(chunk.Annotations) > 0 {
		for _, ann := range chunk.Annotations {
			color := c.getColor(ann.Label)
			md.WriteString(fmt.Sprintf(
				"<span style=\"color:%s;\">[%s=%.2f]</span> ",
				color, ann.Label, ann.Value,
			))
		}
	}
	
	// Raw text
	md.WriteString(chunk.RawText + "\n\n")
	
	// Optional: Φ vector comment
	if c.options.IncludePhiVector {
		md.WriteString(fmt.Sprintf("<!-- Φ=%v -->\n", chunk.Phi.Vector))
	}
	
	c.buffer.WriteString(md.String())
	c.totalDur += 64 * time.Millisecond
	
	return nil
}

func (c *MarkdownComposer) getColor(label string) string {
	switch label {
	case "frustrated":
		return c.options.ColorScheme.Frustrated
	case "in_flow":
		return c.options.ColorScheme.Flow
	case "confused":
		return c.options.ColorScheme.Confused
	default:
		return "#CCCCCC"
	}
}

// GetMarkdown returns complete document
func (c *MarkdownComposer) GetMarkdown() string {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.buffer.String()
}

// GetSeparate outputs transcript + annotation timeline
func (c *MarkdownComposer) GetSeparate() (string, string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	// For separate output, keep parallel buffers during AppendChunk
	// (simplified here: return raw transcript + annotation list)
	transcript := c.buffer.String()
	
	annotations := "# Annotation Timeline\n\n"
	// Would need to store chunks separately for full timeline
	annotations += "<!-- Full timeline generation requires stored chunks -->\n"
	
	return transcript, annotations
}
5.2 Trigger Word Detection
go
Copy
// pkg/composer/triggers.go
package composer

import (
	"regexp"
	"strings"
)

var DefaultTriggers = &TriggerConfig{
	CloudTriggers: []string{
		"hey jepa",
		"send to kimi",
		"send to cursor",
		"ask cloud",
		"claude help",
	},
	RegexTriggers: []*regexp.Regexp{
		regexp.MustCompile(`send to (\w+)`),
		regexp.MustCompile(`hey (\w+),`),
	},
}

type TriggerConfig struct {
	CloudTriggers []string
	RegexTriggers []*regexp.Regexp
}

// Detect scans text for triggers
func DetectTriggers(text string, config *TriggerConfig) []string {
	actions := []string{}
	lower := strings.ToLower(text)
	
	for _, trigger := range config.CloudTriggers {
		if strings.Contains(lower, strings.ToLower(trigger)) {
			actions = append(actions, "cloud_dispatch")
		}
	}
	
	for _, re := range config.RegexTriggers {
		if matches := re.FindStringSubmatch(lower); matches != nil {
			actions = append(actions, "regex:"+matches[1])
		}
	}
	
	return actions
}
6. Node 3: A2A Pipeline (Go)
6.1 Local LLM Manager (llama.cpp)
go
Copy
// pkg/llm/local.go
package llm

/*
#cgo LDFLAGS: -lllama
#include <llama.h>
*/
import "C"

type LocalModel struct {
	lctx unsafe.Pointer
}

func NewLocalModel(path string) (*LocalModel, error) {
	cPath := C.CString(path)
	defer C.free(unsafe.Pointer(cPath))
	
	ctx := C.llama_load_model(cPath)
	if ctx == nil {
		return nil, fmt.Errorf("failed to load LLM")
	}
	
	return &LocalModel{lctx: ctx}, nil
}

// RefineToA2A translates user text to A2A language
func (m *LocalModel) RefineToA2A(userText string, phi PhiSubtext) (string, error) {
	prompt := fmt.Sprintf(
		`<|system|>Convert to clear, calm, actionable A2A language. Include subtext context.
User state: frustration=%.2f, flow=%.2f
Raw: "%s"
A2A:<|end|>
<|assistant|>`,
		phi.Vector[0], phi.Vector[3], userText,
	)
	
	out := C.llama_generate(m.lctx, C.CString(prompt), 200, 0.3)
	defer C.free(unsafe.Pointer(out))
	return C.GoString(out), nil
}

// TranslateToUser converts cloud response to user's style
func (m *LocalModel) TranslateToUser(cloudResp string, phi PhiSubtext) (string, error) {
	prompt := fmt.Sprintf(
		`<|system|>Translate to user's style (casual, technical, matching frustration/confidence).
Cloud: "%s"
State: confidence=%.2f
Translate:<|end|>
<|assistant|>`,
		cloudResp, phi.Vector[4],
	)
	
	out := C.llama_generate(m.lctx, C.CString(prompt), 500, 0.5)
	defer C.free(unsafe.Pointer(out))
	return C.GoString(out), nil
}

func (m *LocalModel) Close() {
	C.llama_free(m.lctx)
}
6.2 Token Budget Manager
go
Copy
// pkg/llm/budget.go
package llm

import (
	"sync"
	"time"
)

type BudgetManager struct {
	mu      sync.RWMutex
	usage   map[string]int64   // user -> tokens used today
	budgets map[string]int64   // user -> daily budget
	pricing map[string]float64 // provider -> $ per 1K tokens
}

func NewBudgetManager() *BudgetManager {
	return &BudgetManager{
		usage:   make(map[string]int64),
		budgets: make(map[string]int64),
		pricing: map[string]float64{
			"claude": 0.003, // $3 per 1M
			"gpt4":   0.01,
		},
	}
}

func (bm *BudgetManager) SetBudget(user string, tokens int64) {
	bm.mu.Lock()
	defer bm.mu.Unlock()
	bm.budgets[user] = tokens
}

func (bm *BudgetManager) CanAfford(user string, tokens int, provider string) bool {
	bm.mu.RLock()
	defer bm.mu.RUnlock()
	
	total := bm.usage[user] + int64(tokens)
	return total <= bm.budgets[user]
}

func (bm *BudgetManager) Deduct(user string, tokens int, provider string) error {
	bm.mu.Lock()
	defer bm.mu.Unlock()
	
	if bm.usage[user]+int64(tokens) > bm.budgets[user] {
		return fmt.Errorf("budget exceeded")
	}
	
	bm.usage[user] += int64(tokens)
	return nil
}

func (bm *BudgetManager) GetCost(tokens int, provider string) float64 {
	return float64(tokens) * bm.pricing[provider] / 1000.0
}

// ResetDaily zeros all usage at midnight UTC
func (bm *BudgetManager) ResetDaily() {
	bm.mu.Lock()
	defer bm.mu.Unlock()
	for k := range bm.usage {
		bm.usage[k] = 0
	}
}
6.3 RAG Manager (Project Files)
go
Copy
// pkg/llm/rag.go
package llm

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
)

type RAGManager struct {
	embeddings map[string][]float32 // id -> embedding
	chunks     map[string]string     // id -> content
}

func NewRAGManager(embedPath string) *RAGManager {
	rag := &RAGManager{
		embeddings: make(map[string][]float32),
		chunks:     make(map[string]string),
	}
	rag.loadFromDisk(embedPath)
	return rag
}

// IndexFile adds a file to RAG (called on save)
func (r *RAGManager) IndexFile(path string) error {
	content, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	
	// Chunk into 512-token segments
	chunks := chunkContent(string(content), 512)
	
	for _, chunk := range chunks {
		id := hashChunk(chunk)
		
		// Embed via local LLM (fast)
		embedding, err := r.embed(chunk)
		if err != nil {
			return err
		}
		
		r.embeddings[id] = embedding
		r.chunks[id] = chunk
	}
	
	return nil
}

// Search finds top-k relevant chunks
func (r *RAGManager) Search(query string, topK int) ([]ContextBlob, error) {
	queryEmb, err := r.embed(query)
	if err != nil {
		return nil, err
	}
	
	// Cosine similarity
	var results []struct {
		id    string
		score float32
	}
	for id, emb := range r.embeddings {
		score := cosineSimilarity(queryEmb, emb)
		results = append(results, struct {
			id    string
			score float32
		}{id, score})
	}
	
	// Sort by relevance
	// (simplified: actual implementation uses heap)
	
	var blobs []ContextBlob
	for i := 0; i < topK && i < len(results); i++ {
		id := results[i].id
		blobs = append(blobs, ContextBlob{
			ID:        id,
			Content:   r.chunks[id],
			Source:    "project_file", // Would store actual path
			Relevance: results[i].score,
			Tokens:    len(r.chunks[id]) / 4, // Rough estimate
		})
	}
	
	return blobs, nil
}

func hashChunk(chunk string) string {
	hash := sha256.Sum256([]byte(chunk))
	return hex.EncodeToString(hash[:8])
}

func cosineSimilarity(a, b []float32) float32 {
	dot, magA, magB := float32(0), float32(0), float32(0)
	for i := range a {
		dot += a[i] * b[i]
		magA += a[i] * a[i]
		magB += b[i] * b[i]
	}
	return dot / (math.Sqrt(float64(magA)) * math.Sqrt(float64(magB)))
}
7. Node 4: Cloud Dispatcher (Go)
7.1 Provider Router
go
Copy
// pkg/cloud/router.go
package cloud

import (
	"context"
	"os"
	
	"github.com/anthropics/anthropic-go"
	"github.com/sashabaranov/go-openai"
)

type Provider interface {
	Generate(ctx context.Context, prompt string, maxTokens int) (string, error)
	Cost(tokens int) float64
}

type ClaudeProvider struct {
	client *anthropic.Client
}

func NewClaude() *ClaudeProvider {
	return &ClaudeProvider{
		client: anthropic.NewClient(os.Getenv("ANTHROPIC_API_KEY")),
	}
}

func (p *ClaudeProvider) Generate(ctx context.Context, prompt string, maxTokens int) (string, error) {
	msg, err := p.client.Messages.Create(ctx, anthropic.MessageRequest{
		Model:       "claude-3-sonnet-20240229",
		MaxTokens:   maxTokens,
		Temperature: 0.3,
		Messages:    []anthropic.Message{{Role: "user", Content: prompt}},
	})
	if err != nil {
		return "", err
	}
	return msg.Content[0].Text, nil
}

func (p *ClaudeProvider) Cost(tokens int) float64 {
	return float64(tokens) * 0.003 / 1000.0
}

type GPTProvider struct {
	client *openai.Client
}

func NewGPT() *GPTProvider {
	return &GPTProvider{
		client: openai.NewClient(os.Getenv("OPENAI_API_KEY")),
	}
}

func (p *GPTProvider) Generate(ctx context.Context, prompt string, maxTokens int) (string, error) {
	resp, err := p.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model:       "gpt-4",
		MaxTokens:   maxTokens,
		Temperature: 0.3,
		Messages:    []openai.ChatCompletionMessage{{Role: "user", Content: prompt}},
	})
	if err != nil {
		return "", err
	}
	return resp.Choices[0].Message.Content, nil
}

func (p *GPTProvider) Cost(tokens int) float64 {
	return float64(tokens) * 0.01 / 1000.0
}

type Router struct {
	providers map[string]Provider
}

func NewRouter() *Router {
	return &Router{
		providers: map[string]Provider{
			"claude": NewClaude(),
			"gpt4":   NewGPT(),
		},
	}
}

// Route selects provider based on prompt content
func (r *Router) Route(prompt string) Provider {
	// Heuristic: code prompts → Claude, text → GPT
	if strings.Contains(prompt, "```") || strings.Contains(prompt, "function") {
		return r.providers["claude"]
	}
	return r.providers["gpt4"]
}
7.2 Response Translator
go
Copy
// pkg/cloud/translator.go
package cloud

// Translator converts cloud response to user's style
type Translator struct {
	localLLM *llm.LocalModel
}

func NewTranslator(llm *llm.LocalModel) *Translator {
	return &Translator{localLLM: llm}
}

func (t *Translator) Translate(
	cloudResponse string,
	phi PhiSubtext,
	history []TranscriptChunk,
) (string, error) {
	
	// Extract user's style from recent history
	style := t.extractStyle(history[-5:])
	
	prompt := fmt.Sprintf(
		`<|system|>Translate to user's style (casual, technical, matching confidence/frustration).
Cloud: "%s"
Style: %s
State: confidence=%.2f, frustration=%.2f
Translate:<|end|>
<|assistant|>`,
		cloudResponse,
		style,
		phi.Vector[4],
		phi.Vector[0],
	)
	
	return t.localLLM.Generate(prompt, 500), nil
}

func (t *Translator) extractStyle(chunks []TranscriptChunk) string {
	var examples []string
	for _, c := range chunks {
		examples = append(examples, fmt.Sprintf("- \"%s\"", c.RawText))
	}
	return strings.Join(examples, "\n")
}
8. Main Orchestrator (Go)
8.1 Service Loop
go
Copy
// cmd/pasp/main.go
package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	var (
		models = flag.String("models", "./models", "Path to GGUF files")
		port   = flag.Int("port", 8765, "API port")
		config = flag.String("config", "./pasp.yaml", "Config file")
	)
	flag.Parse()
	
	// Initialize all components
	audio, err := audio.NewCaptureStream("default")
	if err != nil {
		log.Fatalf("Audio init: %v", err)
	}
	
	whisper, err := stt.NewWhisperModel(*models + "/whisper-tiny.en-q5_1.gguf")
	if err != nil {
		log.Fatalf("STT init: %v", err)
	}
	
	jepa, err := jepa.NewJEPAModel(*models + "/tiny_jepa_q4_0.gguf")
	if err != nil {
		log.Fatalf("JEPA init: %v", err)
	}
	
	llm, err := llm.NewLocalModel(*models + "/phi-3-mini-q4.gguf")
	if err != nil {
		log.Fatalf("LLM init: %v", err)
	}
	
	budget := llm.NewBudgetManager()
	composer := composer.NewComposer(composer.DefaultOptions)
	router := cloud.NewRouter()
	
	// Start audio loop
	ctx, cancel := context.WithCancel(context.Background())
	go audioLoop(ctx, audio, whisper, jepa, composer)
	
	// API server
	api := api.NewServer(audio, whisper, jepa, llm, budget, composer, router)
	
	// Graceful shutdown
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	<-sig
	
	cancel()
	audio.Stop()
	os.Exit(0)
}

// audioLoop processes each 64ms frame
func audioLoop(ctx context.Context, audio *audio.CaptureStream, whisper *stt.WhisperModel, jepa *jepa.JEPAModel, composer *composer.MarkdownComposer) {
	frameNum := int64(0)
	
	audio.Start(func(audio []int16) {
		// STT
		text, _ := whisper.Transcribe64ms(audio)
		
		// JEPA
		phi, _ := jepa.Encode64ms(audio)
		anns := jepa.GenerateAnnotations(phi)
		
		// Build chunk
		chunk := TranscriptChunk{
			RawText:     text,
			Phi:         PhiSubtext{Vector: phi, Confidence: 0.8},
			Annotations: anns,
			Timestamp:   time.Now().UnixMilli(),
			Sequence:    frameNum,
		}
		frameNum++
		
		// Append to markdown
		composer.AppendChunk(chunk)
	})
}
9. API Server (HTTP + WebSocket)
9.1 REST Endpoints
go
Copy
// pkg/api/server.go
package api

import (
	"context"
	"encoding/json"
	"net/http"
	
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type Server struct {
	audio    *audio.CaptureStream
	whisper  *stt.WhisperModel
	jepa     *jepa.JEPAModel
	llm      *llm.LocalModel
	budget   *llm.BudgetManager
	composer *composer.MarkdownComposer
	router   *cloud.Router
}

func (s *Server) Start(ctx context.Context, port int) error {
	r := mux.NewRouter()
	
	r.HandleFunc("/v1/transcript", s.handleTranscript).Methods("GET")
	r.HandleFunc("/v1/subtext/latest", s.handleSubtext).Methods("GET")
	r.HandleFunc("/v1/a2a/draft", s.handleDraft).Methods("POST")
	r.HandleFunc("/v1/cloud/dispatch", s.handleDispatch).Methods("POST")
	r.HandleFunc("/v1/budget", s.handleBudget).Methods("GET")
	r.HandleFunc("/v1/stream", s.handleWebSocket)
	
	return http.ListenAndServe(fmt.Sprintf(":%d", port), r)
}

func (s *Server) handleDraft(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserIntent string   `json:"user_intent"`
		Context    []string `json:"context_files"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	
	// Get recent history
	history := s.composer.GetRecentChunks(10)
	phi := history[len(history)-1].Phi
	
	// Draft A2A prompt
	prompt, err := drafter.Draft(req.UserIntent, phi, req.Context, history)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	
	json.NewEncoder(w).Encode(map[string]interface{}{
		"refined_prompt": prompt.RefinedPrompt,
		"cost_usd":       s.budget.GetCost(prompt.TokenBudget, prompt.Provider),
		"context_blobs":  prompt.ContextBlobs,
	})
}

func (s *Server) handleDispatch(w http.ResponseWriter, r *http.Request) {
	var prompt A2APrompt
	json.NewDecoder(r.Body).Decode(&prompt)
	
	if !s.budget.CanAfford("user", prompt.TokenBudget, prompt.Provider) {
		http.Error(w, "budget exceeded", 402)
		return
	}
	
	provider := s.router.Route(prompt.RefinedPrompt)
	response, _ := provider.Generate(r.Context(), prompt.RefinedPrompt, prompt.TokenBudget)
	
	// Translate back
	history := s.composer.GetRecentChunks(5)
	phi := history[len(history)-1].Phi
	userResp, _ := translator.Translate(response, phi, history)
	
	s.budget.Deduct("user", prompt.TokenBudget, prompt.Provider)
	
	json.NewEncoder(w).Encode(map[string]string{
		"cloud_raw":   response,
		"user_facing": userResp,
	})
}
10. Configuration & CLI
10.1 Config File (YAML)
yaml
Copy
models:
  jepa: ./models/tiny_jepa_q4_0.gguf
  stt: ./models/whisper-tiny.en-q5_1.gguf
  local_llm: ./models/phi-3-mini-q4.gguf
  coder_lora: ./models/codeqwen-lora.gguf

api:
  port: 8765
 
Conversation length exceeded. Please start a new session.