"use client"

import { Popover, PopoverTrigger, PopoverContent, Chip } from "@heroui/react"
import type { Tag } from "@/lib/types"

interface ConversationTagsPopoverProps {
  tags: Tag[]
  className?: string
}

/**
 * Displays conversation tags with popover on hover
 * Shows first tag + "+N" indicator, expands all tags on hover
 */
export default function ConversationTagsPopover({
  tags,
  className = "",
}: ConversationTagsPopoverProps) {
  // Hide if no tags
  if (!tags || tags.length === 0) {
    return null
  }

  const firstTag = tags[0]
  const remainingCount = tags.length - 1

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* First tag always visible */}
      <Chip
        size="sm"
        variant="flat"
        className="text-xs"
        style={{
          backgroundColor: firstTag.color,
          color: "#000",
        }}
      >
        {firstTag.label}
      </Chip>

      {/* Show "+N" with popover if more tags exist */}
      {remainingCount > 0 && (
        <Popover placement="top" showArrow>
          <PopoverTrigger>
            <Chip
              size="sm"
              variant="flat"
              color="default"
              className="text-xs cursor-pointer hover:bg-default-200 transition-colors"
            >
              +{remainingCount}
            </Chip>
          </PopoverTrigger>
          <PopoverContent className="p-3">
            <div className="flex flex-wrap gap-2 max-w-xs">
              {tags.map((tag) => (
                <Chip
                  key={tag.id}
                  size="sm"
                  variant="flat"
                  className="text-xs"
                  style={{
                    backgroundColor: tag.color,
                    color: "#000",
                  }}
                >
                  {tag.label}
                </Chip>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
