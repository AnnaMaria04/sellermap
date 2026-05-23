// Official WB commission rates by subject category
export const WB_COMMISSIONS: Record<string, number> = {
  'Одежда': 0.23,
  'Обувь': 0.22,
  'Аксессуары': 0.20,
  'Аксессуары для путешествий': 0.20,
  'Электроника': 0.17,
  'Телефоны': 0.17,
  'Компьютеры': 0.15,
  'Бытовая техника': 0.15,
  'Дом и сад': 0.19,
  'Мебель': 0.20,
  'Игрушки': 0.20,
  'Красота': 0.21,
  'Косметика': 0.21,
  'Спорт': 0.18,
  'Здоровье': 0.18,
  'Продукты': 0.13,
  'Книги': 0.15,
  'Автотовары': 0.17,
  'Зоотовары': 0.18,
  'Канцтовары': 0.18,
  'Хобби и творчество': 0.18,
};

export function getWBCommission(category: string): number {
  if (WB_COMMISSIONS[category]) return WB_COMMISSIONS[category];
  for (const [key, val] of Object.entries(WB_COMMISSIONS)) {
    if (
      category.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(category.toLowerCase())
    ) {
      return val;
    }
  }
  return 0.19;
}
