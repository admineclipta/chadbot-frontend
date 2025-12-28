"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import ReactMarkdown from "react-markdown"
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  Spinner,
  Chip,
  Divider,
} from "@heroui/react"
import { Bot, Eye, Edit, Sparkles, Save } from "lucide-react"
import { apiService } from "@/lib/api"
import type { Assistant, ModifyPromptRequest } from "@/lib/api-types"
import { toast } from "sonner"

export default function AssistantManagement() {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false)
  const [modification, setModification] = useState("")
  const [isModifying, setIsModifying] = useState(false)
  const [modificationResult, setModificationResult] = useState<string | null>(null)
  const [isResultModalOpen, setIsResultModalOpen] = useState(false)

  useEffect(() => {
    loadAssistants()
  }, [])

  const loadAssistants = async () => {
    try {
      setLoading(true)
      const data = await apiService.getAssistants()
      setAssistants(data)
    } catch (error) {
      console.error("Error loading assistants:", error)
      toast.error("Error al cargar los asistentes")
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = (assistant: Assistant) => {
    setSelectedAssistant(assistant)
    setIsPreviewModalOpen(true)
  }

  const handleModifyClick = (assistant: Assistant) => {
    setSelectedAssistant(assistant)
    setIsPreviewModalOpen(false)
    setModification("")
    setModificationResult(null)
    setIsModifyModalOpen(true)
  }

  const handleSaveModification = async () => {
    if (!selectedAssistant || !modification.trim()) {
      toast.error("Por favor ingrese una modificación")
      return
    }

    try {
      setIsModifying(true)
      
      // Usar el prompter_assistant_id del Postman (puede configurarse)
      const request: ModifyPromptRequest = {
        assistant_id: selectedAssistant.Id,
        prompter_assistant_id: "asst_reAabPqa2cMMM95HpSbY69yn", // ID del asistente modificador
        modificacion: modification,
      }

      const response = await apiService.modifyAssistantPrompt(request)
      
      if (response.Success) {
        setModificationResult(response.Data.NuevoPromptPreview)
        setIsModifyModalOpen(false)
        setIsResultModalOpen(true)
        toast.success("Prompt modificado exitosamente")
        
        // Recargar asistentes para obtener el prompt actualizado
        await loadAssistants()
      } else {
        toast.error(response.Message || "Error al modificar el prompt")
      }
    } catch (error) {
      console.error("Error modifying assistant:", error)
      toast.error("Error al modificar el asistente")
    } finally {
      setIsModifying(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Administración de Asistentes
          </h1>
          <p className="text-default-500 mt-2">
            Gestiona y modifica los prompts de tus asistentes de OpenAI
          </p>
        </div>

        {/* Assistants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assistants.map((assistant) => (
            <Card 
              key={assistant.Id} 
              isPressable
              onPress={() => handlePreview(assistant)}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader className="flex flex-col items-start gap-2 pb-0">
                <div className="flex items-center gap-3 w-full">
                  <Image 
                    src="/openai.png" 
                    alt="OpenAI" 
                    width={24} 
                    height={24}
                    className="flex-shrink-0"
                  />
                  <h3 className="text-lg font-semibold flex-1 truncate">
                    {assistant.Name}
                  </h3>
                </div>
                <Chip size="sm" variant="flat" color="secondary">
                  {assistant.Model}
                </Chip>
              </CardHeader>
              <CardBody className="gap-3">
                <div className="text-sm text-default-500">
                  <p>Creado: {formatDate(assistant.CreatedAt)}</p>
                  <p className="mt-1 truncate">ID: {assistant.Id.substring(0, 20)}...</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Preview Modal */}
        <Modal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          size="3xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <Image 
                  src="/openai.png" 
                  alt="OpenAI" 
                  width={20} 
                  height={20}
                />
                <span>{selectedAssistant?.Name}</span>
              </div>
              <Chip size="sm" variant="flat" color="secondary">
                {selectedAssistant?.Model}
              </Chip>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-default-700 mb-2">
                    Instrucciones del Prompt:
                  </p>
                  <div className="bg-default-100 p-4 rounded-lg prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>
                      {selectedAssistant?.Instructions || ""}
                    </ReactMarkdown>
                  </div>
                </div>
                <Divider />
                <div className="text-sm text-default-500">
                  <p>
                    <strong>ID:</strong> {selectedAssistant?.Id}
                  </p>
                  <p>
                    <strong>Creado:</strong>{" "}
                    {selectedAssistant && formatDate(selectedAssistant.CreatedAt)}
                  </p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="flat"
                onPress={() => setIsPreviewModalOpen(false)}
              >
                Cerrar
              </Button>
              <Button
                color="secondary"
                startContent={<Edit className="w-4 h-4" />}
                onPress={() => selectedAssistant && handleModifyClick(selectedAssistant)}
              >
                Modificar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modify Modal */}
        <Modal
          isOpen={isModifyModalOpen}
          onClose={() => setIsModifyModalOpen(false)}
          size="2xl"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-secondary" />
                <span>Modificar Asistente</span>
              </div>
              <p className="text-sm font-normal text-default-500">
                {selectedAssistant?.Name}
              </p>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <p className="text-sm text-default-600">
                  Describe en lenguaje natural los cambios que deseas realizar al prompt del asistente:
                </p>
                <Textarea
                  label="Modificación"
                  placeholder="Ej: Los nuevos precios de los planes que ofrecerás son estos..."
                  value={modification}
                  onValueChange={setModification}
                  minRows={6}
                  description="Sé específico sobre qué cambios quieres hacer"
                />
                {selectedAssistant && (
                  <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg">
                    <p className="text-xs text-primary-600 dark:text-primary-400">
                      <strong>Asistente:</strong> {selectedAssistant.Name}
                    </p>
                    <p className="text-xs text-primary-600 dark:text-primary-400">
                      <strong>Modelo:</strong> {selectedAssistant.Model}
                    </p>
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="flat"
                onPress={() => setIsModifyModalOpen(false)}
                isDisabled={isModifying}
              >
                Cancelar
              </Button>
              <Button
                color="secondary"
                startContent={isModifying ? <Spinner size="sm" color="white" /> : <Save className="w-4 h-4" />}
                onPress={handleSaveModification}
                isDisabled={isModifying || !modification.trim()}
              >
                {isModifying ? "Modificando..." : "Guardar Cambios"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Result Modal */}
        <Modal
          isOpen={isResultModalOpen}
          onClose={() => setIsResultModalOpen(false)}
          size="3xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-success" />
                <span>Modificación Completada</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div className="bg-success-50 dark:bg-success-900/20 p-4 rounded-lg">
                  <p className="text-success-700 dark:text-success-400 font-semibold mb-2">
                    ✓ El prompt ha sido modificado exitosamente
                  </p>
                  <p className="text-sm text-success-600 dark:text-success-500">
                    El asistente <strong>{selectedAssistant?.Name}</strong> ha sido actualizado.
                  </p>
                </div>
                <Divider />
                <div>
                  <p className="text-sm font-semibold text-default-700 mb-2">
                    Vista previa del nuevo prompt:
                  </p>
                  <div className="bg-default-100 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {modificationResult}
                    </pre>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="success"
                onPress={() => {
                  setIsResultModalOpen(false)
                  setModification("")
                  setModificationResult(null)
                }}
              >
                Cerrar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  )
}
