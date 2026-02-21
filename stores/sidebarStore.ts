import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarSectionState {
  isOpen: boolean
  searchQuery: string
}

interface SidebarState {
  width: number
  isCollapsed: boolean
  sections: Record<string, SidebarSectionState>
  setWidth: (width: number) => void
  toggleCollapsed: () => void
  setSectionOpen: (section: string, isOpen: boolean) => void
  setSectionSearch: (section: string, query: string) => void
  toggleSection: (section: string) => void
}

const MIN_WIDTH = 200
const MAX_WIDTH = 400
const DEFAULT_WIDTH = 280

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      width: DEFAULT_WIDTH,
      isCollapsed: false,
      sections: {
        agents: { isOpen: true, searchQuery: '' },
        evaChat: { isOpen: true, searchQuery: '' },
        callHistory: { isOpen: false, searchQuery: '' },
        documents: { isOpen: true, searchQuery: '' },
        integrations: { isOpen: false, searchQuery: '' },
      },

      setWidth: (width: number) => {
        const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width))
        set({ width: clampedWidth })
      },

      toggleCollapsed: () => {
        set((state) => ({ isCollapsed: !state.isCollapsed }))
      },

      setSectionOpen: (section: string, isOpen: boolean) => {
        set((state) => ({
          sections: {
            ...state.sections,
            [section]: { ...state.sections[section], isOpen },
          },
        }))
      },

      setSectionSearch: (section: string, query: string) => {
        set((state) => ({
          sections: {
            ...state.sections,
            [section]: { ...state.sections[section], searchQuery: query },
          },
        }))
      },

      toggleSection: (section: string) => {
        const current = get().sections[section]
        if (current) {
          set((state) => ({
            sections: {
              ...state.sections,
              [section]: { ...current, isOpen: !current.isOpen },
            },
          }))
        }
      },
    }),
    {
      name: 'speakops-sidebar',
    }
  )
)

export { MIN_WIDTH, MAX_WIDTH, DEFAULT_WIDTH }
