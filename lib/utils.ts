import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getChatSummary(metadata: any, defaultText: string = "Conversation"): string {
  if (!metadata) return defaultText
  
  // Handle case where summary is incorrectly nested as an object
  if (metadata.summary && typeof metadata.summary === 'object' && metadata.summary.summary) {
    return String(metadata.summary.summary)
  }
  
  if (typeof metadata.summary === 'string') {
    return metadata.summary
  }
  
  return defaultText
}
