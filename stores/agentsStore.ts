import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Agent } from '@/lib/types'
import { fetchAgents } from '@/lib/api-client'

interface AgentsState {
  agents: Agent[]
  loading: boolean
  error: string | null
  lastFetched: number | null
  fetchAgents: () => Promise<void>
  getAgent: (id: string) => Agent | undefined
  setAgents: (agents: Agent[]) => void
}

const CACHE_TTL = 5 * 60 * 1000

export const useAgentsStore = create<AgentsState>()(
  persist(
    (set, get) => ({
      agents: [],
      loading: false,
      error: null,
      lastFetched: null,

      fetchAgents: async () => {
        const { lastFetched, agents } = get()
        if (lastFetched && Date.now() - lastFetched < CACHE_TTL && agents.length > 0) {
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

      getAgent: (id: string) => {
        return get().agents.find(a => a.id === id)
      },

      setAgents: (agents: Agent[]) => {
        set({ agents, lastFetched: Date.now() })
      },
    }),
    {
      name: 'speakops-agents',
      partialize: (state) => ({ agents: state.agents, lastFetched: state.lastFetched }),
    }
  )
)
