"use client"

import { Button } from "@/components/ui/button"
import {
  CheckCircle,
  XCircle
} from "lucide-react"
import { useState } from "react"

interface UrlActionsProps {
  urlId: string
  status: "pending" | "checked" | "rejected"
  collection: string
  onActionComplete: () => void
}

export function UrlActions({
  urlId,
  status,
  collection,
  onActionComplete,
}: UrlActionsProps) {
  const [loading, setLoading] = useState<"delete" | "update" | null>(null)

  const updateStage = async (stage: "checked" | "rejected") => {
    setLoading("update")
    try {
      const res = await fetch(
        `/api/urls/${urlId}?collection=${collection}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage }),
        }
      )
      if (!res.ok) throw new Error("Update failed")
      onActionComplete()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2 items-center">
      {/* Stage selector only for pending */}
      {status === "pending" && (
        <div className="relative">
          <select
            disabled={loading !== null}
            onChange={(e) => {
              const value = e.target.value as "checked" | "rejected"
              if (value) updateStage(value)
            }}
            defaultValue=""
            className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 pr-6 text-sm text-slate-300 focus:outline-none"
          >
            <option value="" disabled>
              Update status
            </option>
            <option value="checked">Checked</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      )}

      {/* Static badges for non-pending */}
      {status === "checked" && (
        <Button size="sm" variant="outline" disabled className="gap-1.5">
          <CheckCircle className="h-3.5 w-3.5" />
          Checked
        </Button>
      )}

      {status === "rejected" && (
        <Button
          size="sm"
          variant="outline"
          disabled
          className="gap-1.5 border-red-800 text-red-300"
        >
          <XCircle className="h-3.5 w-3.5" />
          Rejected
        </Button>
      )}
    </div>
  )
}
