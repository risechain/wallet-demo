'use client'

import { WalletProvider } from './WalletProvider'
import { SessionKeyProvider } from '@/context/SessionKeyContext'

export function AppProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WalletProvider>
      <SessionKeyProvider>
        {children}
      </SessionKeyProvider>
    </WalletProvider>
  )
}