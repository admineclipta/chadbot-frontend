"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
  Input,
  Select,
  SelectItem,
  Button,
  Badge,
  Avatar,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Divider,
  Kbd,
  type SelectedItems,
} from "@heroui/react"
import {
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { apiService } from "@/lib/api"
import { useApi } from "@/hooks/use-api"
import { DEBOUNCE_SEARCH_MS } from "@/lib/config"
import type {
  ConversationStatus,
  ConversationSortField,
  SortDirection,
  Team,
  UserDto,
  Tag,
} from "@/lib/api-types"
import { generatePastelColor } from "@/lib/utils"
import SearchableSelect from "./searchable-select"
import SearchableMultiSelect from "./searchable-multi-select"

interface ConversationFiltersProps {
  // Estados de filtros
  searchTerm: string
  selectedStatus: ConversationStatus | "all"
  selectedTeam: string
  selectedAgent: string
  selectedTags: string[]
  sortBy: ConversationSortField
  sortDirection: SortDirection
  
  // Callbacks
  onSearchChange: (value: string) => void
  onStatusChange: (value: ConversationStatus | "all") => void
  onTeamChange: (value: string) => void
  onAgentChange: (value: string) => void
  onTagsChange: (value: string[]) => void
  onSortByChange: (value: ConversationSortField) => void
  onSortDirectionChange: (value: SortDirection) => void
  onClearFilters: () => void
}

const statusOptions: { key: ConversationStatus | "all"; label: string; color: "default" | "success" | "warning" | "danger" }[] = [
  { key: "ACTIVE", label: "Activa", color: "success" },
  { key: "INTERVENED", label: "Intervenida", color: "warning" },
  { key: "CLOSED", label: "Cerrada", color: "default" },
  { key: "NO_ANSWER", label: "Sin respuesta", color: "danger" },
]

const sortFieldOptions: { key: ConversationSortField; label: string }[] = [
  { key: "updatedAt", label: "Última actualización" },
  { key: "createdAt", label: "Fecha de creación" },
  { key: "status", label: "Estado" },
  { key: "contactName", label: "Nombre del contacto" },
]

const sortDirectionOptions: { key: SortDirection; label: string }[] = [
  { key: "DESC", label: "Descendente" },
  { key: "ASC", label: "Ascendente" },
]

export default function ConversationFilters({
  searchTerm,
  selectedStatus,
  selectedTeam,
  selectedAgent,
  selectedTags,
  sortBy,
  sortDirection,
  onSearchChange,
  onStatusChange,
  onTeamChange,
  onAgentChange,
  onTagsChange,
  onSortByChange,
  onSortDirectionChange,
  onClearFilters,
}: ConversationFiltersProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  // Estados temporales para el modal (solo se aplican al dar "Filtrar")
  const [tempStatus, setTempStatus] = useState(selectedStatus)
  const [tempTeam, setTempTeam] = useState(selectedTeam)
  const [tempAgent, setTempAgent] = useState(selectedAgent)
  const [tempTags, setTempTags] = useState(selectedTags)
  const [tempSortBy, setTempSortBy] = useState(sortBy)
  const [tempSortDirection, setTempSortDirection] = useState(sortDirection)

  // Atajo de teclado para enfocar búsqueda (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Sincronizar estados temporales cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setTempStatus(selectedStatus)
      setTempTeam(selectedTeam)
      setTempAgent(selectedAgent)
      setTempTags(selectedTags)
      setTempSortBy(sortBy)
      setTempSortDirection(sortDirection)
    }
  }, [isOpen, selectedStatus, selectedTeam, selectedAgent, selectedTags, sortBy, sortDirection])

  // Fetch teams
  const { data: teamsData, loading: teamsLoading } = useApi(
    (signal) => apiService.getTeams(0, 100, signal),
    [],
    0
  )

  // Fetch users (agentes)
  const { data: usersData, loading: usersLoading } = useApi(
    (signal) => apiService.getUsers(0, 100, signal),
    [],
    0
  )

  // Fetch tags
  const { data: tagsData, loading: tagsLoading } = useApi(
    (signal) => apiService.getTags(0, 100, undefined, signal),
    [],
    0
  )

  const teams = teamsData?.content || []
  const users = usersData?.content || []
  const tags = tagsData?.content || []

  // Filtrar users que tengan agentId
  const agents = useMemo(() => users.filter(u => u.agentId !== null), [users])

  // Calcular cantidad de filtros activos (excluyendo búsqueda y sortBy default)
  const activeFiltersCount = [
    selectedStatus !== "all",
    selectedTeam !== "",
    selectedAgent !== "",
    selectedTags.length > 0,
  ].filter(Boolean).length

  // Aplicar filtros del modal
  const handleApplyFilters = () => {
    onStatusChange(tempStatus)
    onTeamChange(tempTeam)
    onAgentChange(tempAgent)
    onTagsChange(tempTags)
    onSortByChange(tempSortBy)
    onSortDirectionChange(tempSortDirection)
    onOpenChange()
  }

  // Limpiar filtros temporales en el modal
  const handleClearFiltersInModal = () => {
    setTempStatus("all")
    setTempTeam("")
    setTempAgent("")
    setTempTags([])
    setTempSortBy("updatedAt")
    setTempSortDirection("DESC")
  }

  // Remover un filtro específico
  const removeFilter = (type: string, value?: string) => {
    switch (type) {
      case "status":
        onStatusChange("all")
        break
      case "team":
        onTeamChange("")
        break
      case "agent":
        onAgentChange("")
        break
      case "tag":
        if (value) {
          onTagsChange(selectedTags.filter(id => id !== value))
        }
        break
    }
  }

  // Obtener etiquetas de filtros aplicados
  const getAppliedFilters = () => {
    const filters: { type: string; label: string; value?: string; color?: string }[] = []
    
    if (selectedStatus !== "all") {
      const statusOption = statusOptions.find(opt => opt.key === selectedStatus)
      filters.push({
        type: "status",
        label: `${statusOption?.label || selectedStatus}`,
      })
    }
    
    if (selectedTeam) {
      const team = teams.find(t => t.id === selectedTeam)
      filters.push({
        type: "team",
        label: `${team?.name || "Desconocido"}`,
      })
    }
    
    if (selectedAgent) {
      const agent = agents.find(a => a.agentId === selectedAgent)
      filters.push({
        type: "agent",
        label: `${agent?.displayName || agent?.name || "Desconocido"}`,
      })
    }
    
    selectedTags.forEach(tagId => {
      const tag = tags.find(t => t.id === tagId)
      if (tag) {
        filters.push({
          type: "tag",
          label: tag.label, // Usar label en lugar de name
          value: tagId,
          color: tag.color,
        })
      }
    })
    
    return filters
  }

  const appliedFilters = getAppliedFilters()

  return (
    <div className="space-y-3">
      {/* Barra de búsqueda y botón de filtros */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            ref={searchInputRef}
            placeholder="Buscar conversaciones..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            startContent={<Search className="w-4 h-4 text-default-400" />}
            isClearable
            onClear={() => onSearchChange("")}
            className="w-full"
            classNames={{
              inputWrapper: "shadow-none",
            }}
          />
          <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:block">
            <Kbd keys={["command"]} className="bg-default-100 text-default-500 text-xs">K</Kbd>
          </div>
        </div>
        
        <Badge content={activeFiltersCount > 0 ? activeFiltersCount : undefined} color="primary" size="sm">
          <Button
            isIconOnly
            variant="flat"
            onPress={onOpen}
            aria-label="Filtros"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </Button>
        </Badge>
      </div>

      {/* Fila de filtros aplicados */}
      {appliedFilters.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-default-300 scrollbar-track-transparent">
          {appliedFilters.map((filter, index) => (
            <Chip
              key={`${filter.type}-${filter.value || index}`}
              size="sm"
              variant="flat"
              onClose={() => removeFilter(filter.type, filter.value)}
              style={filter.color ? { backgroundColor: filter.color, color: "#000" } : undefined}
            >
              {filter.label}
            </Chip>
          ))}
        </div>
      )}

      {/* Modal de filtros */}
      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Filtros de conversaciones
              </ModalHeader>
              <ModalBody>
                {/* Sección: Estado (Chips) */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Estado</h3>
                  <div className="flex flex-wrap gap-2">
                    <Chip
                      variant={tempStatus === "all" ? "solid" : "flat"}
                      color={tempStatus === "all" ? "primary" : "default"}
                      className="cursor-pointer"
                      onClick={() => setTempStatus("all")}
                    >
                      Todos
                    </Chip>
                    {statusOptions.map((option) => (
                      <Chip
                        key={option.key}
                        variant={tempStatus === option.key ? "solid" : "flat"}
                        color={tempStatus === option.key ? option.color : "default"}
                        className="cursor-pointer"
                        onClick={() => setTempStatus(option.key)}
                      >
                        {option.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <Divider />

                {/* Sección: Equipo */}
                <div>
                  <SearchableSelect<Team>
                    label="Equipo"
                    items={teams}
                    selectedKey={tempTeam}
                    placeholder="Todos los equipos"
                    searchPlaceholder="Buscar equipos..."
                    isLoading={teamsLoading}
                    getKey={(team) => team.id}
                    getTextValue={(team) => team.name}
                    renderSelectedValue={(team) => (
                      <Chip size="sm" variant="flat">
                        {team.name}
                      </Chip>
                    )}
                    renderItem={(team) => (
                      <div className="flex gap-2 items-center">
                        <div className="flex flex-col">
                          <span className="text-small">{team.name}</span>
                          {team.description && (
                            <span className="text-tiny text-default-400">{team.description}</span>
                          )}
                        </div>
                      </div>
                    )}
                    onChange={setTempTeam}
                    emptyLabel="Todos los equipos"
                  />
                </div>

                <Divider />

                {/* Sección: Agente */}
                <div>
                  <SearchableSelect<UserDto>
                    label="Agente"
                    items={agents}
                    selectedKey={tempAgent}
                    placeholder="Todos los agentes"
                    searchPlaceholder="Buscar agentes..."
                    isLoading={usersLoading}
                    getKey={(agent) => agent.agentId!}
                    getTextValue={(agent) => agent.displayName || agent.name}
                  renderSelectedValue={(agent) => agent ? (
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={agent.displayName || agent.name}
                        size="sm"
                        className="w-5 h-5"
                        style={{ backgroundColor: generatePastelColor(agent.agentId || agent.id) }}
                      />
                      <span className="text-sm">{agent.displayName || agent.name}</span>
                    </div>
                  ) : null}
                    renderItem={(agent) => (
                      <div className="flex gap-2 items-center">
                        <Avatar
                          name={agent.displayName || agent.name}
                          size="sm"
                          className="w-6 h-6 shrink-0"
                          style={{ backgroundColor: generatePastelColor(agent.agentId || agent.id) }}
                        />
                        <div className="flex flex-col">
                          <span className="text-small">{agent.displayName || agent.name}</span>
                          <span className="text-tiny text-default-400">{agent.email}</span>
                        </div>
                      </div>
                    )}
                    onChange={setTempAgent}
                    emptyLabel="Todos los agentes"
                  />
                </div>

                <Divider />

                {/* Sección: Etiquetas */}
                <div>
                  <SearchableMultiSelect<Tag>
                    label="Etiquetas"
                    items={tags}
                    selectedKeys={tempTags}
                    placeholder="Todas las etiquetas"
                    searchPlaceholder="Buscar etiquetas..."
                    isLoading={tagsLoading}
                    getKey={(tag) => tag.id}
                    getTextValue={(tag) => tag.label}
                    renderSelectedChip={(tag) => (
                      <Chip
                        size="sm"
                        style={{ backgroundColor: tag.color, color: "#000" }}
                        className="text-xs"
                      >
                        {tag.label}
                      </Chip>
                    )}
                    renderItem={(tag, isSelected) => (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-small">{tag.label}</span>
                      </div>
                    )}
                    onChange={setTempTags}
                    emptyLabel="Todas las etiquetas"
                    maxChipsDisplay={3}
                  />
                </div>

                <Divider />

                {/* Sección: Ordenamiento */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Ordenamiento</h3>
                  <div className="flex gap-2">
                    <Select
                      placeholder="Ordenar por"
                      selectedKeys={[tempSortBy]}
                      onChange={(e) => setTempSortBy(e.target.value as ConversationSortField)}
                      size="sm"
                      className="flex-1"
                    >
                      {sortFieldOptions.map((option) => (
                        <SelectItem key={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </Select>
                    
                    <Select
                      placeholder="Dirección"
                      selectedKeys={[tempSortDirection]}
                      onChange={(e) => setTempSortDirection(e.target.value as SortDirection)}
                      size="sm"
                      className="flex-1"
                    >
                      {sortDirectionOptions.map((option) => (
                        <SelectItem key={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button 
                  variant="light" 
                  onPress={handleClearFiltersInModal}
                >
                  Limpiar filtros
                </Button>
                <Button 
                  color="primary" 
                  onPress={handleApplyFilters}
                >
                  Filtrar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
