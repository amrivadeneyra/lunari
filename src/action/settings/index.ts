'use server'

import { clerkClient, currentUser } from "@clerk/nextjs";
import { client } from "@/lib/prisma";

export const onIntegrateCompany = async (company: string, icon: string) => {
  const user = await currentUser();
  if (!user) return;
  try {
    const userData = await client.user.findUnique({
      where: {
        clerkId: user.id,
      },
      select: {
        company: true,
      },
    });

    if (!userData?.company) {
      // Primero obtener el userId
      const userRecord = await client.user.findUnique({
        where: { clerkId: user.id },
        select: { id: true }
      })

      if (!userRecord) {
        return {
          status: 400,
          message: "Usuario no encontrado"
        }
      }

      const newCompany = await client.company.create({
        data: {
          name: company,
          icon,
          userId: userRecord.id,
          chatBot: {
            create: {
              welcomeMessage: "Hola, ¿tienes alguna pregunta? Envíanos un mensaje aquí",
            }
          }
        },
        select: {
          id: true,
        },
      });

      if (newCompany) {
        return {
          status: 200,
          message: "Empresa agregada exitosamente",
          companyId: newCompany.id
        };
      }
    }

    return {
      status: 400,
      message: "Ya tienes una empresa asociada"
    };

  } catch (error) {
    console.log("Error in onIntegrateCompany: " + error)
  }
}

export const onGetAccountCompany = async () => {
  const user = await currentUser();
  if (!user) {
    return {
      id: '',
      company: null,
    };
  }

  try {
    const userData = await client.user.findUnique({
      where: {
        clerkId: user.id,
      },
      select: {
        id: true,
        company: {
          select: {
            id: true,
            name: true,
            icon: true,
            customer: {
              select: {
                chatRoom: {
                  select: {
                    id: true,
                    live: true,
                  },
                }
              },
            },
          },
        },
      },
    });

    if (userData) {
      return { ...userData }
    }

    return {
      id: '',
      company: null,
    };
  } catch (error: any) {
    console.error("onGetAccountCompany - Error fetching account company:", error);
    return {
      id: '',
      company: null,
    };
  }
}

export const onUpdatePassword = async (password: string) => {
  try {
    const user = await currentUser()

    if (!user) return null
    const update = await clerkClient.users.updateUser(user.id, { password })
    if (update) {
      return { status: 200, message: 'Contraseña actualizada' }
    }
  } catch (error) {
    console.log(error)
  }
}

export const onGetCurrentCompanyInfo = async (companyId: string) => {
  const user = await currentUser()
  if (!user) return null
  try {
    const userData = await client.user.findUnique({
      where: {
        clerkId: user.id,
      },
      select: {
        company: {
          where: {
            id: companyId,
          },
          select: {
            id: true,
            name: true,
            icon: true,
            userId: true,
            products: {
              include: {
                category: true,
                material: true,
                texture: true,
                season: true,
                features: {
                  select: {
                    featureId: true,
                  },
                },
              },
            },
            categories: true,
            materials: true,
            textures: true,
            seasons: true,
            uses: true,
            features: true,
            helpdesk: true,
            filterQuestions: true,
            chatBot: {
              select: {
                id: true,
                welcomeMessage: true,
                icon: true,
              },
            },
          },
        },
      },
    })

    if (userData?.company) {
      return { company: userData.company }
    }

    return null
  } catch (error) {
    console.log("Error en onGetCurrentCompanyInfo:", error)
    return null
  }
}

export const onUpdateCompany = async (id: string, name: string) => {
  try {
    const companyExists = await client.company.findFirst({
      where: {
        name: {
          equals: name,
        },
        id: {
          not: id,
        },
      },
    })

    if (!companyExists) {
      const company = await client.company.update({
        where: {
          id,
        },
        data: {
          name,
        },
      })

      if (company) {
        return {
          status: 200,
          message: 'Empresa actualizada',
        }
      }

      return {
        status: 400,
        message: 'Oops! algo salió mal',
      }
    }

    return {
      status: 400,
      message: 'Una empresa con este nombre ya existe',
    }
  } catch (error) {
    console.log(error)
  }
}

