/**
 * Code Search Engine Example
 *
 * This example demonstrates semantic code search:
 * - Find similar functions by logic
 * - Detect code duplication
 * - Search by intent (not just keywords)
 * - Navigate large codebases intelligently
 *
 * Use Case: "Find similar code in large codebases"
 *
 * Keywords: Code search, semantic code search, code duplication detection, find similar functions, codebase search
 */

import { VectorStore } from '../src';

interface CodeFunction {
  id: string;
  name: string;
  file: string;
  language: string;
  code: string;
  description: string;
}

class CodeSearchEngine {
  private store: VectorStore;

  constructor() {
    this.store = new VectorStore();
  }

  async initialize() {
    await this.store.init();
    console.log('✅ Code Search Engine initialized\n');
  }

  async indexFunction(func: CodeFunction): Promise<void> {
    // Create a rich description for embedding
    const content = `
Function: ${func.name}
File: ${func.file}
Language: ${func.language}
Description: ${func.description}
Code: ${func.code}
    `.trim();

    await this.store.addEntry({
      id: func.id,
      type: 'code-function',
      sourceId: func.file,
      content,
      metadata: {
        name: func.name,
        file: func.file,
        language: func.language,
        code: func.code,
        description: func.description,
        timestamp: new Date().toISOString(),
      },
      editable: true,
    });
  }

  async searchByIntent(query: string, limit: number = 10): Promise<CodeFunction[]> {
    const results = await this.store.search(query, {
      limit,
      threshold: 0.5,
    });

    return results.map((result: any) => ({
      id: result.entry.id,
      name: result.entry.metadata.name,
      file: result.entry.metadata.file,
      language: result.entry.metadata.language,
      code: result.entry.metadata.code,
      description: result.entry.metadata.description,
    }));
  }

  async findSimilarFunctions(targetFunctionId: string, limit: number = 5): Promise<any[]> {
    const results = await this.store.search(targetFunctionId, {
      limit,
      threshold: 0.7,
    });

    return results.map((result: any) => ({
      function: {
        name: result.entry.metadata.name,
        file: result.entry.metadata.file,
        similarity: result.similarity,
      },
    }));
  }

  async detectDuplicates(threshold: number = 0.9): Promise<any[]> {
    const allEntries = await this.store.getEntries();
    const duplicates: any[] = [];

    // Compare each function with every other function
    for (let i = 0; i < allEntries.length; i++) {
      const entry1 = allEntries[i];

      if (entry1.metadata?.name) {
        const results = await this.store.search(entry1.metadata.name, {
          limit: 10,
          threshold,
        });

        for (const result of results) {
          // Skip self-matches
          if (result.entry.id === entry1.id) continue;

          // Check if already reported
          const alreadyReported = duplicates.some(d =>
            (d.func1.id === entry1.id && d.func2.id === result.entry.id) ||
            (d.func1.id === result.entry.id && d.func2.id === entry1.id)
          );

          if (!alreadyReported && result.similarity >= threshold) {
            duplicates.push({
              func1: {
                id: entry1.id,
                name: entry1.metadata.name,
                file: entry1.metadata.file,
              },
              func2: {
                id: result.entry.id,
                name: result.entry.metadata.name,
                file: result.entry.metadata.file,
              },
              similarity: result.similarity,
            });
          }
        }
      }
    }

    return duplicates;
  }
}

