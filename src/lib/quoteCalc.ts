export type AreaTier = 'up_to_25' | '25_to_35' | '35_to_55' | 'multi_55_plus';
export type InstallStage = 'finished_wall' | 'two_stage_chase';
export type MoscowZone = 'inside_mkad' | 'new_moscow_mo';

export interface QuoteInput {
  areaTier: AreaTier;
  installStage: InstallStage;
  zone: MoscowZone;
}

export interface QuoteBreakdown {
  btuLabel: string;
  coolingKw: string;
  equipmentPrice: number;
  installPrice: number;
  deliveryPrice: number;
  totalPrice: number;
  durationLabel: string;
}

export const AREA_LABELS: Record<AreaTier, string> = {
  up_to_25: 'До 25 м²',
  '25_to_35': '25–35 м²',
  '35_to_55': '35–55 м²',
  multi_55_plus: '55+ м² (мультисплит)',
};

export const STAGE_LABELS: Record<InstallStage, string> = {
  finished_wall: 'Готовый ремонт (1 визит)',
  two_stage_chase: 'В штробу на этапе ремонта (2 этапа)',
};

export const ZONE_LABELS: Record<MoscowZone, string> = {
  inside_mkad: 'Москва в пределах МКАД',
  new_moscow_mo: 'Новая Москва и МО (до 30 км)',
};

export function calculateAcQuote(input: QuoteInput): QuoteBreakdown {
  const tiers: Record<
    AreaTier,
    { btu: string; kw: string; equip: number; baseInstall: number }
  > = {
    up_to_25: { btu: '09 BTU', kw: '2.5 кВт', equip: 42900, baseInstall: 15900 },
    '25_to_35': { btu: '12 BTU', kw: '3.5 кВт', equip: 54900, baseInstall: 17500 },
    '35_to_55': { btu: '18 BTU', kw: '5.0 кВт', equip: 78500, baseInstall: 21500 },
    multi_55_plus: { btu: '24+ BTU / 2 блока', kw: '7.1 кВт', equip: 138000, baseInstall: 34900 },
  };

  const t = tiers[input.areaTier];
  const stageExtra = input.installStage === 'two_stage_chase' ? 6500 : 0;
  const deliveryPrice = input.zone === 'inside_mkad' ? 0 : 1800;
  const installPrice = t.baseInstall + stageExtra;
  const totalPrice = t.equip + installPrice + deliveryPrice;

  return {
    btuLabel: t.btu,
    coolingKw: t.kw,
    equipmentPrice: t.equip,
    installPrice,
    deliveryPrice,
    totalPrice,
    durationLabel:
      input.installStage === 'two_stage_chase'
        ? '2 выезда · 2–3 ч на этап'
        : 'Доставка, распаковка и монтаж за 1 день (3–4 ч)',
  };
}

export function formatRub(amount: number): string {
  return `${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009')} ₽`;
}

export function validateQuoteForm(name: string, phone: string): {
  valid: boolean;
  nameError: string | null;
  phoneError: string | null;
} {
  const trimmedName = name.trim();
  const digits = phone.replace(/\D/g, '');
  const nameError =
    trimmedName.length < 2 ? 'Укажите имя (минимум 2 символа)' : null;
  const phoneError =
    digits.length < 10 || digits.length > 12
      ? 'Введите корректный номер телефона РФ'
      : null;

  return {
    valid: !nameError && !phoneError,
    nameError,
    phoneError,
  };
}
