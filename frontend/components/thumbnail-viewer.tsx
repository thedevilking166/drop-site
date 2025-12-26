"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import Image from "next/image"

interface ThumbnailViewerProps {
  topicId: string | number
  title: string
}

export function ThumbnailViewer({ topicId, title }: ThumbnailViewerProps) {
  const [open, setOpen] = useState(false)

  const thumbPath = `/assets/${topicId}_thumb.jpg`

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
          <div className="relative w-full max-w-xl h-96">
            <Image
              src={thumbPath}
              alt={title || "Thumbnail"}
              fill
              unoptimized
              className="rounded-lg object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