export const onChatBotImageUpdate = async (id: string, icon: string) => {
  const user = await currentUser()

  if (!user) return

  try {
    const company = await client.company.update({
      where: {
        id,
      },
      data: {
        chatBot: {
          update: {
            data: {
              icon,
            },
          },
        },
      },
    })

    if (company) {
      return {
        status: 200,
        message: 'Empresa actualizada',
      }
    }

    return {
      status: 400,
      message: 'Oops! algo salió mal',
    }
  } catch (error) {
    console.log(error)
  }
}

export const onUpdateWelcomeMessage = async (
  message: string,
  companyId: string
) => {
  try {
    const update = await client.company.update({
      where: {
        id: companyId,
      },
      data: {
        chatBot: {
          update: {
            data: {
              welcomeMessage: message,
            },
          },
        },
      },
    })

    if (update) {
      return { status: 200, message: 'Mensaje de bienvenida actualizado' }
    }
  } catch (error) {
    console.log(error)
  }
}

export const onDeleteUserCompany = async (id: string) => {
  const user = await currentUser()

  if (!user) return

  try {
    const validUser = await client.user.findUnique({
      where: {
        clerkId: user.id,
      },
      select: {
        id: true,
      },
    })

    if (validUser) {
      const deletedCompany = await client.company.delete({
        where: {
          userId: validUser.id,
          id,
        },
        select: {
          name: true,
        },
      })

      if (deletedCompany) {
        return {
          status: 200,
          message: `${deletedCompany.name} fue eliminada exitosamente`,
        }
      }
    }
  } catch (error) {
    console.log(error)
  }
}

export const onCreateHelpDeskQuestion = async (
  id: string,
  question: string,
  answer: string
) => {
  try {
    const helpDeskQuestion = await client.company.update({
      where: {
        id,
      },
      data: {
        helpdesk: {
          create: {
            question,
            answer,
          },
        },
      },
      include: {
        helpdesk: {
          select: {
            id: true,
            question: true,
            answer: true,
          },
        },
      },
    })

    if (helpDeskQuestion) {
      return {
        status: 200,
        message: 'Nueva pregunta agregada',
        questions: helpDeskQuestion.helpdesk,
      }
    }

    return {
      status: 400,
      message: 'Oops! algo salió mal',
    }
  } catch (error) {
    console.log('Error en onCreateHelpDeskQuestion:', error)
    return {
      status: 400,
      message: 'Error al crear la pregunta. Por favor, intenta nuevamente.',
    }
  }
}

export const onGetAllHelpDeskQuestions = async (id: string) => {
  try {
    const questions = await client.helpDesk.findMany({
      where: {
        companyId: id,
      },
      select: {
        question: true,
        answer: true,
        id: true,
      },
    })

    return {
      status: 200,
      message: 'Preguntas obtenidas exitosamente',
      questions: questions,
    }
  } catch (error) {
    console.log('Error en onGetAllHelpDeskQuestions:', error)
    return {
      status: 400,
      message: 'Error al obtener las preguntas',
      questions: [],
    }
  }
}

export const onUpdateHelpDeskQuestion = async (
  questionId: string,
  question: string,
  answer: string
) => {
  try {
    const updatedQuestion = await client.helpDesk.update({
      where: {
        id: questionId,
      },
      data: {
        question,
        answer,
      },
    })

    if (updatedQuestion) {
      return {
        status: 200,
        message: 'Pregunta actualizada exitosamente',
      }
    }

    return {
      status: 400,
      message: 'Error al actualizar la pregunta',
    }
  } catch (error) {
    console.log(error)
    return {
      status: 400,
      message: 'Error al actualizar la pregunta',
    }
  }
}

