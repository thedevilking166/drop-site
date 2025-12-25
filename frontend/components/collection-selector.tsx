"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CollectionSelectorProps {
    value: string
    onValueChange: (value: string) => void
    disabled?: boolean
}

export function CollectionSelector({ value, onValueChange, disabled }: CollectionSelectorProps) {
    return (
        <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">Collection:</label>
            <Select value={value} onValueChange={onValueChange} disabled={disabled}>
                <SelectTrigger className="w-40">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="new-posts">New Posts</SelectItem>
                    <SelectItem value="old-posts">Old Posts</SelectItem>
                    <SelectItem value="new-p-posts">New P Posts</SelectItem>
                    <SelectItem value="old-p-posts">Old P Posts</SelectItem>
                    <SelectItem value="semi-posts">Semi Posts</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
