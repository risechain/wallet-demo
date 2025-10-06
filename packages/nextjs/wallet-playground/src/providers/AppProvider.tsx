'use client'

import { WalletProvider } from './WalletProvider'

export function AppProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WalletProvider>
      {children}
    </WalletProvider>
  )
}