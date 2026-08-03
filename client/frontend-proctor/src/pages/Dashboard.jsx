import { useMemo, useState } from 'react'
import { Users, UserCheck, AlertTriangle, BellRing, Gauge, ShieldCheck } from 'lucide-react'
import { useMonitor } from '../context/MonitorContext'
import { useFilteredStudents } from '../hooks/useFilteredStudents'
import StatCard from '../components/StatCard'
import Charts from '../components/Charts'
import SearchFilterBar from '../components/SearchFilterBar'
import StudentCard from '../components/StudentCard'
import AlertPanel from '../components/AlertPanel'
import StudentDetailModal from '../components/StudentDetailModal'
import { CardSkeleton, StatSkeleton } from '../components/Skeleton'

export default function Dashboard() {
  const { students, alerts, loading } = useMonitor()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('alerts-desc')
  const [selected, setSelected] = useState(null)

  const filtered = useFilteredStudents(students, { query, filter, sort })

  const stats = useMemo(() => {
    const active = students.filter((s) => s.connected).length
    const underAlert = students.filter((s) => s.status === 'alert').length
    const avgAttention = students.length
      ? Math.round(students.reduce((s, x) => s + x.attention, 0) / students.length)
      : 0
    const todayAlerts = alerts.length
    return { total: students.length, active, underAlert, avgAttention, todayAlerts }
  }, [students, alerts])

  const openById = (id) => {
    const s = students.find((x) => x.id === id)
    if (s) setSelected(s)
  }
  // keep selected in sync with live updates
  const liveSelected = selected ? students.find((s) => s.id === selected.id) || selected : null

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-5">
      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={Users} label="Total Students" value={stats.total} accent="brand" />
            <StatCard icon={UserCheck} label="Active" value={stats.active} sub={`${stats.total - stats.active} offline`} accent="emerald" />
            <StatCard icon={AlertTriangle} label="Under Alert" value={stats.underAlert} accent="rose" pulse={stats.underAlert > 0} />
            <StatCard icon={BellRing} label="Alerts Today" value={stats.todayAlerts} accent="amber" />
            <StatCard icon={Gauge} label="Avg Attention" value={`${stats.avgAttention}%`} accent="brand" />
            <StatCard icon={ShieldCheck} label="AI Status" value="Online" sub="all models active" accent="emerald" />
          </>
        )}
      </section>

      {/* Charts */}
      <section className="mt-5">
        {!loading && <Charts students={students} alerts={alerts} />}
      </section>

      {/* Main grid: students + alert panel */}
      <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <SearchFilterBar
            query={query} setQuery={setQuery}
            filter={filter} setFilter={setFilter}
            sort={sort} setSort={setSort}
            alertCount={stats.underAlert}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              : filtered.map((s) => <StudentCard key={s.id} student={s} onOpen={setSelected} />)}
          </div>

          {!loading && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
              <p className="text-sm font-medium text-slate-500">No students match your filters</p>
              <p className="mt-1 text-xs text-slate-400">Try clearing the search or switching filters.</p>
            </div>
          )}
        </div>

        <aside className="xl:sticky xl:top-20 xl:self-start">
          <AlertPanel onView={openById} />
        </aside>
      </section>

      {liveSelected && <StudentDetailModal student={liveSelected} onClose={() => setSelected(null)} />}
    </main>
  )
}
