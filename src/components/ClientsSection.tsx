import React, { useEffect, useRef, useState } from 'react';
import {
  DISTRICT_TABS,
  MOSCOW_REVIEWS,
  MoscowDistrictFilter,
  filterReviewsByDistrict,
} from '../data/reviewsData';
import { clamp, formatStatValue } from '../lib/scrollMath';

interface ClientsSectionProps {
  onRequestQuote: (note: string) => void;
}

export const ClientsSection: React.FC<ClientsSectionProps> = ({
  onRequestQuote,
}) => {
  const [district, setDistrict] = useState<MoscowDistrictFilter>('all');
  const sectionRef = useRef<HTMLElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const [hasCounted, setHasCounted] = useState(false);

  useEffect(() => {
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      if (countRef.current) countRef.current.textContent = '840+';
      setHasCounted(true);
      return;
    }

    const el = sectionRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || hasCounted) return;
        obs.disconnect();
        setHasCounted(true);

        const start = performance.now();
        const dur = 1600;
        const step = (now: number) => {
          const p = clamp((now - start) / dur);
          if (countRef.current) {
            countRef.current.textContent = formatStatValue(840, 0, '+', p);
          }
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasCounted]);

  const filteredReviews = filterReviewsByDistrict(district);
  const marqueeTop = [...MOSCOW_REVIEWS, ...MOSCOW_REVIEWS];
  const marqueeBottom = [
    ...MOSCOW_REVIEWS.slice(4),
    ...MOSCOW_REVIEWS.slice(0, 4),
    ...MOSCOW_REVIEWS.slice(4),
    ...MOSCOW_REVIEWS.slice(0, 4),
  ];

  return (
    <section
      className="clients-sec"
      id="clients"
      ref={sectionRef}
      aria-label="Сотни довольных клиентов в Москве"
    >
      <div className="clients-inner">
        <div className="clients-head">
          <div>
            <p className="clients-over">
              РАБОТАЕМ ТОЛЬКО ПО МОСКВЕ · ВСЕ ОКРУГА ВНУТРИ И РЯДОМ С МКАД
            </p>
            <h2 className="clients-hl">
              <span ref={countRef} className="clients-hl-count">
                840+
              </span>{' '}
              ДОВОЛЬНЫХ
              <br />
              КЛИЕНТОВ В МОСКВЕ
            </h2>
          </div>

          <div className="clients-metrics">
            <div className="clients-metric">
              <div className="clients-metric-val">4.9 / 5</div>
              <div className="clients-metric-lbl">
                Средняя оценка по 412 подтверждённым монтажам
              </div>
            </div>
            <div className="clients-metric">
              <div className="clients-metric-val">3 ч 20 м</div>
              <div className="clients-metric-lbl">
                От доставки с распаковкой до чистого запуска
              </div>
            </div>
          </div>
        </div>

        <div
          className="clients-tabs"
          role="tablist"
          aria-label="Фильтр отзывов по округам Москвы"
        >
          {DISTRICT_TABS.map((tab) => {
            const active = district === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDistrict(tab.key)}
                className={`clients-tab ${active ? 'is-active' : ''}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {district === 'all' ? (
        <div className="marquee-wrap" aria-label="Лента отзывов клиентов из Москвы">
          <div className="marquee-row">
            <div className="marquee-track">
              {marqueeTop.map((rev, idx) => (
                <article
                  key={`${rev.id}-top-${idx}`}
                  className="review-card review-card-marquee"
                >
                  <div className="review-meta">
                    <span>{rev.complex}</span>
                    <span aria-hidden="true">·</span>
                    <span>{rev.districtLabel}</span>
                  </div>
                  <p className="review-quote">«{rev.quote}»</p>
                  <div className="review-foot">
                    <span className="review-author">{rev.author}</span>
                    <span className="review-model">{rev.model}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="marquee-row">
            <div className="marquee-track marquee-track-reverse">
              {marqueeBottom.map((rev, idx) => (
                <article
                  key={`${rev.id}-bot-${idx}`}
                  className="review-card review-card-marquee"
                >
                  <div className="review-meta">
                    <span>{rev.complex}</span>
                    <span aria-hidden="true">·</span>
                    <span>{rev.installTime}</span>
                  </div>
                  <p className="review-quote">«{rev.quote}»</p>
                  <div className="review-foot">
                    <span className="review-author">{rev.author}</span>
                    <span className="review-model">{rev.model}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="clients-inner">
          <div className="clients-grid">
            {filteredReviews.map((rev) => (
              <article key={rev.id} className="review-card">
                <div className="review-meta">
                  <span>{rev.complex}</span>
                  <span aria-hidden="true">·</span>
                  <span>{rev.districtLabel}</span>
                </div>
                <p className="review-quote">«{rev.quote}»</p>
                <div className="review-foot">
                  <span className="review-author">{rev.author}</span>
                  <span className="review-model">{rev.model}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="clients-inner">
        <div className="clients-cta-bar">
          <div>
            <h3 className="clients-cta-title">
              ВЫЕЗД БРИГАДЫ ПО МОСКВЕ В ДЕНЬ ОБРАЩЕНИЯ
            </h3>
            <p className="clients-cta-sub">
              Привезём Helux Inverter, аккуратно распакуем при вас, выполним
              алмазное бурение без пыли и запустим систему с гарантией 5 лет.
            </p>
          </div>
          <button
            type="button"
            className="btn-pill btn-fill"
            onClick={() =>
              onRequestQuote(
                district === 'all'
                  ? 'Выезд инженера и расчёт по Москве'
                  : `Выезд инженера в округ: ${
                      DISTRICT_TABS.find((t) => t.key === district)?.label ??
                      'Москва'
                    }`
              )
            }
          >
            ВЫЗВАТЬ ИНЖЕНЕРА В МОСКВЕ
          </button>
        </div>

        <footer className="site-footer">
          <div className="footer-brand">
            <svg
              viewBox="0 0 71 31"
              fill="currentColor"
              className="footer-logo"
              aria-hidden="true"
            >
              <path d="M0 0h9.4v31H0V0zm12.2 14.3L24.5 0h10.8L21.2 15.1 35.8 31H24.6L12.2 16.5v-2.2z" />
              <path d="M32.4 0h9.8l8.1 20.6L58.4 0h9.4L54.7 31h-9.2L32.4 0z" />
            </svg>
            <span className="footer-note">
              KV Климат · Продажа и монтаж кондиционеров в Москве · Ежедневно
              09:00–21:00
            </span>
          </div>
          <div className="footer-links">
            <a href="#top">Карта Москвы</a>
            <a href="#about">Показатели</a>
            <a href="#services">Доставка и услуги</a>
            <a href="#clients">Отзывы</a>
          </div>
        </footer>
      </div>
    </section>
  );
};
