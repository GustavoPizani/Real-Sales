import Link from "next/link"

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <div className="w-8 h-8 bg-secondary-custom rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-lg">R</span>
      </div>
      <div className="flex flex-col">
        <span className="text-white font-bold text-lg leading-none">Real Sales</span>
        <span className="text-white/70 text-xs leading-none">CRM</span>
      </div>
    </Link>
  )
}
