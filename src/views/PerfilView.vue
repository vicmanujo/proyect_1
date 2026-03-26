<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : ''
const route = useRoute()

// ==========================================
// 🔐 1. SISTEMA DE PERMISOS (RBAC) DIRECTO AL BACKEND
// ==========================================
// Por defecto en true para que cargue la tabla visualmente mientras responde el backend
const permisosModuloActual = ref({ agregar: true, editar: true, eliminar: true, detalle: true })

const verificarPermisos = async () => {
  try {
    const usrStr = localStorage.getItem('usuario')
    if (!usrStr) return
    const usr = JSON.parse(usrStr)

    // 🟢 Consultamos al backend los permisos reales de este usuario
    const res = await fetch(`${baseURL}/api/menu-dinamico?idPerfil=${usr.idPerfil}`)
    const data = await res.json()

    if (data.success) {
      const rutaActual = route.path 
      let moduloEncontrado = null

      for (const menu of data.menu) {
        const submodulo = menu.submodulos.find(sub => sub.strRutaUrl === rutaActual)
        if (submodulo) {
          moduloEncontrado = submodulo
          break
        }
      }

      // Si encuentra los permisos de esta pantalla, los aplica ocultando los botones que no tocan
      if (moduloEncontrado) {
        permisosModuloActual.value = {
          agregar: moduloEncontrado.permisos.agregar,
          editar: moduloEncontrado.permisos.editar,
          eliminar: moduloEncontrado.permisos.eliminar,
          detalle: moduloEncontrado.permisos.detalle
        }
      }
    }
  } catch (error) {
    console.error("Error al verificar permisos:", error)
  }
}

// --- DATOS DE LA BASE DE DATOS ---
const registros = ref([])
const loading = ref(false)

// --- VARIABLES DE BÚSQUEDA Y ORDENAMIENTO ---
const busqueda = ref('')
const ordenarPor = ref('id') 
const ordenAscendente = ref(false) 

// --- VARIABLES DE MODALES ---
const dialogoFormulario = ref(false)
const dialogoDetalle = ref(false)
const dialogoEliminar = ref(false)

const esEdicion = ref(false)
const cargandoGuardar = ref(false)
const formRef = ref(null)
const valido = ref(false)

const itemFormulario = ref({
  id: null,
  strNombrePerfil: '',
  bitAdministrador: false,
  fechaCreacion: null // 🟢 Ajustado a tu BD
})

// 1. FILTRADO (Buscador)
const registrosFiltrados = computed(() => {
  if (!busqueda.value) return registros.value
  const textoMinusculas = busqueda.value.toLowerCase()
  return registros.value.filter(item => 
    item.strNombrePerfil.toLowerCase().includes(textoMinusculas)
  )
})

// 2. ORDENAMIENTO (Al hacer clic en los títulos)
const registrosOrdenados = computed(() => {
  return [...registrosFiltrados.value].sort((a, b) => {
    let valorA = a[ordenarPor.value]
    let valorB = b[ordenarPor.value]

    if (typeof valorA === 'string') valorA = valorA.toLowerCase()
    if (typeof valorB === 'string') valorB = valorB.toLowerCase()

    // 🟢 Ajustado a tu BD
    if (ordenarPor.value === 'fechaCreacion') {
      valorA = valorA ? new Date(valorA).getTime() : 0
      valorB = valorB ? new Date(valorB).getTime() : 0
    }

    if (valorA < valorB) return ordenAscendente.value ? -1 : 1
    if (valorA > valorB) return ordenAscendente.value ? 1 : -1
    return 0
  })
})

// 3. PAGINACIÓN FINAL
const paginaActual = ref(1)
const elementosPorPagina = 5

const totalPaginas = computed(() => Math.ceil(registrosOrdenados.value.length / elementosPorPagina) || 1)
const registrosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * elementosPorPagina
  const fin = inicio + elementosPorPagina
  return registrosOrdenados.value.slice(inicio, fin)
})

// --- FUNCIONES EXTRA ---
const cambiarOrden = (columna) => {
  if (ordenarPor.value === columna) {
    ordenAscendente.value = !ordenAscendente.value 
  } else {
    ordenarPor.value = columna
    ordenAscendente.value = true 
  }
}

