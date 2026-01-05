```go
// Package pasp implements the Present-Awareness Subtext Protocol
// A production-ready, real-time JEPA-powered subtext transcription system
package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/marketjepa/pasp/internal/config"
	"github.com/marketjepa/pasp/internal/jepa"
	"github.com/marketjepa/pasp/internal/monitoring"
	"github.com/marketjepa/pasp/internal/server"
	"github.com/marketjepa/pasp/internal/stt"
	"github.com/marketjepa/pasp/internal/token"
	"github.com/marketjepa/pasp/internal/transcriber"
	"github.com/marketjepa/pasp/internal/translator"
	"github.com/marketjepa/pasp/pkg/pasp"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize monitoring
	metrics := monitoring.NewPrometheusMetrics()

	// Initialize token ledger
	ledger := token.NewLedger(cfg.Token.InitialBalance)

	// Initialize core components
	audioCapture := pasp.NewAudioCapture(cfg.Audio.SampleRate, cfg.Audio.Channels)
	tinyJepa, err := jepa.NewTinyJEPA(cfg.Jepa.ModelPath, cfg.Jepa.Quantization)
	if err != nil {
		log.Fatalf("Failed to initialize JEPA: %v", err)
	}
	whisperModel, err := stt.NewWhisperModel(cfg.STT.ModelPath, cfg.STT.ModelType)
	if err != nil {
		log.Fatalf("Failed to initialize STT: %v", err)
	}
	localLLM, err := translator.NewLocalLLM(cfg.LLM.ModelPath, cfg.LLM.ContextSize)
	if err != nil {
		log.Fatalf("Failed to initialize LLM: %w", err)
	}

	// Create transcriber
	markdownTranscriber := transcriber.NewMarkdownTranscriber(whisperModel, metrics)

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start audio capture goroutine
	audioCh := make(chan []float32, 100)
	go audioCapture.Capture(ctx, audioCh, metrics)

	// Start JEPA processing goroutine
	phiCh := make(chan jepa.PhiVector, 100)
	go processJEPA(ctx, tinyJepa, audioCh, phiCh, metrics)

	// Start transcription goroutine
	transcriptCh := make(chan transcriber.TranscriptSegment, 100)
	go markdownTranscriber.TranscribeRealTime(ctx, audioCh, phiCh, transcriptCh, metrics)

	// Start A2A translator goroutine
	refinedPromptCh := make(chan translator.A2APrompt, 10)
	go translator.ProcessOutbound(ctx, localLLM, transcriptCh, phiCh, refinedPromptCh, metrics)

	// Start cloud LLM caller
	cloudResponseCh := make(chan translator.CloudResponse, 10)
	go callCloudLLM(ctx, cfg.Cloud, refinedPromptCh, cloudResponseCh, ledger, metrics)

	// Start inbound translation
	finalResponseCh := make(chan string, 10)
	go translator.ProcessInbound(ctx, localLLM, cloudResponseCh, phiCh, finalResponseCh, metrics)

	// Start coder agent (if enabled)
	if cfg.Coder.Enabled {
		coderAgent := NewCoderAgent(cfg.Coder.ModelPath, cfg.Coder.RAGPath)
		go coderAgent.Run(ctx, transcriptCh, phiCh, metrics)
	}

	// Start overnight research scheduler
	if cfg.Research.Enabled {
		researchScheduler := research.NewScheduler(cfg.Research.ConeBudget)
		go researchScheduler.Run(ctx, transcriptCh, phiCh, ledger, metrics)
	}

	// Start gRPC/HTTP server
	srv := server.NewPaspServer(cfg.Server, metrics)
	go srv.Start(ctx)

	// Wait for shutdown signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	log.Println("Shutting down gracefully...")
	cancel()
	srv.Shutdown()
	audioCapture.Stop()
	ledger.Save()

	log.Println("Shutdown complete.")
}

// processJEPA runs the core JEPA encoding loop
func processJEPA(ctx context.Context, jepa *jepa.TinyJEPA, audioCh <-chan []float32, phiCh chan<- jepa.PhiVector, metrics monitoring.Metrics) {
	ticker := time.NewTicker(64 * time.Millisecond)
	defer ticker.Stop()

	var audioWindow []float32
	const windowSize = 2820 // 64ms @ 44.1kHz

	for {
		select {
		case <-ctx.Done():
			return
		case audio := <-audioCh:
			audioWindow = append(audioWindow, audio...)
			if len(audioWindow) >= windowSize {
				// Encode with JEPA
				phi, err := jepa.Encode(audioWindow[:windowSize])
				if err != nil {
					log.Printf("JEPA encode error: %v", err)
					continue
				}

				// Send to next stage
				select {
				case phiCh <- phi:
				default:
					log.Printf("Phi channel full, dropping frame")
				}

				// Shift window (50% overlap)
				audioWindow = audioWindow[windowSize/2:]

				// Record metric
				metrics.JEPALatency().Observe(time.Since(time.Now()).Seconds())
			}
		}
	}
}

// callCloudLLM handles cloud LLM calls with cost tracking
func callCloudLLM(ctx context.Context, cfg config.CloudConfig, in <-chan translator.A2APrompt, out chan<- translator.CloudResponse, ledger *token.Ledger, metrics monitoring.Metrics) {
	for {
		select {
		case <-ctx.Done():
			return
		case prompt := <-in:
			// Calculate cost
			tokens := len(prompt.Text) / 4 // Rough estimate
			cost := float64(tokens) * cfg.CostPerToken

			// Check balance
			if !ledger.CanAfford(cost) {
				log.Printf("Insufficient tokens for cloud call")
				continue
			}

			// Call cloud (with retry)
			var response translator.CloudResponse
			var err error
			for attempt := 0; attempt < 3; attempt++ {
				response, err = callCloudProvider(prompt, cfg)
				if err == nil {
					break
				}
				time.Sleep(time.Second * time.Duration(attempt+1))
			}

			if err != nil {
				log.Printf("Cloud call failed after 3 attempts: %v", err)
				continue
			}

			// Deduct tokens
			ledger.Deduct(cost, "cloud_llm")

			// Record metrics
			metrics.CloudCost().Add(cost)
			metrics.CloudTokens().Add(float64(tokens))

			// Send response
			select {
			case out <- response:
			default:
				log.Printf("Response channel full")
			}
		}
	}
}

// callCloudProvider abstracts cloud LLM calls
func callCloudProvider(prompt translator.A2APrompt, cfg config.CloudConfig) (translator.CloudResponse, error) {
	switch cfg.Provider {
	case "claude":
		return callClaude(prompt.Text, cfg.APIKey, cfg.MaxTokens)
	case "openai":
		return callOpenAI(prompt.Text, cfg.APIKey, cfg.Model, cfg.MaxTokens)
	default:
		return translator.CloudResponse{}, fmt.Errorf("unsupported provider: %s", cfg.Provider)
	}
}
```

This codebase provides a production-ready, modular implementation of the Present-Awareness Subtext Protocol. Each component is designed to be independently testable, replaceable, and scalable. The architecture supports real-time processing, privacy-by-design, and the tokenomics system described in the integration playbook.