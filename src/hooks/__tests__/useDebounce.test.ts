import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { useDebounce } from '../useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )
    // Change the value
    rerender({ value: 'changed', delay: 500 })
    
    // Value should not change immediately
    // Fast-forward time by 250ms (less than delay)
    act(() => {
      jest.advanceTimersByTime(250)
    })
    // Value should still be initial
    // Fast-forward time by another 250ms (total 500ms)
    // Now value should be updated
    expect(result.current).toBe('changed')
  it('should reset timer on rapid value changes', () => {
    // Change value multiple times rapidly
    rerender({ value: 'change1', delay: 500 })
      jest.advanceTimersByTime(200)
    rerender({ value: 'change2', delay: 500 })
    rerender({ value: 'change3', delay: 500 })
    // Value should still be initial because timer keeps resetting
    // Complete the delay
      jest.advanceTimersByTime(500)
    // Should show the latest value
    expect(result.current).toBe('change3')
  it('should handle different data types', () => {
    // Test with number
    const { result: numberResult, rerender: rerenderNumber } = renderHook(
      { initialProps: { value: 0, delay: 300 } }
    rerenderNumber({ value: 42, delay: 300 })
      jest.advanceTimersByTime(300)
    expect(numberResult.current).toBe(42)
    // Test with boolean
    const { result: boolResult, rerender: rerenderBool } = renderHook(
      { initialProps: { value: false, delay: 200 } }
    rerenderBool({ value: true, delay: 200 })
    expect(boolResult.current).toBe(true)
    // Test with object
    const initialObj = { name: 'initial' }
    const changedObj = { name: 'changed' }
    const { result: objResult, rerender: rerenderObj } = renderHook(
      { initialProps: { value: initialObj, delay: 100 } }
    rerenderObj({ value: changedObj, delay: 100 })
      jest.advanceTimersByTime(100)
    expect(objResult.current).toBe(changedObj)
  it('should handle delay changes', () => {
    rerender({ value: 'changed', delay: 200 }) // Change both value and delay
  it('should work with zero delay', () => {
      { initialProps: { value: 'initial', delay: 0 } }
    rerender({ value: 'changed', delay: 0 })
      jest.advanceTimersByTime(0)
  it('should cleanup timer on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
    const { unmount } = renderHook(
    unmount()
    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  it('should handle undefined and null values', () => {
    // Test with undefined
    const { result: undefinedResult, rerender: rerenderUndefined } = renderHook(
      { initialProps: { value: undefined as any, delay: 100 } }
    expect(undefinedResult.current).toBeUndefined()
    rerenderUndefined({ value: 'defined', delay: 100 })
    expect(undefinedResult.current).toBe('defined')
    // Test with null
    const { result: nullResult, rerender: rerenderNull } = renderHook(
      { initialProps: { value: null as any, delay: 100 } }
    expect(nullResult.current).toBeNull()
    rerenderNull({ value: 'not null', delay: 100 })
    expect(nullResult.current).toBe('not null')
  it('should handle array values', () => {
    const initialArray = [1, 2, 3]
    const changedArray = [4, 5, 6]
      { initialProps: { value: initialArray, delay: 300 } }
    expect(result.current).toEqual([1, 2, 3])
    rerender({ value: changedArray, delay: 300 })
    expect(result.current).toEqual([4, 5, 6])
  it('should work correctly with search use case', () => {
    // Simulate typing in a search box
      { initialProps: { value: '', delay: 300 } }
    // User types 'h'
    rerender({ value: 'h', delay: 300 })
    expect(result.current).toBe('')
    // User types 'he' quickly
    act(() => { jest.advanceTimersByTime(50) })
    rerender({ value: 'he', delay: 300 })
    // User types 'hel' quickly
    rerender({ value: 'hel', delay: 300 })
    // User types 'hell' quickly
    rerender({ value: 'hell', delay: 300 })
    // User types 'hello' and stops
    rerender({ value: 'hello', delay: 300 })
    // Wait for debounce to trigger
    expect(result.current).toBe('hello')
  it('should handle very short delays', () => {
      { initialProps: { value: 'initial', delay: 1 } }
    rerender({ value: 'changed', delay: 1 })
      jest.advanceTimersByTime(1)
  it('should handle very long delays', () => {
      { initialProps: { value: 'initial', delay: 10000 } }
    rerender({ value: 'changed', delay: 10000 })
    // Before delay completes
      jest.advanceTimersByTime(9999)
    // After delay completes
  it('should maintain referential equality for objects when value does not change', () => {
    const obj = { name: 'test' }
      { initialProps: { value: obj, delay: 300 } }
    expect(result.current).toBe(obj)
    // Rerender with the same object
    rerender({ value: obj, delay: 300 })
    // Should still be the same reference
})
