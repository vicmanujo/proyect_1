<script setup>
import { ref, onMounted, computed } from 'vue'

const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : '';

// Variables
const archivo = ref(null) 
const titulo = ref('')
const cargando = ref(false)
const imagenes = ref([]) 
const snackbar = ref({ show: false, text: '', color: '' })

// --- LÓGICA INTELIGENTE DE VALIDACIÓN ---
const archivoSeleccionado = computed(() => {
  // Esta función extrae el archivo real, sin importar si Vuetify lo da como array o no
  if (!archivo.value) return null;
  return Array.isArray(archivo.value) ? archivo.value[0] : archivo.value;
});

const esImagenValida = computed(() => {
  const file = archivoSeleccionado.value;
  // 1. Si no hay archivo, botón bloqueado
  if (!file) return false;
  // 2. Si no es imagen (ej. PDF, EXE), botón bloqueado
  if (!file.type.startsWith('image/')) return false;
  
  // Si pasa todo, botón DESBLOQUEADO
  return true;
});

const cargarGaleria = async () => {
  try {
    const res = await fetch(`${baseURL}/api/galeria`)
    imagenes.value = await res.json()
  } catch (error) {
    console.error("Error cargando galería")
  }
}

const subirImagen = async () => {
  // Doble chequeo de seguridad
  if (!esImagenValida.value) {
    snackbar.value = { show: true, text: 'Archivo no válido', color: 'error' }
    return
  }

  cargando.value = true
  
  const formData = new FormData()
  // AQUÍ ESTABA EL ERROR ANTES: Ahora usamos la variable segura
  formData.append('imagen', archivoSeleccionado.value) 
  formData.append('titulo', titulo.value || 'Sin título') // Si no ponen nombre, pone 'Sin título'

  try {
    const res = await fetch(`${baseURL}/api/subir-imagen`, {
      method: 'POST',
      body: formData 
    })
    const data = await res.json()

    if (data.success) {
      snackbar.value = { show: true, text: '¡Imagen subida con éxito!', color: 'success' }
      archivo.value = null // Limpiar input
      titulo.value = ''
      cargarGaleria() // Actualizar carrusel
    } else {
      snackbar.value = { show: true, text: 'Error: ' + data.message, color: 'error' }
    }

  } catch (error) {
    console.error(error)
    snackbar.value = { show: true, text: 'Error de conexión', color: 'error' }
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  cargarGaleria()
})
</script>

<template>
  <v-container class="fill-height d-flex flex-column align-center justify-start pt-10">

    <v-card 
      elevation="10" 
      rounded="xl" 
      width="100%" 
      max-width="600" 
      class="pa-6 mb-8 text-center"
      border
    >
      <div class="mb-4">
        <v-avatar color="#42b883" size="50" class="elevation-2 mb-2">
          <v-icon color="white">mdi-cloud-upload</v-icon>
        </v-avatar>
        <h2 class="text-h6 font-weight-bold text-grey-darken-3">Subir Imagen</h2>
      </div>

      <v-text-field
        v-model="titulo"
        label="Título (Opcional)"
        variant="outlined"
        density="compact"
        color="#42b883"
        class="mb-2"
      ></v-text-field>

      <v-file-input
        v-model="archivo"
        label="Selecciona tu foto"
        variant="outlined"
        density="compact"
        color="#42b883"
        prepend-icon=""
        prepend-inner-icon="mdi-camera"
        accept="image/*" 
        show-size
        :error-messages="archivoSeleccionado && !esImagenValida ? '⛔ Archivo inválido (Solo imágenes)' : ''"
      ></v-file-input>

      <v-btn 
        color="#42b883" 
        block 
        rounded="lg" 
        class="text-white font-weight-bold mt-2"
        @click="subirImagen"
        :loading="cargando"
        :disabled="!esImagenValida"
      >
        <v-icon start v-if="!esImagenValida">mdi-lock</v-icon>
        <v-icon start v-else>mdi-arrow-up-bold</v-icon>
        
        {{ !esImagenValida ? 'Selecciona una imagen válida' : 'Subir Imagen' }}
      </v-btn>
    </v-card>

    <div v-if="imagenes.length > 0" class="w-100" style="max-width: 800px;">
      <h3 class="text-h5 font-weight-bold text-center mb-4 text-grey-darken-2">
        Galería en Vivo
      </h3>
      
      <v-carousel 
        cycle 
        height="400" 
        hide-delimiter-background
        show-arrows="hover"
        class="rounded-xl elevation-10"
      >
        <v-carousel-item
          v-for="(img, i) in imagenes"
          :key="i"
          :src="img.ImagenUrl"
          cover
        >
          <div class="d-flex fill-height align-end justify-center pb-10">
            <div class="bg-black text-white px-4 py-2 rounded-pill opacity-75">
              {{ img.Titulo }}
            </div>
          </div>
        </v-carousel-item>
      </v-carousel>
    </div>

    <div v-else class="text-center text-grey mt-10">
      <v-icon size="60" color="grey-lighten-2">mdi-image-off</v-icon>
      <p class="mt-2">No hay imágenes en el carrusel aún.</p>
    </div>

    <v-btn to="/" variant="text" color="grey" class="mt-8">
      Volver al inicio
    </v-btn>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>

  </v-container>
</template>

<style scoped>
.opacity-75 {
  background-color: rgba(0, 0, 0, 0.6) !important;
}
</style>