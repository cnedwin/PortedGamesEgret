/** The shorter Sluice Intercept challenge. Times are simulation seconds. */
export const INTERCEPT_PACING = { ready: 16, break: 11 };

/**
 * Mixed patrols give the two sluices separate interception windows. The first junk arrives in wave two.
 * Wider spacing between patrols gives defenders time to reopen a gate and cover the crew's landing.
 */
export const INTERCEPT_WAVES = [
  [
    { kind: 'raider', count: 6, gap: 2.8 },
    { kind: 'skiff', count: 3, gap: 3.3, delay: 2 },
    { kind: 'raider', count: 5, gap: 4.4, delay: 23 },
    { kind: 'skiff', count: 3, gap: 3.8, delay: 39 }
  ],
  [
    { kind: 'raider', count: 8, gap: 2.1 },
    { kind: 'skiff', count: 2, gap: 3.4, delay: 10 },
    { kind: 'junk', count: 2, gap: 30, delay: 13 },
    { kind: 'shield', count: 4, gap: 3.1, delay: 32 },
    { kind: 'skiff', count: 3, gap: 3.7, delay: 45 }
  ],
  [
    { kind: 'shield', count: 6, gap: 2.5 },
    { kind: 'skiff', count: 7, gap: 1.5, delay: 4 },
    { kind: 'junk', count: 2, gap: 9, delay: 23 },
    { kind: 'raider', count: 7, gap: 2.3, delay: 26 },
    { kind: 'skiff', count: 4, gap: 2.2, delay: 47 }
  ],
  [
    { kind: 'raider', count: 12, gap: 1.3 },
    { kind: 'junk', count: 2, gap: 8, delay: 6 },
    { kind: 'skiff', count: 8, gap: 2.2, delay: 9 },
    { kind: 'junk', count: 2, gap: 11, delay: 37 },
    { kind: 'shield', count: 7, gap: 2.2, delay: 39 }
  ],
  [
    { kind: 'shield', count: 7, gap: 1.8 },
    { kind: 'skiff', count: 7, gap: 2.5, delay: 6 },
    { kind: 'flagship', count: 1, gap: 1, delay: 16 },
    { kind: 'raider', count: 14, gap: 1.1, delay: 25 },
    { kind: 'junk', count: 2, gap: 10, delay: 45 },
    { kind: 'skiff', count: 5, gap: 3.2, delay: 47 }
  ]
];
