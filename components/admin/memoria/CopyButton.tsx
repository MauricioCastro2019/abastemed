'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface Props {
  text: string
  label?: string
}

export function CopyButton({ text, label = 'Copiar' }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback silencioso
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={copied
        ? { backgroundColor: '#ECFDF5', color: '#059669' }
        : { backgroundColor: '#EBF8FB', color: '#2AABBF' }
      }
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? '¡Copiado!' : label}
    </button>
  )
}
