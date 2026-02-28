import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Agent } from '@/lib/types'
import { fetchAgents } from '@/lib/api-client'

interface AgentsState {
  agents: Agent[]
  loading: boolean
  error: string | null
  lastFetched: number | null
  fetchAgents: (force?: boolean) => Promise<void>
  addAgent: (agent: Agent) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  removeAgent: (id: string) => void
  getAgent: (id: string) => Agent | undefined
  setAgents: (agents: Agent[]) => void
  invalidate: () => void
}

const CACHE_TTL = 5 * 60 * 1000

export const useAgentsStore = create<AgentsState>()(
  persist(
    (set, get) => ({
      agents: [],
      loading: false,
      error: null,
      lastFetched: null,

      fetchAgents: async (force?: boolean) => {
        const { lastFetched, agents } = get()
        if (!force && lastFetched && Date.now() - lastFetched < CACHE_TTL && agents.length > 0) {
          return
        }

        set({ loading: true, error: null })
        try {
          const agents = await fetchAgents()
          set({ agents, loading: false, lastFetched: Date.now() })
        } catch (err) {
          set({ error: (err as Error).message, loading: false })
        }
      },

      addAgent: (agent: Agent) => {
        set(state => ({ agents: [...state.agents, agent], lastFetched: Date.now() }))
      },

      updateAgent: (id: string, updates: Partial<Agent>) => {
        set(state => ({
          agents: state.agents.map(a => a.id === id ? { ...a, ...updates } : a),
        }))
      },

      removeAgent: (id: string) => {
        set(state => ({
          agents: state.agents.filter(a => a.id !== id),
        }))
      },

      getAgent: (id: string) => {
        return get().agents.find(a => a.id === id)
      },

      setAgents: (agents: Agent[]) => {
        set({ agents, lastFetched: Date.now() })
      },

      invalidate: () => {
        set({ lastFetched: null })
      },
    }),
    {
      name: 'speakops-agents',
      // Only persist agents list, NOT lastFetched — every page load should fetch fresh
      partialize: (state) => ({ agents: state.agents }),
    }
  )
)
