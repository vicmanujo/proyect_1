<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'

const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : ''
const route = useRoute()

// ==========================================
// 🔐 1. SISTEMA DE PERMISOS (RBAC) DIRECTO AL BACKEND
// ==========================================
// Por defecto en true para que la interfaz cargue visualmente primero
const permisosModuloActual = ref({ agregar: true, editar: true, eliminar: true, detalle: true })

const verificarPermisos = async () => {
  try {
    const usrStr = localStorage.getItem('usuario')
    if (!usrStr) return
    const usr = JSON.parse(usrStr)

    // 🟢 Consulta los permisos reales al backend
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

// --- DATOS REALES DE LA BASE DE DATOS ---
const registros = ref([])
const perfiles = ref([]) 
const loading = ref(false)

// 🟢 VARIABLES DE BÚSQUEDA Y ORDENAMIENTO
const busqueda = ref('')
const ordenarPor = ref('id') 
const ordenAscendente = ref(false) 

// --- SISTEMA DE NOTIFICACIONES ---
const snackbar = ref({
  show: false,
  mensaje: '',
  color: 'success', 
  icono: 'mdi-check-circle'
})

const mostrarMensaje = (mensaje, tipo = 'success') => {
  snackbar.value.mensaje = mensaje
  snackbar.value.color = tipo === 'success' ? '#4CAF50' : '#E53935' 
  snackbar.value.icono = tipo === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'
  snackbar.value.show = true
}

// --- VARIABLES DE LOS MODALES Y ESTADOS ---
const dialogoFormulario = ref(false)
const dialogoDetalle = ref(false)
const dialogoEliminar = ref(false)

const esEdicion = ref(false)
const cargandoGuardar = ref(false)
const formRef = ref(null)
const valido = ref(false)
const verPassword = ref(false)

const archivoFoto = ref(null) 
const previsualizacionFoto = ref(null) 

const itemFormulario = ref({
  id: null,
  strNombreUsuario: '',
  idPerfil: null,
  strCorreo: '',
  strNumeroCelular: '',
  strPwd: '',
  bitActivo: true, 
  strUrlImagen: null,
  Verificado: false, 
  fechaCreacion: null
})

// Función helper para Perfiles
const obtenerNombrePerfil = (idPerfil) => {
  const perfil = perfiles.value.find(p => p.id === idPerfil)
  return perfil ? perfil.strNombrePerfil : 'Desconocido'
}

// ==========================================
// 🟢 FILTRADO Y ORDENAMIENTO (TABLA INTELIGENTE)
// ==========================================

const registrosFiltrados = computed(() => {
  if (!busqueda.value) return registros.value
  const txt = busqueda.value.toLowerCase()
  return registros.value.filter(item => 
    item.strNombreUsuario.toLowerCase().includes(txt) ||
    item.strCorreo.toLowerCase().includes(txt) ||
    obtenerNombrePerfil(item.idPerfil).toLowerCase().includes(txt)
  )
})

const registrosOrdenados = computed(() => {
  return [...registrosFiltrados.value].sort((a, b) => {
    let valorA = a[ordenarPor.value]
    let valorB = b[ordenarPor.value]

    // Ordenamiento especial por Perfil (Texto)
    if (ordenarPor.value === 'idPerfil') {
      valorA = obtenerNombrePerfil(a.idPerfil).toLowerCase()
      valorB = obtenerNombrePerfil(b.idPerfil).toLowerCase()
    } 
    // Ordenamiento por Fecha
    else if (ordenarPor.value === 'fechaCreacion') {
      valorA = valorA ? new Date(valorA).getTime() : 0
      valorB = valorB ? new Date(valorB).getTime() : 0
    }
    // Textos normales
    else if (typeof valorA === 'string') {
      valorA = valorA.toLowerCase()
      valorB = (typeof valorB === 'string') ? valorB.toLowerCase() : ''
    }

    if (valorA < valorB) return ordenAscendente.value ? -1 : 1
    if (valorA > valorB) return ordenAscendente.value ? 1 : -1
    return 0
  })
})

const cambiarOrden = (columna) => {
  if (ordenarPor.value === columna) {
    ordenAscendente.value = !ordenAscendente.value 
  } else {
    ordenarPor.value = columna
    ordenAscendente.value = true 
  }
}

// --- PAGINACIÓN ---
const paginaActual = ref(1)
const elementosPorPagina = 5

const totalPaginas = computed(() => Math.ceil(registrosOrdenados.value.length / elementosPorPagina) || 1)
const registrosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * elementosPorPagina
  const fin = inicio + elementosPorPagina
  return registrosOrdenados.value.slice(inicio, fin)
})

