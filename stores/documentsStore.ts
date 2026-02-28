import { create } from 'zustand'
import { UserDocument } from '@/lib/types'
import { fetchDocuments } from '@/lib/api-client'

interface DocumentsState {
  documents: UserDocument[]
  loading: boolean
  error: string | null
  fetchDocuments: () => Promise<void>
  addDocument: (doc: UserDocument) => void
  removeDocument: (id: string) => void
  setDocuments: (docs: UserDocument[]) => void
  /** Force re-fetch from API, bypassing any staleness checks */
  refresh: () => Promise<void>
}

export const useDocumentsStore = create<DocumentsState>()((set) => ({
  documents: [],
  loading: false,
  error: null,

  fetchDocuments: async () => {
    set({ loading: true, error: null })
    try {
      const documents = await fetchDocuments()
      set({ documents, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  refresh: async () => {
    try {
      const documents = await fetchDocuments()
      set({ documents })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  addDocument: (doc: UserDocument) => {
    set(state => ({ documents: [doc, ...state.documents] }))
  },

  removeDocument: (id: string) => {
    set(state => ({ documents: state.documents.filter(d => d.id !== id) }))
  },

  setDocuments: (documents: UserDocument[]) => {
    set({ documents })
  },
}))
