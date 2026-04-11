import { Sidebar } from '@/components/admin/Sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth check se maneja en middleware cuando Supabase esté configurado
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F5F5F0' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
