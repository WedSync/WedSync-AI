import nextConfig from '../../../next.config'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import pkg from '../../../package.json'

describe('Build System', () => {
  it('should have Next.js configured', () => {
    expect(nextConfig).toBeDefined()
  })
  
  it('should have required dependencies', () => {
    expect(pkg.dependencies.next).toBeDefined()
    expect(pkg.dependencies.react).toBeDefined()
})
