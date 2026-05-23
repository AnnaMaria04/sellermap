import type { SupplierProduct } from "@/lib/providers/supplier/types";

export type ProductFingerprint = {
  productType: string;
  targetCustomer: string;
  useCase: string;
  keyFeatures: string[];
  ruKeywords: string[];
  categoryGuess: string;
  differentiationAngles: string[];
  irrelevantTermsToAvoid: string[];
};

const NOISE = /\b(high|quality|factory|wholesale|custom|oem|odm|hot|sale|new|manufacturer|supplier|moq|for|with|and)\b/gi;

function unique(values: string[]) {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

export function cleanSupplierTitle(title: string) {
  return title.replace(NOISE, "").replace(/\s+/g, " ").trim();
}

export function fingerprintSupplierProduct(product: SupplierProduct): ProductFingerprint {
  const title = cleanSupplierTitle(product.productTitle || product.originalTitle || "товар");
  const lower = title.toLowerCase();
  const specs = Object.values(product.specs ?? {}).join(" ").toLowerCase();
  const text = `${lower} ${specs}`;

  if (/posca|paint marker|acrylic marker|marker|маркер/.test(text)) {
    return {
      productType: "акриловый маркер",
      targetCustomer: "художники, школьники, покупатели товаров для творчества",
      useCase: "рисование и декоративная разметка по разным поверхностям",
      keyFeatures: unique(["акриловые чернила", "разные цвета", "тонкий наконечник", "подходит для творчества"]),
      ruKeywords: unique(["акриловый маркер", "маркер POSCA", "маркер для рисования", "перманентный маркер", "набор маркеров"]),
      categoryGuess: "Канцтовары / Хобби и творчество",
      differentiationAngles: ["комплект цветов", "качество наконечника", "фото результата на разных поверхностях"],
      irrelevantTermsToAvoid: ["wholesale", "factory", "high quality", "OEM"],
    };
  }

  if (/lamp|light|ламп|светиль/.test(text)) {
    return {
      productType: "настольная лампа",
      targetCustomer: "покупатели товаров для дома, учебы и рабочего места",
      useCase: "освещение рабочего стола",
      keyFeatures: unique(["LED", "диммер", "USB", "компактная упаковка"]),
      ruKeywords: unique(["настольная лампа", "лампа настольная LED", "светильник настольный", "лампа для рабочего стола"]),
      categoryGuess: "Дом / Освещение",
      differentiationAngles: ["регулировка яркости", "USB питание", "фото на рабочем столе"],
      irrelevantTermsToAvoid: ["factory", "wholesale", "custom"],
    };
  }

  if (/backpack|рюкзак/.test(text)) {
    return {
      productType: "городской рюкзак",
      targetCustomer: "студенты, офисные сотрудники, путешественники",
      useCase: "повседневная переноска вещей и ноутбука",
      keyFeatures: unique(["объем", "водостойкость", "отделение для ноутбука"]),
      ruKeywords: unique(["рюкзак городской", "рюкзак 30 литров", "рюкзак для ноутбука", "водонепроницаемый рюкзак"]),
      categoryGuess: "Аксессуары / Рюкзаки",
      differentiationAngles: ["объем", "организация отделений", "материал и фурнитура"],
      irrelevantTermsToAvoid: ["factory", "wholesale"],
    };
  }

  if (/iphone|phone case|чехол/.test(text)) {
    return {
      productType: "чехол для телефона",
      targetCustomer: "пользователи смартфонов",
      useCase: "защита телефона от царапин и ударов",
      keyFeatures: unique(["модель телефона", "материал", "защита камеры"]),
      ruKeywords: unique(["чехол для iPhone", "прозрачный чехол", "силиконовый чехол", "чехол для телефона"]),
      categoryGuess: "Электроника / Аксессуары",
      differentiationAngles: ["совместимость с моделью", "защита камеры", "качество материала"],
      irrelevantTermsToAvoid: ["wholesale", "bulk"],
    };
  }

  const words = title.split(/\s+/).slice(0, 4).join(" ");
  return {
    productType: words || "товар",
    targetCustomer: "покупатели Wildberries",
    useCase: "повседневное использование",
    keyFeatures: unique(title.split(/\s+/).slice(0, 5)),
    ruKeywords: unique([words, product.specs?.category ?? "", product.productTitle].filter(Boolean).slice(0, 4)),
    categoryGuess: product.specs?.category ?? "Категория не определена",
    differentiationAngles: ["комплектация", "цена", "визуальная подача карточки"],
    irrelevantTermsToAvoid: ["wholesale", "factory", "custom", "MOQ"],
  };
}
