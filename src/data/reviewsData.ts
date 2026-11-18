export type MoscowDistrictFilter = 'all' | 'cao' | 'zao' | 'sao' | 'uao';

export interface ClientReview {
  id: string;
  author: string;
  complex: string;
  districtKey: Exclude<MoscowDistrictFilter, 'all'>;
  districtLabel: string;
  model: string;
  installTime: string;
  quote: string;
}

export const DISTRICT_TABS: { key: MoscowDistrictFilter; label: string }[] = [
  { key: 'all', label: 'Все округа Москвы' },
  { key: 'cao', label: 'ЦАО и Сити' },
  { key: 'zao', label: 'ЗАО и ЮЗАО' },
  { key: 'sao', label: 'САО и СВАО' },
  { key: 'uao', label: 'ЮАО и ЮВАО' },
];

export const MOSCOW_REVIEWS: ClientReview[] = [
  {
    id: 'rev-1',
    author: 'Михаил К.',
    complex: 'ЖК «Сердце Столицы»',
    districtKey: 'cao',
    districtLabel: 'ЦАО · Шелепихинская наб.',
    model: 'Helux Inverter 12 BTU',
    installTime: 'Доставка и монтаж за 3 ч 10 мин',
    quote:
      'Привезли систему точно к 10:00, распаковали заводскую коробку прямо в коридоре, показали комплектацию и пломбы. Бурили с пылесосом — на светлом полу ни пылинки.',
  },
  {
    id: 'rev-2',
    author: 'Елена С.',
    complex: 'Хамовники · Саввинская наб.',
    districtKey: 'cao',
    districtLabel: 'ЦАО · Хамовники',
    model: 'Helux Inverter 09 BTU (2 блока)',
    installTime: 'Монтаж в 2 этапа в штробу',
    quote:
      'Заказывали закладку трасс на этапе чернового ремонта и установку блоков после покраски стен. Бригада приехала со своими чехлами и лазерным уровнем, оба блока выставлены идеально.',
  },
  {
    id: 'rev-3',
    author: 'Артём и Анна В.',
    complex: 'ЖК «Событие» · Раменки',
    districtKey: 'zao',
    districtLabel: 'ЗАО · Раменки',
    model: 'Helux Inverter 18 BTU',
    installTime: 'Доставка и запуск в день заявки',
    quote:
      'Отдельно понравилось, что не нужно искать отдельно магазин и монтажников. Сделали расчёт под панорамные окна, привезли, распаковали и отвакуумировали трассу за один визит.',
  },
  {
    id: 'rev-4',
    author: 'Дмитрий Р.',
    complex: 'ЖК «Зиларт»',
    districtKey: 'uao',
    districtLabel: 'ЮАО · Даниловский',
    model: 'Helux Inverter 12 BTU',
    installTime: 'Монтаж за 2 ч 50 мин',
    quote:
      'Согласовали корзину на фасаде с УК, привезли тёмно-изумрудный Helux под наш интерьер. Работает на 19 дБ — ночью вообще не слышно.',
  },
  {
    id: 'rev-5',
    author: 'Ольга Н.',
    complex: 'Сокол · Ленинградский пр-т',
    districtKey: 'sao',
    districtLabel: 'САО · Сокол',
    model: 'Helux Inverter 09 BTU',
    installTime: 'Чистый монтаж по готовому ремонту',
    quote:
      'Очень переживала за свежие обои. Ребята застелили мебель плёнкой, аккуратно распаковали блоки, вынесли весь картон и объяснили управление с телефона.',
  },
  {
    id: 'rev-6',
    author: 'Сергей Л.',
    complex: 'Башня «Федерация» · Сити',
    districtKey: 'cao',
    districtLabel: 'ЦАО · Москва-Сити',
    model: 'Мультисплит · 3 внутренних блока',
    installTime: 'Ночной пропуск · сдача под ключ',
    quote:
      'В Сити строгий регламент по заносу техники. Ребята сами оформили пропуск, подняли оборудование, провели опрессовку азотом и сдали объект с актом.',
  },
  {
    id: 'rev-7',
    author: 'Наталья М.',
    complex: 'ЖК «Воробьёвы Горы»',
    districtKey: 'zao',
    districtLabel: 'ЮЗАО · Ломоносовский',
    model: 'Helux Inverter 12 BTU',
    installTime: 'Доставка + установка за 3 ч',
    quote:
      'Честная смета без доплат на месте: цена из калькулятора совпала с итогом в договоре до рубля. Упаковку вскрывали при мне, гарантию оформили на 5 лет.',
  },
  {
    id: 'rev-8',
    author: 'Игорь Т.',
    complex: 'ЖК «Символ» · Лефортово',
    districtKey: 'uao',
    districtLabel: 'ЮВАО · Лефортово',
    model: 'Helux Inverter 12 BTU',
    installTime: 'Установка за 3 ч 15 мин',
    quote:
      'Заказал утром — к вечеру в квартире уже прохладно. Проверили давление манометром, вывели дренаж аккуратно без лишних коробов.',
  },
  {
    id: 'rev-9',
    author: 'Виктория П.',
    complex: 'ЖК «ВТБ Арена Парк»',
    districtKey: 'sao',
    districtLabel: 'САО · Динамо',
    model: 'Helux Inverter 09 BTU',
    installTime: 'Монтаж в спальне за 2 ч 40 мин',
    quote:
      'Вторым заказом ставим у KV Климат — сначала себе, теперь родителям на Динамо. Приятно иметь дело с одной командой, которая отвечает за результат целиком.',
  },
];

export function filterReviewsByDistrict(
  filter: MoscowDistrictFilter
): ClientReview[] {
  if (filter === 'all') return MOSCOW_REVIEWS;
  return MOSCOW_REVIEWS.filter((r) => r.districtKey === filter);
}
