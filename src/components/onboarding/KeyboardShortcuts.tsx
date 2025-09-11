'use client';

import React, { useState } from 'react';
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { useHotkeys } from 'react-hotkeys-hook';
import { KeyboardShortcut } from '@/types/onboarding';

const shortcuts: KeyboardShortcut[] = [
  {
    key: 'ctrl+/',
    description: 'Show keyboard shortcuts',
    action: () => {},
    category: 'general',
  },
  {
    key: 'ctrl+n',
    description: 'Create new form',
    action: () => {},
    category: 'forms',
  },
  {
    key: 'ctrl+s',
    description: 'Save current form',
    action: () => {},
    category: 'forms',
  },
  {
    key: 'ctrl+p',
    description: 'Preview form',
    action: () => {},
    category: 'forms',
  },
  {
    key: 'g d',
    description: 'Go to dashboard',
    action: () => {},
    category: 'navigation',
  },
  {
    key: 'g f',
    description: 'Go to forms',
    action: () => {},
    category: 'navigation',
  },
  {
    key: 'g c',
    description: 'Go to clients',
    action: () => {},
    category: 'navigation',
  },
];

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useHotkeys('ctrl+/', () => setIsOpen(true), { preventDefault: true });
  useHotkeys('?', () => setIsOpen(true), { preventDefault: true });
  useHotkeys('escape', () => setIsOpen(false), { enableOnFormTags: true });

  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, KeyboardShortcut[]>,
  );

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={setIsOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-zinc-500/20 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <Button
                    color="white"
                    onClick={() => setIsOpen(false)}
                    className="rounded-md bg-white text-zinc-400 hover:text-zinc-500"
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </Button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title
                      as="h3"
                      className="text-base font-semibold leading-6 text-zinc-900"
                    >
                      Keyboard Shortcuts
                    </Dialog.Title>

                    <div className="mt-4 space-y-6">
                      {Object.entries(groupedShortcuts).map(
                        ([category, categoryShortcuts]) => (
                          <div key={category}>
                            <h4 className="text-sm font-medium text-zinc-900 capitalize mb-3">
                              {category.replace('-', ' ')}
                            </h4>
                            <div className="space-y-2">
                              {categoryShortcuts.map((shortcut) => (
                                <div
                                  key={shortcut.key}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-sm text-zinc-600">
                                    {shortcut.description}
                                  </span>
                                  <kbd className="inline-flex items-center rounded border border-zinc-200 px-2 py-1 text-xs font-sans text-zinc-500">
                                    {shortcut.key
                                      .split('+')
                                      .map((key, index, array) => (
                                        <Fragment key={key}>
                                          <span className="capitalize">
                                            {key}
                                          </span>
                                          {index < array.length - 1 && (
                                            <span className="mx-1">+</span>
                                          )}
                                        </Fragment>
                                      ))}
                                  </kbd>
                                </div>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                    </div>

                    <div className="mt-6 text-xs text-zinc-500">
                      Press{' '}
                      <kbd className="rounded border border-zinc-200 px-1">
                        ?
                      </kbd>{' '}
                      or{' '}
                      <kbd className="rounded border border-zinc-200 px-1">
                        Ctrl+/
                      </kbd>{' '}
                      to toggle this dialog
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
