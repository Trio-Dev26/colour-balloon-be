// Fixed system values (PRD D11): admins cannot edit them, so this file is the
// source of truth. The seeder re-applies it on every startup, and its order is
// the display order of the dropdowns.
export interface CatalogEntry {
  code: string;
  titleEn: string;
  titleMy: string;
}

export const LEVELS: readonly CatalogEntry[] = [
  { code: 'FOUNDATION', titleEn: 'Foundation', titleMy: 'အခြေခံ' },
  { code: 'BEGINNER', titleEn: 'Beginner', titleMy: 'အစပြုသူ' },
  { code: 'ELEMENTARY', titleEn: 'Elementary', titleMy: 'အခြေခံအဆင့်' },
  { code: 'INTERMEDIATE', titleEn: 'Intermediate', titleMy: 'အလယ်အလတ်အဆင့်' },
  { code: 'PROFESSIONAL', titleEn: 'Professional', titleMy: 'ကျွမ်းကျင်အဆင့်' },
];

export const CATEGORIES: readonly CatalogEntry[] = [
  { code: 'MAIN_LESSON', titleEn: 'Main Lesson', titleMy: 'အဓိကသင်ခန်းစာ' },
  { code: 'READING', titleEn: 'Reading', titleMy: 'ဖတ်ရှုခြင်း' },
  { code: 'WRITING', titleEn: 'Writing', titleMy: 'ရေးသားခြင်း' },
  { code: 'SPEAKING', titleEn: 'Speaking', titleMy: 'စကားပြောခြင်း' },
  { code: 'GRAMMAR', titleEn: 'Grammar', titleMy: 'သဒ္ဒါ' },
  { code: 'POETRY', titleEn: 'Poetry', titleMy: 'ကဗျာ' },
];
