"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Clock, CheckCircle, SquareArrowOutUpRight, LogOut, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { extractTopicId } from "@/lib/utils"
import { CollectionSelector } from "@/components/collection-selector"
import { ThumbnailViewer } from "@/components/thumbnail-viewer"
import { PaginationControls } from "@/components/pagination-controls"
import { UrlActions } from "@/components/url-actions"
import { useRouter } from "next/navigation"

type UrlRecord = {
  _id: string
  title: string
  thumb_url: string
  post_url: string
  stage: "pending" | "checked" | "rejected"
  extracted_images: string[]
  extracted_links: string[]
  topic_id: string
}

export default function Home() {
  const [urls, setUrls] = useState<UrlRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedCollection, setSelectedCollection] = useState("new-posts")
  const [statusFilter, setStatusFilter] = useState<"all" | UrlRecord["stage"]>("all")
  const router = useRouter()

  const fetchUrls = async (page = 1) => {
    setIsLoading(true)

    const params = new URLSearchParams({
      collection: selectedCollection,
      page: String(page),
      limit: "10",
    })

    if (statusFilter !== "all") {
      params.append("stage", statusFilter)
    }

    try {
      const response = await fetch(`/api/urls?${params.toString()}`)
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

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
      });
      router.push("/login");
    } catch (err) {
      console.error('Logout failed:', err);
      router.push("/login");
    }
  }

  const getStatusBadge = (status: UrlRecord["stage"] = "pending") => {
    const variants = {
      pending: {
        color: "bg-slate-800 text-slate-300 border-slate-700",
        icon: Clock,
        label: "Pending",
      },
      checked: {
        color: "bg-emerald-950 text-emerald-300 border-emerald-800",
        icon: CheckCircle,
        label: "Checked",
      },
      rejected: {
        color: "bg-red-950 text-red-300 border-red-800",
        icon: XCircle,
        label: "Rejected",
      },
    } as const

    const safeStatus = status && status in variants ? status : "pending"
    const { color, icon: Icon } = variants[safeStatus]

    return (
      <Badge variant="outline" className={cn("gap-1.5 font-medium", color)}>
        <Icon className="h-3 w-3" />
        {safeStatus}
      </Badge>
    )
  }



  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 text-balance">Processing Tracker</h1>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" className="w-full sm:w-auto gap-2 bg-transparent">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* URLs Table */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-slate-100">Tracked URLs</CardTitle>
              <CardDescription className="text-slate-400">
                {urls.length} {urls.length === 1 ? "URL" : "URLs"} on this page
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setCurrentPage(1)
                  setStatusFilter(e.target.value as "all" | UrlRecord["stage"])
                }}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm w-full sm:w-auto"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="checked">Checked</option>
                <option value="rejected">Rejected</option>
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
              <div className="text-center py-8 text-slate-400">No URLs match this filter</div>
            ) : (
              <div className="rounded-lg border border-slate-800 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-900/50 border-slate-800 hover:bg-slate-900/50">
                      <TableHead className="font-semibold text-slate-300 text-xs sm:text-sm">Topic ID</TableHead>
                      <TableHead className="font-semibold text-slate-300 text-xs sm:text-sm">Thumbnail</TableHead>
                      <TableHead className="font-semibold text-slate-300 text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="font-semibold text-slate-300 text-xs sm:text-sm">Unique URL</TableHead>
                      <TableHead className="font-semibold text-slate-300 text-xs sm:text-sm">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {urls.map((record) => (
                      <TableRow key={record._id} className="hover:bg-slate-800/50 border-slate-800">
                        <TableCell className="font-medium text-xs sm:text-sm">
                          <code className="text-blue-400 text-xs sm:text-sm bg-slate-800 px-2 py-1 rounded">
                            {extractTopicId(record.post_url) || "N/A"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <ThumbnailViewer
                            topicId={record.topic_id}
                            title={record.title}
                          />
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">{getStatusBadge(record.stage)}</TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {record.title ? (
                            <a
                              href={record.post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 hover:underline truncate block max-w-xs text-xs sm:text-sm"
                            >
                              <SquareArrowOutUpRight className="inline-block mr-1 h-4 w-4" />
                            </a>
                          ) : (
                            <span className="text-slate-600 text-xs sm:text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm">
                          <UrlActions
                            urlId={record._id}
                            status={record.stage}
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
