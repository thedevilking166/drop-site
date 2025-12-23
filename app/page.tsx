"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Clock, Download, CheckCircle, SquareArrowOutUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { extractTopicId } from "@/lib/utils"
import { CollectionSelector } from "@/components/collection-selector"
import { ThumbnailViewer } from "@/components/thumbnail-viewer"
import { PaginationControls } from "@/components/pagination-controls"
import { UrlActions } from "@/components/url-actions"

type UrlRecord = {
  _id: string
  post_url: string
  title: string
  thumb_url: string
  stage: "pending" | "extracted" | "complete"
  createdAt: string
}

export default function Home() {
  const [urls, setUrls] = useState<UrlRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedCollection, setSelectedCollection] = useState("new-posts")

  const fetchUrls = async (page = 1) => {
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:4000/urls?collection=${selectedCollection}&page=${page}&limit=10`)
      const data = await response.json()
      setUrls(data.items || [])
      setTotalPages(data.pages || 1)
      setCurrentPage(page)
    } catch (error) {
      console.error("Error fetching URLs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUrls(1)
  }, [selectedCollection])

  const getStatusBadge = (stage: UrlRecord["stage"]) => {
    const variants = {
      pending: { color: "bg-slate-800 text-slate-300 border-slate-700", icon: Clock },
      extracted: { color: "bg-amber-950 text-amber-300 border-amber-800", icon: Download },
      complete: { color: "bg-emerald-950 text-emerald-300 border-emerald-800", icon: CheckCircle },
    }

    const { color, icon: Icon } = variants[stage]

    return (
      <Badge variant="outline" className={cn("gap-1.5 font-medium", color)}>
        <Icon className="h-3 w-3" />
        {stage.charAt(0).toUpperCase() + stage.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 text-balance">Processing Tracker</h1>
        </div>

        {/* URLs Table */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-slate-100">Tracked URLs</CardTitle>
              <CardDescription className="text-slate-400">
                {urls.length} {urls.length === 1 ? "URL" : "URLs"} on this page
              </CardDescription>
            </div>

            <CollectionSelector
              value={selectedCollection}
              onValueChange={(value) => {
                setCurrentPage(1)
                setSelectedCollection(value)
              }}
              disabled={isLoading}
            />
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
              </div>
            ) : urls.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 text-lg mb-2">No URLs tracked yet</p>
                <p className="text-slate-600">Add your first URL above to get started</p>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-800 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-900/50 border-slate-800 hover:bg-slate-900/50">
                      <TableHead className="font-semibold text-slate-300">Topic ID</TableHead>
                      <TableHead className="font-semibold text-slate-300">Thumbnail</TableHead>
                      <TableHead className="font-semibold text-slate-300">Status</TableHead>
                      <TableHead className="font-semibold text-slate-300">Unique URL</TableHead>
                      <TableHead className="font-semibold text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {urls.map((record) => (
                      <TableRow key={record._id} className="hover:bg-slate-800/50 border-slate-800">
                        <TableCell className="font-medium">
                          <code className="text-blue-400 text-sm bg-slate-800 px-2 py-1 rounded">
                            {extractTopicId(record.post_url) || "N/A"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <ThumbnailViewer thumbUrl={record.thumb_url} title={record.title} />
                        </TableCell>
                        <TableCell>{getStatusBadge(record.stage)}</TableCell>
                        <TableCell>
                          {record.title ? (
                            <a
                              href={record.post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 hover:underline truncate block max-w-xs text-sm"
                            >
                              <SquareArrowOutUpRight className="inline-block mr-1 h-4 w-4" />
                            </a>
                          ) : (
                            <span className="text-slate-600 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <UrlActions
                            urlId={record._id}
                            stage={record.stage}
                            collection={selectedCollection}
                            onActionComplete={() => fetchUrls(currentPage)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={fetchUrls}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
