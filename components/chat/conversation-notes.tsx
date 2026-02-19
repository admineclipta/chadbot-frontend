"use client"

import { useState, useEffect } from "react"
import { Textarea, Button, Card, Spinner, Avatar, Checkbox } from "@heroui/react"
import { Trash2, Edit2, Plus, Save, X } from "lucide-react"
import { toast } from "sonner"
import { apiService } from "@/lib/api"
import type { NoteResponseDto } from "@/lib/api-types"
import { formatMessageTime } from "@/lib/utils"

interface ConversationNotesProps {
  conversationId: string
  className?: string
}

export default function ConversationNotes({ conversationId, className = "" }: ConversationNotesProps) {
  const [notes, setNotes] = useState<NoteResponseDto[]>([])
  const [loading, setLoading] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState("")
  const [newNoteIsPrivate, setNewNoteIsPrivate] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [editingIsPrivate, setEditingIsPrivate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalElements, setTotalElements] = useState(0)

  useEffect(() => {
    loadNotes()
  }, [conversationId])

  const loadNotes = async (pageToLoad: number = 0) => {
    if (!conversationId) return

    try {
      setLoading(true)
      const response = await apiService.getConversationNotes(conversationId, pageToLoad, 20)
      
      if (pageToLoad === 0) {
        setNotes(response.content)
      } else {
        setNotes(prev => [...prev, ...response.content])
      }
      
      setPage(pageToLoad)
      setHasMore(!response.last)
      setTotalElements(response.totalElements)
    } catch (error: any) {
      console.error("Error loading notes:", error)
      toast.error(error.message || "Error al cargar las notas")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) {
      toast.error("El contenido de la nota no puede estar vacío")
      return
    }

    try {
      setSubmitting(true)
      const newNote = await apiService.createNote(conversationId, newNoteContent.trim(), newNoteIsPrivate)
      setNotes(prev => [newNote, ...prev])
      setNewNoteContent("")
      setNewNoteIsPrivate(false)
      setTotalElements(prev => prev + 1)
      toast.success("Nota creada exitosamente")
    } catch (error: any) {
      console.error("Error creating note:", error)
      toast.error(error.message || "Error al crear la nota")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!editingContent.trim()) {
      toast.error("El contenido de la nota no puede estar vacío")
      return
    }

    try {
      setSubmitting(true)
      const updatedNote = await apiService.updateNote(noteId, editingContent.trim(), editingIsPrivate)
      setNotes(prev => prev.map(note => note.id === noteId ? updatedNote : note))
      setEditingNoteId(null)
      setEditingContent("")
      setEditingIsPrivate(false)
      toast.success("Nota actualizada exitosamente")
    } catch (error: any) {
      console.error("Error updating note:", error)
      toast.error(error.message || "Error al actualizar la nota")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta nota?")) {
      return
    }

    try {
      await apiService.deleteNote(noteId)
      setNotes(prev => prev.filter(note => note.id !== noteId))
      setTotalElements(prev => prev - 1)
      toast.success("Nota eliminada exitosamente")
    } catch (error: any) {
      console.error("Error deleting note:", error)
      toast.error(error.message || "Error al eliminar la nota")
    }
  }

  const startEditing = (note: NoteResponseDto) => {
    setEditingNoteId(note.id)
    setEditingContent(note.note)
    setEditingIsPrivate(note.private)
  }

  const cancelEditing = () => {
    setEditingNoteId(null)
    setEditingContent("")
    setEditingIsPrivate(false)
  }

  const getInitials = (displayName?: string) => {
    if (!displayName) return "?"
    const parts = displayName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
    }
    return displayName.substring(0, 2).toUpperCase()
  }

  const getAgentName = (agent?: NoteResponseDto['agent']) => {
    if (!agent) return "Usuario desconocido"
    return agent.displayName || "Usuario desconocido"
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header con contador */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Notas del chat {totalElements > 0 && `(${totalElements})`}
        </h3>
      </div>

      {/* Lista de notas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && notes.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <Spinner size="md" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <p className="text-sm">No hay notas para esta conversación</p>
            <p className="text-xs mt-1">Agrega la primera nota abajo</p>
          </div>
        ) : (
          <>
            {notes.map((note) => (
              <Card key={note.id} className="p-3 shadow-sm">
                {editingNoteId === note.id ? (
                  // Modo edición
                  <div className="space-y-2">
                    <Textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      placeholder="Contenido de la nota..."
                      minRows={2}
                      maxRows={6}
                      className="w-full"
                      disabled={submitting}
                    />
                    <Checkbox
                      isSelected={editingIsPrivate}
                      onValueChange={setEditingIsPrivate}
                      size="sm"
                      className="text-xs"
                    >
                      Nota privada (solo visible para agentes)
                    </Checkbox>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="flat"
                        color="default"
                        onPress={cancelEditing}
                        disabled={submitting}
                        startContent={<X size={14} />}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        onPress={() => handleUpdateNote(note.id)}
                        isLoading={submitting}
                        startContent={!submitting && <Save size={14} />}
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Modo vista
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar
                          name={getInitials(note.agent?.displayName)}
                          size="sm"
                          className="flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                              {getAgentName(note.agent)}
                            </p>
                            {note.private && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-medium">
                                Privada
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatMessageTime(new Date(note.createdAt))}
                            {note.updatedAt !== note.createdAt && " (editada)"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="default"
                          onPress={() => startEditing(note)}
                          className="min-w-unit-8 w-8 h-8"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => handleDeleteNote(note.id)}
                          className="min-w-unit-8 w-8 h-8"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">
                      {note.note}
                    </p>
                  </div>
                )}
              </Card>
            ))}

            {/* Botón cargar más */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  size="sm"
                  variant="flat"
                  color="default"
                  onPress={() => loadNotes(page + 1)}
                  isLoading={loading}
                >
                  Cargar más notas
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input para nueva nota */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
        <Textarea
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          placeholder="Escribe una nota sobre esta conversación..."
          minRows={2}
          maxRows={4}
          className="w-full"
          disabled={submitting}
          onKeyDown={(e) => {
            // Ctrl+Enter para enviar
            if (e.key === "Enter" && e.ctrlKey) {
              e.preventDefault()
              handleCreateNote()
            }
          }}
        />
        <Checkbox
          isSelected={newNoteIsPrivate}
          onValueChange={setNewNoteIsPrivate}
          size="sm"
          className="text-xs"
        >
          Nota privada (solo visible para agentes)
        </Checkbox>
        <div className="flex justify-between items-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Presiona Ctrl+Enter para agregar
          </p>
          <Button
            size="sm"
            color="primary"
            onPress={handleCreateNote}
            isLoading={submitting}
            isDisabled={!newNoteContent.trim()}
            startContent={!submitting && <Plus size={16} />}
          >
            Agregar nota
          </Button>
        </div>
      </div>
    </div>
  )
}