const formatearFecha = (fechaSQL) => {
  if (!fechaSQL) return 'Sin fecha registrada'
  const fecha = new Date(fechaSQL)
  return fecha.toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

watch(() => itemFormulario.value.strNombrePerfil, (nuevoValor) => {
  if (nuevoValor) {
    itemFormulario.value.strNombrePerfil = nuevoValor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')
  }
})

// --- VALIDACIONES ---
const reglasNombre = [
  v => !!v || 'El nombre del perfil es obligatorio',
  v => (v && v.trim().length > 0) || 'No puede ser solo espacios',
  v => (v && v.length <= 50) || 'Máximo 50 caracteres',
]

// --- FUNCIONES CRUD ---
const cargarPerfiles = async () => {
  loading.value = true
  try {
    const res = await fetch(`${baseURL}/api/perfil`)
    registros.value = await res.json()
  } catch (error) {
    console.error("Error al cargar perfiles:", error)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await verificarPermisos() // 🟢 Validamos los permisos antes de cargar
  cargarPerfiles()
})

const abrirCrear = () => {
  itemFormulario.value = { id: null, strNombrePerfil: '', bitAdministrador: false, fechaCreacion: null }
  esEdicion.value = false
  dialogoFormulario.value = true
}

const abrirEditar = (item) => {
  itemFormulario.value = { ...item }
  esEdicion.value = true
  dialogoFormulario.value = true
}

const abrirDetalle = (item) => {
  itemFormulario.value = { ...item }
  dialogoDetalle.value = true
}

const abrirEliminar = (item) => {
  itemFormulario.value = { ...item }
  dialogoEliminar.value = true
}

const guardarDatos = async () => {
  if (itemFormulario.value.strNombrePerfil) {
    itemFormulario.value.strNombrePerfil = itemFormulario.value.strNombrePerfil.trim()
  }

  const { valid } = await formRef.value.validate()
  if (!valid) return

  cargandoGuardar.value = true

  try {
    const url = esEdicion.value ? `${baseURL}/api/perfil/${itemFormulario.value.id}` : `${baseURL}/api/perfil`
    const metodo = esEdicion.value ? 'PUT' : 'POST'
    
    const res = await fetch(url, { 
        method: metodo, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemFormulario.value) 
    })
    
    const data = await res.json()
    
    if (data.success) {
        await cargarPerfiles()
        dialogoFormulario.value = false
        busqueda.value = '' 
    } else {
        alert(data.message)
    }
  } catch (error) {
    console.error(error)
    alert("Error de conexión con el servidor")
  } finally {
    cargandoGuardar.value = false
  }
}

const confirmarEliminar = async () => {
  cargandoGuardar.value = true
  
  try {
    const res = await fetch(`${baseURL}/api/perfil/${itemFormulario.value.id}`, { method: 'DELETE' })
    const data = await res.json()

    if (data.success) {
        await cargarPerfiles()
        if (paginaActual.value > totalPaginas.value) paginaActual.value = totalPaginas.value
        dialogoEliminar.value = false
    } else {
        alert(data.message)
    }
  } catch (error) {
    console.error(error)
    alert("Error al eliminar el perfil")
  } finally {
    cargandoGuardar.value = false
  }
}
</script>

