import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
