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
} from "@heroui/react"
import { Tag as TagIcon, Plus, X } from "lucide-react"
import { useState } from "react"
import type { Tag } from "@/lib/types"

interface ConversationTagsModalProps {
  isOpen: boolean
  onClose: () => void
  tags: Tag[]
  onAddTag?: (tagLabel: string) => void
  onRemoveTag?: (tagId: string) => void
}

export default function ConversationTagsModal({
  isOpen,
  onClose,
  tags,
  onAddTag,
  onRemoveTag,
}: ConversationTagsModalProps) {
  const [newTagLabel, setNewTagLabel] = useState("")

  const handleAddTag = () => {
    if (newTagLabel.trim() && onAddTag) {
      onAddTag(newTagLabel.trim())
      setNewTagLabel("")
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
                  <p className="text-sm font-medium text-foreground mb-3">
                    Etiquetas Actuales
                  </p>
                  {tags && tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Chip
                          key={tag.id}
                          size="md"
                          variant="flat"
                          style={{
                            backgroundColor: tag.color,
                            color: "#000",
                          }}
                          endContent={
                            onRemoveTag ? (
                              <button
                                className="ml-1"
                                onClick={() => onRemoveTag(tag.id)}
                              >
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

                {/* Agregar nueva etiqueta */}
                {onAddTag && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">
                      Agregar Etiqueta
                    </p>
                    <div className="flex gap-2">
                      <Input
                        size="sm"
                        placeholder="Nueva etiqueta..."
                        value={newTagLabel}
                        onChange={(e) => setNewTagLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleAddTag()
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        color="primary"
                        isIconOnly
                        onPress={handleAddTag}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
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
