'use client';

import { useEffect, useState } from 'react';

interface ClientDateProps {
  value: string;
  format?: 'date' | 'dateTime';
  locale?: string;
}

export function ClientDate({
  value,
  format = 'date',
  locale = 'pl-PL',
}: ClientDateProps) {
  const [formatted, setFormatted] = useState('');

  useEffect(() => {
    const date = new Date(value);
    setFormatted(
      format === 'dateTime'
        ? date.toLocaleString(locale)
        : date.toLocaleDateString(locale)
    );
  }, [format, locale, value]);

  return <>{formatted}</>;
}
