"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  Button,
  Input,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Checkbox,
  Chip,
  ScrollShadow,
  Spinner,
} from "@heroui/react"
import { Search, ChevronDown, X } from "lucide-react"

interface SearchableMultiSelectProps<T> {
  items: T[]
  selectedKeys: string[]
  placeholder: string
  searchPlaceholder?: string
  isLoading?: boolean
  label?: string
  getKey: (item: T) => string
  getTextValue: (item: T) => string
  renderSelectedChip?: (item: T) => React.ReactNode
  renderItem: (item: T, isSelected: boolean) => React.ReactNode
  onChange: (values: string[]) => void
  emptyLabel?: string
  filterFunction?: (item: T, searchTerm: string) => boolean
  className?: string
  maxChipsDisplay?: number
}

export default function SearchableMultiSelect<T>({
  items,
  selectedKeys,
  placeholder,
  searchPlaceholder = "Buscar...",
  isLoading = false,
  label,
  getKey,
  getTextValue,
  renderSelectedChip,
  renderItem,
  onChange,
  emptyLabel = "Todos",
  filterFunction,
  className = "",
  maxChipsDisplay = 3,
}: SearchableMultiSelectProps<T>) {
  const [searchValue, setSearchValue] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Encontrar items seleccionados
  const selectedItems = useMemo(() => {
    return items.filter(item => selectedKeys.includes(getKey(item)))
  }, [items, selectedKeys, getKey])

  // Filtrar items basándose en el término de búsqueda
  const filteredItems = useMemo(() => {
    if (!searchValue) return items
    
    if (filterFunction) {
      return items.filter(item => filterFunction(item, searchValue))
    }
    
    // Función de filtrado por defecto
    return items.filter(item => {
      const textValue = getTextValue(item).toLowerCase()
      return textValue.includes(searchValue.toLowerCase())
    })
  }, [items, searchValue, filterFunction, getTextValue])

  // Auto-focus en el input de búsqueda cuando se abre
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Resetear búsqueda cuando se cierra el dropdown
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setSearchValue("")
    }
  }

  // Manejar toggle de selección
  const handleToggle = (key: string) => {
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter(k => k !== key))
    } else {
      onChange([...selectedKeys, key])
    }
  }

  // Limpiar todas las selecciones
  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
    setSearchValue("")
  }

  // Renderizar valor seleccionado
  const displayValue = useMemo(() => {
    if (selectedItems.length === 0) {
      return <span className="text-default-400">{emptyLabel}</span>
    }

    const displayItems = selectedItems.slice(0, maxChipsDisplay)
    const remaining = selectedItems.length - maxChipsDisplay

    return (
      <div className="flex flex-wrap gap-1">
        {displayItems.map((item) => {
          if (renderSelectedChip) {
            return (
              <div key={getKey(item)}>
                {renderSelectedChip(item)}
              </div>
            )
          }
          return (
            <Chip key={getKey(item)} size="sm" variant="flat">
              {getTextValue(item)}
            </Chip>
          )
        })}
        {remaining > 0 && (
          <Chip size="sm" variant="flat">
            +{remaining}
          </Chip>
        )}
      </div>
    )
  }, [selectedItems, emptyLabel, renderSelectedChip, getTextValue, getKey, maxChipsDisplay])

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      
      <Popover
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        placement="bottom"
        offset={4}
        classNames={{
          content: "p-0 w-full min-w-[280px]",
        }}
      >
        <PopoverTrigger>
          <Button
            variant="flat"
            className="w-full justify-between min-h-10 h-auto py-2 px-3"
            endContent={
              <div className="flex items-center gap-1 shrink-0">
                {selectedKeys.length > 0 && (
                  <X
                    className="w-4 h-4 text-default-400 hover:text-default-600 cursor-pointer"
                    onClick={handleClearAll}
                  />
                )}
                <ChevronDown className={`w-4 h-4 text-default-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            }
            isLoading={isLoading}
          >
            <div className="flex-1 text-left text-sm">
              {displayValue}
            </div>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[320px]">
          <div className="flex flex-col w-full">
            {/* Campo de búsqueda integrado */}
            <div className="p-2 border-b border-divider">
              <Input
                ref={searchInputRef}
                size="sm"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                startContent={<Search className="w-4 h-4 text-default-400" />}
                isClearable
                onClear={() => setSearchValue("")}
                classNames={{
                  inputWrapper: "shadow-none",
                }}
              />
            </div>

            {/* Lista de items */}
            <ScrollShadow className="max-h-[300px]">
              {isLoading ? (
                <div className="flex justify-center items-center py-6">
                  <Spinner size="sm" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-6 text-center text-sm text-default-400">
                  {searchValue ? "No se encontraron resultados" : "No hay elementos disponibles"}
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredItems.map((item) => {
                    const key = getKey(item)
                    const isSelected = selectedKeys.includes(key)
                    
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-default-100 cursor-pointer transition-colors"
                        onClick={() => handleToggle(key)}
                      >
                        <Checkbox
                          isSelected={isSelected}
                          size="sm"
                          classNames={{
                            wrapper: "shrink-0",
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          {renderItem(item, isSelected)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollShadow>

            {/* Footer con contador */}
            {!isLoading && (
              <div className="p-2 border-t border-divider flex justify-between items-center">
                <p className="text-xs text-default-400">
                  {searchValue ? (
                    `${filteredItems.length} resultado${filteredItems.length !== 1 ? 's' : ''}`
                  ) : (
                    `${items.length} total`
                  )}
                </p>
                {selectedKeys.length > 0 && (
                  <p className="text-xs text-primary font-medium">
                    {selectedKeys.length} seleccionado{selectedKeys.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
