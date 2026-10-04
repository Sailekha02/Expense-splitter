import { useCallback, useEffect, useMemo, useState } from "react";
import { DataContext } from "./contexts.js";
import { useAuth, useUI } from "./hooks.js";
import { api } from "../api/client.js";
import { userSummary } from "../../shared/calc.js";

const EMPTY = { groups: [], expenses: [], settlements: [] };
const cacheKey = (id) => `es_cache_${id}`;

function readCache(id) {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(id))) || null;
  } catch {
    return null;
  }
}

/**
 * Holds the user's groups / expenses / settlements.
 * The server is the source of truth; a copy is kept in localStorage so the app opens instantly
 * and can still show your data if the server is unreachable.
 */
export default function DataProvider({ children }) {
  const { user } = useAuth();
  const { toast } = useUI();
  const userId = user?.id;

  const [state, setState] = useState({ owner: null, data: EMPTY, loading: false, offline: false });

  const load = useCallback(
    async (id) => {
      try {
        const data = await api.getData();
        setState({ owner: id, data, loading: false, offline: false });
      } catch (err) {
        if (err.status === 0) {
          setState((s) => ({ ...s, loading: false, offline: true }));
          toast.error("Server unreachable. Showing your last saved data.");
        } else {
          setState((s) => ({ ...s, loading: false }));
          toast.error(err.message);
        }
      }
    },
    [toast]
  );

  // When the user changes: show cached data straight away, then refresh from the server.
  useEffect(() => {
    if (!userId) {
      setState({ owner: null, data: EMPTY, loading: false, offline: false });
      return;
    }
    const cached = readCache(userId);
    setState({ owner: userId, data: cached || EMPTY, loading: !cached, offline: false });
    load(userId);
  }, [userId, load]);

  // Persist to localStorage whenever data changes
  useEffect(() => {
    if (userId && state.owner === userId) {
      try {
        localStorage.setItem(cacheKey(userId), JSON.stringify(state.data));
      } catch {
        /* storage full or unavailable: not fatal */
      }
    }
  }, [state.data, state.owner, userId]);

  const patch = useCallback((fn) => setState((s) => ({ ...s, data: fn(s.data) })), []);
  const { groups, expenses, settlements } = state.data;

  const actions = useMemo(
    () => ({
      refresh: () => load(userId),

      async createGroup(payload) {
        const { group } = await api.createGroup(payload);
        patch((d) => ({ ...d, groups: [...d.groups, group] }));
        return group;
      },
      async updateGroup(id, payload) {
        const { group } = await api.updateGroup(id, payload);
        patch((d) => ({ ...d, groups: d.groups.map((g) => (g.id === id ? group : g)) }));
        return group;
      },
      async deleteGroup(id) {
        await api.deleteGroup(id);
        patch((d) => ({
          groups: d.groups.filter((g) => g.id !== id),
          expenses: d.expenses.filter((e) => e.groupId !== id),
          settlements: d.settlements.filter((s) => s.groupId !== id),
        }));
      },
      async addMember(id, name) {
        const { group } = await api.addMember(id, name);
        patch((d) => ({ ...d, groups: d.groups.map((g) => (g.id === id ? group : g)) }));
      },
      async removeMember(id, memberId) {
        const { group } = await api.removeMember(id, memberId);
        patch((d) => ({ ...d, groups: d.groups.map((g) => (g.id === id ? group : g)) }));
      },

      async createExpense(payload) {
        const { expense } = await api.createExpense(payload);
        patch((d) => ({ ...d, expenses: [...d.expenses, expense] }));
        return expense;
      },
      async updateExpense(id, payload) {
        const { expense } = await api.updateExpense(id, payload);
        patch((d) => ({ ...d, expenses: d.expenses.map((e) => (e.id === id ? expense : e)) }));
        return expense;
      },
      async deleteExpense(id) {
        await api.deleteExpense(id);
        patch((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) }));
      },

      async createSettlement(payload) {
        const { settlement } = await api.createSettlement(payload);
        patch((d) => ({ ...d, settlements: [...d.settlements, settlement] }));
        return settlement;
      },
      async deleteSettlement(id) {
        await api.deleteSettlement(id);
        patch((d) => ({ ...d, settlements: d.settlements.filter((s) => s.id !== id) }));
      },

      clearCache() {
        if (userId) localStorage.removeItem(cacheKey(userId));
      },
    }),
    [load, patch, userId]
  );

  const groupsById = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g])), [groups]);
  const summary = useMemo(
    () => userSummary(groups, expenses, settlements, userId),
    [groups, expenses, settlements, userId]
  );

  const value = useMemo(
    () => ({
      groups,
      expenses,
      settlements,
      groupsById,
      summary,
      loading: state.loading,
      offline: state.offline,
      ...actions,
    }),
    [groups, expenses, settlements, groupsById, summary, state.loading, state.offline, actions]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
