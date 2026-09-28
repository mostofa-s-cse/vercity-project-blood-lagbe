import React, { useState } from 'react';
import { ScreenId } from '../types/blood';
import { sound } from '../utils/audio';

interface PitchDeckScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const PitchDeckScreen: React.FC<PitchDeckScreenProps> = ({ onNavigate }) => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  const slides = [
    {
      title: 'The Blood Crisis in Bangladesh',
      subtitle: 'Fragmented communication, dangerous syndicates & urgent maternal emergencies',
      tag: 'PROBLEM ANALYSIS',
      accentColor: 'from-red-950 via-slate-900 to-black',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-3xl font-black text-red-500">800,000+</span>
              <h4 className="text-sm font-bold text-white mt-1">Annual Units Needed</h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Bangladesh experiences an acute deficit of safe voluntary blood, particularly for Thalassemia patients, trauma accidents, and emergency C-section deliveries.
              </p>
            </div>
            <span className="text-[11px] text-red-400 font-semibold mt-4">
              ~35% Deficit in public healthcare
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-3xl font-black text-amber-400">৳5K - ৳15K</span>
              <h4 className="text-sm font-bold text-white mt-1">Syndicate Exploitation</h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Middlemen and illegal blood brokers prey on grieving families outside major hospitals like DMCH, selling unsafe, unscreened bags with falsified test stamps.
              </p>
            </div>
            <span className="text-[11px] text-amber-400 font-semibold mt-4">
              Black market blood brokers
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-3xl font-black text-blue-400">Chaos</span>
              <h4 className="text-sm font-bold text-white mt-1">Unverified Social Posts</h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Desperate families post phone numbers on Facebook groups without verification, leading to harassment, fraudulent solicitations, and delayed emergency care.
              </p>
            </div>
            <span className="text-[11px] text-blue-400 font-semibold mt-4">
              Zero structured triage or telemetry
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Blood Lagbe? (রক্ত লাগবে?)',
      subtitle: 'Centralized Emergency Lifeline & Geofenced Telemetry Network',
      tag: 'OUR SOLUTION',
      accentColor: 'from-slate-950 via-red-950 to-black',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-red-600/30 text-red-400 flex items-center justify-center shrink-0 font-bold">
                1
              </span>
              <div>
                <strong className="text-white block text-sm">Geofenced Multi-Carrier SMS</strong>
                <span>Instant prioritized broadcast to pre-screened voluntary donors within 5 km radius via GP, Robi, Banglalink, and Teletalk.</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-red-600/30 text-red-400 flex items-center justify-center shrink-0 font-bold">
                2
              </span>
              <div>
                <strong className="text-white block text-sm">Doctor Verified Requisition Slips</strong>
                <span>Clinical validation requirement prevents fake alerts and hoarded inventory, preserving precious donor goodwill.</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-red-600/30 text-red-400 flex items-center justify-center shrink-0 font-bold">
                3
              </span>
              <div>
                <strong className="text-white block text-sm">Live Responding Telemetry & Handshake</strong>
                <span>5-stage transparent tracking with recipient OTP sign-off protects patients and validates clinical handover.</span>
              </div>
            </div>
          </div>

          <div className="bg-red-950/40 rounded-2xl p-5 border border-red-800/40 flex flex-col justify-between">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                100% Free & Non-Commercial
              </span>
              <h4 className="text-lg font-black text-white mt-2">Ethical Lifesaver Protocol</h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                By removing monetary exchange and empowering verified voluntary heroes, Blood Lagbe dismantles predatory syndicates and creates a national culture of safe, regular blood donation.
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-red-800/40 flex items-center justify-between text-xs font-mono text-red-300">
              <span>DGHS Authorized</span>
              <span>BDRCS Affiliated</span>
              <span>999 Integration</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Digital Donor Passport & Biological Guardrails',
      subtitle: 'Protecting voluntary donors while ensuring medical readiness',
      tag: 'INNOVATION',
      accentColor: 'from-slate-900 via-slate-800 to-red-950',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6 text-xs text-slate-300">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <span className="material-symbols-outlined text-red-500 text-3xl mb-2">hourglass_empty</span>
            <h4 className="text-sm font-bold text-white">90-Day Biological Cooldown</h4>
            <p className="mt-2 leading-relaxed">
              Automated biological countdown protects donors from excessive blood draw, ensuring full hemoglobin and iron replenishment before subsequent donation eligibility.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <span className="material-symbols-outlined text-emerald-400 text-3xl mb-2">badge</span>
            <h4 className="text-sm font-bold text-white">Tamper-Proof Digital Smart ID</h4>
            <p className="mt-2 leading-relaxed">
              Authenticated QR passport tied to national NID and BDRCS records. Prevents donor impersonation and accelerates hospital triage intake.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <span className="material-symbols-outlined text-amber-400 text-3xl mb-2">ac_unit</span>
            <h4 className="text-sm font-bold text-white">IoT Cold-Chain Telemetry</h4>
            <p className="mt-2 leading-relaxed">
              Real-time temperature telemetry (+2°C to +6°C) for blood bank chilling units prevents spoilage and maintains viability across regional hospital networks.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Measurable Impact & Scalability Roadmap',
      subtitle: 'From Dhaka medical cluster to all 64 districts of Bangladesh',
      tag: 'TRACTION & ROADMAP',
      accentColor: 'from-red-950 via-slate-900 to-slate-950',
      content: (
        <div className="flex flex-col gap-6 mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-2xl font-black text-white">18.4m</span>
              <span className="text-[11px] text-slate-400 block mt-1">Average Response</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-2xl font-black text-emerald-400">94.2%</span>
              <span className="text-[11px] text-slate-400 block mt-1">SOS Fulfillment</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-2xl font-black text-red-500">2,480+</span>
              <span className="text-[11px] text-slate-400 block mt-1">Verified Donors</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-2xl font-black text-amber-400">64</span>
              <span className="text-[11px] text-slate-400 block mt-1">Districts Target</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white">Ready to explore the live application?</h4>
              <p className="text-xs text-slate-400 mt-1">
                Experience real-time SOS broadcast, donor GPS telemetry, and digital passports right now.
              </p>
            </div>
            <button
              onClick={() => {
                sound.playTap();
                onNavigate('emergency-hub');
              }}
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider transition-transform hover:scale-105 shadow-lg shadow-red-600/30 whitespace-nowrap"
            >
              Launch Emergency Hub
            </button>
          </div>
        </div>
      ),
    },
  ];

  const current = slides[currentSlide];

  const handleNext = () => {
    sound.playTap();
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    sound.playTap();
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      {/* Slide Canvas */}
      <div
        className={`bg-gradient-to-br ${current.accentColor} rounded-3xl p-6 sm:p-10 text-white border border-slate-700 shadow-2xl relative min-h-[500px] flex flex-col justify-between`}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                {current.tag}
              </span>
              <span className="text-xs text-slate-400">
                Slide {currentSlide + 1} of {slides.length}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-400">Blood Lagbe? Initiative</span>
          </div>

          {/* Titles */}
          <div className="mt-6">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {current.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium">
              {current.subtitle}
            </p>
          </div>

          {/* Body Content */}
          {current.content}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-8">
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  sound.playTap();
                  setCurrentSlide(idx);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlide ? 'w-8 bg-red-500' : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                currentSlide === 0
                  ? 'border-white/10 text-white/30 cursor-not-allowed'
                  : 'border-white/20 text-white hover:bg-white/10'
              }`}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentSlide === slides.length - 1}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-colors ${
                currentSlide === slides.length - 1
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-md'
              }`}
            >
              Next Slide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
