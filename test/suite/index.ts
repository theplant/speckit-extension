import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
  // Support filtering tests via SPECKIT_TEST_GREP environment variable
  const grepPattern = process.env.SPECKIT_TEST_GREP;
  
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 60000,
    grep: grepPattern ? new RegExp(grepPattern) : undefined
  });

  const testsRoot = path.resolve(__dirname, '..');

  const files = await glob('**/**.test.js', { cwd: testsRoot });
  
  files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));

  return new Promise((resolve, reject) => {
    mocha.run((failures: number) => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}
