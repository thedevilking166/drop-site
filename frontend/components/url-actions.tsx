"use client"

import { Button } from "@/components/ui/button"
import { Trash2, Cpu, CheckCircle } from "lucide-react"
import { useState } from "react"

interface UrlActionsProps {
  urlId: string
  status: "pending" | "extracting" | "extracted" | "complete" | "error"
  collection: string
  onActionComplete: () => void
}

export function UrlActions({
  urlId,
  status,
  collection,
  onActionComplete,
}: UrlActionsProps) {
  const [loading, setLoading] = useState<"delete" | "extract" | null>(null)

  const handleDelete = async () => {
    setLoading("delete")
    try {
      const res = await fetch(
        `/api/urls/${urlId}?collection=${collection}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error("Delete failed")
      onActionComplete()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  const handleExtract = async () => {
    setLoading("extract")
    try {
      const res = await fetch(
        `/api/urls/extract?collection=${collection}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url_id: urlId }),
        }
      )
      if (!res.ok) throw new Error("Extract failed")
      onActionComplete()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      {status === "pending" && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleExtract}
          disabled={loading !== null}
          className="gap-1.5"
        >
          <Cpu className="h-3.5 w-3.5" />
          Extract
        </Button>
      )}

      {status === "extracted" && (
        <Button
          size="sm"
          variant="outline"
          disabled
          className="gap-1.5"
        >
          <Cpu className="h-3.5 w-3.5" />
          Extracted
        </Button>
      )}

      {status === "complete" && (
        <Button size="sm" variant="outline" disabled className="gap-1.5">
          <CheckCircle className="h-3.5 w-3.5" />
          Complete
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={handleDelete}
        disabled={loading !== null}
        className="gap-1.5 hover:bg-red-950 hover:text-red-300 hover:border-red-700"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  )
}