// --- VALIDACIONES ESTRICTAS ---
const reglasTexto = [
  v => !!v || 'Campo obligatorio',
  v => (v && v.trim().length > 0) || 'No puede estar vacío',
]
const reglasCorreo = [
  v => !!v || 'El correo es obligatorio',
  v => /.+@.+\..+/.test(v) || 'Ingresa un correo válido'
]
const reglasTelefono = [
  v => !!v || 'El teléfono es obligatorio',
  v => /^[0-9]{10}$/.test(v) || 'Debe tener exactamente 10 números'
]

// 🟢 REGLA DE CONTRASEÑA SEGURA (8 chars, 1 Mayus, 1 Num)
const reglasPassword = computed(() => {
  if (esEdicion.value && (!itemFormulario.value.strPwd || itemFormulario.value.strPwd === '')) return [] // Opcional al editar
  return [
    v => !!v || 'La contraseña es obligatoria',
    v => (v && v.length >= 8) || 'Mínimo 8 caracteres',
    v => /[A-Z]/.test(v) || 'Debe contener al menos una letra Mayúscula',
    v => /[a-z]/.test(v) || 'Debe contener al menos una letra Minúscula',
    v => /[0-9]/.test(v) || 'Debe contener al menos un Número'
  ]
})

// --- FUNCIONES EXTRA ---
const formatearFecha = (fechaSQL) => {
  if (!fechaSQL) return 'N/A'
  const fecha = new Date(fechaSQL)
  return fecha.toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

// Bloquea PDFs y los expulsa del input
const manejarSubidaFoto = async (fileArray) => {
  const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
  
  if (file) {
    if (!file.type.startsWith('image/')) {
      mostrarMensaje('⚠️ Alerta: Documento no permitido. Solo imágenes.', 'error')
      await nextTick()
      archivoFoto.value = null 
      previsualizacionFoto.value = null
      return
    }
    previsualizacionFoto.value = URL.createObjectURL(file)
  } else {
    previsualizacionFoto.value = null
  }
}

// --- FUNCIONES CRUD ---

const cargarDatos = async () => {
  loading.value = true
  try {
    const [resUsuarios, resPerfiles] = await Promise.all([
      fetch(`${baseURL}/api/usuario`),
      fetch(`${baseURL}/api/perfil`)
    ])
    registros.value = await resUsuarios.json()
    perfiles.value = await resPerfiles.json()
  } catch (error) {
    console.error("Error al cargar datos:", error)
    mostrarMensaje('Error de conexión con la base de datos', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await verificarPermisos() // 🟢 Validamos permisos antes de cargar
  cargarDatos()
})

const abrirCrear = () => {
  itemFormulario.value = { id: null, strNombreUsuario: '', idPerfil: null, strCorreo: '', strNumeroCelular: '', strPwd: '', bitActivo: true, strUrlImagen: null }
  archivoFoto.value = null
  previsualizacionFoto.value = null
  esEdicion.value = false
  verPassword.value = false
  dialogoFormulario.value = true
}

const abrirEditar = (item) => {
  itemFormulario.value = { ...item, strPwd: '' } 
  archivoFoto.value = null
  previsualizacionFoto.value = item.strUrlImagen || null 
  esEdicion.value = true
  verPassword.value = false
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
  const { valid } = await formRef.value.validate()
  if (!valid) return

  let fileToUpload = null;
  if (archivoFoto.value) {
    fileToUpload = Array.isArray(archivoFoto.value) ? archivoFoto.value[0] : archivoFoto.value;
    if (fileToUpload && !fileToUpload.type.startsWith('image/')) {
      mostrarMensaje('⚠️ Intento de subir documento bloqueado. Elige una image.', 'error')
      archivoFoto.value = null
      previsualizacionFoto.value = null
      return 
    }
  }

  cargandoGuardar.value = true

  try {
    const formData = new FormData()
    formData.append('strNombreUsuario', itemFormulario.value.strNombreUsuario.trim())
    formData.append('idPerfil', itemFormulario.value.idPerfil)
    formData.append('strCorreo', itemFormulario.value.strCorreo.trim())
    formData.append('strNumeroCelular', itemFormulario.value.strNumeroCelular)
    formData.append('bitActivo', itemFormulario.value.bitActivo)
    
    if (itemFormulario.value.strPwd) formData.append('strPwd', itemFormulario.value.strPwd)
    if (fileToUpload) formData.append('foto', fileToUpload)

    const url = esEdicion.value ? `${baseURL}/api/usuario/${itemFormulario.value.id}` : `${baseURL}/api/usuario`
    const metodo = esEdicion.value ? 'PUT' : 'POST'

    const res = await fetch(url, { method: metodo, body: formData })
    const data = await res.json()

    if (data.success) {
      await cargarDatos()
      dialogoFormulario.value = false
      mostrarMensaje(data.message, 'success')
      busqueda.value = ''
    } else {
      mostrarMensaje(data.message, 'error') 
    }
  } catch (error) {
    console.error(error)
    mostrarMensaje('Error de conexión al guardar', 'error')
  } finally {
    cargandoGuardar.value = false
  }
}

const confirmarEliminar = async () => {
  cargandoGuardar.value = true
  try {
    const res = await fetch(`${baseURL}/api/usuario/${itemFormulario.value.id}`, { method: 'DELETE' })
    const data = await res.json()

    if (data.success) {
      await cargarDatos()
      if (paginaActual.value > totalPaginas.value) paginaActual.value = totalPaginas.value
      dialogoEliminar.value = false
      mostrarMensaje(data.message, 'success')
    } else {
      mostrarMensaje(data.message, 'error')
    }
  } catch (error) {
    console.error(error)
    mostrarMensaje('Error al eliminar', 'error')
  } finally {
    cargandoGuardar.value = false
  }
}
</script>

<template>
  <v-container fluid class="pa-6">
    
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top right" :timeout="4000" elevation="10" rounded="pill">
      <div class="d-flex align-center text-white">
        <v-icon start class="mr-2">{{ snackbar.icono }}</v-icon>
        <span class="font-weight-bold">{{ snackbar.mensaje }}</span>
      </div>
      <template v-slot:actions>
        <v-btn variant="text" icon="mdi-close" color="white" @click="snackbar.show = false"></v-btn>
      </template>
    </v-snackbar>

    <v-row align="center" justify="space-between" class="mb-4">
      <v-col cols="12" md="5">
        <h2 class="text-h5 font-weight-bold" style="color: #1867C0;">
          <v-icon color="#1867C0" class="mr-2">mdi-account-group</v-icon>
          Directorio de Usuarios
        </h2>
        <p class="text-grey-darken-1 text-caption mt-1">
          Administra los accesos, roles y datos de los empleados.
        </p>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-text-field
          v-model="busqueda"
          placeholder="Buscar por nombre, correo o perfil..."
          variant="outlined"
          density="compact"
          color="#1867C0"
          prepend-inner-icon="mdi-magnify"
          hide-details
          clearable
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="3" class="text-right">
        <v-btn v-if="permisosModuloActual.agregar" color="#1867C0" prepend-icon="mdi-account-plus" class="text-white font-weight-bold text-capitalize w-100" rounded="lg" elevation="2" @click="abrirCrear">
          Nuevo Usuario
        </v-btn>
      </v-col>
    </v-row>

    <v-card elevation="4" rounded="xl" border class="overflow-x-auto position-relative">
      
      <v-progress-linear v-if="loading" indeterminate color="#1867C0" class="position-absolute w-100" style="top: 0; z-index: 10;"></v-progress-linear>

      <v-table hover style="min-width: 1000px;">
        <thead>
          <tr class="bg-grey-lighten-4 text-no-wrap">
            <th class="font-weight-bold text-subtitle-2 pl-6 cursor-pointer" style="color: #1867C0;" @click="cambiarOrden('strNombreUsuario')">
              Usuario Info
              <v-icon size="small" class="ml-1" :color="ordenarPor === 'strNombreUsuario' ? '#1867C0' : 'transparent'">{{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
            </th>
            <th class="font-weight-bold text-subtitle-2 cursor-pointer" style="color: #1867C0;" @click="cambiarOrden('strCorreo')">
              Contacto
              <v-icon size="small" class="ml-1" :color="ordenarPor === 'strCorreo' ? '#1867C0' : 'transparent'">{{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
            </th>
            <th class="font-weight-bold text-subtitle-2 cursor-pointer" style="color: #1867C0;" @click="cambiarOrden('idPerfil')">
              Perfil / Rol
              <v-icon size="small" class="ml-1" :color="ordenarPor === 'idPerfil' ? '#1867C0' : 'transparent'">{{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
            </th>
            <th class="font-weight-bold text-subtitle-2 text-center cursor-pointer" style="color: #1867C0;" @click="cambiarOrden('bitActivo')">
              Estado
              <v-icon size="small" class="ml-1" :color="ordenarPor === 'bitActivo' ? '#1867C0' : 'transparent'">{{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
            </th>
            <th class="font-weight-bold text-subtitle-2 text-center cursor-pointer" style="color: #1867C0;" @click="cambiarOrden('fechaCreacion')">
              Fecha Ingreso
              <v-icon size="small" class="ml-1" :color="ordenarPor === 'fechaCreacion' ? '#1867C0' : 'transparent'">{{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
            </th>
            <th class="font-weight-bold text-subtitle-2 text-center" style="width: 140px; color: #1867C0;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in registrosPaginados" :key="item.id">
            <td class="pl-6 py-2">
              <div class="d-flex align-center">
                <v-avatar size="40" class="mr-3" color="grey-lighten-2" border>
                  <v-img v-if="item.strUrlImagen" :src="item.strUrlImagen" cover></v-img>
                  <v-icon v-else color="grey-darken-2">mdi-account</v-icon>
                </v-avatar>
                <div>
                  <div class="font-weight-bold text-grey-darken-3">{{ item.strNombreUsuario }}</div>
                </div>
              </div>
            </td>
            <td>
              <div class="d-flex flex-column py-1 text-caption text-grey-darken-3">
                <div class="mb-1"><v-icon size="small" class="mr-1" color="#1867C0">mdi-email</v-icon>{{ item.strCorreo }}</div>
                <div><v-icon size="small" class="mr-1" color="#1867C0">mdi-phone</v-icon>{{ item.strNumeroCelular }}</div>
              </div>
            </td>
            <td class="text-grey-darken-3 font-weight-medium">
              <v-icon size="small" color="grey" class="mr-1">mdi-shield-account</v-icon>
              {{ obtenerNombrePerfil(item.idPerfil) }}
            </td>
            <td class="text-center">
              <v-chip :color="item.bitActivo ? 'success' : 'red-darken-1'" size="small" variant="flat" class="font-weight-bold mb-1 d-block">
                {{ item.bitActivo ? 'Activo' : 'Inactivo' }}
              </v-chip>
              <v-chip :color="item.Verificado ? 'blue' : 'grey'" size="x-small" variant="outlined" class="font-weight-bold">
                <v-icon start size="x-small">{{ item.Verificado ? 'mdi-check-decagram' : 'mdi-alert-circle-outline' }}</v-icon>
                {{ item.Verificado ? 'Verificado' : 'Pendiente' }}
              </v-chip>
            </td>
            <td class="text-center text-caption text-grey-darken-1">
              {{ formatearFecha(item.fechaCreacion) }}
            </td>
            <td class="text-center">
              <v-btn v-if="permisosModuloActual.detalle" icon size="small" color="grey-darken-2" variant="text" @click="abrirDetalle(item)" title="Ver Detalle"><v-icon>mdi-eye</v-icon></v-btn>
              <v-btn v-if="permisosModuloActual.editar" icon size="small" color="#1867C0" variant="text" @click="abrirEditar(item)" title="Editar"><v-icon>mdi-pencil</v-icon></v-btn>
              <v-btn v-if="permisosModuloActual.eliminar" icon size="small" color="red-darken-2" variant="text" @click="abrirEliminar(item)" title="Eliminar"><v-icon>mdi-delete</v-icon></v-btn>
            </td>
          </tr>
          <tr v-if="registrosPaginados.length === 0 && !loading">
            <td colspan="6" class="text-center pa-8 text-grey">
              <v-icon size="40" color="grey-lighten-1" class="mb-2">
                {{ busqueda ? 'mdi-file-search-outline' : 'mdi-account-off' }}
              </v-icon><br>
              {{ busqueda ? `No hay resultados para "${busqueda}"` : 'No hay usuarios registrados' }}
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

    <v-dialog v-model="dialogoFormulario" max-width="700" persistent>
      <v-card rounded="xl">
        <v-card-title class="text-white pa-4 d-flex align-center" style="background-color: #1867C0;">
          <v-icon start>{{ esEdicion ? 'mdi-account-edit' : 'mdi-account-plus' }}</v-icon>
          {{ esEdicion ? 'Editar Usuario' : 'Nuevo Usuario' }}
        </v-card-title>
        
        <v-card-text class="pt-6">
          <v-form ref="formRef" v-model="valido" @submit.prevent>
            <v-row>
              
              <v-col cols="12" md="4" class="text-center d-flex flex-column align-center justify-center border-right">
                <v-avatar size="120" color="grey-lighten-3" class="mb-4 elevation-2 border">
                  <v-img v-if="previsualizacionFoto" :src="previsualizacionFoto" cover></v-img>
                  <v-icon v-else size="60" color="grey">mdi-camera-plus</v-icon>
                </v-avatar>
                
                <v-file-input
                  v-model="archivoFoto"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  label="Subir Foto (Opcional)"
                  variant="outlined"
                  density="compact"
                  color="#1867C0"
                  prepend-icon=""
                  prepend-inner-icon="mdi-camera"
                  show-size
                  @update:modelValue="manejarSubidaFoto"
                  class="w-100"
                ></v-file-input>
              </v-col>

              <v-col cols="12" md="8">
                <div class="d-flex justify-space-between align-end mb-1">
                  <span class="text-subtitle-2 text-grey-darken-2">Nombre Completo</span>
                  <span class="text-caption font-weight-bold" :class="itemFormulario.strNombreUsuario?.length === 100 ? 'text-red' : 'text-grey-darken-1'">
                    {{ 100 - (itemFormulario.strNombreUsuario?.length || 0) }} caracteres restantes
                  </span>
                </div>
                
                <v-text-field 
                  v-model="itemFormulario.strNombreUsuario" 
                  :rules="reglasTexto" 
                  placeholder="Ej. Juan Pérez"
                  variant="outlined" 
                  density="compact" 
                  color="#1867C0" 
                  class="mb-2" 
                  prepend-inner-icon="mdi-account"
                  maxlength="100"
                  hide-details="auto"
                  @input="v => { itemFormulario.strNombreUsuario = v.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '') }"
                >
                  <template v-slot:counter><span></span></template>
                </v-text-field>
                
                <v-row dense class="mt-2">
                  <v-col cols="12" sm="6">
                    <v-text-field v-model="itemFormulario.strCorreo" :rules="reglasCorreo" label="Correo Electrónico" variant="outlined" density="compact" color="#1867C0" class="mb-2" prepend-inner-icon="mdi-email"></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field v-model="itemFormulario.strNumeroCelular" :rules="reglasTelefono" label="Celular (10 dígitos)" variant="outlined" density="compact" color="#1867C0" maxlength="10" class="mb-2" prepend-inner-icon="mdi-phone" @input="v => { itemFormulario.strNumeroCelular = v.target.value.replace(/[^0-9]/g, '') }"></v-text-field>
                  </v-col>
                </v-row>

                <v-row dense>
                  <v-col cols="12" sm="6">
                    <v-select v-model="itemFormulario.idPerfil" :items="perfiles" item-title="strNombrePerfil" item-value="id" :rules="[v => !!v || 'Selecciona un perfil']" label="Perfil / Rol" variant="outlined" density="compact" color="#1867C0" class="mb-2" prepend-inner-icon="mdi-shield-account"></v-select>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field v-model="itemFormulario.strPwd" :rules="reglasPassword" :append-inner-icon="verPassword ? 'mdi-eye-off' : 'mdi-eye'" :type="verPassword ? 'text' : 'password'" :label="esEdicion ? 'Nueva Contraseña (Opcional)' : 'Contraseña Segura'" variant="outlined" density="compact" color="#1867C0" class="mb-2" prepend-inner-icon="mdi-lock" hint="Mínimo 8 caracteres, 1 mayúscula, 1 número" @click:append-inner="verPassword = !verPassword"></v-text-field>
                  </v-col>
                </v-row>

                <v-switch v-model="itemFormulario.bitActivo" :label="itemFormulario.bitActivo ? 'Usuario Activo en el sistema' : 'Usuario Inactivo (Bloqueado)'" color="#1867C0" inset hide-details class="mt-2"></v-switch>
              </v-col>

            </v-row>
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

    <v-dialog v-model="dialogoDetalle" max-width="500">
      <v-card rounded="xl">
        <div class="text-center pt-8 pb-4 position-relative" style="background-color: #1867C0;">
          <v-btn icon="mdi-close" variant="text" color="white" class="position-absolute" style="top: 10px; right: 10px;" @click="dialogoDetalle = false"></v-btn>
          
          <v-badge :color="itemFormulario.Verificado ? 'success' : 'grey'" :icon="itemFormulario.Verificado ? 'mdi-check' : 'mdi-alert'" location="bottom right" offset-x="15" offset-y="15">
            <v-avatar size="100" class="elevation-4 mb-3 border-white">
              <v-img v-if="itemFormulario.strUrlImagen" :src="itemFormulario.strUrlImagen" cover></v-img>
              <v-icon v-else size="50" color="white">mdi-account</v-icon>
            </v-avatar>
          </v-badge>
          
          <h3 class="text-white font-weight-bold">{{ itemFormulario.strNombreUsuario }}</h3>
          <p class="text-blue-lighten-4 text-caption mb-0">{{ obtenerNombrePerfil(itemFormulario.idPerfil) }}</p>
        </div>
        <v-card-text class="pa-6">
          <v-list density="compact">
            <v-list-item>
              <template v-slot:prepend><v-icon color="#1867C0">mdi-email</v-icon></template>
              <v-list-item-title class="text-caption text-grey">Correo Electrónico</v-list-item-title>
              <v-list-item-subtitle class="text-body-2 font-weight-medium text-grey-darken-4">{{ itemFormulario.strCorreo }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider class="my-2"></v-divider>
            
            <v-list-item>
              <template v-slot:prepend><v-icon color="#1867C0">mdi-phone</v-icon></template>
              <v-list-item-title class="text-caption text-grey">Número Celular</v-list-item-title>
              <v-list-item-subtitle class="text-body-2 font-weight-medium text-grey-darken-4">{{ itemFormulario.strNumeroCelular }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider class="my-2"></v-divider>

            <v-list-item>
              <template v-slot:prepend><v-icon color="#1867C0">mdi-calendar-clock</v-icon></template>
              <v-list-item-title class="text-caption text-grey">Fecha de Ingreso</v-list-item-title>
              <v-list-item-subtitle class="text-body-2 font-weight-medium text-grey-darken-4">{{ formatearFecha(itemFormulario.fechaCreacion) }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider class="my-2"></v-divider>

            <v-list-item>
              <template v-slot:prepend><v-icon color="#1867C0">mdi-power</v-icon></template>
              <v-list-item-title class="text-caption text-grey">Estado del Sistema</v-list-item-title>
              <v-list-item-subtitle class="mt-1">
                <v-chip :color="itemFormulario.bitActivo ? 'success' : 'red-darken-1'" size="small">
                  {{ itemFormulario.bitActivo ? 'Activo (Acceso Permitido)' : 'Inactivo (Acceso Bloqueado)' }}
                </v-chip>
                <v-chip :color="itemFormulario.Verificado ? 'blue' : 'grey'" size="small" class="ml-2" variant="outlined">
                  {{ itemFormulario.Verificado ? 'Correo Verificado' : 'Pendiente Verificación' }}
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
        <v-card-title class="text-h6 font-weight-bold text-grey-darken-4">¿Eliminar Usuario?</v-card-title>
        <v-card-text class="text-grey-darken-1">
          Estás a punto de eliminar a <b>"{{ itemFormulario.strNombreUsuario }}"</b>. Esta acción borrará su acceso de forma permanente.
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
.border-right {
  border-right: 1px solid #e0e0e0;
}
.border-top {
  border-top: 1px solid #e0e0e0;
}
.border-white {
  border: 4px solid white !important;
}
.cursor-pointer {
  cursor: pointer;
  transition: background-color 0.2s;
}
.cursor-pointer:hover {
  background-color: #f5f5f5 !important;
}
@media (max-width: 959px) {
  .border-right {
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
  }
}
</style>