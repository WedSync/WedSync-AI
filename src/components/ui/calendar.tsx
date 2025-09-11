'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CalendarProps {
  className?: string;
  classNames?: {
    months?: string;
    month?: string;
    caption?: string;
    caption_label?: string;
    nav?: string;
    nav_button?: string;
    nav_button_previous?: string;
    nav_button_next?: string;
    table?: string;
    head_row?: string;
    head_cell?: string;
    row?: string;
    cell?: string;
    day?: string;
    day_selected?: string;
    day_today?: string;
    day_outside?: string;
    day_disabled?: string;
    day_hidden?: string;
  };
  showOutsideDays?: boolean;
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  mode?: 'single' | 'multiple' | 'range';
}

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  selected,
  onSelect,
  disabled,
  mode = 'single',
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      });
    }

    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = new Date().toDateString() === date.toDateString();
      const isSelected =
        selected && selected.toDateString() === date.toDateString();

      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        isSelected,
      });
    }

    // Add empty cells for days after the last day of the month
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      });
    }

    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1),
    );
  };

  const handleDayClick = (date: Date) => {
    if (disabled && disabled(date)) return;
    if (onSelect) {
      onSelect(date);
    }
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className={cn('p-3', className)} {...props}>
      <div
        className={cn(
          'flex justify-between items-center pb-4',
          classNames?.nav,
        )}
      >
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
            classNames?.nav_button,
            classNames?.nav_button_previous,
          )}
          onClick={goToPreviousMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className={cn('text-sm font-medium', classNames?.caption_label)}>
          {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>

        <button
          type="button"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
            classNames?.nav_button,
            classNames?.nav_button_next,
          )}
          onClick={goToNextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <table
        className={cn('w-full border-collapse space-y-1', classNames?.table)}
      >
        <thead>
          <tr className={cn('flex', classNames?.head_row)}>
            {daysOfWeek.map((day) => (
              <th
                key={day}
                className={cn(
                  'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
                  classNames?.head_cell,
                )}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(days.length / 7) }).map(
            (_, weekIndex) => (
              <tr
                key={weekIndex}
                className={cn('flex w-full mt-2', classNames?.row)}
              >
                {days
                  .slice(weekIndex * 7, (weekIndex + 1) * 7)
                  .map((day, dayIndex) => {
                    const isDisabled = disabled && disabled(day.date);

                    return (
                      <td
                        key={dayIndex}
                        className={cn(
                          'text-center text-sm p-0 relative',
                          classNames?.cell,
                        )}
                      >
                        <button
                          type="button"
                          className={cn(
                            'h-9 w-9 p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            !day.isCurrentMonth &&
                              'text-muted-foreground opacity-50',
                            day.isSelected &&
                              'bg-primary text-primary-foreground',
                            day.isToday &&
                              !day.isSelected &&
                              'bg-accent text-accent-foreground',
                            isDisabled &&
                              'text-muted-foreground opacity-30 cursor-not-allowed',
                            classNames?.day,
                            day.isSelected && classNames?.day_selected,
                            day.isToday && classNames?.day_today,
                            !day.isCurrentMonth && classNames?.day_outside,
                            isDisabled && classNames?.day_disabled,
                          )}
                          onClick={() => handleDayClick(day.date)}
                          disabled={isDisabled}
                        >
                          {day.date.getDate()}
                        </button>
                      </td>
                    );
                  })}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
