/**
 * Tests para schemas de configuración
 */

import { describe, it, expect } from 'vitest'
import {
  AddCompanySchema,
  CompanySettingsSchema,
  HelpDeskQuestionsSchema,
  FilterQuestionsSchema,
  AddProductSchema,
  MAX_UPLOAD_SIZE,
  ACCEPTED_FILE_TYPES,
} from './settings.schema'

describe('Settings Schemas', () => {
  describe('AddCompanySchema', () => {
    it('debe validar dominio correcto', () => {
      const validData = {
        company: 'Mi Empresa',
        image: [
          {
            type: 'image/png',
            size: 1024 * 1024, // 1MB
          },
        ],
      }

      const result = AddCompanySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('debe rechazar nombre muy corto', () => {
      const invalidData = {
        company: 'A',
        image: [
          {
            type: 'image/png',
            size: 1024 * 1024,
          },
        ],
      }

      const result = AddCompanySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('debe rechazar nombre muy largo', () => {
      const invalidData = {
        company: 'A'.repeat(51),
        image: [
          {
            type: 'image/png',
            size: 1024 * 1024,
          },
        ],
      }

      const result = AddCompanySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('debe rechazar caracteres especiales no permitidos', () => {
      const invalidData = {
        company: 'Mi Empresa @#$',
        image: [
          {
            type: 'image/png',
            size: 1024 * 1024,
          },
        ],
      }

      const result = AddCompanySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('debe aceptar guiones y guiones bajos', () => {
      const validData = {
        company: 'Mi_Empresa-123',
        image: [
          {
            type: 'image/png',
            size: 1024 * 1024,
          },
        ],
      }

      const result = AddCompanySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('debe rechazar imagen muy grande', () => {
      const invalidData = {
        company: 'Mi Empresa',
        image: [
          {
            type: 'image/png',
            size: MAX_UPLOAD_SIZE + 1,
          },
        ],
      }

      const result = AddCompanySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('debe rechazar tipo de archivo no permitido', () => {
      const invalidData = {
        company: 'Mi Empresa',
        image: [
          {
            type: 'image/gif',
            size: 1024 * 1024,
          },
        ],
      }

      const result = AddCompanySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('CompanySettingsSchema', () => {
    it('debe validar configuración completa', () => {
      const validData = {
        company: 'Mi Empresa',
        welcomeMessage: 'Bienvenido a nuestra tienda',
        image: [
          {
            type: 'image/jpeg',
            size: 1024 * 1024,
          },
        ],
      }

      const result = CompanySettingsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('debe aceptar solo welcomeMessage', () => {
      const validData = {
        welcomeMessage: 'Bienvenido',
      }

      const result = CompanySettingsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('debe rechazar mensaje muy corto', () => {
      const invalidData = {
        welcomeMessage: 'Hola',
      }

      const result = CompanySettingsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('HelpDeskQuestionsSchema', () => {
    it('debe validar pregunta y respuesta', () => {
      const validData = {
        question: '¿Cuál es el horario de atención?',
        answer: 'Lunes a Viernes de 9am a 6pm',
      }

      const result = HelpDeskQuestionsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('debe rechazar pregunta vacía', () => {
      const invalidData = {
        question: '',
        answer: 'Respuesta válida',
      }

      const result = HelpDeskQuestionsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('debe rechazar respuesta vacía', () => {
      const invalidData = {
        question: 'Pregunta válida',
        answer: '',
      }

      const result = HelpDeskQuestionsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('FilterQuestionsSchema', () => {
    it('debe validar pregunta de filtro', () => {
      const validData = {
        question: '¿Qué tipo de producto buscas?',
      }

      const result = FilterQuestionsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('debe rechazar pregunta vacía', () => {
      const invalidData = {
        question: '',
      }

      const result = FilterQuestionsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('AddProductSchema', () => {
    it('debe validar producto completo', () => {
      const validData = {
        name: 'Tela de Algodón Premium',
        price: '50000',
        image: [
          {
            type: 'image/png',
            size: 1024 * 1024,
          },
        ],
        materialId: 'material-123',
        width: '1.50m',
        weight: '150 gr/m²',
        color: 'Azul',
        stock: '100',
        unit: 'metro',
        categoryId: 'category-123',
        description: 'Tela de alta calidad',
      }

      const result = AddProductSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('debe validar producto mínimo', () => {
      const validData = {
        name: 'Producto Simple',
        price: '10000',
        image: [
          {
            type: 'image/jpeg',
            size: 500 * 1024,
          },
        ],
      }

      const result = AddProductSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('debe rechazar nombre muy corto', () => {
      const invalidData = {
        name: 'AB',
        price: '10000',
        image: [
          {
            type: 'image/png',
            size: 1024 * 1024,
          },
        ],
      }

      const result = AddProductSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('debe rechazar imagen muy grande', () => {
      const invalidData = {
        name: 'Producto Válido',
        price: '10000',
        image: [
          {
            type: 'image/png',
            size: MAX_UPLOAD_SIZE + 1,
          },
        ],
      }

      const result = AddProductSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('debe aceptar campos opcionales', () => {
      const validData = {
        name: 'Producto Completo',
        price: '20000',
        image: [
          {
            type: 'image/jpeg',
            size: 1024 * 1024,
          },
        ],
        salePrice: '15000',
        featured: true,
        colors: 'Azul, Rojo, Verde',
        care: 'Lavar a mano',
      }

      const result = AddProductSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})

