import React, { useEffect, useRef, useState } from 'react';
import {
  computeBandEdgeRatio,
  drawDeliveryStage,
} from './renderers/deliverySceneCanvas';
import { CroppedAcCutouts, extractHeluxCutouts } from './lib/imageCrop';
import {
  clamp,
  computeCardSweepPercent,
  computeHorizonGlow,
  computeLayoutUnits,
  computeServicesProgress,
  computeSpeedKmh,
  easeInOutQuad,
  formatStatValue,
} from './lib/scrollMath';
import { ServiceIcon, ServiceIconType } from './components/ServiceIcons';
import { QuoteModal } from './components/QuoteModal';
import { ClientsSection } from './components/ClientsSection';
import { MoscowGlobe3D, MoscowGlobeState } from './components/MoscowGlobe3D';

interface StatDef {
  id: string;
  target: number;
  decimals: number;
  suffix: string;
  initialText: string;
  finalText: string;
  caption: string;
  isTextOnly?: boolean;
}

const STATS: StatDef[] = [
  {
    id: 'stat-1',
    target: 3200,
    decimals: 0,
    suffix: '+',
    initialText: '0+',
    finalText: '3\u2009200+',
    caption: 'Установленных систем в Москве',
  },
  {
    id: 'stat-2',
    target: 98.6,
    decimals: 1,
    suffix: '%',
    initialText: '0.0%',
    finalText: '98.6%',
    caption: 'Монтажей точно в день доставки',
  },
  {
    id: 'stat-3',
    target: 9,
    decimals: 0,
    suffix: '+',
    initialText: '0+',
    finalText: '9+',
    caption: 'Лет работы исключительно в Москве',
  },
  {
    id: 'stat-4',
    target: 45,
    decimals: 0,
    suffix: '+',
    initialText: '0+',
    finalText: '45+',
    caption: 'Штатных монтажных бригад',
  },
  {
    id: 'stat-5',
    target: 0,
    decimals: 0,
    suffix: '',
    initialText: '24/7',
    finalText: '24/7',
    caption: 'Сервисная поддержка клиентов',
    isTextOnly: true,
  },
];

interface ServiceCardDef {
  icon: ServiceIconType;
  titleLine1: string;
  titleLine2: string;
  body: string;
}

const SERVICE_CARDS: ServiceCardDef[] = [
  {
    icon: 'selection',
    titleLine1: 'ПОДБОР',
    titleLine2: 'ОБОРУДОВАНИЯ',
    body: 'Точный расчёт теплопритоков, уровня шума и подбор инверторных сплит-систем под планировку вашей квартиры или офиса.',
  },
  {
    icon: 'unpacking',
    titleLine1: 'ДОСТАВКА',
    titleLine2: 'И РАСПАКОВКА',
    body: 'Бережная доставка собственным транспортом по Москве, подъём на этаж, вскрытие заводской упаковки и проверка при вас.',
  },
  {
    icon: 'install',
    titleLine1: 'ЧИСТЫЙ',
    titleLine2: 'МОНТАЖ',
    body: 'Алмазное бурение с пылесосом, прокладка медной трассы, вакуумирование и пусконаладка по стандарту без пыли и следов.',
  },
  {
    icon: 'service',
    titleLine1: 'СЕРВИС',
    titleLine2: 'И ЧИСТКА',
    body: 'Сезонное техническое обслуживание, антибактериальная мойка теплообменников, проверка давления и дозаправка фреоном.',
  },
  {
    icon: 'multisplit',
    titleLine1: 'МУЛЬТИСПЛИТ',
    titleLine2: 'И ВЕНТИЛЯЦИЯ',
    body: 'Проектирование скрытых канальных и мультисплит-систем в два этапа для квартир бизнес-класса, офисов и коттеджей.',
  },
];

const HELUX_IMAGE_URL =
  '/assets/aistudio/file_0000000041888246a9c1217fc407515d_3fc3d648.png';

