"use client";

import React from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Compass,
  FileCheck2,
  GraduationCap,
  Layers,
  MapPin,
  Printer,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEPARTMENTS } from "@/lib/departments";

export default function LandingPage() {
  const { user, getDashboardUrl } = useAuth();

  const services = [
    {
      title: "Lecture Halls & Theatres",
      description: "Real-time hall availability, seat capacities, multimedia setups, and reservation workflow.",
      icon: CalendarDays,
      href: "/halls",
      buttonText: "Browse & Book Halls",
      accent: "border-t-4 border-t-[#C41E3A]",
      badge: "Real-time Calendar",
    },
    {
      title: "Lecturer Consultations",
      description: "Schedule academic guidance and office-hour appointments with faculty lecturers.",
      icon: Clock,
      href: "/lecturers",
      buttonText: "Schedule Consultation",
      accent: "border-t-4 border-t-[#FDB913]",
      badge: "Instant Slots",
    },
    {
      title: "Laboratory Equipment",
      description: "Browse high-precision engineering instruments, sensors, oscilloscopes, and tools.",
      icon: Wrench,
      href: "/equipment",
      buttonText: "Borrow Equipment",
      accent: "border-t-4 border-t-[#0B6478]",
      badge: "Tracked Inventory",
    },
    {
      title: "Lab Services & 3D Printing",
      description: "Submit digital fabrication orders, upload CAD STL files, and monitor fabrication status.",
      icon: Printer,
      href: "/services",
      buttonText: "Submit Print Request",
      accent: "border-t-4 border-t-[#7E3A74]",
      badge: "Fabrication Hub",
    },
  ];

  const stats = [
    { label: "Lecture Halls & Labs", value: "12+" },
    { label: "Engineering Disciplines", value: "5" },
    { label: "Lab Equipment Items", value: "80+" },
    { label: "Active Faculty Members", value: "50+" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border shadow-elevation-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-0.5 shadow-elevation-sm ring-1 ring-border group-hover:ring-primary/50 transition-all overflow-hidden">
              <img
                src="/logo.jpg"
                alt="University of Sri Jayewardenepura Crest"
                className="h-full w-full object-cover rounded-lg"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-foreground group-hover:text-primary transition-colors">
                  USJ Resource Portal
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDB913]/20 text-[#78350F] border border-[#FDB913]/30 hidden sm:inline-flex">
                  FOE
                </span>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">
                Faculty of Engineering, University of Sri Jayewardenepura
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <Link href={getDashboardUrl(user)}>
                <Button variant="usj" size="sm" className="gap-1.5">
                  <span>Open Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/lecture" className="hidden md:inline-flex">
                  <Button variant="ghost" size="sm">
                    Lecturer Portal
                  </Button>
                </Link>
                <Link href="/admin" className="hidden md:inline-flex">
                  <Button variant="ghost" size="sm">
                    Admin Portal
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="usj" size="sm">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section with Faculty Building Backdrop */}
      <section className="relative overflow-hidden bg-brand-navy text-white py-16 lg:py-24">
        {/* Background photo of faculty building */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity scale-105"
          style={{ backgroundImage: "url('/faculty-building-wide.webp')" }}
        />
        {/* Brand crimson & navy gradient overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(196,30,58,0.92)_0%,rgba(139,21,56,0.85)_45%,rgba(17,26,58,0.95)_100%)]" />
        
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-medium text-white/95">
              <img
                src="/logo.jpg"
                alt="University Crest"
                className="h-5 w-5 rounded-full object-cover ring-1 ring-white/50"
              />
              <span>Faculty of Engineering · University of Sri Jayewardenepura</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white drop-shadow-sm">
              Smart Resource Booking &amp; Facility Management
            </h1>

            <p className="text-white/90 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
              Official centralized platform for lecture halls, laboratories, equipment loaning, fabrication services, and lecturer consultation appointments.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {user ? (
                <Link href={getDashboardUrl(user)}>
                  <Button variant="gold" size="lg" className="gap-2">
                    <span>Enter My Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="gold" size="lg" className="gap-2">
                      <span>Sign In with University ID</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/lecture">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white gap-1.5"
                    >
                      <span>👨‍🏫</span> Lecturer Portal
                    </Button>
                  </Link>
                  <Link href="/admin">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white gap-1.5"
                    >
                      <span>🛡️</span> Admin Portal
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-white/15">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#FDB913]">{s.value}</div>
                  <div className="text-xs text-white/80 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Department Band */}
      <section className="bg-card border-y border-border py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider">
              Departments:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {Object.values(DEPARTMENTS).map((d) => (
                <span
                  key={d.key}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${d.chipClass} border border-border/50`}
                >
                  <span className={`h-2 w-2 rounded-full ${d.swatchClass}`} />
                  <span className="font-bold">{d.code}</span>
                  <span className="hidden sm:inline">· {d.name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 space-y-12">
        {/* Core Services Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Key Capabilities</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Faculty Facilities &amp; Academic Services
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
              Streamlining campus logistics for undergraduate students, lecturers, and technical administration staff.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.title}
                  className={`flex flex-col justify-between hover:shadow-elevation-md transition-all rounded-card ${item.accent}`}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {item.badge}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold">{item.title}</CardTitle>
                    <CardDescription className="text-xs leading-relaxed">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href={item.href}>
                      <Button variant="outline" size="sm" className="w-full text-xs font-semibold hover:border-primary">
                        {item.buttonText}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Informational Banner */}
        <section className="rounded-card border bg-gradient-to-r from-primary/5 via-card to-accent/5 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-elevation-sm">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-4 w-4" />
              <span>Verified Institutional Access</span>
            </div>
            <h3 className="text-xl font-bold text-foreground">
              Official University Single-Sign-On &amp; Role-based Security
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Log in with your institutional credentials (<span className="font-mono text-primary font-semibold">@eng.sjp.ac.lk</span> or <span className="font-mono text-primary font-semibold">@sjp.ac.lk</span>) to automatically access your student or lecturer dashboard.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <Link href={getDashboardUrl(user)}>
                <Button variant="usj" size="default">
                  My Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="usj" size="default">
                  Sign In Now
                </Button>
              </Link>
            )}
          </div>
        </section>
      </main>

      {/* University Footer */}
      <footer className="border-t bg-card text-card-foreground mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3.5">
              <img
                src="/logo.jpg"
                alt="University Emblem"
                className="h-12 w-12 rounded-xl object-cover shadow-elevation-sm ring-1 ring-border"
              />
              <div>
                <p className="font-bold text-sm text-foreground">
                  Faculty of Engineering
                </p>
                <p className="text-xs text-muted-foreground">
                  University of Sri Jayewardenepura, Sri Lanka
                </p>
              </div>
            </div>

            <div className="text-center md:text-right text-xs text-muted-foreground space-y-1">
              <p>Campus: Ratmalana / Hapugala, Sri Lanka</p>
              <p>
                Technical Support:{" "}
                <a href="mailto:support@foe.sjp.ac.lk" className="text-primary hover:underline font-medium">
                  support@foe.sjp.ac.lk
                </a>
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border/60 text-center text-[11px] text-muted-foreground">
            &copy; {new Date().getFullYear()} University of Sri Jayewardenepura. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
