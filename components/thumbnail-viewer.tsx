"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

interface ThumbnailViewerProps {
  thumbUrl: string | null
  title: string
}

export function ThumbnailViewer({ thumbUrl, title }: ThumbnailViewerProps) {
  const [open, setOpen] = useState(false)

  if (!thumbUrl) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">No thumbnail</span>
      </div>
    )
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Eye className="h-3.5 w-3.5" />
        View
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title || "Thumbnail"}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <img
              src={thumbUrl || "/placeholder.svg"}
              alt={title || "Thumbnail"}
              className="max-h-96 max-w-full rounded-lg object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
