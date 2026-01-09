# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Advanced filtering options
- Hybrid search (keyword + semantic)
- Multi-language support
- WebGPU acceleration for similarity search
- Distributed vector search across browser tabs
- Automatic embedding model detection
- Vector quantization for compression

## [1.0.0] - 2026-01-08

### Added
- Initial release of @superinstance/in-browser-vector-search
- Privacy-first in-browser vector search engine
- Semantic similarity search with cosine similarity
- IndexedDB persistence for offline use
- Checkpoint system for data versioning
- Rollback capabilities to previous states
- LoRA training data export (JSONL format)
- Knowledge base management
- Vector storage and retrieval
- Text embedding support
- Batch operations for efficiency
- LRU cache for performance optimization
- Full TypeScript support with type definitions
- Comprehensive documentation and examples

### Features
- **Vector Search**
  - Semantic similarity search
  - Cosine similarity calculation
  - Nearest neighbor queries
  - Batch search operations

- **Data Persistence**
  - IndexedDB integration
  - Checkpoint system
  - Rollback to any checkpoint
  - Automatic data versioning

- **Knowledge Management**
  - Add, update, delete documents
  - Bulk import/export
  - Category management
  - Tag-based filtering

- **AI Training Support**
  - LoRA training data export
  - JSONL format export
  - Question-answer pairs
  - Fine-tuning data preparation

- **Performance**
  - LRU cache implementation
  - Optimized similarity calculations
  - Batch operations
  - Efficient memory usage

### Documentation
- Comprehensive README with installation guide
- API documentation for all methods
- TypeScript type definitions
- Usage examples for common scenarios
- Integration examples
- Performance optimization guide

### Security
- 100% local execution (no API calls)
- No data leaves the browser
- Privacy-first design
- No external dependencies for core functionality
- Secure data storage with IndexedDB

[Unreleased]: https://github.com/SuperInstance/In-Browser-Vector-Search/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/SuperInstance/In-Browser-Vector-Search/releases/tag/v1.0.0
