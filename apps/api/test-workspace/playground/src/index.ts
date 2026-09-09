/**
 * Dummy project file for E2E testing.
 * The AI will modify this file during test execution.
 */

export function greet(name: string): string {
  return `Hello, ${name}!`;
}

export function add(a: number, b: number): number {
  return a + b;
}

console.log(greet("CommitFlow"));
console.log(`2 + 3 = ${add(2, 3)}`);
