# Contributing to In-Browser Vector Search

First off, thank you for considering contributing to In-Browser Vector Search! It's people like you that make In-Browser Vector Search such a powerful tool for privacy-first semantic search.

## Code of Conduct

This project and everyone participating in it is governed by the In-Browser Vector Search Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [support@superinstance.github.io](mailto:support@superinstance.github.io).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find that the problem has already been reported. When you create a bug report, include as many details as possible:

**Provide a descriptive title**

**Describe the exact steps to reproduce the problem**
1. Go to '...'
2. Run '....'
3. Scroll down to '....'
4. See error

**Provide specific examples to demonstrate the steps**
- Include screenshots or code samples
- Share your vector search configuration
- Include error logs and stack traces

**Describe the behavior you observed and what you expected**

**Describe your environment**
- OS: [e.g. macOS 13.0, Windows 11, Ubuntu 22.04]
- Browser: [e.g. Chrome 120, Firefox 121, Safari 17]
- Node version: [e.g. 18.0.0, 20.0.0]
- In-Browser Vector Search version: [e.g. 1.0.0]
- Vector dimension: [e.g. 768, 1536]
- Storage type: [IndexedDB, memory]

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful for vector search**
- **List some examples of how this feature would be used**
- **Include mock-ups or examples if applicable**

### Pull Requests

1. **Fork the repository** and create your branch from `main`.
2. **Install dependencies**: `npm install`
3. **Make your changes** with clear, descriptive commit messages.
4. **Write or update tests** for your changes.
5. **Ensure all tests pass**: `npm test`
6. **Run linting**: `npm run lint`
7. **Build the project**: `npm run build`
8. **Update documentation** if you've changed functionality.
9. **Submit a pull request** with a clear description of the changes.

#### Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/In-Browser-Vector-Search.git
cd In-Browser-Vector-Search

# Install dependencies
npm install

# Watch mode for development
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Run linter
npm run lint
```

#### Code Style

- Use TypeScript strict mode
- Follow existing code structure and patterns
- Write meaningful comments for complex vector operations
- Use descriptive variable and function names
- Keep functions small and focused
- Write tests for new features
- Optimize vector search performance

#### Commit Messages

Follow the Conventional Commits specification:

```
feat: add HNSW index implementation
fix: resolve vector similarity calculation issue
docs: update API documentation
test: add tests for checkpoint system
refactor: optimize vector storage
perf: improve search performance with caching
```

### Adding Features

When adding new features:

1. **Discuss in an issue first** to get feedback
2. **Break the feature into small, manageable PRs**
3. **Write tests first** (Test-Driven Development)
4. **Update documentation** (README, API docs, examples)
5. **Add examples** demonstrating the new feature
6. **Consider performance implications for large vector sets**

### Vector Search Integration

When adding new search algorithms or indexing methods:

1. **Implement the search interface**
   ```typescript
   interface VectorSearchIndex {
     addVector(vector: number[], metadata?: any): void;
     search(query: number[], k: number): Promise<SearchResult[]>;
     removeVector(id: string): void;
     save(): Promise<void>;
     load(): Promise<void>;
   }
   ```

2. **Add IndexedDB persistence** for large datasets
3. **Write comprehensive tests** including:
   - Unit tests for search algorithms
   - Integration tests with IndexedDB
   - Performance tests for large datasets
   - Accuracy tests for similarity calculations

4. **Update documentation**:
   - Add algorithm to README
   - Create usage example
   - Document performance characteristics
   - Note any limitations

5. **Add benchmark example** using the new algorithm

## Project Structure

```
in-browser-vector-search/
├── src/
│   ├── vector/           # Vector operations and similarity
│   ├── storage/          # IndexedDB persistence
│   ├── index/            # Search indexing algorithms
│   ├── checkpoint/       # Checkpoint and rollback system
│   └── types.ts          # TypeScript type definitions
├── tests/                # Test files
├── examples/             # Example search scenarios
├── docs/                 # Documentation
└── dist/                 # Compiled JavaScript (generated)
```

## Testing

We use Vitest for testing. Run tests with:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- vector.test.ts
```

### Writing Tests

- Write descriptive test names
- Test both success and failure cases
- Use mocks for IndexedDB when appropriate
- Keep tests independent and focused
- Aim for high code coverage (>80%)
- Test with large vector datasets

### Performance Testing

- Test search performance with 1K, 10K, 100K vectors
- Benchmark similarity calculations
- Test IndexedDB read/write performance
- Verify checkpoint/rollback performance
- Profile memory usage with large datasets

## Documentation

Documentation is crucial for the project's success. When contributing:

- **README.md**: Update for new features or breaking changes
- **API.md**: Document new search APIs
- **Examples**: Add examples for new search features
- **Comments**: Comment complex vector operations
- **CHANGELOG.md**: Document changes in each version

### Vector Search Best Practices

When documenting search features:
- Explain the search algorithm used
- Note performance characteristics
- List recommended vector dimensions
- Provide usage examples
- Explain similarity metrics

## Release Process

Releases are managed by the maintainers:

1. Update version in package.json
2. Update CHANGELOG.md
3. Create a git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions will publish to npm

## Performance Guidelines

In-Browser Vector Search is designed for performance:

- **Efficient indexing**: Use appropriate indexing algorithms
- **Lazy loading**: Load vectors on-demand from IndexedDB
- **Caching**: Cache frequently accessed vectors
- **Batch operations**: Group vector insertions for efficiency
- **Memory efficient**: Manage memory for large vector sets

## Community Guidelines

- Be respectful and inclusive
- Provide constructive feedback
- Help others when you can
- Follow the Code of Conduct
- Focus on what is best for the community
- Consider privacy implications in all discussions

## Getting Help

- **Documentation**: Start with the README and docs/
- **Issues**: Search existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions
- **Email**: [support@superinstance.github.io](mailto:support@superinstance.github.io)

## Vector Search Resources

Contributors should be familiar with:

- **Vector Similarity**: Cosine similarity, Euclidean distance, dot product
- **Indexing Algorithms**: HNSW, IVF, Annoy, FAISS
- **Embedding Models**: Sentence transformers, OpenAI embeddings
- **IndexedDB**: Browser storage API for large datasets
- **WebGPU**: GPU-accelerated vector operations

## Recognition

Contributors will be recognized in:
- The CONTRIBUTORS.md file
- Release notes for significant contributions
- The project's README

Thank you for contributing to In-Browser Vector Search and making privacy-first search accessible!