export const onDeleteHelpDeskQuestion = async (questionId: string) => {
  try {
    const deletedQuestion = await client.helpDesk.delete({
      where: {
        id: questionId,
      },
    })

    if (deletedQuestion) {
      return {
        status: 200,
        message: 'Pregunta eliminada exitosamente',
      }
    }

    return {
      status: 400,
      message: 'Error al eliminar la pregunta',
    }
  } catch (error) {
    console.log(error)
    return {
      status: 400,
      message: 'Error al eliminar la pregunta',
    }
  }
}

export const onCreateFilterQuestions = async (id: string, question: string) => {
  try {
    const filterQuestion = await client.company.update({
      where: {
        id,
      },
      data: {
        filterQuestions: {
          create: {
            question,
          },
        },
      },
      include: {
        filterQuestions: {
          select: {
            id: true,
            question: true,
          },
        },
      },
    })

    if (filterQuestion) {
      return {
        status: 200,
        message: 'Pregunta de filtro agregada',
        questions: filterQuestion.filterQuestions,
      }
    }
    return {
      status: 400,
      message: 'Oops! algo salió mal',
    }
  } catch (error) {
    console.log('Error en onCreateFilterQuestions:', error)
    return {
      status: 400,
      message: 'Error al crear la pregunta. Por favor, intenta nuevamente.',
    }
  }
}

export const onGetAllFilterQuestions = async (id: string) => {
  try {
    const questions = await client.filterQuestions.findMany({
      where: {
        companyId: id,
      },
      select: {
        question: true,
        id: true,
      },
      orderBy: {
        question: 'asc',
      },
    })

    return {
      status: 200,
      message: 'Preguntas obtenidas exitosamente',
      questions: questions,
    }
  } catch (error) {
    console.log('Error en onGetAllFilterQuestions:', error)
    return {
      status: 400,
      message: 'Error al obtener las preguntas',
      questions: [],
    }
  }
}

export const onUpdateFilterQuestion = async (questionId: string, question: string) => {
  try {
    const updatedQuestion = await client.filterQuestions.update({
      where: {
        id: questionId,
      },
      data: {
        question,
      },
    })

    if (updatedQuestion) {
      return {
        status: 200,
        message: 'Pregunta actualizada exitosamente',
      }
    }

    return {
      status: 400,
      message: 'Error al actualizar la pregunta',
    }
  } catch (error) {
    console.log(error)
    return {
      status: 400,
      message: 'Error al actualizar la pregunta',
    }
  }
}

export const onDeleteFilterQuestion = async (questionId: string) => {
  try {
    const deletedQuestion = await client.filterQuestions.delete({
      where: {
        id: questionId,
      },
    })

    if (deletedQuestion) {
      return {
        status: 200,
        message: 'Pregunta eliminada exitosamente',
      }
    }

    return {
      status: 400,
      message: 'Error al eliminar la pregunta',
    }
  } catch (error) {
    console.log('Error en onDeleteFilterQuestion:', error)
    return {
      status: 400,
      message: 'Error al eliminar la pregunta',
    }
  }
}

export const onCreateNewCompanyProduct = async (
  id: string,
  name: string,
  image: string,
  price: string,
  productData?: {
    materialId?: string
    width?: string
    weight?: string
    color?: string
    textureId?: string
    stock?: number
    unit?: string
    minStock?: number
    sku?: string
    salePrice?: number
    categoryId?: string
    featured?: boolean
    description?: string
    colors?: string[]
    images?: string[]
    seasonId?: string
    care?: string
    featureIds?: string[]
  }
) => {
  try {
    // Separar featureIds del resto de productData
    const { featureIds, ...restProductData } = productData || {}
    
    const product = await client.company.update({
      where: {
        id,
      },
      data: {
        products: {
          create: {
            name,
            image,
            price: parseInt(price),
            ...restProductData,
            // Agregar características si existen
            ...(featureIds && featureIds.length > 0 && {
              features: {
                create: featureIds.map(featureId => ({
                  featureId
                }))
              }
            })
          },
        },
      },
    })

    if (product) {
      return {
        status: 200,
        message: 'Producto creado exitosamente',
      }
    }
  } catch (error) {
    console.log(error)
  }
}

