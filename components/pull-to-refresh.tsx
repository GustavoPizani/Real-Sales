"use client"

import { useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"

export function PullToRefresh() {
  const startY = useRef(0)
  const pulling = useRef(false)
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    // Só ativa no PWA instalado (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true
    if (!isStandalone) return

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY
        pulling.current = true
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0) setPullY(Math.min(delta, 100))
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!pulling.current) return
      pulling.current = false
      const delta = e.changedTouches[0].clientY - startY.current
      if (delta >= 80) {
        setRefreshing(true)
        setTimeout(() => window.location.reload(), 300)
      } else {
        setPullY(0)
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchmove", onTouchMove, { passive: true })
    document.addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchmove", onTouchMove)
      document.removeEventListener("touchend", onTouchEnd)
    }
  }, [])

  if (pullY === 0 && !refreshing) return null

  const progress = Math.min(pullY / 80, 1)
  const translateY = refreshing ? 48 : pullY * 0.5

  return (
    <div
      className="fixed top-0 left-1/2 z-50 pointer-events-none"
      style={{ transform: `translateX(-50%) translateY(${translateY}px)`, transition: refreshing ? "transform 0.2s" : "none" }}
    >
      <div className="p-2 rounded-full bg-background border border-border shadow-lg">
        <RefreshCw
          className="h-5 w-5 text-primary"
          style={{
            transform: `rotate(${progress * 360}deg)`,
            transition: refreshing ? "none" : undefined,
            animation: refreshing ? "spin 0.6s linear infinite" : "none",
          }}
        />
      </div>
    </div>
  )
}
