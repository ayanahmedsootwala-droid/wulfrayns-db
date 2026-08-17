/**
 * useSettings — reads business/dealer info from localStorage (rpm_settings_*)
 * Single source of truth for all pages that display dealer contact details.
 */
const ls = (key: string, def: string) => {
  try { return localStorage.getItem(`rpm_settings_${key}`) ?? def; } catch { return def; }
};

export interface DealerSettings {
  bizName: string;
  bizPhone: string;
  bizEmail: string;
  bizAddress: string;
  bizWhatsApp: string;
  displayName: string;
  phoneNumber: string;
  website: string;
  instagram: string;
  ntn: string;
  strn: string;
  currency: string;
  defaultCity: string;
  tagline: string;
}

export function getSettings(): DealerSettings {
  return {
    bizName:     ls('bizName',     'Wulfrayn\'s DB'),
    bizPhone:    ls('bizPhone',    '+92 300 0000000'),
    bizEmail:    ls('bizEmail',    'info@rpmmotors.pk'),
    bizAddress:  ls('bizAddress',  'Karachi, Pakistan'),
    bizWhatsApp: ls('bizWhatsApp', '+92 300 0000000'),
    displayName: ls('displayName', 'Admin'),
    phoneNumber: ls('phoneNumber', '+92 300 0000000'),
    website:     ls('website',     ''),
    instagram:   ls('instagram',   ''),
    ntn:         ls('ntn',         ''),
    strn:        ls('strn',        ''),
    currency:    ls('currency',    'PKR'),
    defaultCity: ls('defaultCity', 'Karachi'),
    tagline:     ls('tagline',     'Drive Your Dream'),
  };
}

/** React hook — returns fresh settings on each render (reads localStorage synchronously). */
export function useSettings(): DealerSettings {
  return getSettings();
}