export const onDeleteCompanyProduct = async (productId: string) => {
  try {
    const product = await client.product.delete({
      where: {
        id: productId,
      },
    })

    if (product) {
      return {
        status: 200,
        message: 'Producto eliminado exitosamente',
      }
    }
  } catch (error) {
    console.log(error)
    return {
      status: 400,
      message: 'Error al eliminar el producto',
    }
  }
}

export const onUpdateCompanyProduct = async (
  productId: string,
  name: string,
  price: string,
  image?: string,
  productData?: {
    materialId?: string
    width?: string
    weight?: string
    color?: string
    textureId?: string
    stock?: number
    unit?: string
    minStock?: number
    sku?: string
    salePrice?: number
    categoryId?: string
    featured?: boolean
    description?: string
    colors?: string[]
    images?: string[]
    seasonId?: string
    care?: string
    featureIds?: string[]
  }
) => {
  try {
    // Separar featureIds del resto de productData
    const { featureIds, ...restProductData } = productData || {}
    
    const updateData: any = {
      name,
      price: parseInt(price),
      ...restProductData,
    }

    if (image) {
      updateData.image = image
    }

    // Si hay featureIds, actualizar las características
    if (featureIds !== undefined) {
      // Primero eliminar todas las características existentes
      await client.productFeature.deleteMany({
        where: {
          productId: productId
        }
      })
      
      // Luego crear las nuevas si hay alguna seleccionada
      if (featureIds.length > 0) {
        await client.productFeature.createMany({
          data: featureIds.map(featureId => ({
            productId: productId,
            featureId: featureId
          })),
          skipDuplicates: true
        })
      }
    }

    const product = await client.product.update({
      where: {
        id: productId,
      },
      data: updateData,
    })

    if (product) {
      return {
        status: 200,
        message: 'Producto actualizado exitosamente',
      }
    }
  } catch (error) {
    console.log(error)
    return {
      status: 400,
      message: 'Error al actualizar el producto',
    }
  }
}

export const onToggleProductStatus = async (productId: string) => {
  try {
    const currentProduct = await client.product.findUnique({
      where: { id: productId },
      select: {
        active: true
      }
    })

    if (!currentProduct) {
      return {
        status: 404,
        message: 'Producto no encontrado',
      }
    }

    const product = await client.product.update({
      where: {
        id: productId,
      },
      data: {
        active: !currentProduct.active,
      },
    })

    if (product) {
      return {
        status: 200,
        message: `Producto ${product.active ? 'activado' : 'desactivado'} exitosamente`,
        active: product.active,
      }
    }
  } catch (error) {
    console.log(error)
    return {
      status: 400,
      message: 'Error al cambiar el estado del producto',
    }
  }
}

// ===== GESTIÓN DE HORARIOS DISPONIBLES =====

export const onGetAvailabilitySchedule = async (companyId: string) => {
  try {
    const schedule = await client.availabilitySchedule.findMany({
      where: {
        companyId,
      },
      select: {
        id: true,
        dayOfWeek: true,
        timeSlots: true,
        isActive: true,
      },
      orderBy: {
        dayOfWeek: 'asc',
      },
    })

    return {
      status: 200,
      schedule,
    }
  } catch (error) {
    console.log(error)
    return {
      status: 400,
      message: 'Error al obtener horarios',
      schedule: [],
    }
  }
}