// Sample code functions
const sampleFunctions: CodeFunction[] = [
  {
    id: 'func-1',
    name: 'calculateAverage',
    file: 'utils/math.ts',
    language: 'TypeScript',
    description: 'Calculate the average of an array of numbers',
    code: `
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return sum / numbers.length;
}
    `,
  },
  {
    id: 'func-2',
    name: 'computeMean',
    file: 'stats/mean.js',
    language: 'JavaScript',
    description: 'Compute the mean value of a dataset',
    code: `
function computeMean(data) {
  if (!data || data.length === 0) return 0;
  const total = data.reduce((a, b) => a + b, 0);
  return total / data.length;
}
    `,
  },
  {
    id: 'func-3',
    name: 'getUserById',
    file: 'api/users.ts',
    language: 'TypeScript',
    description: 'Fetch a user from the database by their ID',
    code: `
async function getUserById(id: string): Promise<User> {
  const user = await db.users.findOne({ id });
  if (!user) throw new Error('User not found');
  return user;
}
    `,
  },
  {
    id: 'func-4',
    name: 'fetchUser',
    file: 'services/userService.js',
    language: 'JavaScript',
    description: 'Retrieve user information from database',
    code: `
async function fetchUser(userId) {
  const result = await database.query('SELECT * FROM users WHERE id = ?', [userId]);
  if (result.length === 0) throw new Error('User not found');
  return result[0];
}
    `,
  },
  {
    id: 'func-5',
    name: 'bubbleSort',
    file: 'algorithms/sort.ts',
    language: 'TypeScript',
    description: 'Sort an array using bubble sort algorithm',
    code: `
function bubbleSort(arr: number[]): number[] {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}
    `,
  },
  {
    id: 'func-6',
    name: 'sortByProperty',
    file: 'utils/array.ts',
    language: 'TypeScript',
    description: 'Sort array of objects by a property',
    code: `
function sortByProperty<T>(arr: T[], prop: keyof T): T[] {
  return arr.slice().sort((a, b) => {
    const valA = a[prop];
    const valB = b[prop];
    if (valA < valB) return -1;
    if (valA > valB) return 1;
    return 0;
  });
}
    `,
  },
  {
    id: 'func-7',
    name: 'validateEmail',
    file: 'utils/validation.ts',
    language: 'TypeScript',
    description: 'Validate email address format',
    code: `
function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
    `,
  },
  {
    id: 'func-8',
    name: 'isValidEmail',
    file: 'helpers/validators.js',
    language: 'JavaScript',
    description: 'Check if a string is a valid email',
    code: `
function isValidEmail(email) {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(email);
}
    `,
  },
];

