# Test Assets

This directory contains test assets for Playwright E2E tests.

## Photo Gallery Tests

The photo gallery system tests use mock image files to simulate photo upload workflows. In a real testing environment, you would place sample JPEG files here:

- `test-photo-1.jpg` - Sample wedding photo for testing uploads
- `test-photo-2.jpg` - Another sample photo for batch upload testing
- `test-photo-large.jpg` - Large photo (>5MB) for compression testing

For security reasons, actual image files are not committed to the repository. The tests use simulated File objects instead.

## Usage

The Playwright tests automatically mock file operations, so physical files are not required. However, if you want to test with real files during development:

1. Add sample JPEG images to this directory
2. Update the test file paths in the spec files
3. Ensure images are properly sized for testing (various dimensions)