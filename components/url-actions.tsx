"use client"

import { Button } from "@/components/ui/button"
import { Trash2, Cpu, CheckCircle } from "lucide-react"
import { useState } from "react"

interface UrlActionsProps {
  urlId: string
  status: "pending" | "extracted" | "complete"
  collection: string
  onActionComplete: () => void
}

export function UrlActions({ urlId, status, collection, onActionComplete }: UrlActionsProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `http://localhost:4000/urls/${urlId}?collection=${collection}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        throw new Error("Delete failed")
      }

      onActionComplete()
    } catch (error) {
      console.error("Error deleting URL:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      {status === "pending" && (
        <Button size="sm" variant="outline" disabled>
          <Cpu className="h-3.5 w-3.5" />
          Extract
        </Button>
      )}

      {status === "extracted" && (
        <Button size="sm" variant="outline" disabled>
          <CheckCircle className="h-3.5 w-3.5" />
          Complete
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={handleDelete}
        disabled={isLoading}
        className="gap-1.5 hover:bg-red-950 hover:text-red-300 hover:border-red-700"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  )
}
