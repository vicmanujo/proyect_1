<script setup>
import { ref, onMounted } from 'vue'

const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : '';

// Variables
const archivo = ref(null) // El archivo seleccionado
const titulo = ref('')
const cargando = ref(false)
const imagenes = ref([]) // Lista de imágenes para el carrusel
const snackbar = ref({ show: false, text: '', color: '' })

// 1. Obtener imágenes al cargar
const cargarGaleria = async () => {
  try {
    const res = await fetch(`${baseURL}/api/galeria`)
    imagenes.value = await res.json()
  } catch (error) {
    console.error("Error cargando galería")
  }
}

// 2. Subir imagen
const subirImagen = async () => {
  if (!archivo.value) {
    snackbar.value = { show: true, text: 'Selecciona una imagen primero', color: 'warning' }
    return
  }

  cargando.value = true
  
  // Usamos FormData para enviar archivos (es diferente a JSON)
  const formData = new FormData()
  formData.append('imagen', archivo.value) // 'imagen' debe coincidir con upload.single('imagen') del backend
  formData.append('titulo', titulo.value)

  try {
    const res = await fetch(`${baseURL}/api/subir-imagen`, {
      method: 'POST',
      body: formData // No lleva headers Content-Type, el navegador lo pone solo
    })
    const data = await res.json()

    if (data.success) {
      snackbar.value = { show: true, text: '¡Imagen subida con éxito!', color: 'success' }
      archivo.value = null
      titulo.value = ''
      cargarGaleria() // Recargar el carrusel
    } else {
      snackbar.value = { show: true, text: 'Error: ' + data.message, color: 'error' }
    }

  } catch (error) {
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
        <h2 class="text-h6 font-weight-bold text-grey-darken-3">Subir a Cloudinary</h2>
      </div>

      <v-text-field
        v-model="titulo"
        label="Título de la imagen (Opcional)"
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
      ></v-file-input>

      <v-btn 
        color="#42b883" 
        block 
        rounded="lg" 
        class="text-white font-weight-bold mt-2"
        @click="subirImagen"
        :loading="cargando"
      >
        Subir Imagen
        <v-icon end>mdi-arrow-up-bold</v-icon>
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
/* Estilo para que el fondo semitransparente del título se vea bien */
.opacity-75 {
  background-color: rgba(0, 0, 0, 0.6) !important;
}
</style>