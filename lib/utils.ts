import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractTopicId(url: string): string | null {
  const match = url.match(/\/topic\/(\d+)-/)
  return match ? match[1] : null
}
