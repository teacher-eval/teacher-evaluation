import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-navy-900 p-4 font-sans text-ink">
      <div className="auth-bg" aria-hidden="true">
        <Image src="/bg.webp" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-navy-900/55" />
      </div>
      <main className="animate-fade-in-up relative z-10 flex w-full justify-center items-center">{children}</main>
    </div>
  );
}
