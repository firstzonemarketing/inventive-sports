import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCms } from '../lib/cms';
import { assetUrl } from '../lib/assets';
import { CinematicSportsStage } from './CinematicSportsStage';

interface HeroRevealProps {
  reducedMotion: boolean;
}

export const HeroReveal: React.FC<HeroRevealProps> = ({ reducedMotion }) => {
  const { settings, navigate } = useCms();

  return (
    <>
      {/* SECTION 1 — GSAP SCROLLTRIGGER CINEMATIC HERO & MULTI-SPORT STAGE */}
      <CinematicSportsStage reducedMotion={reducedMotion} />

      {/* SECTION 2 — ABOUT THE ACADEMY (EDITORIAL SPLIT LAYOUT) */}
      <section
        id="about-academy-preview"
        aria-labelledby="about-academy-heading"
        className="relative w-full py-20 sm:py-28 bg-[#F5F5F5] border-b border-[#E7E7E7]"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left 6 Columns: Large Academy Image */}
          <div data-reveal className="lg:col-span-6 relative">
            <div className="relative aspect-[16/11] w-full bg-[#FFFFFF] border border-[#E7E7E7] p-2 shadow-[0_16px_44px_rgba(21,21,21,0.08)]">
              <img
                src={assetUrl('/images/about/multi.png')}
                alt="Multidisciplinary training at Inventive Sports Academy"
                loading="lazy"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute bottom-5 left-5 bg-[#151515]/92 text-[#FFFFFF] px-4 py-2 border-l-2 border-[#D71920]">
                <span className="font-tech-code text-[10px] text-[#D71920] block">
                  ESTABLISHED 2018 // BANGALORE
                </span>
                <span className="font-display font-bold text-sm">
                  Holistic Sports &amp; Performing Arts Ecosystem
                </span>
              </div>
            </div>
          </div>

          {/* Right 6 Columns: Animated Heading, Introduction, Selected Highlights & About Link */}
          <div data-reveal className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="w-6 h-[2px] bg-[#D71920]"
              />
              <span className="font-mono-label text-[11px] text-[#D71920]">
                ABOUT THE ACADEMY
              </span>
            </div>

            <h2
              id="about-academy-heading"
              className="heading-section text-[#151515] uppercase"
            >
              {settings.headline || 'MORE THAN A SPORTS ACADEMY.'}
            </h2>

            <p className="body-lead text-[#626262]">
              {settings.description ||
                'Inventive Sports brings together physical development, strategic thinking, creative expression, and teamwork in a multidisciplinary learning environment. We believe every discipline offers an opportunity to discover strengths, build confidence, and develop lifelong skills.'}
            </p>

            {/* Selected Highlights (No Invented Statistics) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E7E7E7]">
              {[
                'Multidisciplinary training across field sports, chess & performing arts',
                'Specialist coaches dedicated to foundational technique and character',
                'Purpose-built centers in Kammanahalli & Hesaraghatta, Bangalore',
                'Structured progression from beginner discovery to tournament play',
              ].map((highlight) => (
                <div key={highlight} className="flex items-start gap-2.5">
                  <CheckCircle2
                    aria-hidden="true"
                    className="w-4 h-4 text-[#D71920] shrink-0 mt-1"
                  />
                  <span className="text-xs sm:text-sm text-[#151515] font-medium leading-snug">
                    {highlight}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <a
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/about');
                }}
                className="inline-flex items-center gap-3 bg-[#151515] text-[#FFFFFF] font-mono-label text-xs px-6 py-4 hover:bg-[#D71920] transition-colors group"
              >
                <span>READ OUR STORY &amp; MEET THE LEADERSHIP</span>
                <ArrowRight
                  aria-hidden="true"
                  className="w-4 h-4 transition-transform group-hover:translate-x-1"
                />
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
