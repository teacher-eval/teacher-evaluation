"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore, useState } from "react";

import {
  ChevronLeftIcon,
  CloseIcon,
  LogoutIcon,
  MenuIcon,
  NavIcon,
  ShieldIcon,
} from "@/components/icons";
import type { NavItem } from "@/lib/nav";

const SIDEBAR_COLLAPSE_KEY = "sidebarCollapsed";
const COLLAPSE_EVENT = "sidebar:collapse-change";

function readCollapsed(): boolean {
  return document.documentElement.classList.contains("sidebar-collapsed");
}

function subscribeCollapse(onStoreChange: () => void): () => void {
  window.addEventListener(COLLAPSE_EVENT, onStoreChange);
  return () => window.removeEventListener(COLLAPSE_EVENT, onStoreChange);
}

export type SidebarUser = {
  fullName: string;
  subtitle: string;
  avatarUrl?: string | null;
};

type SidebarProps = {
  user: SidebarUser;
  nav: NavItem[];
  signOut: () => Promise<void>;
};

function isActive(pathname: string, item: NavItem, nav: NavItem[]): boolean {
  const home = nav[0]?.href;
  if (item.href === home) return pathname === home;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function Sidebar({ user, nav, signOut }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The pre-paint script in the root layout already applied the class. Using an
  // external store keeps the button's ARIA state in sync without a cascading
  // setState effect, and the server snapshot avoids a hydration mismatch.
  const collapsed = useSyncExternalStore(
    subscribeCollapse,
    readCollapsed,
    () => false,
  );

  const setDrawer = useCallback((next: boolean) => {
    setOpen(next);
    if (next) {
      document.body.classList.add("drawer-open");
      document.body.style.overflow = "hidden";
    } else {
      document.body.classList.remove("drawer-open");
      document.body.style.overflow = "";
    }
  }, []);

  // Escape closes the drawer.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawer(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setDrawer]);

  // Leaving mobile width must not leave the page scroll-locked.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    function onChange() {
      if (query.matches) {
        setOpen(false);
        document.body.classList.remove("drawer-open");
        document.body.style.overflow = "";
      }
    }
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Always restore scrolling when the shell unmounts.
  useEffect(() => {
    return () => {
      document.body.classList.remove("drawer-open");
      document.body.style.overflow = "";
    };
  }, []);

  function toggleCollapse() {
    const next = document.documentElement.classList.toggle("sidebar-collapsed");
    try {
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      // Private mode: the class still applies for this page view.
    }
    // Tell useSyncExternalStore the snapshot changed.
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }

  const initial = (user.fullName || "U").charAt(0).toUpperCase();
  const collapseLabel = collapsed ? "Expand navigation" : "Collapse navigation";

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy shadow-2xl transition-transform duration-300 md:translate-x-0 ${
          open ? "" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="sidebar-brand flex items-center gap-3 border-b border-navy-600 p-5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-600 text-gold-400"
            aria-hidden="true"
          >
            <ShieldIcon className="h-5 w-5" />
          </div>
          <span className="sidebar-label min-w-0 text-sm font-semibold leading-tight tracking-tight text-white">
            TVET Digital Feedback
          </span>
          <button
            type="button"
            id="sidebar-collapse"
            onClick={toggleCollapse}
            aria-controls="sidebar"
            aria-expanded={!collapsed}
            aria-label={collapseLabel}
            title={collapseLabel}
            className="sidebar-collapse-btn ml-auto hidden h-8 w-8 items-center justify-center rounded-lg text-navy-100 transition-colors hover:bg-navy-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 md:inline-flex"
          >
            <ChevronLeftIcon className="sidebar-collapse-icon h-5 w-5 transition-transform" />
          </button>
          <button
            type="button"
            id="sidebar-close"
            onClick={() => setDrawer(false)}
            aria-label="Close navigation menu"
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-100 transition-colors hover:bg-navy-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 md:hidden"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Profile */}
        <div className="sidebar-profile border-b border-navy-600 p-5">
          <div className="sidebar-profile-row flex items-center gap-3.5">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full border-2 border-gold-500 object-cover shadow-sm"
              />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gold-500 bg-navy-600 font-bold text-white"
                aria-hidden="true"
              >
                {initial}
              </div>
            )}
            <div className="sidebar-label min-w-0 overflow-hidden">
              <div className="truncate text-sm font-semibold text-white">
                {user.fullName || "User"}
              </div>
              <div className="truncate text-xs text-navy-200">{user.subtitle}</div>
            </div>
          </div>
        </div>

        <nav
          className="custom-scrollbar flex-1 space-y-1 overflow-y-auto py-3"
          aria-label="Main navigation"
        >
          {nav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="sidebar-link"
              aria-current={isActive(pathname, item, nav) ? "page" : undefined}
              onClick={() => setDrawer(false)}
            >
              <NavIcon name={item.key} className="h-5 w-5 shrink-0" />
              <span className="sidebar-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-navy-600 p-3">
          <form action={signOut}>
            <button type="submit" className="sidebar-logout w-full">
              <LogoutIcon className="h-5 w-5 shrink-0" />
              <span className="sidebar-label">Logout</span>
            </button>
          </form>
        </div>
      </div>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden ${
          open ? "" : "hidden"
        }`}
        id="sidebar-overlay"
        onClick={() => setDrawer(false)}
        aria-hidden="true"
      />

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50 text-navy"
            aria-hidden="true"
          >
            <ShieldIcon className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold text-navy">TVET Digital Feedback</span>
        </div>
        <button
          type="button"
          id="sidebar-mobile-toggle"
          onClick={() => setDrawer(!open)}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-controls="sidebar"
          aria-expanded={open}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>
    </>
  );
}
