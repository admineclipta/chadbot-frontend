"use client"

import { useState, useEffect, useMemo } from "react"
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

const statusOptions: { key: ConversationStatus | "all"; label: string }[] = [
  { key: "all", label: "Todos los estados" },
  { key: "ACTIVE", label: "Activa" },
  { key: "INTERVENED", label: "Intervenida" },
  { key: "CLOSED", label: "Cerrada" },
  { key: "NO_ANSWER", label: "Sin respuesta" },
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
  
  // Estados temporales para el modal (solo se aplican al dar "Filtrar")
  const [tempStatus, setTempStatus] = useState(selectedStatus)
  const [tempTeam, setTempTeam] = useState(selectedTeam)
  const [tempAgent, setTempAgent] = useState(selectedAgent)
  const [tempTags, setTempTags] = useState(selectedTags)
  const [tempSortBy, setTempSortBy] = useState(sortBy)
  const [tempSortDirection, setTempSortDirection] = useState(sortDirection)

  // Estados de búsqueda interna
  const [teamSearchValue, setTeamSearchValue] = useState("")
  const [agentSearchValue, setAgentSearchValue] = useState("")
  const [tagSearchValue, setTagSearchValue] = useState("")

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
    DEBOUNCE_SEARCH_MS
  )

  // Fetch users (agentes)
  const { data: usersData, loading: usersLoading } = useApi(
    (signal) => apiService.getUsers(0, 100, signal),
    [],
    DEBOUNCE_SEARCH_MS
  )

  // Fetch tags
  const { data: tagsData, loading: tagsLoading } = useApi(
    (signal) => apiService.getTags(0, 100, undefined, signal),
    [],
    DEBOUNCE_SEARCH_MS
  )

  const teams = teamsData?.content || []
  const users = usersData?.content || []
  const tags = tagsData?.content || []

  // Filtrar users que tengan agentId
  const agents = useMemo(() => users.filter(u => u.agentId !== null), [users])

  // Filtrar por búsqueda interna
  const filteredTeams = useMemo(() => {
    if (!teamSearchValue) return teams
    return teams.filter(t => t.name.toLowerCase().includes(teamSearchValue.toLowerCase()))
  }, [teams, teamSearchValue])

  const filteredAgents = useMemo(() => {
    if (!agentSearchValue) return agents
    return agents.filter(a => {
      const name = a.displayName || a.name || a.email
      return name.toLowerCase().includes(agentSearchValue.toLowerCase())
    })
  }, [agents, agentSearchValue])

  const filteredTags = useMemo(() => {
    if (!tagSearchValue) return tags
    return tags.filter(t => t.name.toLowerCase().includes(tagSearchValue.toLowerCase()))
  }, [tags, tagSearchValue])

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
        label: `Estado: ${statusOption?.label || selectedStatus}`,
      })
    }
    
    if (selectedTeam) {
      const team = teams.find(t => t.id === selectedTeam)
      filters.push({
        type: "team",
        label: `Equipo: ${team?.name || "Desconocido"}`,
      })
    }
    
    if (selectedAgent) {
      const agent = agents.find(a => a.agentId === selectedAgent)
      filters.push({
        type: "agent",
        label: `Agente: ${agent?.displayName || agent?.name || "Desconocido"}`,
      })
    }
    
    selectedTags.forEach(tagId => {
      const tag = tags.find(t => t.id === tagId)
      if (tag) {
        filters.push({
          type: "tag",
          label: tag.name,
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
        <Input
          placeholder="Buscar conversaciones..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          startContent={<Search className="w-4 h-4 text-default-400" />}
          isClearable
          onClear={() => onSearchChange("")}
          className="flex-1"
          classNames={{
            inputWrapper: "shadow-none",
          }}
        />
        
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
                {/* Sección: Estado */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Estado</h3>
                  <Select
                    placeholder="Seleccionar estado"
                    selectedKeys={[tempStatus]}
                    onChange={(e) => setTempStatus(e.target.value as ConversationStatus | "all")}
                    size="sm"
                  >
                    {statusOptions.map((option) => (
                      <SelectItem key={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <Divider />

                {/* Sección: Equipo */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Equipo</h3>
                  <Select
                    placeholder="Seleccionar equipo"
                    selectedKeys={tempTeam ? [tempTeam] : []}
                    onChange={(e) => setTempTeam(e.target.value)}
                    size="sm"
                    isLoading={teamsLoading}
                  >
                    <SelectItem key="">
                      Todos los equipos
                    </SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <Divider />

                {/* Sección: Agente */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Agente</h3>
                  <Select
                    placeholder="Seleccionar agente"
                    selectedKeys={tempAgent ? [tempAgent] : []}
                    onChange={(e) => setTempAgent(e.target.value)}
                    size="sm"
                    isLoading={agentsLoading}
                    renderValue={(items) => {
                      if (items.length === 0) return "Todos los agentes"
                      const agent = agents.find(a => a.id === items[0].key)
                      if (!agent) return "Todos los agentes"
                      
                      return (
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={agent.displayName}
                            size="sm"
                            className="w-5 h-5"
                            style={{ backgroundColor: generatePastelColor(agent.id) }}
                          />
                          <span className="text-sm">{agent.displayName}</span>
                        </div>
                      )
                    }}
                  >
                    <SelectItem key="">
                      Todos los agentes
                    </SelectItem>
                    {agents.map((agent) => (
                      <SelectItem
                        key={agent.id}
                        startContent={
                          <Avatar
                            name={agent.displayName}
                            size="sm"
                            className="w-6 h-6"
                            style={{ backgroundColor: generatePastelColor(agent.id) }}
                          />
                        }
                      >
                        {agent.displayName}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <Divider />

                {/* Sección: Etiquetas */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Etiquetas</h3>
                  <Select
                    placeholder="Seleccionar etiquetas"
                    selectionMode="multiple"
                    selectedKeys={tempTags}
                    onSelectionChange={(keys) => {
                      const selectedArray = Array.from(keys) as string[]
                      setTempTags(selectedArray)
                    }}
                    size="sm"
                    isLoading={tagsLoading}
                    renderValue={(items) => {
                      if (items.length === 0) return "Todas las etiquetas"
                      
                      return (
                        <div className="flex flex-wrap gap-1">
                          {items.map((item) => {
                            const tag = tags.find(t => t.id === item.key)
                            if (!tag) return null
                            
                            return (
                              <Chip
                                key={tag.id}
                                size="sm"
                                style={{ backgroundColor: tag.color, color: "#000" }}
                                className="text-xs"
                              >
                                {tag.name}
                              </Chip>
                            )
                          })}
                        </div>
                      )
                    }}
                  >
                    {tags.map((tag) => (
                      <SelectItem
                        key={tag.id}
                        startContent={
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                        }
                      >
                        {tag.name}
                      </SelectItem>
                    ))}
                  </Select>
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