// Demonstration functions
async function demonstrateCodeSearch() {
  console.log('=== Code Search Engine Demo ===\n');

  const engine = new CodeSearchEngine();
  await engine.initialize();

  // Index all sample functions
  console.log('📚 Indexing codebase...');
  for (const func of sampleFunctions) {
    await engine.indexFunction(func);
    console.log(`  ✅ Indexed: ${func.name} (${func.file})`);
  }
  console.log(`\nIndexed ${sampleFunctions.length} functions\n`);

  // Example 1: Search by intent
  console.log('🔍 Example 1: Search by Intent');
  console.log('   Query: "calculate mean of numbers"\n');

  const results1 = await engine.searchByIntent('calculate mean of numbers', 3);
  results1.forEach((func, index) => {
    console.log(`   ${index + 1}. ${func.name}`);
    console.log(`      File: ${func.file}`);
    console.log(`      ${func.description}\n`);
  });

  // Example 2: Find similar functions
  console.log('🔍 Example 2: Find Similar Functions');
  console.log('   Target: validateEmail\n');

  const similarFuncs = await engine.findSimilarFunctions('func-7', 3);
  similarFuncs.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.function.name}`);
    console.log(`      File: ${item.function.file}`);
    console.log(`      Similarity: ${(item.function.similarity * 100).toFixed(0)}%\n`);
  });

  // Example 3: Detect duplicates
  console.log('🔍 Example 3: Detect Code Duplication');
  console.log('   Scanning for duplicate or near-duplicate functions...\n');

  const duplicates = await engine.detectDuplicates(0.85);
  if (duplicates.length > 0) {
    console.log(`   Found ${duplicates.length} potential duplicates:\n`);
    duplicates.forEach((dup, index) => {
      console.log(`   ${index + 1}. ${dup.func1.name} ↔ ${dup.func2.name}`);
      console.log(`      Similarity: ${(dup.similarity * 100).toFixed(0)}%`);
      console.log(`      ${dup.func1.file} ↔ ${dup.func2.file}\n`);
    });
  } else {
    console.log('   ✅ No duplicates found\n');
  }

  // Example 4: Semantic search
  console.log('🔍 Example 4: Semantic Search by Concept');
  console.log('   Query: "sorting algorithm"\n');

  const results4 = await engine.searchByIntent('sorting algorithm', 3);
  results4.forEach((func, index) => {
    console.log(`   ${index + 1}. ${func.name}`);
    console.log(`      File: ${func.file}`);
    console.log(`      Language: ${func.language}\n`);
  });

  // Example 5: Search across languages
  console.log('🔍 Example 5: Language-Agnostic Search');
  console.log('   Query: "check if email is valid"\n');

  const results5 = await engine.searchByIntent('check if email is valid', 5);
  results5.forEach((func, index) => {
    console.log(`   ${index + 1}. ${func.name} (${func.language})`);
    console.log(`      ${func.file}\n`);
  });
}

async function demonstrateRealWorldUsage() {
  console.log('\n=== Real-World Usage Examples ===\n');

  const engine = new CodeSearchEngine();
  await engine.initialize();

  // Index sample functions
  for (const func of sampleFunctions) {
    await engine.indexFunction(func);
  }

  console.log('💡 Common Use Cases:\n');

  // Use case 1: Refactoring
  console.log('1️⃣  Refactoring: Find functions to consolidate');
  console.log('   Query: "calculate average"\n');

  const refactorResults = await engine.searchByIntent('calculate average', 5);
  const highlySimilar = refactorResults.filter(r => r.name.includes('average') || r.name.includes('mean'));

  if (highlySimilar.length > 1) {
    console.log(`   Found ${highlySimilar.length} similar functions that could be consolidated:`);
    highlySimilar.forEach(r => console.log(`   - ${r.name} in ${r.file}`));
  }
  console.log('');

  // Use case 2: Code review
  console.log('2️⃣  Code Review: Check for similar implementations');
  console.log('   Checking email validation functions...\n');

  const emailFuncs = await engine.searchByIntent('email validation', 5);
  if (emailFuncs.length > 1) {
    console.log(`   ⚠️  Found ${emailFuncs.length} email validation functions:`);
    emailFuncs.forEach(f => console.log(`   - ${f.name} in ${f.file}`));
    console.log('   💡 Consider consolidating to a single validation utility');
  }
  console.log('');

  // Use case 3: Learning
  console.log('3️⃣  Learning: Find examples of patterns');
  console.log('   Query: "async database query"\n');

  const examples = await engine.searchByIntent('async database query', 3);
  console.log('   Found examples:');
  examples.forEach((func, index) => {
    console.log(`   ${index + 1}. ${func.name}`);
    console.log(`      ${func.description}`);
  });
  console.log('');

  // Use case 4: Migration
  console.log('4️⃣  Migration: Find JavaScript to convert to TypeScript');
  console.log('   Finding JavaScript functions...\n');

  const jsFunctions = sampleFunctions.filter(f => f.language === 'JavaScript');
  console.log(`   Found ${jsFunctions.length} JavaScript functions to convert:`);
  jsFunctions.forEach(f => console.log(`   - ${f.name} in ${f.file}`));
  console.log('');

  // Use case 5: Bug fixing
  console.log('5️⃣  Bug Fixing: Find all functions that might be affected');
  console.log('   Query: "user database"\n');

  const affected = await engine.searchByIntent('user database', 5);
  console.log('   Functions that interact with user database:');
  affected.forEach(f => console.log(`   - ${f.name}: ${f.description}`));
}

async function runCodeDuplicationAudit() {
  console.log('\n=== Code Duplication Audit ===\n');

  const engine = new CodeSearchEngine();
  await engine.initialize();

  // Index all functions
  for (const func of sampleFunctions) {
    await engine.indexFunction(func);
  }

  console.log('🔍 Running duplication audit...\n');

  // Find duplicates at different thresholds
  const exactDuplicates = await engine.detectDuplicates(0.95);
  const nearDuplicates = await engine.detectDuplicates(0.85);
  const similarFunctions = await engine.detectDuplicates(0.75);

  console.log('📊 Duplication Report:\n');
  console.log(`Exact Duplicates (>95% similarity): ${exactDuplicates.length}`);
  console.log(`Near Duplicates (>85% similarity): ${nearDuplicates.length}`);
  console.log(`Similar Functions (>75% similarity): ${similarFunctions.length}\n`);

  if (nearDuplicates.length > 0) {
    console.log('🔴 High Priority - Consolidate these functions:\n');
    nearDuplicates.forEach((dup, index) => {
      console.log(`${index + 1}. ${dup.func1.name} ↔ ${dup.func2.name}`);
      console.log(`   Similarity: ${(dup.similarity * 100).toFixed(0)}%`);
      console.log(`   ${dup.func1.file}`);
      console.log(`   ${dup.func2.file}\n`);
    });

    console.log('💡 Recommendations:');
    console.log('   1. Create shared utility functions');
    console.log('   2. Remove duplicate implementations');
    console.log('   3. Update all references to use consolidated version');
    console.log('   4. Add unit tests for shared utilities');
  } else {
    console.log('✅ No significant duplication detected!');
  }
}

// Export functions
export { CodeSearchEngine, demonstrateCodeSearch, demonstrateRealWorldUsage, runCodeDuplicationAudit };

// Auto-run
if (typeof window !== 'undefined') {
  (window as any).demonstrateCodeSearch = demonstrateCodeSearch;
  (window as any).runCodeDuplicationAudit = runCodeDuplicationAudit;
  console.log('📝 Code Search Engine - Available functions:');
  console.log('  - demonstrateCodeSearch() - See semantic code search in action');
  console.log('  - runCodeDuplicationAudit() - Find duplicate code');
}
