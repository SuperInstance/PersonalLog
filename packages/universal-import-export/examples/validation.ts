/**
 * Validation Example
 *
 * Demonstrates data validation capabilities.
 */

import { ImportValidator } from '@superinstance/universal-import-export'

async function validationExample() {
  const validator = new ImportValidator()

  // Example 1: Valid data
  console.log('Example 1: Valid data')
  const validData = [
    {
      id: 'conv-1',
      title: 'Valid Conversation',
      type: 'ai-assisted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg-1',
          type: 'text',
          author: 'user',
          content: { text: 'Hello' },
          timestamp: new Date().toISOString(),
        },
      ],
    },
  ]

  const validResult = await validator.validate(validData)
  console.log(`Valid: ${validResult.valid}`)
  console.log(`Schema valid: ${validResult.schema.valid}`)
  console.log(`Types valid: ${validResult.types.valid}`)
  console.log(`Constraints valid: ${validResult.constraints.valid}`)
  console.log(`Security valid: ${validResult.security.valid}`)

  // Example 2: Invalid data
  console.log('\nExample 2: Invalid data')
  const invalidData = [
    {
      // Missing required fields
      title: 'Invalid Conversation',
      type: 'invalid-type',
      createdAt: 'not-a-date',
    },
  ]

  const invalidResult = await validator.validate(invalidData)
  console.log(`Valid: ${invalidResult.valid}`)
  console.log(`Schema errors: ${invalidResult.schema.errors.length}`)
  console.log(`Type errors: ${invalidResult.types.errors.length}`)
  console.log(`Missing fields: ${invalidResult.schema.missing.join(', ')}`)

  // Example 3: Security issues
  console.log('\nExample 3: Security issues')
  const suspiciousData = [
    {
      id: 'conv-2',
      title: '<script>alert("XSS")</script>',
      type: 'personal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    },
  ]

  const securityResult = await validator.validate(suspiciousData)
  console.log(`Security valid: ${securityResult.security.valid}`)
  console.log(`Security issues: ${securityResult.security.issues.length}`)
  for (const issue of securityResult.security.issues) {
    console.log(`  - ${issue.type}: ${issue.description} (${issue.severity})`)
  }
}

// Run the example
validationExample().catch(console.error)
