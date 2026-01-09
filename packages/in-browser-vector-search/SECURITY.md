# Security Policy

## Supported Versions

Currently, only the latest version of In-Browser Vector Search is supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: Yes |

## Reporting a Vulnerability

If you discover a security vulnerability in In-Browser Vector Search, please report it to us responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please send an email to [security@superinstance.github.io](mailto:security@superinstance.github.io) with:

* A description of the vulnerability
* Steps to reproduce the issue
* Any potential impact you've identified
* If possible, a suggested fix or mitigation

### What to Expect

Once you've submitted a vulnerability report:

1. **Acknowledgment**: We will respond within 48 hours to acknowledge receipt
2. **Investigation**: We will investigate the issue and determine severity
3. **Resolution**: We will work on a fix and aim to release a patch within 7 days for critical issues
4. **Disclosure**: We will coordinate public disclosure with you

## Security Best Practices for Users

### Data Privacy

- **All data stays local**: Vector search is performed entirely in the browser
- **No external APIs**: No embeddings or search queries leave your browser
- **No telemetry**: In-Browser Vector Search does not collect telemetry or usage data
- **Private by design**: Your knowledge base remains completely private

### IndexedDB Security

- **Same-origin policy**: IndexedDB follows browser same-origin policy
- **Sandboxed storage**: Each origin has isolated storage
- **No cross-origin access**: Vectors cannot be accessed by other origins
- **User-controlled deletion**: Users can clear IndexedDB data at any time

### Browser Security

- **Use HTTPS**: Always load your application over HTTPS in production
- **Content Security Policy**: Implement strict CSP headers to prevent XSS attacks
- **Validate embeddings**: Ensure embeddings come from trusted sources
- **Sanitize metadata**: Sanitize any metadata stored with vectors

### Environment Variables

In-Browser Vector Search is designed to work with zero configuration. For advanced usage:

```bash
# Optional: Enable debug mode (development only)
DEBUG_VECTOR_SEARCH=true

# Optional: Custom IndexedDB database name
VECTOR_SEARCH_DB_NAME=my_vector_db

# Optional: Maximum vector batch size
MAX_VECTOR_BATCH_SIZE=1000
```

### Dependency Management

- Regularly update dependencies: `npm update`
- Audit dependencies for vulnerabilities: `npm audit`
- Review security advisories for dependencies
- Keep Node.js updated to the latest stable version
- Review IndexedDB wrapper dependencies for security issues

### Input Validation

- Validate all vector inputs before processing
- Ensure vector dimensions match expected size
- Sanitize metadata stored with vectors
- Implement rate limiting for bulk operations
- Protect against memory exhaustion attacks

## Security Features

### Current Security Measures

- **Input Validation**: All vector inputs are validated using TypeScript types
- **Memory Safety**: Proper memory management for large vector datasets
- **Dependency Auditing**: Regular security audits of dependencies
- **Type Safety**: TypeScript strict mode catches many potential issues at compile time
- **Browser Security**: Leverages browser security model for IndexedDB
- **No External Requests**: All search happens locally, no external API calls

### Privacy Features

- **Local Processing**: All vector operations happen in the browser
- **No Server Communication**: Zero data transmission to external servers
- **User Control**: Users have full control over their data
- **Offline Capable**: Works completely offline after initial load
- **Data Ownership**: Vectors and metadata belong entirely to the user

### Known Limitations

- **IndexedDB Storage**: Limited by browser IndexedDB quota
- **Memory Constraints**: Large vector datasets require significant memory
- **Browser Compatibility**: IndexedDB support varies by browser
- **Performance**: Search performance depends on device capabilities
- **Embedding Security**: Security depends on how embeddings are generated

## Security Audits

This project has not yet undergone a formal security audit. We welcome contributions from security researchers and encourage responsible disclosure of any vulnerabilities found.

### Security Research

We encourage security research into In-Browser Vector Search:

- **Responsible Disclosure**: Please report vulnerabilities privately
- **Testing Guidelines**: Test with your own vector datasets
- **Documentation**: Document any security findings with clear reproduction steps
- **Collaboration**: Work with us on security improvements

## Dependency Security

We actively monitor our dependencies for security vulnerabilities:

- Minimal dependency footprint to reduce attack surface
- Regular `npm audit` checks
- Immediate action on high-severity vulnerabilities
- Automated Dependabot security updates

## Data Storage Security

### IndexedDB Security

- **Origin Isolation**: Each origin has isolated IndexedDB storage
- **Sandboxed Access**: JavaScript can only access its own origin's data
- **User Permission**: Browser requires implicit permission for IndexedDB
- **Persistent Storage**: Data persists across browser sessions
- **Clearable Data**: Users can clear IndexedDB data via browser settings

### Memory Management

- **Vector Limits**: Enforce reasonable limits on vector dataset sizes
- **Batch Processing**: Process vectors in batches to manage memory
- **Lazy Loading**: Load vectors on-demand from IndexedDB
- **Memory Monitoring**: Monitor memory usage to prevent exhaustion
- **Garbage Collection**: Compatible with JavaScript garbage collection

### Checkpoint Security

- **Version Control**: Checkpoints include version information
- **Atomic Operations**: Checkpoint creation is atomic
- **Rollback Safety**: Rollback operations are validated
- **Data Integrity**: Checksums for checkpoint data
- **Secure Storage**: Checkpoints stored securely in IndexedDB

## Cross-Origin Security

- **Same-Origin Policy**: Strict adherence to browser same-origin policy
- **No Cross-Origin Data**: Vectors cannot be shared across origins
- **Frame Isolation**: Respects iframe isolation boundaries
- **Service Worker Support**: Optional service worker for improved performance
- **Shared Worker Security**: Safe use of shared workers when enabled

## Embedding Security

### Embedding Generation

In-Browser Vector Search does not generate embeddings. Security considerations:

- **Trusted Sources**: Use trusted sources for embeddings
- **Validation**: Validate embedding dimensions and values
- **Sanitization**: Sanitize any metadata associated with embeddings
- **Storage Security**: Ensure embeddings are stored securely in IndexedDB
- **Transmission Security**: If embeddings are fetched, use HTTPS

### Third-Party Embeddings

When using embeddings from third-party services:

- **Review Privacy Policies**: Understand how embedding services handle data
- **Data Minimization**: Only send necessary text for embedding generation
- **Secure Transmission**: Use HTTPS for all API calls
- **API Key Security**: Never expose API keys in client-side code
- **Rate Limiting**: Respect API rate limits

## Contact Information

For security-related inquiries:

* **Security Vulnerabilities**: [security@superinstance.github.io](mailto:security@superinstance.github.io)
* **General Inquiries**: [support@superinstance.github.io](mailto:support@superinstance.github.io)

## Response Time Commitments

* **Critical Vulnerabilities**: 48 hours initial response, 7 days for fix
* **High Severity**: 72 hours initial response, 14 days for fix
* **Medium Severity**: 1 week initial response, 30 days for fix
* **Low Severity**: 2 weeks initial response, next release for fix

## Privacy by Design

In-Browser Vector Search is built with privacy as a core principle:

- **Local-First**: All data processing happens locally in the browser
- **No Tracking**: No user tracking or analytics collection
- **No Data Collection**: No data is sent to external servers
- **User Control**: Users have complete control over their data
- **Transparent**: Open source code for full transparency

Thank you for helping keep In-Browser Vector Search and its users safe!
