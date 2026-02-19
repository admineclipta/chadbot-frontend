"use client"

import React, { useState, useMemo } from "react"
import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Input,
  ScrollShadow,
} from "@heroui/react"
import { ChevronDown, Search } from "lucide-react"
import { countries, searchCountries, type Country } from "@/lib/countries"

interface CountrySelectorProps {
  selectedCountry: Country | null
  onCountrySelect: (country: Country) => void
  placeholder?: string
  className?: string
}

export default function CountrySelector({
  selectedCountry,
  onCountrySelect,
  placeholder = "Seleccionar país",
  className = "",
}: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredCountries = useMemo(() => {
    return searchCountries(searchQuery)
  }, [searchQuery])

  const handleCountrySelect = (country: Country) => {
    onCountrySelect(country)
    setIsOpen(false)
    setSearchQuery("")
  }

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      placement="bottom-start"
      classNames={{
        content: "p-0 w-80",
      }}
    >
      <PopoverTrigger>
        <Button
          variant="bordered"
          className={`justify-between h-14 px-3 ${className}`}
          endContent={<ChevronDown className="h-4 w-4" />}
        >
          {selectedCountry ? (
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedCountry.flag}</span>
              <span className="font-medium">{selectedCountry.dialCode}</span>
              <span className="text-sm text-gray-500 truncate">
                {selectedCountry.name}
              </span>
            </div>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="w-full">
          <div className="p-3 border-b">
            <Input
              placeholder="Buscar país..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startContent={<Search className="h-4 w-4 text-gray-400" />}
              size="sm"
              variant="bordered"
            />
          </div>
          <ScrollShadow className="h-60">
            <div className="p-1">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <Button
                    key={country.code}
                    variant="light"
                    className="w-full justify-start h-auto p-3 mb-1"
                    onPress={() => handleCountrySelect(country)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span className="text-xl">{country.flag}</span>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sm">
                          {country.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {country.dialCode}
                        </div>
                      </div>
                      <div className="text-sm font-mono text-gray-600">
                        {country.code}
                      </div>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No se encontraron países
                </div>
              )}
            </div>
          </ScrollShadow>
        </div>
      </PopoverContent>
    </Popover>
  )
}
