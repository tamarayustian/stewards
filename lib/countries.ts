export const COUNTRIES = [
  { code: '+852', label: 'HK +852' },
  { code: '+1', label: 'US +1' },
  { code: '+86', label: 'CN +86' },
  { code: '+886', label: 'TW +886' },
  { code: '+44', label: 'UK +44' },
  { code: '+81', label: 'JP +81' },
  { code: '+82', label: 'KR +82' },
  { code: '+65', label: 'SG +65' },
  { code: '+61', label: 'AU +61' },
  { code: '+1', label: 'CA +1' },
  { code: '+49', label: 'DE +49' },
  { code: '+33', label: 'FR +33' },
  { code: '+62', label: 'ID +62' },
  { code: '+63', label: 'PH +63' },
] as const;

export type Country = (typeof COUNTRIES)[number];

export const DEFAULT_COUNTRY_CODE: Country['code'] = '+852';
