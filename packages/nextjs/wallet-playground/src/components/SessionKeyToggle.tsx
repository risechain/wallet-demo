'use client'

import { useSessionKeyPreference } from '@/context/SessionKeyContext'
import { useSessionKeys } from '@/hooks/useSessionKeys'
import { useState, useEffect } from 'react'

export function SessionKeyToggle() {
  const [mounted, setMounted] = useState(false)
  const { preferSessionKey, setPreferSessionKey } = useSessionKeyPreference()
  const { sessionKeys, hasSessionKey } = useSessionKeys()

  // Get current key state - this will update when hasSessionKey changes
  const hasActiveKey = hasSessionKey()
  // Only count keys that are both active AND have local private keys (usable keys)
  const usableKeyCount = sessionKeys.filter(key =>
    key.hasPrivateKey &&
    key.expiry > Math.floor(Date.now() / 1000)
  ).length

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-700 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-500"></div>
          <span className="text-sm text-gray-300">Loading...</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Use session keys:</span>
          <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-gray-600">
            <span className="inline-block h-3 w-3 transform rounded-full bg-white translate-x-1" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-700 rounded-lg">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${hasActiveKey ? 'bg-green-500' : 'bg-gray-500'}`}></div>
        <span className="text-sm text-gray-300">
          {usableKeyCount > 0 ? `${usableKeyCount} usable key${usableKeyCount !== 1 ? 's' : ''}` : 'No usable keys'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Use session keys:</span>
        <button
          onClick={() => setPreferSessionKey(!preferSessionKey)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            preferSessionKey ? 'bg-green-600' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              preferSessionKey ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  )
}