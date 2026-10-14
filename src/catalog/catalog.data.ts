// Fixed system values (Decision Log D11, D14): admins cannot edit them, so this
// file is the source of truth. The seeder re-applies it on every startup, and
// its order is the display order of the dropdowns.
export interface CatalogEntry {
  code: string;
  titleEn: string;
  titleMy: string;
}

export const LEVELS: readonly CatalogEntry[] = [
  { code: 'F', titleEn: 'Foundation', titleMy: 'အခြေခံ' },
  { code: 'B', titleEn: 'Beginner', titleMy: 'အစပြုသူ' },
  { code: 'E', titleEn: 'Elementary', titleMy: 'အခြေခံအဆင့်' },
  { code: 'I', titleEn: 'Intermediate', titleMy: 'အလယ်အလတ်အဆင့်' },
];

export const CATEGORIES: readonly CatalogEntry[] = [
  { code: 'M', titleEn: 'Main Lesson', titleMy: 'အဓိကသင်ခန်းစာ' },
  { code: 'R', titleEn: 'Reading', titleMy: 'ဖတ်ရှုခြင်း' },
  { code: 'W', titleEn: 'Writing', titleMy: 'ရေးသားခြင်း' },
  { code: 'S', titleEn: 'Speaking', titleMy: 'စကားပြောခြင်း' },
  { code: 'G', titleEn: 'Grammar', titleMy: 'သဒ္ဒါ' },
  { code: 'P', titleEn: 'Poetry', titleMy: 'ကဗျာ' },
];
