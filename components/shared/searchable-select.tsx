"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  Button,
  Input,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Listbox,
  ListboxItem,
  Spinner,
} from "@heroui/react"
import { Search, ChevronDown, X } from "lucide-react"

interface SearchableSelectProps<T> {
  items: T[]
  selectedKey: string
  placeholder: string
  searchPlaceholder?: string
  isLoading?: boolean
  label?: string
  getKey: (item: T) => string
  getTextValue: (item: T) => string
  renderSelectedValue?: (item: T | null) => React.ReactNode
  renderItem: (item: T) => React.ReactNode
  onChange: (value: string) => void
  emptyLabel?: string
  filterFunction?: (item: T, searchTerm: string) => boolean
  className?: string
}

export default function SearchableSelect<T>({
  items,
  selectedKey,
  placeholder,
  searchPlaceholder = "Buscar...",
  isLoading = false,
  label,
  getKey,
  getTextValue,
  renderSelectedValue,
  renderItem,
  onChange,
  emptyLabel = "Todos",
  filterFunction,
  className = "",
}: SearchableSelectProps<T>) {
  const [searchValue, setSearchValue] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Encontrar el item seleccionado
  const selectedItem = useMemo(() => {
    if (!selectedKey) return null
    return items.find(item => getKey(item) === selectedKey) || null
  }, [items, selectedKey, getKey])

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

  // Manejar selección
  const handleSelect = (key: string) => {
    onChange(key)
    // No cerramos el dropdown para permitir seguir navegando
    // setIsOpen(false)
    // No limpiamos la búsqueda para mantener el contexto
    // setSearchValue("")
  }

  // Limpiar selección
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("")
    setSearchValue("")
  }

  // Renderizar valor seleccionado
  const displayValue = useMemo(() => {
    if (!selectedItem) return emptyLabel
    
    if (renderSelectedValue) {
      return renderSelectedValue(selectedItem)
    }
    
    return getTextValue(selectedItem)
  }, [selectedItem, emptyLabel, renderSelectedValue, getTextValue])

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
            className="w-full justify-between h-10 px-3"
            endContent={
              <div className="flex items-center gap-1">
                {selectedKey && (
                  <X
                    className="w-4 h-4 text-default-400 hover:text-default-600 cursor-pointer"
                    onClick={handleClear}
                  />
                )}
                <ChevronDown className={`w-4 h-4 text-default-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            }
            isLoading={isLoading}
          >
            <div className="flex-1 text-left truncate text-sm">
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
            <div className="max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center items-center py-6">
                  <Spinner size="sm" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-6 text-center text-sm text-default-400">
                  {searchValue ? "No se encontraron resultados" : "No hay elementos disponibles"}
                </div>
              ) : (
                <Listbox
                  aria-label="Selección"
                  selectionMode="single"
                  selectedKeys={selectedKey ? [selectedKey] : []}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as string
                    if (key) handleSelect(key)
                  }}
                >
                  {filteredItems.map((item) => (
                    <ListboxItem
                      key={getKey(item)}
                      textValue={getTextValue(item)}
                    >
                      {renderItem(item)}
                    </ListboxItem>
                  ))}
                </Listbox>
              )}
            </div>

            {/* Contador de resultados */}
            {searchValue && !isLoading && (
              <div className="p-2 border-t border-divider">
                <p className="text-xs text-default-400 text-center">
                  {filteredItems.length} resultado{filteredItems.length !== 1 ? 's' : ''} encontrado{filteredItems.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