<template>
  <v-container fluid class="pa-6">
    
    <v-row align="center" justify="space-between" class="mb-4">
      <v-col cols="12" md="5">
        <h2 class="text-h5 font-weight-bold" style="color: #1867C0;">
          <v-icon color="#1867C0" class="mr-2">mdi-shield-account</v-icon>
          Gestión de Perfiles
        </h2>
        <p class="text-grey-darken-1 text-caption mt-1">
          Administra los roles y su nivel de acceso en el sistema corporativo.
        </p>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-text-field
          v-model="busqueda"
          placeholder="Buscar perfil..."
          variant="outlined"
          density="compact"
          color="#1867C0"
          prepend-inner-icon="mdi-magnify"
          hide-details
          clearable
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="3" class="text-right">
        <v-btn v-if="permisosModuloActual.agregar" color="#1867C0" prepend-icon="mdi-plus" class="text-white font-weight-bold text-capitalize w-100" rounded="lg" elevation="2" @click="abrirCrear">
          Nuevo Perfil
        </v-btn>
      </v-col>
    </v-row>

    <v-card elevation="4" rounded="xl" border class="overflow-x-auto position-relative">
      
      <v-progress-linear v-if="loading" indeterminate color="#1867C0" class="position-absolute w-100" style="top: 0; z-index: 10;"></v-progress-linear>

      <v-table hover style="min-width: 800px;">
        <thead>
          <tr class="bg-grey-lighten-4 text-no-wrap">
            
            <th class="font-weight-bold text-subtitle-2 pl-6 cursor-pointer" style="color: #1867C0;" @click="cambiarOrden('strNombrePerfil')">
              Nombre del Perfil
              <v-icon size="small" class="ml-1" :color="ordenarPor === 'strNombrePerfil' ? '#1867C0' : 'transparent'">
                {{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
              </v-icon>
            </th>

            <th class="font-weight-bold text-subtitle-2 cursor-pointer" style="color: #1867C0;" @click="cambiarOrden('fechaCreacion')">
              Fecha de Creación
              <v-icon size="small" class="ml-1" :color="ordenarPor === 'fechaCreacion' ? '#1867C0' : 'transparent'">
                {{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
              </v-icon>
            </th>

            <th class="font-weight-bold text-subtitle-2 text-center" style="color: #1867C0;">Privilegios</th>
            <th class="font-weight-bold text-subtitle-2 text-center" style="width: 180px; color: #1867C0;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in registrosPaginados" :key="item.id">
            <td class="text-grey-darken-3 font-weight-bold pl-6">
              {{ item.strNombrePerfil }}
            </td>
            
            <td class="text-grey-darken-1 text-body-2">
              <v-icon size="small" class="mr-1" color="grey">mdi-calendar-clock</v-icon>
              {{ formatearFecha(item.fechaCreacion) }}
            </td>

            <td class="text-center">
              <v-chip :color="item.bitAdministrador ? 'success' : 'grey-darken-1'" size="small" variant="flat" class="font-weight-bold">
                {{ item.bitAdministrador ? 'Administrador' : 'Estándar' }}
              </v-chip>
            </td>
            <td class="text-center">
              <v-btn v-if="permisosModuloActual.detalle" icon size="small" color="grey-darken-2" variant="text" @click="abrirDetalle(item)" title="Ver Detalle">
                <v-icon>mdi-eye</v-icon>
              </v-btn>
              <v-btn v-if="permisosModuloActual.editar" icon size="small" color="#1867C0" variant="text" @click="abrirEditar(item)" title="Editar">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn v-if="permisosModuloActual.eliminar" icon size="small" color="red-darken-2" variant="text" @click="abrirEliminar(item)" title="Eliminar">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>

          <tr v-if="registrosPaginados.length === 0 && !loading">
            <td colspan="4" class="text-center pa-8 text-grey">
              <v-icon size="40" color="grey-lighten-1" class="mb-2">
                {{ busqueda ? 'mdi-file-search-outline' : 'mdi-shield-off' }}
              </v-icon><br>
              {{ busqueda ? `No se encontraron perfiles con "${busqueda}"` : 'Aún no hay perfiles registrados. Haz clic en "Nuevo Perfil" para comenzar.' }}
            </td>
          </tr>
        </tbody>
      </v-table>

      <v-divider></v-divider>

      <div v-if="totalPaginas > 1 || registros.length > 0" class="d-flex align-center justify-center pa-3 bg-white">
        <v-btn icon="mdi-chevron-double-left" variant="plain" size="small" :disabled="paginaActual === 1" @click="paginaActual = 1"></v-btn>
        <v-btn icon="mdi-chevron-left" variant="plain" size="small" :disabled="paginaActual === 1" @click="paginaActual--"></v-btn>
        <span class="mx-4 text-subtitle-2 text-grey-darken-2 font-weight-bold">Página {{ paginaActual }} de {{ totalPaginas }}</span>
        <v-btn icon="mdi-chevron-right" variant="plain" size="small" :disabled="paginaActual === totalPaginas" @click="paginaActual++"></v-btn>
        <v-btn icon="mdi-chevron-double-right" variant="plain" size="small" :disabled="paginaActual === totalPaginas" @click="paginaActual = totalPaginas"></v-btn>
      </div>
    </v-card>

    <v-dialog v-model="dialogoFormulario" max-width="500" persistent>
      <v-card rounded="xl">
        <v-card-title class="text-white pa-4 d-flex align-center" style="background-color: #1867C0;">
          <v-icon start>mdi-shield-edit</v-icon>
          {{ esEdicion ? 'Editar Perfil' : 'Nuevo Perfil' }}
        </v-card-title>
        
        <v-card-text class="pt-6">
          <v-form ref="formRef" v-model="valido" @submit.prevent>
            <div class="d-flex justify-space-between align-end mb-1">
              <span class="text-subtitle-2 text-grey-darken-2">Nombre del Perfil</span>
              <span class="text-caption font-weight-bold" :class="itemFormulario.strNombrePerfil?.length === 50 ? 'text-red' : 'text-grey-darken-1'">
                {{ 50 - (itemFormulario.strNombrePerfil?.length || 0) }} caracteres restantes
              </span>
            </div>
            
            <v-text-field 
              v-model="itemFormulario.strNombrePerfil" 
              placeholder="Ej. Gerente de Ventas" 
              variant="outlined" 
              color="#1867C0" 
              density="compact"
              :rules="reglasNombre"
              counter 
              maxlength="50"
              class="mb-4"
              hide-details="auto"
              prepend-inner-icon="mdi-format-title"
            >
              <template v-slot:counter><span></span></template>
            </v-text-field>

            <v-alert type="info" variant="tonal" density="compact" color="#1867C0" class="mb-4 text-caption">
              Los perfiles de tipo administrador tienen acceso total al sistema de forma predeterminada.
            </v-alert>

            <v-switch
              v-model="itemFormulario.bitAdministrador"
              label="¿Es un perfil de Administrador?"
              color="#1867C0"
              hide-details
              inset
            ></v-switch>
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-4 bg-grey-lighten-4 border-top">
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-2" variant="text" class="text-capitalize" @click="dialogoFormulario = false">Cancelar</v-btn>
          <v-btn color="#1867C0" variant="elevated" class="text-capitalize text-white" @click="guardarDatos" :loading="cargandoGuardar">
            <v-icon start>mdi-content-save</v-icon> {{ esEdicion ? 'Actualizar' : 'Guardar' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogoDetalle" max-width="450">
      <v-card rounded="xl">
        <v-card-title class="bg-grey-darken-3 text-white pa-4 d-flex align-center">
          <v-icon start>mdi-text-box-search-outline</v-icon>
          Detalles del Perfil
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" density="comfortable" color="white" @click="dialogoDetalle = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-6">
          <v-list density="compact">
            <v-list-item>
              <template v-slot:prepend><v-icon color="#1867C0">mdi-format-title</v-icon></template>
              <v-list-item-title class="text-caption text-grey">Nombre Asignado</v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-weight-bold text-grey-darken-4">{{ itemFormulario.strNombrePerfil }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider class="my-2"></v-divider>

            <v-list-item>
              <template v-slot:prepend><v-icon color="#1867C0">mdi-calendar-clock</v-icon></template>
              <v-list-item-title class="text-caption text-grey">Fecha de Registro</v-list-item-title>
              <v-list-item-subtitle class="text-body-2 font-weight-medium text-grey-darken-4">{{ formatearFecha(itemFormulario.fechaCreacion) }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider class="my-2"></v-divider>

            <v-list-item>
              <template v-slot:prepend><v-icon color="#1867C0">mdi-security</v-icon></template>
              <v-list-item-title class="text-caption text-grey">Nivel de Privilegios</v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-weight-bold mt-1">
                <v-chip :color="itemFormulario.bitAdministrador ? 'success' : 'grey'" size="small">
                  {{ itemFormulario.bitAdministrador ? 'Administrador Total' : 'Usuario Estándar' }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogoEliminar" max-width="400" persistent>
      <v-card rounded="xl" class="text-center pa-4">
        <v-icon size="60" color="red-darken-2" class="mt-4 mb-2">mdi-alert-circle-outline</v-icon>
        <v-card-title class="text-h6 font-weight-bold text-grey-darken-4">¿Eliminar Perfil?</v-card-title>
        <v-card-text class="text-grey-darken-1">
          Estás a punto de eliminar el perfil <b>"{{ itemFormulario.strNombrePerfil }}"</b>. Esta acción no se puede deshacer.
        </v-card-text>
        <v-card-actions class="justify-center pb-4">
          <v-btn color="grey-darken-2" variant="text" class="text-capitalize" @click="dialogoEliminar = false">Cancelar</v-btn>
          <v-btn color="red-darken-2" variant="elevated" class="text-capitalize px-6" @click="confirmarEliminar" :loading="cargandoGuardar">
            Sí, eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<style scoped>
.overflow-x-auto {
  overflow-x: auto !important;
}
.cursor-pointer {
  cursor: pointer;
  transition: background-color 0.2s;
}
.cursor-pointer:hover {
  background-color: #f5f5f5 !important;
}
.border-top {
  border-top: 1px solid #e0e0e0;
}
</style>