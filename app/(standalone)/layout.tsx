// app/(standalone)/layout.tsx
export default function StandaloneLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-screen bg-white">
      {children}
    </div>
  );
}