export const onUpdateAvailabilitySchedule = async (
  companyId: string,
  dayOfWeek: string,
  timeSlots: string[],
  isActive: boolean
) => {
  try {
    // Buscar si ya existe un registro para este día
    const existing = await client.availabilitySchedule.findUnique({
      where: {
        companyId_dayOfWeek: {
          companyId,
          dayOfWeek: dayOfWeek as any,
        },
      },
    })

    if (existing) {
      // Actualizar
      const updated = await client.availabilitySchedule.update({
        where: {
          id: existing.id,
        },
        data: {
          timeSlots,
          isActive,
        },
      })

      if (updated) {
        return {
          status: 200,
          message: 'Horario actualizado exitosamente',
        }
      }
    } else {
      // Crear
      const created = await client.availabilitySchedule.create({
        data: {
          companyId,
          dayOfWeek: dayOfWeek as any,
          timeSlots,
          isActive,
        },
      })

      if (created) {
        return {
          status: 200,
          message: 'Horario creado exitosamente',
        }
      }
    }

    return {
      status: 400,
      message: 'Error al guardar horario',
    }
  } catch (error) {
    console.log(error)
    return {
      status: 400,
      message: 'Error al guardar horario',
    }
  }
}

// ============================================
// GESTIÓN DE CATÁLOGOS DE PRODUCTOS
// ============================================

// ===== CATEGORÍAS =====
export const onGetCategories = async (companyId: string) => {
  try {
    const categories = await client.category.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    })
    return categories
  } catch (error) {
    console.log(error)
    return []
  }
}

export const onCreateCategory = async (companyId: string, name: string) => {
  try {
    const category = await client.category.create({
      data: { companyId, name },
    })
    return { status: 200, message: 'Categoría creada exitosamente', data: category }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al crear categoría' }
  }
}

export const onUpdateCategory = async (id: string, name: string) => {
  try {
    const category = await client.category.update({
      where: { id },
      data: { name },
    })
    return { status: 200, message: 'Categoría actualizada exitosamente', data: category }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al actualizar categoría' }
  }
}

export const onDeleteCategory = async (id: string) => {
  try {
    await client.category.delete({ where: { id } })
    return { status: 200, message: 'Categoría eliminada exitosamente' }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al eliminar categoría' }
  }
}

export const onToggleCategory = async (id: string) => {
  try {
    const category = await client.category.findUnique({ where: { id } })
    if (!category) return { status: 404, message: 'Categoría no encontrada' }

    const updated = await client.category.update({
      where: { id },
      data: { active: !category.active },
    })
    return { status: 200, message: 'Estado actualizado exitosamente', data: updated }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al actualizar estado' }
  }
}

// ===== MATERIALES =====
export const onGetMaterials = async (companyId: string) => {
  try {
    const materials = await client.material.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    })
    return materials
  } catch (error) {
    console.log(error)
    return []
  }
}

export const onCreateMaterial = async (companyId: string, name: string) => {
  try {
    const material = await client.material.create({
      data: { companyId, name },
    })
    return { status: 200, message: 'Material creado exitosamente', data: material }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al crear material' }
  }
}

export const onUpdateMaterial = async (id: string, name: string) => {
  try {
    const material = await client.material.update({
      where: { id },
      data: { name },
    })
    return { status: 200, message: 'Material actualizado exitosamente', data: material }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al actualizar material' }
  }
}

export const onDeleteMaterial = async (id: string) => {
  try {
    await client.material.delete({ where: { id } })
    return { status: 200, message: 'Material eliminado exitosamente' }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al eliminar material' }
  }
}

export const onToggleMaterial = async (id: string) => {
  try {
    const material = await client.material.findUnique({ where: { id } })
    if (!material) return { status: 404, message: 'Material no encontrado' }

    const updated = await client.material.update({
      where: { id },
      data: { active: !material.active },
    })
    return { status: 200, message: 'Estado actualizado exitosamente', data: updated }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al actualizar estado' }
  }
}

// ===== TEXTURAS =====
export const onGetTextures = async (companyId: string) => {
  try {
    const textures = await client.texture.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    })
    return textures
  } catch (error) {
    console.log(error)
    return []
  }
}

export const onCreateTexture = async (companyId: string, name: string) => {
  try {
    const texture = await client.texture.create({
      data: { companyId, name },
    })
    return { status: 200, message: 'Textura creada exitosamente', data: texture }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al crear textura' }
  }
}

