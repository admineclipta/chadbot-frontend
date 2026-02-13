"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardBody,
  Input,
  Button,
  Chip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react"
import {
  EyeIcon,
  SlashIcon as EyeSlashIcon,
  MessageCircleIcon,
  SparklesIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { apiService, ApiError } from "@/lib/api"
import type { LoginRequest } from "@/lib/api-types"
import { config } from "@/lib/config"

export default function Login() {
  const router = useRouter()
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showEasterEggMessage, setShowEasterEggMessage] = useState(false)
  const [showSuperAdminPrompt, setShowSuperAdminPrompt] = useState(false)
  const confettiRef = useRef<HTMLDivElement>(null)
  const currentYear = new Date().getFullYear()

  // Función para validar email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Manejar cambio de usuario/email
  const handleUsuarioChange = (value: string) => {
    setUsuario(value)
    if (value && !validateEmail(value)) {
      setEmailError("Por favor ingresa un email válido")
    } else {
      setEmailError(null)
    }
  }

  // Función para testear la conectividad de la API
  const testApiConnection = async () => {
    try {
      console.log("Testing API connection...")
      const response = await fetch(`${config.apiUrl}/health`, {
        method: "GET",
      })
      console.log("API connection test response:", response.status, response.statusText)
      
      if (response.ok) {
        alert("✅ Conexión a la API exitosa")
      } else {
        alert(`❌ Error de conexión: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error("API connection test error:", error)
      alert(`❌ Error de red: ${error}`)
    }
  }
  const generateConfetti = useCallback(() => {
    setShowConfetti(true)
    
    // Crear elementos de confeti
    const confettiContainer = confettiRef.current
    if (!confettiContainer) return

    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd', '#ff7675', '#74b9ff']
    const shapes = ['square', 'circle', 'triangle', 'star', 'heart']
    const emojis = ['🎉', '✨', '🌟', '💫', '🎊', '🎈', '🔥', '💎', '🦄', '🌈']

    // Crear múltiples oleadas de confeti
    for (let wave = 0; wave < 3; wave++) {
      setTimeout(() => {
        for (let i = 0; i < 80; i++) {
          const confettiPiece = document.createElement('div')
          const color = colors[Math.floor(Math.random() * colors.length)]
          const shape = shapes[Math.floor(Math.random() * shapes.length)]
          const size = Math.random() * 12 + 6
          const isEmoji = Math.random() < 0.3 // 30% chance de emoji
          
          confettiPiece.style.position = 'absolute'
          confettiPiece.style.left = `${Math.random() * 100}%`
          confettiPiece.style.top = '-20px'
          confettiPiece.style.pointerEvents = 'none'
          confettiPiece.style.zIndex = '9999'
          confettiPiece.style.fontSize = `${size}px`
          
          if (isEmoji) {
            confettiPiece.textContent = emojis[Math.floor(Math.random() * emojis.length)]
            confettiPiece.style.width = 'auto'
            confettiPiece.style.height = 'auto'
          } else {
            confettiPiece.style.width = `${size}px`
            confettiPiece.style.height = `${size}px`
            confettiPiece.style.backgroundColor = color
            
            if (shape === 'circle') {
              confettiPiece.style.borderRadius = '50%'
            } else if (shape === 'triangle') {
              confettiPiece.style.width = '0'
              confettiPiece.style.height = '0'
              confettiPiece.style.backgroundColor = 'transparent'
              confettiPiece.style.borderLeft = `${size/2}px solid transparent`
              confettiPiece.style.borderRight = `${size/2}px solid transparent`
              confettiPiece.style.borderBottom = `${size}px solid ${color}`
            } else if (shape === 'star') {
              confettiPiece.innerHTML = '★'
              confettiPiece.style.color = color
              confettiPiece.style.backgroundColor = 'transparent'
              confettiPiece.style.textAlign = 'center'
              confettiPiece.style.lineHeight = `${size}px`
            } else if (shape === 'heart') {
              confettiPiece.innerHTML = '♥'
              confettiPiece.style.color = color
              confettiPiece.style.backgroundColor = 'transparent'
              confettiPiece.style.textAlign = 'center'
              confettiPiece.style.lineHeight = `${size}px`
            }
          }

          // Animación de caída mejorada
          const fallDuration = Math.random() * 4000 + 3000
          const fallDelay = Math.random() * 500
          const rotationSpeed = Math.random() * 720 + 360
          const horizontalDrift = (Math.random() - 0.5) * 300
          const bounceHeight = Math.random() * 50 + 20

          confettiPiece.animate([
            {
              transform: `translateY(0px) translateX(0px) rotate(0deg) scale(1)`,
              opacity: 1
            },
            {
              transform: `translateY(${bounceHeight}px) translateX(${horizontalDrift * 0.3}px) rotate(${rotationSpeed * 0.3}deg) scale(1.2)`,
              opacity: 1,
              offset: 0.1
            },
            {
              transform: `translateY(${window.innerHeight + 100}px) translateX(${horizontalDrift}px) rotate(${rotationSpeed}deg) scale(0.8)`,
              opacity: 0
            }
          ], {
            duration: fallDuration,
            delay: fallDelay,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }).onfinish = () => {
            confettiPiece.remove()
          }

          confettiContainer.appendChild(confettiPiece)
        }
      }, wave * 300)
    }

    // Limpiar el estado después de 6 segundos
    setTimeout(() => {
      setShowConfetti(false)
    }, 6000)
  }, [])

  const handleEasterEgg = () => {
    generateConfetti()
    setShowEasterEggMessage(true)
    
    // Vibración en dispositivos móviles (si está disponible)
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 300])
    }
    
    // Crear un audio context para un sonido de celebración
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Secuencia de notas celebratorias
      const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
      let noteIndex = 0
      
      const playNote = () => {
        if (noteIndex < notes.length) {
          oscillator.frequency.setValueAtTime(notes[noteIndex], audioContext.currentTime)
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
          noteIndex++
          setTimeout(playNote, 100)
        }
      }
      
      oscillator.start()
      playNote()
      setTimeout(() => oscillator.stop(), 500)
    } catch (e) {
      // Audio no disponible, continuar sin sonido
      console.log('Audio no disponible')
    }
    
    // Mostrar mensaje divertido en consola
    console.log('🎉 ¡Has encontrado el easter egg de Eclipta! 🎉')
    console.log('✨ Desarrollado con amor por el equipo de Eclipta ✨')
    console.log('🚀 ¡Gracias por usar Chadbot! 🚀')
    
    // Ocultar mensaje después de 3 segundos
    setTimeout(() => {
      setShowEasterEggMessage(false)
    }, 3000)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setEmailError(null)

    try {
      const credentials: LoginRequest = {
        email: usuario,
        password: password,
      }

      console.log("Attempting login with credentials:", { email: usuario })
      const response = await apiService.login(credentials)
      console.log("Login response:", response)

      if (response.accessToken) {
        console.log("Login successful, token received")
        
        // Obtener los datos completos del usuario desde el endpoint /auth/me
        try {
          const fullUserData = await apiService.getCurrentUser();
          console.log("Full user data from API:", fullUserData);
          
          // Determinar el rol basado en los roles del usuario
          // Consideramos admin a usuarios con roles: admin, administrador, owner, superadmin
          const isAdmin = fullUserData.roles?.some((role) => {
            const roleLower = role.code.toLowerCase();
            return roleLower.includes("admin") || 
                   roleLower.includes("administrador") ||
                   roleLower.includes("owner") ||
                   roleLower.includes("superadmin");
          });

          const isSuperAdmin = fullUserData.roles?.some((role) => {
            const roleLower = role.code.toLowerCase();
            return roleLower === "super_admin" || roleLower === "superadmin";
          });
          
          const frontendUserData = {
            id: fullUserData.id,
            name: fullUserData.name || fullUserData.displayName || fullUserData.email.split('@')[0],
            email: fullUserData.email,
            avatar: "https://cdn-icons-png.flaticon.com/512/6596/6596121.png",
            role: isAdmin ? "admin" : "agent",
            roles: fullUserData.roles || [], // Guardar todos los roles con sus permisos
            permissions: fullUserData.permissions || [], // Guardar todos los permisos
            displayName: fullUserData.displayName,
            agentId: fullUserData.agentId,
          }

          localStorage.setItem("chadbot_user", JSON.stringify(frontendUserData))
          console.log("User data saved to localStorage, redirecting...")

          if (isSuperAdmin) {
            setShowSuperAdminPrompt(true)
            return
          }

          // Redirigir al dashboard
          router.push("/")
        } catch (userError) {
          console.error("Failed to fetch user data:", userError)
          setError("Error al cargar los datos del usuario.")
        }
      } else {
        console.error("Login failed or missing token in response")
        setError("Error en la respuesta del servidor. Intenta nuevamente.")
      }
    } catch (error) {
      console.error("Login error:", error)
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setError("Credenciales incorrectas. Verifica tu email y contraseña.")
        } else if (error.status === 403) {
          setError("No tienes permisos para acceder al sistema.")
        } else if (error.status >= 500) {
          setError("Error del servidor. Intenta más tarde o contacta al administrador.")
        } else {
          setError(error.message || "Error de conexión. Verifica tu conexión a internet.")
        }
      } else {
        setError("Error inesperado. Intenta nuevamente.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fondo con degradado usando la paleta de marca */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-brand-primary to-blue-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fillRule=evenodd%3E%3Cg fill=%23BDF26D fillOpacity=0.08%3E%3Ccircle cx=30 cy=30 r=4/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
      </div>

      {/* Elementos decorativos flotantes con colores de marca */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-brand-lime/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-brand-lavender/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-lime/15 rounded-full blur-2xl animate-pulse delay-500"></div>

      {/* Contenido principal */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        {/* Contenedor de confeti */}
        <div 
          ref={confettiRef}
          className="fixed inset-0 pointer-events-none z-50"
          style={{ zIndex: 9999 }}
        />
        
        {/* Mensaje de easter egg */}
        <AnimatePresence>
          {showEasterEggMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -50 }}
              transition={{ duration: 0.5, ease: "backOut" }}
              className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white px-6 py-3 rounded-full shadow-2xl border border-white/30 backdrop-blur-lg"
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 0.6, repeat: 2 }}
                className="flex items-center gap-2 font-semibold"
              >
                <SparklesIcon className="h-5 w-5" />
                <span>¡Con amor el equipo de Eclipta! 🎉</span>
                <SparklesIcon className="h-5 w-5" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="w-full max-w-md">
          {/* Logo y título */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <img src="/chadbot-isotipo.png" alt="Chadbot" className="w-16 h-16 object-contain" />
              <h1 className="text-4xl font-bold text-white font-bricolage">chadbot</h1>
            </div>
            <p className="text-white/90 text-base">Plataforma de Mensajería Inteligente</p>
            
            {/* Indicador de ambiente discreto con popover */}
            <div className="absolute top-4 right-4">
              <Popover showArrow placement="bottom">
                <PopoverTrigger>
                  <Chip 
                    size="sm" 
                    variant="flat" 
                    className="bg-white/30 text-slate-800 border border-slate-300/50 text-xs cursor-pointer hover:bg-white/40 hover:text-slate-900 transition-all duration-200"
                  >
                    {config.environmentName}
                  </Chip>
                </PopoverTrigger>
                <PopoverContent className="p-1">
                  <div className="px-3 py-2 bg-white/90 backdrop-blur-lg rounded-lg border border-slate-300">
                    <p className="text-xs text-slate-700">
                      Conectado a: <span className="text-slate-900 font-mono">{config.apiUrl}</span>
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Card de login con efecto cristal */}
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardBody className="p-8">
              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
                  <AlertCircleIcon className="h-4 w-4 text-red-300" />
                  <span className="text-red-200 text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <Input
                  type="email"
                  label="Email"
                  placeholder="usuario@empresa.com"
                  value={usuario}
                  onChange={(e) => handleUsuarioChange(e.target.value)}
                  isRequired
                  variant="flat"
                  radius="lg"
                  size="lg"
                  isInvalid={!!emailError}
                  errorMessage={emailError}
                  classNames={{
                    base: "max-w-full",
                    mainWrapper: "h-full",
                    input: [
                      "bg-transparent", 
                      "text-white", 
                      "placeholder:text-white/50", 
                      "text-base",
                      "outline-none",
                      "focus:outline-none",
                      "focus:ring-0",
                      "border-none"
                    ],
                    innerWrapper: "bg-transparent",
                    inputWrapper: [
                      "shadow-lg",
                      "bg-white/20",
                      "backdrop-blur-md",
                      "backdrop-saturate-200",
                      "hover:bg-white/25",
                      "focus-within:!bg-white/25",
                      "!cursor-text",
                      "border-2",
                      "border-white/20",
                      "hover:border-white/40",
                      "focus-within:!border-white/60",
                      "!outline-none",
                      "focus:!outline-none",
                      "focus-visible:!outline-none",
                      "h-14",
                    ],
                    label: "text-white/80 font-medium",
                    errorMessage: "text-red-300 text-xs mt-1",
                  }}
                />

                <Input
                  label="Contraseña"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  isRequired
                  variant="flat"
                  radius="lg"
                  size="lg"
                  classNames={{
                    base: "max-w-full",
                    mainWrapper: "h-full",
                    input: [
                      "bg-transparent", 
                      "text-white", 
                      "placeholder:text-white/50", 
                      "text-base",
                      "outline-none",
                      "focus:outline-none",
                      "focus:ring-0",
                      "border-none"
                    ],
                    innerWrapper: "bg-transparent",
                    inputWrapper: [
                      "shadow-lg",
                      "bg-white/20",
                      "backdrop-blur-md",
                      "backdrop-saturate-200",
                      "hover:bg-white/25",
                      "focus-within:!bg-white/25",
                      "!cursor-text",
                      "border-2",
                      "border-white/20",
                      "hover:border-white/40",
                      "focus-within:!border-white/60",
                      "!outline-none",
                      "focus:!outline-none",
                      "focus-visible:!outline-none",
                      "h-14",
                    ],
                    label: "text-white/80 font-medium",
                  }}
                  endContent={
                    <button className="focus:outline-none" type="button" onClick={() => setIsVisible(!isVisible)}>
                      {isVisible ? (
                        <EyeSlashIcon className="h-5 w-5 text-white/60 hover:text-white/80 transition-colors" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-white/60 hover:text-white/80 transition-colors" />
                      )}
                    </button>
                  }
                  type={isVisible ? "text" : "password"}
                />

                <Button
                  type="submit"
                  className="w-full bg-brand-lime hover:bg-brand-lime/90 text-slate-900 font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                  isLoading={isLoading}
                  size="lg"
                  radius="lg"
                  isDisabled={!!emailError || !usuario || !password}
                >
                  {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
                </Button>
              </form>
            </CardBody>
          </Card>

          {/* Debug Button */}
          {config.environment === "development" && (
            <div className="text-center mt-4">
              <Button
                onClick={testApiConnection}
                className="bg-gray-700 hover:bg-gray-600 text-white"
                size="sm"
                variant="flat"
              >
                🔧 Test API Connection
              </Button>
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-white/60 text-sm">
              © {currentYear} ChatVRM. Desarrollado por{" "}
              <motion.span
                onClick={handleEasterEgg}
                className={`text-white/80 hover:text-white cursor-pointer font-medium transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] select-none ${showConfetti ? 'easter-egg-text' : ''}`}
                whileHover={{ 
                  scale: 1.05,
                  textShadow: "0 0 8px rgba(255,255,255,0.8)"
                }}
                whileTap={{ 
                  scale: 0.95,
                  rotate: [0, -5, 5, -5, 0],
                  transition: { duration: 0.3 }
                }}
              >
                eclipta
              </motion.span>
              .
            </p>
          </div>
        </div>

        <Modal
          isOpen={showSuperAdminPrompt}
          onClose={() => setShowSuperAdminPrompt(false)}
          size="lg"
          isDismissable={false}
          classNames={{
            backdrop: "bg-slate-950/70 backdrop-blur-sm",
          }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-5 w-5 text-brand-lime" />
                  <span>Acceso Super Admin</span>
                </ModalHeader>
                <ModalBody>
                  <p className="text-slate-600 dark:text-slate-300">
                    Tu usuario tiene el rol <span className="font-semibold">super_admin</span>.
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Quieres ser redirigido a la web de administracion (Chadmin)?
                  </p>
                  {!config.chadminUrl && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      La URL de Chadmin no esta configurada en el ambiente.
                    </p>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button
                    variant="light"
                    onPress={() => {
                      onClose()
                      router.push("/")
                    }}
                  >
                    Continuar en Chadbot
                  </Button>
                  <Button
                    color="secondary"
                    isDisabled={!config.chadminUrl}
                    onPress={() => {
                      if (config.chadminUrl) {
                        window.location.href = config.chadminUrl
                      }
                    }}
                  >
                    Ir a Chadmin
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    </div>
  )
}
