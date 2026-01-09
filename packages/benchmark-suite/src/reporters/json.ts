/**
 * JSON reporter - outputs machine-readable JSON
 */

import type { SuiteResult, ReporterOptions } from '../types.js';
import { writeFileSync } from 'fs';
import * as os from 'os';

export interface JsonReport {
  timestamp: string;
  suites: SuiteResult[];
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cpuCores: number;
    totalMemory: number;
  };
}

/**
 * Generate JSON report
 */
export function reportJson(
  results: SuiteResult[],
  options: ReporterOptions = {}
): JsonReport {
  const report: JsonReport = {
    timestamp: new Date().toISOString(),
    suites: results,
    environment: getEnvironmentInfo()
  };

  if (options.output) {
    writeFileSync(options.output, JSON.stringify(report, null, 2));
    console.log(`\n📄 JSON report saved to: ${options.output}`);
  }

  return report;
}

/**
 * Get environment information
 */
function getEnvironmentInfo() {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cpuCores: os.cpus().length,
    totalMemory: os.totalmem()
  };
}
