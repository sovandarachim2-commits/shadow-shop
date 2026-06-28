import { createContext, useContext, useMemo, useState } from 'react'

const AdminPageHeaderContext = createContext(null)

export function AdminPageHeaderProvider({ children }) {
  const [pageHeader, setPageHeader] = useState(null)
  const value = useMemo(() => ({ pageHeader, setPageHeader }), [pageHeader])

  return (
    <AdminPageHeaderContext.Provider value={value}>
      {children}
    </AdminPageHeaderContext.Provider>
  )
}

export function useAdminPageHeader() {
  return useContext(AdminPageHeaderContext)
}
