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
  id: string
  post_url: string
  title: string
  thumbnail_url: string
  status: "pending" | "extracted" | "complete"
  createdAt: string
}

export default function Home() {
  const [urls, setUrls] = useState<UrlRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedCollection, setSelectedCollection] = useState("new-posts")
  const [statusFilter, setStatusFilter] = useState<"all" | UrlRecord["status"]>("all")

  const fetchUrls = async (page = 1) => {
    setIsLoading(true)

    const params = new URLSearchParams({
      collection: selectedCollection,
      page: String(page),
      limit: "10",
    })

    if (statusFilter !== "all") {
      params.append("status", statusFilter)
    }

    try {
      const response = await fetch(
        `http://localhost:4000/urls?${params.toString()}`
      )
      const data = await response.json()

      setUrls(data.items || [])
      setTotalPages(data.pages || 1)
      setCurrentPage(page)
    } catch (err) {
      console.error("Fetch failed:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUrls(1)
  }, [selectedCollection, statusFilter])

  const getStatusBadge = (status: UrlRecord["status"]) => {
    const variants = {
      pending: { color: "bg-slate-800 text-slate-300 border-slate-700", icon: Clock },
      extracted: { color: "bg-amber-950 text-amber-300 border-amber-800", icon: Download },
      complete: { color: "bg-emerald-950 text-emerald-300 border-emerald-800", icon: CheckCircle },
    }

    const { color, icon: Icon } = variants[status]

    return (
      <Badge variant="outline" className={cn("gap-1.5 font-medium", color)}>
        <Icon className="h-3 w-3" />
        {status}
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
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setCurrentPage(1)
                  setStatusFilter(e.target.value as "all" | UrlRecord["status"])
                }}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="extracted">Extracted</option>
                <option value="complete">Complete</option>
              </select>

              <CollectionSelector
                value={selectedCollection}
                onValueChange={(value) => {
                  setCurrentPage(1)
                  setSelectedCollection(value)
                }}
                disabled={isLoading}
              />
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
              </div>
            ) : urls.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No URLs match this filter
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
                      <TableRow key={record.id} className="hover:bg-slate-800/50 border-slate-800">
                        <TableCell className="font-medium">
                          <code className="text-blue-400 text-sm bg-slate-800 px-2 py-1 rounded">
                            {extractTopicId(record.post_url) || "N/A"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <ThumbnailViewer
                            thumbUrl={`${record.thumbnail_url}?Authorization=4_003c76cc198d29d0000000000_01c14dc8_aff6e6_acct_MRi-RH_Pzj5F5WeO8NTWQidlvrI=`}
                            title={record.title}
                          />
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
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
                            urlId={record.id}
                            status={record.status}
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
