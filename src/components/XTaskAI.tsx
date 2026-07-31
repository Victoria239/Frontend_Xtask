import React, { useState, useRef, useEffect } from 'react';
import {
  IconButton,
  Box,
  Paper,
  Typography,
  TextField,
  Fab,
  Avatar,
  Chip,
  useTheme,
  alpha,
  CircularProgress,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  SmartToy,
  Close,
  Send,
  Search,
  Business,
  People,
  AttachMoney,
  Assessment,
  Public,
  Psychology,
  Lightbulb,
  TrendingUp,
  Mic,
  MicOff,
  VolumeUp,
  VolumeOff,
  Settings,
} from '@mui/icons-material';
import axios from 'axios';
import { notify } from "../hooks/useToast";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'app-data' | 'web-search';
  sources?: string[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  query: string;
  type: 'app' | 'web';
}

const XTaskAI: React.FC = () => {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '¡Hola! Soy XTaskAI, tu asistente inteligente con capacidades de voz. Puedo ayudarte a consultar información del aplicativo y buscar en Internet. Puedes hablarme directamente o escribirme. ¿En qué puedo asistirte?',
      sender: 'ai',
      timestamp: new Date(),
      type: 'text',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  /* Compat: el viejo state {open,message,severity} fue reemplazado por sileo (notify).
   * Mantenemos el setter como wrapper para no tocar 3 callsites internos. */
  const setNotification = (
    s: { open: boolean; message: string; severity: 'success' | 'error' | 'info' }
      | ((prev: { open: boolean; message: string; severity: 'success' | 'error' | 'info' }) => unknown)
  ) => {
    if (typeof s === 'function') return; // ignoramos los cierres ({...prev, open: false})
    if (s.open && s.message) {
      notify({ kind: s.severity, msg: s.message });
    }
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  const quickActions: QuickAction[] = [
    {
      id: '1',
      label: 'Resumen de Proyectos',
      icon: <Business />,
      query: 'Muéstrame un resumen de todos los proyectos activos',
      type: 'app',
    },
    {
      id: '2',
      label: 'Estado Financiero',
      icon: <AttachMoney />,
      query: '¿Cuál es el estado financiero actual de la empresa?',
      type: 'app',
    },
    {
      id: '3',
      label: 'Información de Empleados',
      icon: <People />,
      query: '¿Cuántos empleados hay y cuál es su satisfacción?',
      type: 'app',
    },
    {
      id: '4',
      label: 'Buscar en Internet',
      icon: <Public />,
      query: 'Busca información sobre las últimas tendencias en gestión empresarial',
      type: 'web',
    },
    {
      id: '5',
      label: 'Análisis de KPIs',
      icon: <Assessment />,
      query: 'Analiza los KPIs más importantes del negocio',
      type: 'app',
    },
    {
      id: '6',
      label: 'Ideas de Mejora',
      icon: <Lightbulb />,
      query: 'Sugereme ideas para mejorar la productividad del equipo',
      type: 'web',
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Inicializar síntesis de voz
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
    }
  }, []);

  // Inicializar reconocimiento de voz
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        setInputValue(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setNotification({
          open: true,
          message: 'Error en el reconocimiento de voz. Por favor, intenta nuevamente.',
          severity: 'error',
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Función para iniciar/detener reconocimiento de voz
  const toggleVoiceRecognition = () => {
    if (!voiceEnabled || !recognitionRef.current) {
      setNotification({
        open: true,
        message: 'El reconocimiento de voz no está disponible en tu navegador.',
        severity: 'error',
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setNotification({
        open: true,
        message: 'Escuchando... Habla ahora.',
        severity: 'info',
      });
    }
  };

  // Función para sintetizar voz
  const speakText = (text: string) => {
    if (!speechEnabled || !synthesisRef.current) return;

    // Detener cualquier voz en curso
    synthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    synthesisRef.current.speak(utterance);
  };

  // Función para detener la voz
  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Determinar si es una consulta del aplicativo o de Internet
      const isWebQuery = inputValue.toLowerCase().includes('internet') || 
                        inputValue.toLowerCase().includes('busca') ||
                        inputValue.toLowerCase().includes('google') ||
                        inputValue.toLowerCase().includes('información externa');

      let response;
      
      if (isWebQuery) {
        // Consulta a Internet (simulada - en producción usarías una API real)
        response = await simulateWebSearch(inputValue);
      } else {
        // Consulta del aplicativo
        response = await queryAppData(inputValue);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        sender: 'ai',
        timestamp: new Date(),
        type: response.type,
        sources: response.sources,
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Sintetizar la respuesta del asistente si está habilitado
      if (speechEnabled) {
        setTimeout(() => {
          speakText(response.text);
        }, 500);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Lo siento, tuve un problema al procesar tu consulta. Por favor, intenta nuevamente.',
        sender: 'ai',
        timestamp: new Date(),
        type: 'text',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const queryAppData = async (query: string) => {
    // Simulación de consulta al aplicativo
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (query.toLowerCase().includes('proyecto')) {
      return {
        type: 'app-data' as const,
        text: `**Resumen de Proyectos Activos:**

📊 **Total de Proyectos:** 12
✅ **Completados:** 3 (25%)
🔄 **En Progreso:** 8 (67%)
⚠️ **En Riesgo:** 1 (8%)

**Proyectos Destacados:**
• **E-commerce Platform** - 85% completado
• **Mobile App Redesign** - 72% completado  
• **Data Analytics Dashboard** - 60% completado

**Métricas Clave:**
• Tasa de éxito: 83%
• Tiempo promedio de entrega: 4.2 semanas
• Presupuesto total: €450,000`,
        sources: ['Base de datos de Proyectos', 'Sistema de Gestión'],
      };
    }

    if (query.toLowerCase().includes('financiero') || query.toLowerCase().includes('dinero')) {
      return {
        type: 'app-data' as const,
        text: `**Estado Financiero Actual:**

💰 **Ingresos Mensuales:** €125,000
📈 **Crecimiento:** +15% vs mes anterior
📊 **Margen de Beneficio:** 42%
💼 **Costos Operativos:** €72,500

**Distribución de Ingresos:**
• Servicios: 65% (€81,250)
• Productos: 25% (€31,250)
• Consultoría: 10% (€12,500)

**Proyecciones:**
• Ingresos Q2: €380,000 estimados
• Margen objetivo: 45%
• ROI actual: 18.5%`,
        sources: ['Sistema Financiero', 'Reportes Contables'],
      };
    }

    if (query.toLowerCase().includes('empleado')) {
      return {
        type: 'app-data' as const,
        text: `**Información de Empleados:**

👥 **Total de Empleados:** 45
⭐ **Satisfacción:** 4.2/5.0
🔄 **Rotación:** 8% (baja)
📚 **Capacitación:** 12 cursos completados este mes

**Distribución por Departamento:**
• Desarrollo: 18 empleados
• Ventas: 12 empleados
• Marketing: 8 empleados
• Administración: 7 empleados

**Indicadores de Rendimiento:**
• Productividad: +12% vs trimestre anterior
• Asistencia: 96%
• Engagement: 4.1/5.0`,
        sources: ['RRHH Database', 'Sistema de Evaluación'],
      };
    }

    return {
      type: 'app-data' as const,
      text: `He analizado tu consulta sobre el aplicativo XTask. 

**Información General del Sistema:**
🏢 **Empresa:** XTask Solutions
📊 **Usuarios Activos:** 156
🔄 **Uptime del Sistema:** 99.8%
⚡ **Respuesta Promedio:** 1.2s

**Módulos Disponibles:**
• Gestión de Proyectos
• Recursos Humanos  
• Finanzas y Contabilidad
• KPIs y Analytics
• Sistema de Nómina

¿Necesitas información específica sobre algún módulo en particular?`,
      sources: ['Sistema XTask', 'Base de datos Principal'],
    };
  };

  const simulateWebSearch = async (query: string) => {
    // Simulación de búsqueda en Internet
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      type: 'web-search' as const,
      text: `**Resultados de Búsqueda en Internet:**

🔍 **Consulta:** "${query}"

**Información Encontrada:**

Según las últimas tendencias en gestión empresarial para 2024:

📈 **Tecnologías Emergentes:**
• IA y Machine Learning en procesos de negocio
• Automatización Robótica de Procesos (RPA)
• Análisis Predictivo para toma de decisiones

💡 **Mejores Prácticas:**
• Metodologías Agile adaptadas a equipos remotos
• Sistemas de gestión híbridos (presencial/remote)
• Enfoque en bienestar y salud mental de empleados

📊 **Métricas de Éxito:**
• Productividad: +23% con herramientas digitales
• Retención: -15% rotación con programas flexibles
• Innovación: +40% ideas implementadas

**Fuentes Consultadas:**
• Harvard Business Review
• McKinsey Digital Report
• Forbes Technology Council

¿Te gustaría que profundice en algún aspecto específico?`,
      sources: ['Harvard Business Review', 'McKinsey Digital', 'Forbes Tech'],
    };
  };

  const handleQuickAction = (action: QuickAction) => {
    setInputValue(action.query);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Botón Flotante */}
      {!isOpen && (
        <Tooltip title="XTaskAI - Asistente Inteligente" arrow>
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              width: 64,
              height: 64,
              backgroundColor: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
                transform: 'scale(1.1)',
              },
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              zIndex: 1000,
            }}
            onClick={() => setIsOpen(true)}
          >
            <SmartToy sx={{ fontSize: 32 }} />
          </Fab>
        </Tooltip>
      )}

      {/* Ventana del Chat */}
      {isOpen && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 400,
            height: 600,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            zIndex: 1000,
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'white', color: theme.palette.primary.main }}>
                <SmartToy />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  XTaskAI
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Asistente con Voz
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Configuración de Voz">
                <IconButton size="small" onClick={() => setShowSettings(!showSettings)} sx={{ color: 'white' }}>
                  <Settings />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: 'white' }}>
                <Close />
              </IconButton>
            </Box>
          </Box>

          {/* Panel de Configuración de Voz */}
          {showSettings && (
            <Box sx={{ p: 2, backgroundColor: alpha(theme.palette.primary.main, 0.05), borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Configuración de Voz
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={voiceEnabled}
                      onChange={(e) => setVoiceEnabled(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Reconocimiento de Voz (Entrada)"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={speechEnabled}
                      onChange={(e) => setSpeechEnabled(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Síntesis de Voz (Salida)"
                />
              </Box>
            </Box>
          )}

          {/* Área de Acciones Rápidas */}
          <Box sx={{ p: 1, backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
            <Typography variant="caption" sx={{ ml: 1, fontWeight: 600, color: 'text.secondary' }}>
              Consultas Rápidas:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {quickActions.map((action) => (
                <Chip
                  key={action.id}
                  label={action.label}
                  size="small"
                  icon={action.icon}
                  onClick={() => handleQuickAction(action)}
                  sx={{
                    fontSize: '0.7rem',
                    height: 24,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Mensajes */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor:
                      message.sender === 'user'
                        ? theme.palette.primary.main
                        : message.type === 'web-search'
                        ? alpha(theme.palette.success.main, 0.1)
                        : message.type === 'app-data'
                        ? alpha(theme.palette.info.main, 0.1)
                        : alpha(theme.palette.grey[100], 0.8),
                    color:
                      message.sender === 'user'
                        ? 'white'
                        : message.type === 'web-search'
                        ? theme.palette.success.dark
                        : message.type === 'app-data'
                        ? theme.palette.info.dark
                        : 'text.primary',
                    wordBreak: 'break-word',
                    border: message.type !== 'text' ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}` : 'none',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                    {message.text}
                  </Typography>
                  {message.sources && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.8 }}>
                        Fuentes:
                      </Typography>
                      {message.sources.map((source, idx) => (
                        <Typography key={idx} variant="caption" sx={{ display: 'block', opacity: 0.7 }}>
                          • {source}
                        </Typography>
                      ))}
                    </Box>
                  )}
                  <Typography variant="caption" sx={{ mt: 0.5, display: 'block', opacity: 0.7 }}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              </Box>
            ))}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.grey[100], 0.8),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Pensando...
                  </Typography>
                </Box>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box sx={{ p: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                fullWidth
                size="small"
                placeholder={isListening ? "Escuchando..." : "Escribe o habla tu consulta..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading || isListening}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: isListening ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                  },
                }}
                InputProps={{
                  startAdornment: isListening && (
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                  ),
                }}
              />
              
              {/* Botón de Reconocimiento de Voz */}
              <Tooltip title={isListening ? "Detener grabación" : "Iniciar reconocimiento de voz"}>
                <IconButton
                  onClick={toggleVoiceRecognition}
                  disabled={!voiceEnabled || isLoading}
                  sx={{
                    backgroundColor: isListening 
                      ? theme.palette.error.main 
                      : voiceEnabled 
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha(theme.palette.action.disabled, 0.1),
                    color: isListening 
                      ? 'white' 
                      : voiceEnabled 
                        ? theme.palette.primary.main
                        : theme.palette.action.disabled,
                    '&:hover': {
                      backgroundColor: isListening 
                        ? theme.palette.error.dark
                        : voiceEnabled 
                          ? alpha(theme.palette.primary.main, 0.2)
                          : alpha(theme.palette.action.disabled, 0.2),
                    },
                  }}
                >
                  {isListening ? <MicOff /> : <Mic />}
                </IconButton>
              </Tooltip>

              {/* Botón de Control de Voz (Detener/Reproducir) */}
              {isSpeaking ? (
                <Tooltip title="Detener voz">
                  <IconButton
                    onClick={stopSpeaking}
                    sx={{
                      backgroundColor: alpha(theme.palette.error.main, 0.1),
                      color: theme.palette.error.main,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.error.main, 0.2),
                      },
                    }}
                  >
                    <VolumeOff />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Repetir última respuesta">
                  <IconButton
                    onClick={() => {
                      const lastAiMessage = messages.filter(m => m.sender === 'ai').pop();
                      if (lastAiMessage && speechEnabled) {
                        speakText(lastAiMessage.text);
                      }
                    }}
                    disabled={!speechEnabled || messages.filter(m => m.sender === 'ai').length === 0}
                    sx={{
                      backgroundColor: speechEnabled 
                        ? alpha(theme.palette.success.main, 0.1)
                        : alpha(theme.palette.action.disabled, 0.1),
                      color: speechEnabled 
                        ? theme.palette.success.main
                        : theme.palette.action.disabled,
                      '&:hover': {
                        backgroundColor: speechEnabled 
                          ? alpha(theme.palette.success.main, 0.2)
                          : alpha(theme.palette.action.disabled, 0.2),
                      },
                    }}
                  >
                    <VolumeUp />
                  </IconButton>
                </Tooltip>
              )}

              {/* Botón de Envío */}
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading || isListening}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                  '&:disabled': {
                    backgroundColor: theme.palette.action.disabled,
                  },
                }}
              >
                {isLoading ? <CircularProgress size={20} color="inherit" /> : <Send />}
              </IconButton>
            </Box>

            {/* Indicador de Estado de Voz */}
            {(isListening || isSpeaking) && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                {isListening && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={12} />
                    <Typography variant="caption" color="primary">
                      🎤 Escuchando...
                    </Typography>
                  </Box>
                )}
                {isSpeaking && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={12} color="success" />
                    <Typography variant="caption" color="success.main">
                      🔊 Hablando...
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* Las notificaciones ahora se renderizan globalmente vía sileo (Toaster en App.tsx) */}
    </>
  );
};

export default XTaskAI;
