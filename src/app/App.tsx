import { MainShell } from '@/components/layout/MainShell'
import { Providers } from './providers'

export default function App() {
  return (
    <Providers>
      <MainShell />
    </Providers>
  )
}
