/**
 * Basic Usage Example
 *
 * Demonstrates basic error handling with Central Error Manager
 */

import {
  initializeErrorHandler,
  handleError,
  NetworkError,
  ValidationError,
} from '@superinstance/central-error-manager';

// Initialize the error handler
async function init() {
  await initializeErrorHandler({
    enableLogging: true,
    logToConsole: true,
    userTechnicalLevel: 'intermediate',
  });
}

// Example 1: Basic try-catch with error handling
async function fetchUserData(userId: string) {
  try {
    const response = await fetch(`/api/users/${userId}`);

    if (!response.ok) {
      throw new NetworkError('Failed to fetch user data', {
        url: `/api/users/${userId}`,
        status: response.status,
      });
    }

    return await response.json();
  } catch (error) {
    handleError(error, {
      component: 'UserService',
      operation: 'fetchUserData',
      userId,
    });
    throw error; // Re-throw for caller to handle
  }
}

// Example 2: Validation with specific error type
function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email address', {
      field: 'email',
      value: email,
    });
  }
}

// Example 3: Using error context
async function saveUserData(userData: any) {
  try {
    validateEmail(userData.email);

    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error('Failed to save user');
    }

    return await response.json();
  } catch (error) {
    handleError(error, {
      component: 'UserService',
      operation: 'saveUserData',
      additional: {
        userEmail: userData.email,
        timestamp: Date.now(),
      },
    });
    throw error;
  }
}

// Example 4: Multiple error types
async function processFile(file: File) {
  try {
    // Validate file size
    if (file.size > 10 * 1024 * 1024) { // 10MB
      throw new ValidationError('File too large', {
        field: 'file',
        value: file.size,
        context: { maxSize: 10 * 1024 * 1024 },
      });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new ValidationError('Invalid file type', {
        field: 'file',
        value: file.type,
        context: { allowedTypes: ['image/*'] },
      });
    }

    // Process file
    const result = await uploadFile(file);
    return result;
  } catch (error) {
    handleError(error, {
      component: 'FileProcessor',
      operation: 'processFile',
      fileName: file.name,
      fileSize: file.size,
    });
    throw error;
  }
}

async function uploadFile(file: File): Promise<any> {
  // Simulated upload
  return { success: true, url: 'https://example.com/file.jpg' };
}

// Run examples
async function main() {
  await init();

  console.log('=== Example 1: Fetch User Data ===');
  try {
    await fetchUserData('123');
  } catch (error) {
    console.log('Error handled:', error);
  }

  console.log('\n=== Example 2: Validate Email ===');
  try {
    validateEmail('invalid-email');
  } catch (error) {
    console.log('Validation error:', error);
  }

  console.log('\n=== Example 3: Save User Data ===');
  try {
    await saveUserData({
      email: 'test@example.com',
      name: 'John Doe',
    });
  } catch (error) {
    console.log('Save error:', error);
  }

  console.log('\n=== Example 4: Process File ===');
  try {
    await processFile(new File(['content'], 'test.txt', { type: 'text/plain' }));
  } catch (error) {
    console.log('File processing error:', error);
  }
}

// Uncomment to run
// main().catch(console.error);