function runGlitchReveal(el: HTMLElement, delay: number): Animation | null {
  const anim = el.animate(
    [
      {
        opacity: 0,
        clipPath: 'inset(0 100% 0 0)',
        transform: 'translateX(-0.05em)',
        textShadow: '-0.12em 0 0 rgba(47,99,255,0.8), 0.07em 0 0 rgba(17,17,17,0.25)',
        offset: 0,
      },
      {
        opacity: 1,
        clipPath: 'inset(0 38% 0 0)',
        transform: 'translateX(0.035em)',
        textShadow: '0.09em 0 0 rgba(47,99,255,0.65), -0.05em 0 0 rgba(17,17,17,0.3)',
        offset: 0.3,
      },
      {
        opacity: 0.8,
        clipPath: 'inset(0)',
        transform: 'translateX(-0.018em)',
        textShadow: '-0.045em 0 0 rgba(47,99,255,0.55), 0.025em 0 0 rgba(17,17,17,0.2)',
        offset: 0.55,
      },
      {
        opacity: 1,
        clipPath: 'inset(0)',
        transform: 'translateX(0.008em)',
        textShadow: '0.015em 0 0 rgba(47,99,255,0.35), 0 0 0 rgba(17,17,17,0)',
        offset: 0.78,
      },
      {
        opacity: 1,
        clipPath: 'inset(0)',
        transform: 'none',
        textShadow: 'none',
        offset: 1,
      },
    ],
    {
      duration: 900,
      delay,
      easing: 'steps(14, end)',
      fill: 'backwards',
    }
  );
  anim.onfinish = () => {
    el.classList.remove('ent');
  };
  return anim;
}

function runFadeUp(
  el: HTMLElement,
  distancePx: number,
  duration: number,
  delay: number
): Animation | null {
  const anim = el.animate(
    [
      { opacity: 0, transform: `translateY(${distancePx}px)` },
      { opacity: 1, transform: 'none' },
    ],
    {
      duration,
      delay,
      easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
      fill: 'backwards',
    }
  );
  anim.onfinish = () => {
    el.classList.remove('ent');
  };
  return anim;
}

