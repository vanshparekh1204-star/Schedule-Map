import { Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { CommandPalette } from './components/CommandPalette'
import { Composer } from './components/Composer'
import { QuickAdd } from './components/QuickAdd'
import { ShortcutsSheet, useGlobalShortcuts } from './components/Shortcuts'
import { Toasts } from './components/Toasts'
import { useData } from './db/useData'
import { CalendarPage } from './routes/CalendarPage'
import { InsightsPage } from './routes/InsightsPage'
import { NotFound } from './routes/NotFound'
import { RewardsPage } from './routes/RewardsPage'
import { RoutinesPage } from './routes/RoutinesPage'
import { SettingsPage } from './routes/SettingsPage'
import { TodayPage } from './routes/TodayPage'

export function App() {
  const data = useData()
  useGlobalShortcuts()

  if (!data) {
    return <div className="min-h-dvh bg-bg" aria-busy="true" />
  }

  return (
    <>
      <AppShell today={data.today}>
        <Routes>
          <Route path="/" element={<TodayPage data={data} />} />
          <Route path="/calendar" element={<CalendarPage data={data} />} />
          <Route path="/routines" element={<RoutinesPage data={data} />} />
          <Route path="/rewards" element={<RewardsPage data={data} />} />
          <Route path="/insights" element={<InsightsPage data={data} />} />
          <Route path="/settings" element={<SettingsPage data={data} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppShell>
      <Composer data={data} />
      <QuickAdd data={data} />
      <CommandPalette data={data} />
      <ShortcutsSheet />
      <Toasts />
    </>
  )
}
