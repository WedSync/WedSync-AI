/**
 * Simple toast helper functions
 * Works with the existing toast system
 */

// Simple toast functions that can be used without context
export const toast = {
  success: (message: string) => {
    // Create and dispatch a custom event for toast notifications
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { type: 'success', title: message },
      }),
    );
  },

  error: (message: string) => {
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { type: 'error', title: message },
      }),
    );
  },

  info: (message: string) => {
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { type: 'info', title: message },
      }),
    );
  },

  warning: (message: string) => {
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { type: 'warning', title: message },
      }),
    );
  },

  // For compatibility with template modal
  promise: (
    promise: Promise<any>,
    options: { loading: string; success: string; error: string },
  ) => {
    toast.info(options.loading);
    return promise
      .then(() => {
        toast.success(options.success);
      })
      .catch(() => {
        toast.error(options.error);
      });
  },
};
