import React, { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import {
  AREA_LABELS,
  AreaTier,
  InstallStage,
  MoscowZone,
  STAGE_LABELS,
  ZONE_LABELS,
  calculateAcQuote,
  formatRub,
  validateQuoteForm,
} from '../lib/quoteCalc';

interface QuoteModalProps {
  open: boolean;
  onClose: () => void;
  initialServiceNote?: string;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({
  open,
  onClose,
  initialServiceNote,
}) => {
  const [areaTier, setAreaTier] = useState<AreaTier>('25_to_35');
  const [installStage, setInstallStage] =
    useState<InstallStage>('finished_wall');
  const [zone, setZone] = useState<MoscowZone>('inside_mkad');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{
    name: string | null;
    phone: string | null;
  }>({ name: null, phone: null });
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const breakdown = calculateAcQuote({ areaTier, installStage, zone });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateQuoteForm(name, phone);
    if (!res.valid) {
      setErrors({ name: res.nameError, phone: res.phoneError });
      return;
    }
    setErrors({ name: null, phone: null });
    const code = `KV-${Math.floor(1000 + Math.random() * 9000)}`;
    setSubmittedRef(code);
  };

  const handleReset = () => {
    setSubmittedRef(null);
    setName('');
    setPhone('');
    setErrors({ name: null, phone: null });
  };

  return (
    <div
      className="quote-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="quote-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-modal-title"
      >
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#d9dbe0]">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.09em] text-[#2f63ff]">
              Только Москва · Все округа
            </p>
            <h3
              id="quote-modal-title"
              className="mt-1 text-[28px] leading-none uppercase tracking-tight text-[#111111]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Расчёт под ключ
            </h3>
            {initialServiceNote && (
              <p className="mt-2 text-xs text-[#5d6270]">{initialServiceNote}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно расчёта"
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[#d9dbe0] text-[#111111] hover:border-[#2f63ff] hover:text-[#2f63ff] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submittedRef ? (
          <div className="py-8">
            <div className="w-11 h-11 rounded-full bg-[#eef2ff] text-[#2f63ff] flex items-center justify-center mb-4">
              <Check className="w-5 h-5" />
            </div>
            <h4
              className="text-2xl uppercase text-[#111111]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Заявка {submittedRef} оформлена
            </h4>
            <p className="mt-2 text-sm text-[#5d6270] leading-relaxed">
              Инженер KV Климат свяжется с вами по номеру{' '}
              <span className="text-[#111111] font-medium">{phone}</span> в
              течение 15 минут, подтвердит модель ({breakdown.btuLabel}) и
              согласует удобное время доставки с распаковкой и монтажом.
            </p>
            <div className="mt-5 pt-4 border-t border-[#d9dbe0] flex items-center justify-between text-sm">
              <span className="text-[#6b6f78]">Предварительная смета</span>
              <span className="font-mono font-medium text-[#2f63ff] tabular-nums">
                {formatRub(breakdown.totalPrice)}
              </span>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 h-10 rounded-full bg-[#2f63ff] hover:bg-[#1f4fe0] text-white font-mono text-xs uppercase tracking-[0.09em] transition-colors cursor-pointer"
              >
                Готово
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-5 h-10 rounded-full border border-[#d9dbe0] hover:border-[#111111] text-[#111111] font-mono text-xs uppercase tracking-[0.09em] transition-colors cursor-pointer"
              >
                Новый расчёт
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-[0.09em] text-[#5d6270] mb-2">
                Площадь помещения
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(AREA_LABELS) as AreaTier[]).map((key) => {
                  const active = areaTier === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAreaTier(key)}
                      className={`px-3 py-2.5 text-left text-xs font-medium border transition-colors cursor-pointer ${
                        active
                          ? 'border-[#2f63ff] bg-[#eef2ff] text-[#111111]'
                          : 'border-[#d9dbe0] bg-white text-[#5d6270] hover:border-[#111111]'
                      }`}
                    >
                      {AREA_LABELS[key]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-[0.09em] text-[#5d6270] mb-2">
                  Этап ремонта
                </label>
                <div className="space-y-2">
                  {(Object.keys(STAGE_LABELS) as InstallStage[]).map((key) => {
                    const active = installStage === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setInstallStage(key)}
                        className={`w-full px-3 py-2 text-left text-xs font-medium border transition-colors cursor-pointer ${
                          active
                            ? 'border-[#2f63ff] bg-[#eef2ff] text-[#111111]'
                            : 'border-[#d9dbe0] bg-white text-[#5d6270] hover:border-[#111111]'
                        }`}
                      >
                        {STAGE_LABELS[key]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-[0.09em] text-[#5d6270] mb-2">
                  Зона доставки
                </label>
                <div className="space-y-2">
                  {(Object.keys(ZONE_LABELS) as MoscowZone[]).map((key) => {
                    const active = zone === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setZone(key)}
                        className={`w-full px-3 py-2 text-left text-xs font-medium border transition-colors cursor-pointer ${
                          active
                            ? 'border-[#2f63ff] bg-[#eef2ff] text-[#111111]'
                            : 'border-[#d9dbe0] bg-white text-[#5d6270] hover:border-[#111111]'
                        }`}
                      >
                        {ZONE_LABELS[key]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-[#f8f9fc] border border-[#d9dbe0] p-4 space-y-2 text-xs">
              <div className="flex justify-between text-[#5d6270]">
                <span>Инверторная сплит-система ({breakdown.btuLabel} · {breakdown.coolingKw})</span>
                <span className="font-mono text-[#111111] tabular-nums">
                  {formatRub(breakdown.equipmentPrice)}
                </span>
              </div>
              <div className="flex justify-between text-[#5d6270]">
                <span>Доставка, подъём и распаковка при клиенте</span>
                <span className="font-mono text-[#111111] tabular-nums">
                  {breakdown.deliveryPrice === 0
                    ? 'Бесплатно'
                    : formatRub(breakdown.deliveryPrice)}
                </span>
              </div>
              <div className="flex justify-between text-[#5d6270]">
                <span>Чистый монтаж и вакуумирование</span>
                <span className="font-mono text-[#111111] tabular-nums">
                  {formatRub(breakdown.installPrice)}
                </span>
              </div>
              <div className="pt-2 border-t border-[#d9dbe0] flex items-baseline justify-between">
                <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#6b6f78]">
                  {breakdown.durationLabel}
                </span>
                <span
                  className="text-2xl text-[#2f63ff] tabular-nums"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {formatRub(breakdown.totalPrice)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="quote-name"
                  className="block text-[11px] font-mono uppercase tracking-[0.09em] text-[#5d6270] mb-1.5"
                >
                  Ваше имя
                </label>
                <input
                  id="quote-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Алексей"
                  className="w-full h-10 px-3 text-sm border border-[#d9dbe0] focus:border-[#2f63ff] focus:outline-none text-[#111111]"
                />
                {errors.name && (
                  <p className="mt-1 text-[11px] text-red-600">{errors.name}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="quote-phone"
                  className="block text-[11px] font-mono uppercase tracking-[0.09em] text-[#5d6270] mb-1.5"
                >
                  Телефон в Москве
                </label>
                <input
                  id="quote-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (999) 123-45-67"
                  className="w-full h-10 px-3 text-sm border border-[#d9dbe0] focus:border-[#2f63ff] focus:outline-none text-[#111111]"
                />
                {errors.phone && (
                  <p className="mt-1 text-[11px] text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>

            <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-[#6b6f78]">
                Гарантия 5 лет на оборудование и монтаж
              </span>
              <button
                type="submit"
                className="px-7 h-10 rounded-full bg-[#2f63ff] hover:bg-[#1f4fe0] text-white font-mono text-xs uppercase tracking-[0.09em] transition-colors cursor-pointer"
              >
                Отправить заявку
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