export const onUpdateTexture = async (id: string, name: string) => {
  try {
    const texture = await client.texture.update({
      where: { id },
      data: { name },
    })
    return { status: 200, message: 'Textura actualizada exitosamente', data: texture }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al actualizar textura' }
  }
}

export const onDeleteTexture = async (id: string) => {
  try {
    await client.texture.delete({ where: { id } })
    return { status: 200, message: 'Textura eliminada exitosamente' }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al eliminar textura' }
  }
}

export const onToggleTexture = async (id: string) => {
  try {
    const texture = await client.texture.findUnique({ where: { id } })
    if (!texture) return { status: 404, message: 'Textura no encontrada' }

    const updated = await client.texture.update({
      where: { id },
      data: { active: !texture.active },
    })
    return { status: 200, message: 'Estado actualizado exitosamente', data: updated }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al actualizar estado' }
  }
}

// ===== TEMPORADAS =====
export const onGetSeasons = async (companyId: string) => {
  try {
    const seasons = await client.season.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    })
    return seasons
  } catch (error) {
    console.log(error)
    return []
  }
}

export const onCreateSeason = async (companyId: string, name: string) => {
  try {
    const season = await client.season.create({
      data: { companyId, name },
    })
    return { status: 200, message: 'Temporada creada exitosamente', data: season }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al crear temporada' }
  }
}

export const onUpdateSeason = async (id: string, name: string) => {
  try {
    const season = await client.season.update({
      where: { id },
      data: { name },
    })
    return { status: 200, message: 'Temporada actualizada exitosamente', data: season }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al actualizar temporada' }
  }
}

export const onDeleteSeason = async (id: string) => {
  try {
    await client.season.delete({ where: { id } })
    return { status: 200, message: 'Temporada eliminada exitosamente' }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al eliminar temporada' }
  }
}

export const onToggleSeason = async (id: string) => {
  try {
    const season = await client.season.findUnique({ where: { id } })
    if (!season) return { status: 404, message: 'Temporada no encontrada' }

    const updated = await client.season.update({
      where: { id },
      data: { active: !season.active },
    })
    return { status: 200, message: 'Estado actualizado exitosamente', data: updated }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al actualizar estado' }
  }
}

// ===== USOS =====
export const onGetUses = async (companyId: string) => {
  try {
    const uses = await client.use.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    })
    return uses
  } catch (error) {
    console.log(error)
    return []
  }
}

export const onCreateUse = async (companyId: string, name: string) => {
  try {
    const use = await client.use.create({
      data: { companyId, name },
    })
    return { status: 200, message: 'Uso creado exitosamente', data: use }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al crear uso' }
  }
}

export const onUpdateUse = async (id: string, name: string) => {
  try {
    const use = await client.use.update({
      where: { id },
      data: { name },
    })
    return { status: 200, message: 'Uso actualizado exitosamente', data: use }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al actualizar uso' }
  }
}

export const onDeleteUse = async (id: string) => {
  try {
    await client.use.delete({ where: { id } })
    return { status: 200, message: 'Uso eliminado exitosamente' }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al eliminar uso' }
  }
}

export const onToggleUse = async (id: string) => {
  try {
    const use = await client.use.findUnique({ where: { id } })
    if (!use) return { status: 404, message: 'Uso no encontrado' }

    const updated = await client.use.update({
      where: { id },
      data: { active: !use.active },
    })
    return { status: 200, message: 'Estado actualizado exitosamente', data: updated }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al actualizar estado' }
  }
}

// ===== CARACTERÍSTICAS =====
export const onGetFeatures = async (companyId: string) => {
  try {
    const features = await client.feature.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    })
    return features
  } catch (error) {
    console.log(error)
    return []
  }
}

export const onCreateFeature = async (companyId: string, name: string) => {
  try {
    const feature = await client.feature.create({
      data: { companyId, name },
    })
    return { status: 200, message: 'Característica creada exitosamente', data: feature }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al crear característica' }
  }
}