export default function App() {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteNote, setQuoteNote] = useState<string | undefined>(undefined);

  const hwrapRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const hfRef = useRef<HTMLDivElement>(null);
  const globeStateRef = useRef<MoscowGlobeState>({
    vw: 1440,
    heroHeight: 900,
    uv: 1,
    up: 1,
    isPortrait: false,
    reducedMotion: false,
    scrollFadeOpacity: 1,
    hidden: false,
  });
  const logoRef = useRef<HTMLAnchorElement>(null);
  const navLinkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const overRef = useRef<HTMLParagraphElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const heroLineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const ledeRef = useRef<HTMLParagraphElement>(null);
  const btnsRef = useRef<HTMLDivElement>(null);
  const hzRef = useRef<HTMLDivElement>(null);

  const phRef = useRef<HTMLDivElement>(null);
  const phImgRef = useRef<HTMLImageElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const bigLineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const bigHeadingRef = useRef<HTMLHeadingElement>(null);
  const statItemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const statNumRefs = useRef<(HTMLDivElement | null)[]>([]);

  const trackRef = useRef<HTMLElement>(null);
  const deliveryCanvasRef = useRef<HTMLCanvasElement>(null);
  const cutoutsRef = useRef<CroppedAcCutouts | null>(null);
  const lettersRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const cardSweepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    const root = document.documentElement;
    if ('registerProperty' in CSS) {
      try {
        (CSS as unknown as { registerProperty: (def: Record<string, unknown>) => void }).registerProperty({
          name: '--hl',
          syntax: '<number>',
          inherits: false,
          initialValue: '1',
        });
      } catch {
        // already registered
      }
    }

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isRecorder =
      new URLSearchParams(window.location.search).get('rec') === '1';

    let heroRevealFinished = reducedMotion;
    const startTime = performance.now();

    // Hero Load Sequence
    if (!reducedMotion) {
      if (logoRef.current) runFadeUp(logoRef.current, 8, 700, 0);
      navLinkRefs.current.forEach((a, i) => {
        if (a) runFadeUp(a, 8, 700, (i + 1) * 70);
      });
      if (overRef.current) runFadeUp(overRef.current, 10, 700, 150);

      heroLineRefs.current.forEach((ln, i) => {
        if (!ln) return;
        const anim = runGlitchReveal(ln, 260 + i * 130);
        if (i === heroLineRefs.current.length - 1 && anim) {
          anim.onfinish = () => {
            ln.classList.remove('ent');
            heroRevealFinished = true;
          };
        }
      });

      if (ledeRef.current) runFadeUp(ledeRef.current, 14, 800, 900);
      if (btnsRef.current) runFadeUp(btnsRef.current, 14, 800, 1040);
    } else {
      document.querySelectorAll('.ent').forEach((el) => el.classList.remove('ent'));
    }

    // Stats IntersectionObservers
    const observers: IntersectionObserver[] = [];

    if (reducedMotion) {
      statNumRefs.current.forEach((el, idx) => {
        if (el) el.textContent = STATS[idx].finalText;
      });
    } else {
      if (phRef.current) {
        const photoObs = new IntersectionObserver(
          (entries) => {
            if (!entries[0].isIntersecting) return;
            photoObs.disconnect();

            phRef.current?.animate(
              [
                { clipPath: 'inset(100% 0 0 0)' },
                { clipPath: 'inset(0 0 0 0)' },
              ],
              {
                duration: 1100,
                easing: 'cubic-bezier(0.7, 0, 0.2, 1)',
                fill: 'both',
              }
            );
            phImgRef.current?.animate(
              [{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
              {
                duration: 1600,
                easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
                fill: 'both',
              }
            );
            if (introRef.current) {
              runFadeUp(introRef.current, 14, 900, 250);
            }
          },
          { threshold: 0, rootMargin: '0px 0px -15% 0px' }
        );
        photoObs.observe(phRef.current);
        observers.push(photoObs);
      }

      if (bigHeadingRef.current) {
        const bigObs = new IntersectionObserver(
          (entries) => {
            if (!entries[0].isIntersecting) return;
            bigObs.disconnect();
            bigLineRefs.current.forEach((ln, i) => {
              if (ln) runGlitchReveal(ln, i * 130);
            });
          },
          { threshold: 0, rootMargin: '0px 0px -15% 0px' }
        );
        bigObs.observe(bigHeadingRef.current);
        observers.push(bigObs);
      }

      statItemRefs.current.forEach((li, idx) => {
        if (!li) return;
        const stat = STATS[idx];
        const numEl = statNumRefs.current[idx];
        const obs = new IntersectionObserver(
          (entries) => {
            if (!entries[0].isIntersecting) return;
            obs.disconnect();

            runFadeUp(li, 12, 700, 0);
            if (numEl) runGlitchReveal(numEl, 60);

            li.animate([{ '--hl': 0 }, { '--hl': 1 }] as Keyframe[], {
              duration: 900,
              delay: 60,
              easing: 'cubic-bezier(0.7, 0, 0.2, 1)',
              fill: 'both',
            });

            if (!stat.isTextOnly && numEl) {
              const countStart = performance.now() + 60;
              const countDur = 1600;
              const stepCount = (now: number) => {
                const p = clamp((now - countStart) / countDur);
                numEl.textContent = formatStatValue(
                  stat.target,
                  stat.decimals,
                  stat.suffix,
                  p
                );
                if (p < 1) requestAnimationFrame(stepCount);
              };
              requestAnimationFrame(stepCount);
            }
          },
          { threshold: 0, rootMargin: '0px 0px -15% 0px' }
        );
        obs.observe(li);
        observers.push(obs);
      });
    }

    // Dynamic state updated on resize & scroll
    let units = computeLayoutUnits(
      document.documentElement.clientWidth,
      document.documentElement.clientHeight
    );
    let stripWidth = 2200;
    let lettersWidth = 3000;

    const measureAndApplyUnits = () => {
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;

      stripWidth = stripRef.current ? stripRef.current.scrollWidth : 2200;
      lettersWidth = lettersRef.current ? lettersRef.current.scrollWidth : 3000;

      // First pass to compute uc for measuring short landscape copy height
      const prelim = computeLayoutUnits(vw, vh, stripWidth, 0);
      root.style.setProperty('--uc', `${prelim.uc}px`);
      root.classList.toggle('m-port', prelim.modes.port);
      root.classList.toggle('m-land', prelim.modes.land);
      root.classList.toggle('m-hp', prelim.modes.hp);
      root.classList.toggle('sticky', prelim.modes.sticky);

      let copyBottom = 0;
      if (prelim.modes.land && copyRef.current) {
        copyBottom =
          copyRef.current.offsetTop + copyRef.current.offsetHeight;
      }

      units = computeLayoutUnits(vw, vh, stripWidth, copyBottom);

      root.style.setProperty('--uc', `${units.uc}px`);
      root.style.setProperty('--uv', `${units.uv}px`);
      root.style.setProperty('--us', `${units.us}px`);
      root.style.setProperty('--u', `${units.u}px`);
      root.style.setProperty('--up', `${units.up}px`);

      if (hwrapRef.current) {
        hwrapRef.current.style.height = `${units.wrapHeight}px`;
      }
      if (heroRef.current) {
        heroRef.current.style.height = units.modes.port
          ? 'auto'
          : `${units.heroHeight}px`;
      }
      if (hfRef.current) {
        hfRef.current.style.top = units.modes.port
          ? 'auto'
          : `${Math.max(0, (units.vh - 900 * units.uc) / 2)}px`;
      }
      if (trackRef.current) {
        trackRef.current.style.height = `${(1 + units.A + units.B) * units.vh}px`;
      }
    };

    measureAndApplyUnits();
    window.addEventListener('resize', measureAndApplyUnits);

    // Unified rAF loop
    let curQ = -1;
    let lastPaintedScrollY = -1;
    let lastPaintedQ = -1;
    let lastTrackTop = -1;
    let prevScrollY = window.scrollY;
    let prevTime = performance.now();
    let smoothedSpeed = 0;
    let rafId = 0;

    const updateFrame = (
      now: number,
      overrideQ?: number,
      overrideSpeedLabel?: string,
      forceRepaint = false
    ) => {
      const elapsedSec = (now - startTime) / 1000;
      const scrollY = window.scrollY;
      const dt = Math.max(0.008, (now - prevTime) / 1000);
      const dy = scrollY - prevScrollY;
      prevScrollY = scrollY;
      prevTime = now;

      const scrollChanged = forceRepaint || Math.abs(scrollY - lastPaintedScrollY) > 0.25;

      // 1. Horizon Glow & Hero Scroll Response
      const glow = computeHorizonGlow(units.wrapHeight, scrollY, units.vh);

      if (scrollChanged) {
        lastPaintedScrollY = scrollY;

        if (hzRef.current) {
          if (glow.visible) {
            const Rx = Math.max(0.75 * units.vw, 0.9 * units.vh);
            const Ry = 0.72 * units.vh;
            const centreY = glow.drawnEdge * units.vh - Ry;
            hzRef.current.style.display = 'block';
            hzRef.current.style.opacity = String(glow.opacity);
            hzRef.current.style.background = `radial-gradient(${Rx}px ${Ry}px at 50% ${centreY}px, rgba(255,255,255,0) 0px, rgba(238,242,255,0) ${(0.985 * Rx).toFixed(1)}px, rgba(214,224,255,0.6) ${Rx.toFixed(1)}px, #9fb2ff ${(1.06 * Rx).toFixed(1)}px, #5a80ff ${(1.14 * Rx).toFixed(1)}px, #2f63ff ${(1.236 * Rx).toFixed(1)}px, #5a80ff ${(1.32 * Rx).toFixed(1)}px, #a9bcff ${(1.42 * Rx).toFixed(1)}px, #dfe6ff ${(1.53 * Rx).toFixed(1)}px, #ffffff ${(1.65 * Rx).toFixed(1)}px)`;
          } else {
            hzRef.current.style.display = 'none';
          }
        }

        if (heroRef.current) {
          heroRef.current.style.visibility =
            units.modes.sticky && glow.heroHidden ? 'hidden' : 'visible';
        }

        if (copyRef.current) {
          copyRef.current.style.opacity = String(glow.copyOpacity);
          copyRef.current.style.transform = `translateY(${glow.copyTranslateVh}vh)`;
        }

        if (logoRef.current) {
          logoRef.current.style.opacity = String(glow.navOpacity);
        }
        navLinkRefs.current.forEach((a) => {
          if (a) a.style.opacity = String(glow.navOpacity);
        });

        if (heroRevealFinished) {
          heroLineRefs.current.forEach((ln, idx) => {
            if (!ln) return;
            if (glow.k <= 0) {
              ln.style.transform = '';
              ln.style.textShadow = '';
              ln.style.clipPath = '';
            } else {
              const sign = idx % 2 === 0 ? 1 : -1;
              const o = glow.glitchJ * 0.09 * sign;
              ln.style.transform = `translateX(${o}em)`;
              ln.style.textShadow = `${(-1.6 * o).toFixed(4)}em 0 0 rgba(47,99,255,${(0.7 * glow.k + 0.15).toFixed(2)}), ${(0.8 * o).toFixed(4)}em 0 0 rgba(17,17,17,0.25)`;
              ln.style.clipPath = `inset(0 ${(glow.k * glow.k * 100).toFixed(2)}% 0 0)`;
            }
          });
        }
      }

      // 2. Sync Three.js 3D Moscow Planet state without React re-renders
      globeStateRef.current.vw = units.vw;
      globeStateRef.current.heroHeight = units.heroHeight;
      globeStateRef.current.uv = units.uv;
      globeStateRef.current.up = units.up;
      globeStateRef.current.isPortrait = units.modes.port;
      globeStateRef.current.reducedMotion = reducedMotion;
      globeStateRef.current.scrollFadeOpacity = glow.globeOpacity;
      globeStateRef.current.hidden = units.modes.sticky && glow.heroHidden;

      // 3. Services Scroll Scene
      if (trackRef.current) {
        const trackTop =
          lastTrackTop >= 0 && !scrollChanged
            ? lastTrackTop
            : (lastTrackTop = trackRef.current.offsetTop);

        const serv = computeServicesProgress(
          scrollY,
          trackTop,
          units.vh,
          units.A,
          units.B,
          stripWidth,
          lettersWidth,
          units.vw
        );

        const targetQ = overrideQ !== undefined ? overrideQ : serv.q;
        if (curQ < 0 || overrideQ !== undefined || isRecorder) curQ = targetQ;
        else curQ = curQ + (targetQ - curQ) * 0.2;

        if (Math.abs(targetQ - curQ) < 0.0005) curQ = targetQ;

        const qChanged = forceRepaint || Math.abs(curQ - lastPaintedQ) > 0.0002;

        if (qChanged) {
          lastPaintedQ = curQ;
          const edgePx = computeBandEdgeRatio(curQ, units.modes.hp) * units.vh;
          root.style.setProperty('--edge-px', `${edgePx.toFixed(1)}px`);
          root.style.setProperty('--ph', serv.settled || curQ >= 0.94 ? '1' : '0');

          if (deliveryCanvasRef.current) {
            drawDeliveryStage({
              canvas: deliveryCanvasRef.current,
              q: curQ,
              isPhone: units.modes.hp,
              cutouts: cutoutsRef.current,
            });
          }
        }

        if (scrollChanged) {
          if (stripRef.current) {
            stripRef.current.style.transform = `translateX(${serv.stripX.toFixed(1)}px)`;
          }
          if (lettersRef.current) {
            lettersRef.current.style.transform = `translateX(${serv.lettersX.toFixed(1)}px)`;
          }

          // Card cobalt-to-white text sweep
          const lefts = cardSweepRefs.current.map((el) =>
            el ? el.getBoundingClientRect().left : 0
          );
          cardSweepRefs.current.forEach((el, idx) => {
            if (!el) return;
            const s = computeCardSweepPercent(lefts[idx], units.vw);
            el.style.setProperty('--s', `${s.toFixed(2)}%`);
          });
        }

        // Speed readout (only update DOM when value changes)
        if (readoutRef.current) {
          if (overrideSpeedLabel) {
            readoutRef.current.textContent = overrideSpeedLabel;
          } else if (Math.abs(dy) > 0.1 || smoothedSpeed > 0.05) {
            const spd = computeSpeedKmh(dy, dt, smoothedSpeed);
            smoothedSpeed = spd.speed;
            if (readoutRef.current.textContent !== spd.label) {
              readoutRef.current.textContent = spd.label;
            }
          }
        }
      }
    };

    const handleResizeForce = () => {
      measureAndApplyUnits();
      lastTrackTop = -1;
      updateFrame(performance.now(), undefined, undefined, true);
    };
    window.removeEventListener('resize', measureAndApplyUnits);
    window.addEventListener('resize', handleResizeForce);

    let onRecScroll: (() => void) | null = null;

    // Recorder mode hook (?rec=1)
    if (isRecorder) {
      let lastRecY = 0;
      (
        window as unknown as {
          __recTime?: (_video: unknown, t: number) => number;
        }
      ).__recTime = (_video: unknown, t: number) => {
        const trackTop = trackRef.current ? trackRef.current.offsetTop : 0;
        const totalSpan = (units.A + units.B) * units.vh;
        let k = 0;
        if (t > 0.44 && t < 10.56) {
          k = easeInOutQuad((t - 0.44) / (10.56 - 0.44));
        } else if (t >= 10.56) {
          k = 1;
        }
        const targetY = trackTop + k * totalSpan;
        const deltaY = Math.abs(targetY - lastRecY);
        lastRecY = targetY;
        window.scrollTo({ top: targetY, behavior: 'instant' as ScrollBehavior });
        const speedNum = Math.min(99, Math.round((deltaY * 60) / 32));
        const speedLabel = `${speedNum.toString().padStart(2, '0')} КМ/Ч`;
        const q = clamp((targetY - trackTop) / (units.A * units.vh));
        updateFrame(performance.now(), q, speedLabel, true);
        return q * 4.02;
      };
      onRecScroll = () => updateFrame(performance.now());
      window.addEventListener('scroll', onRecScroll, { passive: true });
      updateFrame(performance.now(), undefined, undefined, true);
    } else {
      const tick = (now: number) => {
        updateFrame(now);
        rafId = requestAnimationFrame(tick);
      };
      updateFrame(performance.now(), undefined, undefined, true);
      rafId = requestAnimationFrame(tick);
    }

    const handleAnchorClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href')?.slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    };
    document.addEventListener('click', handleAnchorClick);

    const heluxImg = new Image();
    heluxImg.onload = () => {
      if (cancelled) return;
      try {
        cutoutsRef.current = extractHeluxCutouts(heluxImg);
        lastPaintedQ = -1;
        updateFrame(performance.now(), undefined, undefined, true);
      } catch {
        // fallback primitives remain active if extraction fails
      }
    };
    heluxImg.src = HELUX_IMAGE_URL;

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResizeForce);
      if (onRecScroll) window.removeEventListener('scroll', onRecScroll);
      document.removeEventListener('click', handleAnchorClick);
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  const openQuoteWithNote = (note?: string) => {
    setQuoteNote(note);
    setQuoteOpen(true);
  };

  return (
    <main>
      {/* SECTION 1: 3D MOSCOW GLOBE HERO */}
      <div className="hwrap" ref={hwrapRef}>
        <section className="hero" id="top" ref={heroRef}>
          <MoscowGlobe3D stateRef={globeStateRef} />

          <div className="hf" ref={hfRef}>
            <a
              href="#top"
              className="logo ent"
              ref={logoRef}
              aria-label="KV Климат — наверх"
            >
              <svg viewBox="0 0 71 31" fill="currentColor" aria-hidden="true">
                <path d="M0 0h9.4v31H0V0zm12.2 14.3L24.5 0h10.8L21.2 15.1 35.8 31H24.6L12.2 16.5v-2.2z" />
                <path d="M32.4 0h9.8l8.1 20.6L58.4 0h9.4L54.7 31h-9.2L32.4 0z" />
              </svg>
            </a>

            <nav aria-label="Основная навигация">
              <ul className="vnav">
                <li>
                  <a
                    href="#about"
                    className="ent"
                    ref={(el) => {
                      navLinkRefs.current[0] = el;
                    }}
                  >
                    О КОМПАНИИ
                  </a>
                </li>
                <li>
                  <a
                    href="#services"
                    className="ent"
                    ref={(el) => {
                      navLinkRefs.current[1] = el;
                    }}
                  >
                    УСЛУГИ
                  </a>
                </li>
                <li>
                  <a
                    href="#clients"
                    className="ent"
                    ref={(el) => {
                      navLinkRefs.current[2] = el;
                    }}
                  >
                    КЛИЕНТЫ
                  </a>
                </li>
              </ul>
            </nav>

            <div className="copy" ref={copyRef}>
              <p className="over ent" ref={overRef}>
                РАБОТАЕМ ТОЛЬКО В МОСКВЕ
              </p>

              <h1 className="hl">
                {['МОНТАЖ', 'КЛИМАТА', 'В МОСКВЕ'].map((line, i) => (
                  <span
                    key={line}
                    className="ln ent"
                    ref={(el) => {
                      heroLineRefs.current[i] = el;
                    }}
                  >
                    {line}
                  </span>
                ))}
              </h1>

              <p className="lede ent" ref={ledeRef}>
                Подбор, быстрая доставка по столице, бережная распаковка и
                чистая установка кондиционеров в каждом округе Москвы.
              </p>

              <div className="btns ent" ref={btnsRef}>
                <button
                  type="button"
                  className="btn-pill btn-fill"
                  onClick={() => openQuoteWithNote()}
                >
                  РАССЧИТАТЬ СТОИМОСТЬ
                </button>
                <a href="#services" className="btn-pill btn-out">
                  НАШИ УСЛУГИ
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* HORIZON GLOW OVERLAY */}
      <div className="hz" ref={hzRef} aria-hidden="true" />

      {/* SECTION 2: PINNED STATS */}
      <section className="stats" id="about" aria-label="О компании и показатели">
        <div className="pin">
          <div className="ph" ref={phRef}>
            <img
              src="/src/assets/images/moscow_ac_install_1794963805050.jpg"
              alt="Установленный настенный инверторный кондиционер в современной московской квартире с видом на город"
              className="ph-img"
              ref={phImgRef}
              referrerPolicy="no-referrer"
            />
          </div>

          <h2 className="big" ref={bigHeadingRef}>
            {['СТАВИМ', 'КЛИМАТ.', 'ОТВЕЧАЕМ', 'ЗА ТИШИНУ.'].map((line, i) => (
              <span
                key={line}
                className="ln ent"
                ref={(el) => {
                  bigLineRefs.current[i] = el;
                }}
              >
                {line}
              </span>
            ))}
          </h2>
        </div>

        <div className="col">
          <div className="intro ent" ref={introRef}>
            <p>
              От точного расчёта мощности до первого запуска — вся логистика и
              монтаж находятся в руках одной московской инженерной команды.
            </p>
            <p>
              Привозим технику собственным транспортом, распаковываем заводскую
              коробку прямо на объекте, бурим без пыли и даём официальную
              гарантию на каждый метр трассы.
            </p>
            <div className="intro-links">
              <a href="#services" className="intro-link">
                Наши услуги
              </a>
              <button
                type="button"
                className="intro-link"
                onClick={() => openQuoteWithNote('Расчёт подбора и монтажа в Москве')}
              >
                Рассчитать монтаж
              </button>
            </div>
          </div>

          <ul className="nums">
            {STATS.map((stat, idx) => (
              <li
                key={stat.id}
                className="ent"
                ref={(el) => {
                  statItemRefs.current[idx] = el;
                }}
              >
                <div
                  className="n ent"
                  ref={(el) => {
                    statNumRefs.current[idx] = el;
                  }}
                >
                  {stat.initialText}
                </div>
                <div className="c">{stat.caption}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SECTION 3: SERVICES DELIVERY & UNPACKING SCROLL SCENE */}
      <section
        className="track"
        id="services"
        ref={trackRef}
        aria-label="Доставка, распаковка и услуги"
      >
        <div className="scene">
          <div className="scene-bg-band" aria-hidden="true" />

          <div className="letters-clip" aria-hidden="true">
            <div className="letters" ref={lettersRef}>
              НАШИ УСЛУГИ
            </div>
          </div>

          <canvas
            id="delivery-stage"
            ref={deliveryCanvasRef}
            data-testid="delivery-stage-canvas"
            aria-label="Сцена доставки и распаковки кондиционеров KV Климат"
          />

          <div className="readout" ref={readoutRef} aria-hidden="true">
            00 КМ/Ч
          </div>

          <div className="band">
            <div className="strip" ref={stripRef}>
              <div className="lead">
                <h2 className="lead-hl">
                  ВСЁ ДЛЯ
                  <br />
                  КЛИМАТА
                  <br />
                  <span className="accent">В ОДНОМ МЕСТЕ.</span>
                </h2>
                <div className="lead-p">
                  <p>
                    От доставки со склада в Москве и аккуратной распаковки при
                    вас до скрытой прокладки фреонотрассы и пусконаладки.
                  </p>
                  <p>
                    Один договор, собственный автопарк, штатные монтажники и
                    полная прозрачность по цене и срокам.
                  </p>
                </div>
              </div>

              {SERVICE_CARDS.map((card, idx) => (
                <article className="card" key={card.titleLine1 + card.titleLine2}>
                  <ServiceIcon type={card.icon} />
                  <div
                    className="card-sweep"
                    ref={(el) => {
                      cardSweepRefs.current[idx] = el;
                    }}
                  >
                    <h3 className="card-title">
                      {card.titleLine1}
                      <br />
                      {card.titleLine2}
                    </h3>
                    <p className="card-body">{card.body}</p>
                  </div>
                </article>
              ))}
            </div>

            <button
              type="button"
              className="pill"
              onClick={() => openQuoteWithNote('Консультация по услугам доставки и монтажа')}
            >
              Выбрать кондиционер и монтаж
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 4: MOSCOW CLIENTS & REVIEWS */}
      <ClientsSection onRequestQuote={openQuoteWithNote} />

      <QuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        initialServiceNote={quoteNote}
      />
    </main>
  );
}
