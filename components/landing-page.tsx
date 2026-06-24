"use client";

import React, { useState, useEffect } from 'react';
import { SignInButton, SignUpButton, SignedOut, SignedIn, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

const EmailCapture = ({ buttonText = "Join the waitlist", showCount = false }: { buttonText?: string, showCount?: boolean }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [claimedCount, setClaimedCount] = useState(0);

  useEffect(() => {
    // Fetch initial claimed count
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/waitlist');
        if (res.ok) {
          const data = await res.json();
          setClaimedCount(data.claimedCount || 0);
        }
      } catch {
        console.error('Failed to fetch claimed count');
      }
    };
    fetchCount();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        const data = await res.json();
        setClaimedCount(data.claimedCount);
        setStatus('success');
        if (data.message) {
          setMessage(data.message);
        } else {
          setMessage("You're on the list! We'll email you within 48 hours.");
        }
      } else {
        throw new Error('Something went wrong');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {status === 'success' ? (
        <div className="text-center py-4 px-6 border border-[#E5E7EB] rounded-lg bg-white">
          <p className="text-[#0F0F14] font-semibold text-base">{message}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 border border-[#E5E7EB] rounded-lg text-[#0F0F14] text-base focus:outline-none focus:ring-2 focus:ring-[#5B5BF6]/20 focus:border-[#5B5BF6] transition-all"
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-6 py-3 bg-[#5B5BF6] text-white font-semibold rounded-lg hover:bg-[#4a4ae5] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Submitting...' : buttonText}
            </button>
          </div>
          {status === 'error' && <p className="text-xs text-red-600">{message}</p>}
          {showCount && (
            <p className="text-xs text-[#6B7280] text-center">
              Only 25 spots. {claimedCount} claimed so far.
            </p>
          )}
        </form>
      )}
    </div>
  );
};

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white text-[#0F0F14] font-sans">
      {/* Header */}
      <header className="py-4 px-6 border-b border-[#E5E7EB]">
        <div className="max-w-[720px] mx-auto flex items-center justify-between">
          <div className="text-lg font-bold text-[#0F0F14]">
            QuickQA<span className="text-[#5B5BF6]"></span>
          </div>
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-sm font-semibold text-[#6B7280] hover:text-[#0F0F14]">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 bg-[#5B5BF6] text-white text-sm font-semibold rounded-lg hover:bg-[#4a4ae5]">
                  Sign up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/projects">
                <button className="px-4 py-2 bg-[#5B5BF6] text-white text-sm font-semibold rounded-lg hover:bg-[#4a4ae5]">
                  Dashboard
                </button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Section 1: Hero */}
      <section className="py-24 px-6">
        <div className="max-w-[720px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E5E7EB] mb-10">
            <span className="text-green-500">🟢</span>
            <span className="text-xs font-semibold text-[#0F0F14]">Beta — Free for first 25 teams, lifetime (90% off)</span>
          </div>

          <h1 className="text-[48px] lg:text-[56px] font-bold leading-[1.1] mb-6 text-[#0F0F14]">
            UAT feedback shouldn't live in <span className="text-[#5B5BF6]">Excel</span>, <span className="text-[#5B5BF6]">Word</span>, and <span className="text-[#5B5BF6]">Email</span> threads.
          </h1>
          
          <p className="text-xl text-[#6B7280] mb-10 max-w-[600px] mx-auto leading-relaxed">
            Click on any live website. Drop a pin. Get a tracked issue with a screenshot — automatically. No code install required.
          </p>

          <EmailCapture />
          <p className="text-xs text-[#6B7280] mt-4">
            Free lifetime access for the first 25 teams. No credit card.
          </p>
        </div>
      </section>

      {/* Section 2: How It Works (Demo) */}
      <section className="py-24 px-6">
        <div className="max-w-[720px] mx-auto text-center">
          <p className="text-xs font-bold text-[#5B5BF6] uppercase tracking-[0.2em] mb-4">HOW IT WORKS</p>
          <h2 className="text-[32px] font-bold mb-12 text-[#0F0F14]">
            Three steps. Zero ambiguity.
          </h2>
          
          {/* Product Visual */}
          <div className="mb-12 border border-[#E5E7EB] rounded-lg bg-white overflow-hidden">
            <img 
              src="/demo.gif" 
              alt="Signoff AI Demo" 
              className="w-full h-auto"
            />
          </div>

          {/* Steps */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-left">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-sm font-bold text-[#0F0F14]">1</div>
              <span className="text-sm text-[#0F0F14]">Open any live URL</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-sm font-bold text-[#0F0F14]">2</div>
              <span className="text-sm text-[#0F0F14]">Click to pin an issue</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-sm font-bold text-[#0F0F14]">3</div>
              <span className="text-sm text-[#0F0F14]">Track issue status</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: The Problem */}
      <section className="py-24 px-6">
        <div className="max-w-[720px] mx-auto">
          <p className="text-xs font-bold text-[#5B5BF6] uppercase tracking-[0.2em] mb-4 text-center">WHY WE BUILT THIS</p>
          <h2 className="text-[32px] font-bold mb-12 text-[#0F0F14] text-center">
            If this sounds familiar, you already know the problem.
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 border border-[#E5E7EB] rounded-lg bg-white">
              <h3 className="text-lg font-bold mb-3 text-[#DC2626]">Email chaos</h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                Feedback arrives in emails, Slack, and spreadsheets. By the time it reaches a developer, the context is gone.
              </p>
            </div>
            <div className="p-6 border border-[#E5E7EB] rounded-lg bg-white">
              <h3 className="text-lg font-bold mb-3 text-[#EA580C]">Lost between versions</h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                A bug gets fixed but nobody tracks whether V2 actually resolved it. The same issue ships twice.
              </p>
            </div>
            <div className="p-6 border border-[#E5E7EB] rounded-lg bg-white">
              <h3 className="text-lg font-bold mb-3 text-[#EA580C]">No proof of approval</h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                Who approved this release? Based on what testing? There's no record.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: The Offer */}
      <section className="py-24 px-6 bg-[#FAFAFA]">
        <div className="max-w-[720px] mx-auto text-center">
          <h2 className="text-[32px] font-bold mb-6 text-[#0F0F14]">Founding member access</h2>
          <p className="text-lg text-[#6B7280] mb-10 max-w-[500px] mx-auto">
            We're onboarding the first 25 teams personally. You'll get lifetime free access in exchange for honest feedback during beta.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-10 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[#5B5BF6] font-bold">✓</span>
              <span className="text-sm text-[#0F0F14]">Lifetime free access — no credit card, ever</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#5B5BF6] font-bold">✓</span>
              <span className="text-sm text-[#0F0F14]">Direct line to the founder for feedback</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#5B5BF6] font-bold">✓</span>
              <span className="text-sm text-[#0F0F14]">Shape the roadmap for what gets built next</span>
            </div>
          </div>

          <EmailCapture buttonText="Claim your spot" showCount />
        </div>
      </section>

      {/* Section 5: Footer */}
      <footer className="py-16 px-6 bg-white">
        <div className="max-w-[720px] mx-auto text-center">
          <p className="text-sm text-[#6B7280] mb-4">
            QuickQA — built by a solo dev tired of chasing client feedback in spreadsheets.
          </p>
          <a href="mailto:ranjithrk22498@gmail.com" className="text-sm text-[#5B5BF6] font-semibold hover:underline">
            ranjithrk22498@gmail.com
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