export const onUpdateFeature = async (id: string, name: string) => {
  try {
    const feature = await client.feature.update({
      where: { id },
      data: { name },
    })
    return { status: 200, message: 'Característica actualizada exitosamente', data: feature }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al actualizar característica' }
  }
}

export const onDeleteFeature = async (id: string) => {
  try {
    await client.feature.delete({ where: { id } })
    return { status: 200, message: 'Característica eliminada exitosamente' }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al eliminar característica' }
  }
}

export const onToggleFeature = async (id: string) => {
  try {
    const feature = await client.feature.findUnique({ where: { id } })
    if (!feature) return { status: 404, message: 'Característica no encontrada' }

    const updated = await client.feature.update({
      where: { id },
      data: { active: !feature.active },
    })
    return { status: 200, message: 'Estado actualizado exitosamente', data: updated }
  } catch (error) {
    console.log(error)
    return { status: 400, message: 'Error al actualizar estado' }
  }
}

// Eliminar cuenta completa del usuario y todos los datos asociados
export const onDeleteAccount = async () => {
  const user = await currentUser()
  
  if (!user) {
    return {
      status: 401,
      message: 'No autorizado'
    }
  }

  try {
    // 1. Obtener el usuario de la base de datos y verificar que tiene una company
    const dbUser = await client.user.findUnique({
      where: {
        clerkId: user.id,
      },
      select: {
        id: true,
        company: {
          select: {
            id: true,
            userId: true,
          }
        }
      }
    })

    if (!dbUser) {
      return {
        status: 404,
        message: 'Usuario no encontrado en la base de datos'
      }
    }

    if (!dbUser.company) {
      return {
        status: 400,
        message: 'No tienes una empresa asociada para eliminar'
      }
    }

    // Verificar que el usuario es el dueño de la company
    if (dbUser.company.userId !== dbUser.id) {
      return {
        status: 403,
        message: 'No tienes permisos para eliminar esta cuenta'
      }
    }

    const companyId = dbUser.company.id
    const clerkIdToDelete = user.id

    // 2. Eliminar Bookings asociados a la company (no tienen cascade)
    await client.bookings.deleteMany({
      where: {
        companyId: companyId
      }
    })

    // 3. Eliminar ConversationMetrics y CustomerSatisfaction asociados a la company
    // (aunque tienen cascade, los borramos manualmente por companyId para asegurar limpieza completa)
    await client.conversationMetrics.deleteMany({
      where: {
        companyId: companyId
      }
    })

    await client.customerSatisfaction.deleteMany({
      where: {
        companyId: companyId
      }
    })

    // 4. Eliminar Campaigns asociadas al usuario
    await client.campaign.deleteMany({
      where: {
        userId: dbUser.id
      }
    })

    // 5. Eliminar la Company (esto borrará automáticamente todos los datos relacionados con cascade):
    // - ChatBot
    // - Customer (y sus CustomerResponses, ChatRoom, Bookings, ProductReservation, CustomerSatisfaction)
    // - FilterQuestions
    // - HelpDesk
    // - Product (y sus ProductUse, ProductFeature, ProductReservation)
    // - AvailabilitySchedule
    // - Category, Material, Texture, Season, Use, Feature
    await client.company.delete({
      where: {
        id: companyId
      }
    })

    // 6. Eliminar el User de la base de datos
    await client.user.delete({
      where: {
        id: dbUser.id
      }
    })

    // 7. Eliminar el usuario de Clerk (solo la cuenta del proyecto)
    try {
      await clerkClient.users.deleteUser(clerkIdToDelete)
    } catch (clerkError) {
      console.error('Error al eliminar usuario de Clerk:', clerkError)
      // Continuamos aunque falle Clerk, ya que los datos de la DB ya fueron eliminados
    }

    return {
      status: 200,
      message: 'Cuenta eliminada exitosamente. Todos los datos asociados han sido eliminados.'
    }
  } catch (error) {
    console.error('Error al eliminar cuenta:', error)
    return {
      status: 500,
      message: 'Error al eliminar la cuenta. Por favor, intenta nuevamente.'
    }
  }
}
