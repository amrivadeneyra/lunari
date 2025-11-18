# Lunari AI - Plataforma de Chatbots Inteligentes

[![Next.js](https://img.shields.io/badge/Next.js-14.2.4-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-green)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.1-38B2AC)](https://tailwindcss.com/)

Lunari AI es una plataforma completa de chatbots inteligentes que permite a empresas crear, personalizar y gestionar asistentes virtuales para mejorar la atención al cliente, automatizar ventas y optimizar la experiencia del usuario.

## Características Principales

### Chatbot Inteligente
- **IA Conversacional**: Integración con OpenAI GPT-3.5 para respuestas naturales y contextuales
- **Personalización Completa**: Iconos, colores, mensajes de bienvenida y temas personalizables
- **Detección de Negocios**: Identificación automática del tipo de negocio basado en productos
- **Respuestas Contextuales**: Adaptación automática según el contexto de la conversación

### Gestión de Empresas
- **Multi-empresa**: Soporte para múltiples empresas/dominios por usuario
- **Configuración Flexible**: Personalización completa por empresa
- **Dashboard Unificado**: Gestión centralizada de todas las empresas

### Sistema de Conversaciones
- **Chat en Tiempo Real**: Conversaciones en vivo con notificaciones push
- **Historial Completo**: Almacenamiento y gestión de todas las conversaciones
- **Estados de Conversación**: No leídos, todos, expirados y favoritos
- **Búsqueda Avanzada**: Filtrado y búsqueda de conversaciones

### Gestión de Productos
- **Catálogo Digital**: Gestión completa de productos con imágenes y precios
- **Recomendaciones IA**: Sugerencias inteligentes basadas en el contexto

### Sistema de Citas
- **Agendamiento Automático**: Reserva de citas con calendario integrado
- **Gestión de Horarios**: Configuración de slots de tiempo disponibles
- **Confirmaciones**: Notificaciones automáticas de citas

### Sistema de Notificaciones
- **Email Automático**: Notificaciones por correo electrónico
- **Notificaciones Push**: Alertas en tiempo real
- **Templates Personalizables**: Mensajes personalizados por empresa

## Tecnologías Utilizadas

### Frontend
- **Next.js 14.2.4** - Framework de React con App Router
- **React 18** - Biblioteca de interfaz de usuario
- **TypeScript 5** - Tipado estático para JavaScript
- **Tailwind CSS 3.4.1** - Framework de CSS utilitario
- **Radix UI** - Componentes de interfaz accesibles
- **Lucide React** - Iconografía moderna

### Backend
- **Next.js API Routes** - API REST integrada
- **Prisma 5.22.0** - ORM moderno para bases de datos
- **PostgreSQL** - Base de datos relacional
- **Clerk** - Autenticación y gestión de usuarios

### IA y Servicios Externos
- **OpenAI GPT-3.5** - Modelo de lenguaje para el chatbot
- **UploadCare** - Gestión de archivos y imágenes

### Herramientas de Desarrollo
- **ESLint** - Linting de código
- **PostCSS** - Procesamiento de CSS
- **React Hook Form** - Gestión de formularios
- **Zod** - Validación de esquemas
- **Date-fns** - Manipulación de fechas

## Instalación

### Prerrequisitos
- Node.js 18+ 
- PostgreSQL
- Cuenta de OpenAI
- Cuenta de Clerk

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd s7-temporal
```

2. **Instalar dependencias**
```bash
npm install
# o
yarn install
# o
bun install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env.local
```

Editar `.env.local` con tus credenciales:
```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/lunari_ai"

# Autenticación
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# OpenAI
OPEN_AI_KEY=your_openai_api_key

# UploadCare
NEXT_PUBLIC_UPLOAD_CARE_PUBLIC_KEY=your_uploadcare_key

```

4. **Configurar la base de datos**
```bash
npx prisma generate
npx prisma db push
```

5. **Ejecutar el servidor de desarrollo**
```bash
npm run dev
# o
yarn dev
# o
bun dev
```

6. **Abrir en el navegador**
```
http://localhost:3000
```

## Estructura del Proyecto

```
lunari/
├── src/
│   ├── action/          # Server actions
│   ├── app/             # Next.js App Router
│   ├── components/      # Componentes React
│   ├── constants/       # Constantes y configuraciones
│   ├── context/         # Contextos de React
│   ├── hooks/           # Custom hooks
│   ├── icons/           # Iconos personalizados
│   ├── lib/             # Utilidades y configuraciones
│   └── schemas/         # Esquemas de validación
├── prisma/              # Esquema y migraciones de base de datos
├── public/              # Archivos estáticos
└── docs/                # Documentación adicional
```

## Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Construcción para producción
npm run build

# Iniciar servidor de producción
npm run start

# Linting
npm run lint
```

## Base de Datos

El proyecto utiliza PostgreSQL con Prisma como ORM. Los modelos principales incluyen:

- **User**: Usuarios del sistema
- **Company**: Empresas/dominios
- **ChatBot**: Configuración de asistentes virtuales
- **Customer**: Clientes de las empresas
- **ChatRoom**: Salas de chat
- **ChatMessage**: Mensajes de conversación
- **Product**: Productos de las empresas
- **Bookings**: Citas agendadas

## Configuración del Asistente Virtual

### Personalización Visual
- Icono personalizado
- Colores de tema
- Mensaje de bienvenida
- Fondo personalizado

### Funcionalidades
- Preguntas frecuentes (FAQ)
- Catálogo de productos
- Agendamiento de citas
- Procesamiento de pagos
- Captura de información del cliente

### Integraciones
- OpenAI para respuestas inteligentes
- Email para notificaciones

---

**Lunari AI** - Transformando la atención al cliente con IA inteligente