/**
 * Tests para schemas de autenticación
 */

import { describe, it, expect } from 'vitest'
import {
    UserRegistrationSchema,
    UserLoginSchema,
    ChangePasswordSchema,
} from './auth.schema'

describe('Auth Schemas', () => {
    describe('UserRegistrationSchema', () => {
        it('debe validar datos de registro correctos', () => {
            const validData = {
                type: 'business',
                fullname: 'Juan Pérez',
                email: 'juan@example.com',
                confirmEmail: 'juan@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                otp: '123456',
            }

            const result = UserRegistrationSchema.safeParse(validData)
            expect(result.success).toBe(true)
        })

        it('debe rechazar nombre muy corto', () => {
            const invalidData = {
                type: 'business',
                fullname: 'Jua', // Solo 3 caracteres (mínimo es 4)
                email: 'juan@example.com',
                confirmEmail: 'juan@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                otp: '123456',
            }

            const result = UserRegistrationSchema.safeParse(invalidData)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('al menos 4 caracteres')
            }
        })

        it('debe rechazar email inválido', () => {
            const invalidData = {
                type: 'business',
                fullname: 'Juan Pérez',
                email: 'email-invalido',
                confirmEmail: 'email-invalido',
                password: 'password123',
                confirmPassword: 'password123',
                otp: '123456',
            }

            const result = UserRegistrationSchema.safeParse(invalidData)
            expect(result.success).toBe(false)
        })

        it('debe rechazar contraseña muy corta', () => {
            const invalidData = {
                type: 'business',
                fullname: 'Juan Pérez',
                email: 'juan@example.com',
                confirmEmail: 'juan@example.com',
                password: 'pass',
                confirmPassword: 'pass',
                otp: '123456',
            }

            const result = UserRegistrationSchema.safeParse(invalidData)
            expect(result.success).toBe(false)
        })

        it('debe rechazar cuando las contraseñas no coinciden', () => {
            const invalidData = {
                type: 'business',
                fullname: 'Juan Pérez',
                email: 'juan@example.com',
                confirmEmail: 'juan@example.com',
                password: 'password123',
                confirmPassword: 'password456',
                otp: '123456',
            }

            const result = UserRegistrationSchema.safeParse(invalidData)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('contraseñas no coinciden')
            }
        })

        it('debe rechazar cuando los emails no coinciden', () => {
            const invalidData = {
                type: 'business',
                fullname: 'Juan Pérez',
                email: 'juan@example.com',
                confirmEmail: 'juan2@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                otp: '123456',
            }

            const result = UserRegistrationSchema.safeParse(invalidData)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('emails no coinciden')
            }
        })

        it('debe rechazar OTP muy corto', () => {
            const invalidData = {
                type: 'business',
                fullname: 'Juan Pérez',
                email: 'juan@example.com',
                confirmEmail: 'juan@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                otp: '12345',
            }

            const result = UserRegistrationSchema.safeParse(invalidData)
            expect(result.success).toBe(false)
        })

        it('debe rechazar contraseña con caracteres especiales no permitidos', () => {
            const invalidData = {
                type: 'business',
                fullname: 'Juan Pérez',
                email: 'juan@example.com',
                confirmEmail: 'juan@example.com',
                password: 'password@123',
                confirmPassword: 'password@123',
                otp: '123456',
            }

            const result = UserRegistrationSchema.safeParse(invalidData)
            expect(result.success).toBe(false)
        })
    })

    describe('UserLoginSchema', () => {
        it('debe validar datos de login correctos', () => {
            const validData = {
                email: 'juan@example.com',
                password: 'password123',
            }

            const result = UserLoginSchema.safeParse(validData)
            expect(result.success).toBe(true)
        })

        it('debe rechazar email inválido', () => {
            const invalidData = {
                email: 'email-invalido',
                password: 'password123',
            }

            const result = UserLoginSchema.safeParse(invalidData)
            expect(result.success).toBe(false)
        })

        it('debe rechazar contraseña muy corta', () => {
            const invalidData = {
                email: 'juan@example.com',
                password: 'pass',
            }

            const result = UserLoginSchema.safeParse(invalidData)
            expect(result.success).toBe(false)
        })

        it('debe rechazar contraseña muy larga', () => {
            const invalidData = {
                email: 'juan@example.com',
                password: 'a'.repeat(65),
            }

            const result = UserLoginSchema.safeParse(invalidData)
            expect(result.success).toBe(false)
        })
    })

    describe('ChangePasswordSchema', () => {
        it('debe validar cambio de contraseña correcto', () => {
            const validData = {
                password: 'newpassword123',
                confirmPassword: 'newpassword123',
            }

            const result = ChangePasswordSchema.safeParse(validData)
            expect(result.success).toBe(true)
        })

        it('debe rechazar cuando las contraseñas no coinciden', () => {
            const invalidData = {
                password: 'newpassword123',
                confirmPassword: 'differentpassword',
            }

            const result = ChangePasswordSchema.safeParse(invalidData)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('contraseñas no coinciden')
            }
        })

        it('debe rechazar contraseña muy corta', () => {
            const invalidData = {
                password: 'short',
                confirmPassword: 'short',
            }

            const result = ChangePasswordSchema.safeParse(invalidData)
            expect(result.success).toBe(false)
        })
    })
})

