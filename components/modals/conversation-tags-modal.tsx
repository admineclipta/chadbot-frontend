"use client"

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip,
  Input,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Checkbox,
  Spinner,
} from "@heroui/react"
import { Tag as TagIcon, Plus, X, Search } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { apiService } from "@/lib/api"
import type { Tag } from "@/lib/types"

interface ConversationTagsModalProps {
  isOpen: boolean
  onClose: () => void
  tags: Tag[]
  onAddTag?: (tagLabel: string) => Promise<any> | void
  onRemoveTag?: (tagId: string) => void
  onSetTags?: (tagIds: string[]) => void
}

export default function ConversationTagsModal({
  isOpen,
  onClose,
  tags,
  onAddTag,
  onRemoveTag,
  onSetTags,
}: ConversationTagsModalProps) {
  const [newTagLabel, setNewTagLabel] = useState("")

  // Async tag search
  const [searchValue, setSearchValue] = useState("")
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => (tags || []).map(t => t.id))
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // sync selected when props.tags changes (e.g., parent updates)
    setSelectedIds((tags || []).map(t => t.id))
  }, [tags])

  useEffect(() => {
    // fetch tags on open and when searchValue changes (debounced)
    if (!isOpen) return

    const controller = new AbortController()
    abortRef.current = controller

    let active = true
    const fetchTags = async () => {
      try {
        setIsLoading(true)
        const res = await apiService.getTags(0, 50, searchValue, controller.signal)
        if (!active) return
        setAvailableTags(res.content)
      } catch (e) {
        if ((e as any)?.name === 'AbortError') return
        console.error('Error fetching tags', e)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    const debounce = setTimeout(fetchTags, 250)
    return () => {
      active = false
      controller.abort()
      clearTimeout(debounce)
    }
  }, [isOpen, searchValue])

  const [creating, setCreating] = useState(false)

  const handleAddTag = async () => {
    const label = newTagLabel.trim()
    if (!label || !onAddTag) return
    try {
      setCreating(true)
      await onAddTag(label)
      setNewTagLabel("")
    } catch (e) {
      console.error('Error creating tag from input', e)
    } finally {
      setCreating(false)
    }
  }

  const toggleTag = (tagId: string) => {
    const next = selectedIds.includes(tagId) ? selectedIds.filter(id => id !== tagId) : [...selectedIds, tagId]
    setSelectedIds(next)
    if (onSetTags) {
      onSetTags(next)
    }
  }

  const handleCreateFromSearch = async () => {
    const label = searchValue.trim()
    if (!label || !onAddTag) return
    try {
      setCreating(true)
      await onAddTag(label)
      setSearchValue("")
    } catch (e) {
      console.error('Error creating tag from search', e)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      classNames={{
        backdrop: "bg-background/80 backdrop-blur-sm",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <TagIcon className="h-5 w-5 text-primary" />
                <span>Etiquetas de la Conversación</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                {/* Etiquetas actuales */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Etiquetas Actuales</p>
                  {tags && tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Chip
                          key={tag.id}
                          size="md"
                          variant="flat"
                          style={{ backgroundColor: tag.color, color: "#000" }}
                          endContent={
                            onRemoveTag ? (
                              <button className="ml-1" onClick={() => onRemoveTag(tag.id)}>
                                <X className="h-3 w-3" />
                              </button>
                            ) : undefined
                          }
                        >
                          {tag.label}
                        </Chip>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-default-500 bg-default-50 dark:bg-default-100/50 rounded-lg p-4 text-center">
                      No hay etiquetas asignadas
                    </div>
                  )}
                </div>

                {/* Selector async con creación */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Buscar / Agregar Etiquetas</p>

                  <div className="relative">
                    <Input
                      size="sm"
                      placeholder="Buscar etiquetas..."
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      disabled={creating}
                      startContent={<Search className="w-4 h-4 text-default-400" />}
                      isClearable
                      onClear={() => setSearchValue("")}
                      classNames={{ inputWrapper: "shadow-none" }}
                    />

                    <div className="mt-2 max-h-60 overflow-y-auto border rounded-md bg-background">
                      {isLoading ? (
                        <div className="flex items-center justify-center p-4"><Spinner size="sm" /></div>
                      ) : availableTags.length === 0 ? (
                        <div className="p-3 text-sm text-default-400">{searchValue ? (
                          <div className="flex items-center justify-between gap-2">
                            <span>No se encontraron resultados</span>
                            <Button size="xs" color="primary" onPress={handleCreateFromSearch} isLoading={creating} disabled={creating}>
                              Crear "{searchValue}"
                            </Button>
                          </div>
                        ) : (
                          "No hay etiquetas disponibles"
                        )}</div>
                      ) : (
                        <div className="flex flex-col">
                          {availableTags.map((t) => {
                            const isSelected = selectedIds.includes(t.id)
                            return (
                              <div
                                key={t.id}
                                className={`flex items-center gap-2 px-3 py-2 ${creating ? '' : 'hover:bg-default-100 cursor-pointer'}`}
                                onClick={() => { if (!creating) toggleTag(t.id) }}
                              >
                                <Checkbox isSelected={isSelected} size="sm" />
                                <div className="flex-1 min-w-0 flex items-center justify-between">
                                  <div className="truncate text-sm">{t.label}</div>
                                  <div className="ml-2">
                                    <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: t.color }} />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Crear via input rápido */}
                      {onAddTag && (
                    <div className="mt-2 flex gap-2">
                      <Input
                        size="sm"
                        placeholder="Nueva etiqueta..."
                        value={newTagLabel}
                        onChange={(e) => setNewTagLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag() }}
                        disabled={creating}
                      />
                      <Button size="sm" color="primary" isIconOnly onPress={handleAddTag} isLoading={creating} disabled={creating}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="default" variant="light" onPress={onClose}>
                Cerrar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
