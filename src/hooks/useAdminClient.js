import { useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

// Query helpers for admin use. All queries run as the authenticated admin user
// whose session already satisfies is_admin(auth.uid()), so no additional
// user_id filter is applied — admins see all rows by design.
//
// All functions are stable references (useCallback + empty deps) so consumers
// can safely include them in useEffect/useCallback dep arrays without loops.

export function useAdminClient() {
  const fetchAllRows = useCallback(async (table, { select = '*', order = null, limit = null, filters = [] } = {}) => {
    let q = supabase.from(table).select(select)
    for (const [col, op, val] of filters) {
      q = q.filter(col, op, val)
    }
    if (order) q = q.order(order.column, { ascending: order.ascending ?? false })
    if (limit) q = q.limit(limit)
    const { data, error } = await q
    if (error) throw error
    return data
  }, [])

  const fetchPage = useCallback(async (table, { select = '*', page = 0, pageSize = 50, order = null, filters = [] } = {}) => {
    const from = page * pageSize
    const to   = from + pageSize - 1
    let q = supabase.from(table).select(select, { count: 'exact' })
    for (const [col, op, val] of filters) {
      q = q.filter(col, op, val)
    }
    if (order) q = q.order(order.column, { ascending: order.ascending ?? false })
    q = q.range(from, to)
    const { data, error, count } = await q
    if (error) throw error
    return { data, count }
  }, [])

  const getRow = useCallback(async (table, id) => {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single()
    if (error) throw error
    return data
  }, [])

  const updateRow = useCallback(async (table, id, updates) => {
    const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  }, [])

  const deleteRow = useCallback(async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
  }, [])

  const countByTable = useCallback(async (tables) => {
    const results = {}
    await Promise.all(
      tables.map(async (table) => {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
        results[table] = error ? null : count
      })
    )
    return results
  }, [])

  return useMemo(
    () => ({ fetchAllRows, fetchPage, getRow, updateRow, deleteRow, countByTable }),
    [fetchAllRows, fetchPage, getRow, updateRow, deleteRow, countByTable]
  )
}
