<script setup>
import { ref, computed } from 'vue'

// Detectar entorno para la URL
const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : '';

const valido = ref(false)
const cargando = ref(false)
const formulario = ref(null) 
const snackbar = ref({ show: false, text: '', color: '' })

const datos = ref({
  nombre: '',
  correo: '',
  telefono: '',
  fechaNacimiento: '',
  mensaje: ''
})

// --- REGLAS DE VALIDACIÓN ESTRICTAS ---

// 1. Nombre: 
// - No acepta vacío ni solo espacios (.trim())
// - Máximo 60
// - Regex de solo letras (doble seguridad)
const reglasNombre = [
  v => !!v || 'El nombre es obligatorio',
  v => (v && v.trim().length > 0) || 'El nombre no puede ser solo espacios', // 🚫 NUEVA REGLA
  v => (v && v.length <= 60) || 'Máximo 60 caracteres',
  v => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(v) || 'Solo se permiten letras'
]

// 2. Correo: 
// - No acepta espacios vacíos
const reglasCorreo = [
  v => !!v || 'El correo es obligatorio',
  v => (v && v.trim().length > 0) || 'El correo no puede tener espacios vacíos', // 🚫 NUEVA REGLA
  v => (v && v.length <= 100) || 'Máximo 100 caracteres',
  v => /.+@.+\..+/.test(v) || 'El correo debe ser válido'
]

// 3. Teléfono
const reglasTelefono = [
  v => !!v || 'El teléfono es obligatorio',
  v => /^[0-9]+$/.test(v) || 'Solo se permiten números',
  v => (v && v.length === 10) || 'Debe tener exactamente 10 dígitos'
]

// 4. Fecha
const reglasFecha = [
  v => !!v || 'La fecha de nacimiento es obligatoria'
]

// 5. Mensaje: 
// - No acepta solo espacios (evita mensajes vacíos disfrazados)
const reglasMensaje = [
  v => !!v || 'El mensaje es obligatorio',
  v => (v && v.trim().length > 0) || 'El mensaje no puede estar vacío', // 🚫 NUEVA REGLA
  v => (v && v.length <= 300) || 'Máximo 300 caracteres'
]

// Calcular fecha máxima (Mayores de 18 años)
const fechaMax = computed(() => {
  const hoy = new Date();
  hoy.setFullYear(hoy.getFullYear() - 18); 
  return hoy.toISOString().split('T')[0];
})

const enviarFormulario = async () => {
  // Antes de validar, limpiamos los espacios sobrantes al inicio y final de todos los campos
  datos.value.nombre = datos.value.nombre.trim();
  datos.value.correo = datos.value.correo.trim();
  datos.value.mensaje = datos.value.mensaje.trim();

  const { valid } = await formulario.value.validate()
  if (!valid) return

  cargando.value = true

  try {
    const respuesta = await fetch(`${baseURL}/api/guardar-contacto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos.value)
    });

    const resultado = await respuesta.json();

    if (resultado.success) {
      snackbar.value = { show: true, text: '¡Mensaje enviado con éxito!', color: 'success' }
      formulario.value.reset() 
    } else {
      snackbar.value = { show: true, text: 'Error: ' + resultado.message, color: 'error' }
    }

  } catch (error) {
    console.error(error)
    snackbar.value = { show: true, text: 'Error de conexión con el servidor', color: 'error' }
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    
    <v-card 
      elevation="12" 
      rounded="xl" 
      width="100%" 
      max-width="500" 
      class="pa-6"
      border
    >
      <div class="text-center mb-6">
        <v-avatar color="#42b883" size="60" class="elevation-3 mb-3">
          <v-icon color="white" size="32">mdi-email-fast-outline</v-icon>
        </v-avatar>
        <h2 class="text-h5 font-weight-bold text-grey-darken-3">Contáctanos</h2>
        <p class="text-caption text-grey">Déjanos tus datos y te responderemos</p>
      </div>

      <v-form ref="formulario" v-model="valido" @submit.prevent="enviarFormulario">
        
        <v-row dense>
          <v-col cols="12">
            <v-text-field
              v-model="datos.nombre"
              label="Nombre Completo"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              color="#42b883"
              :rules="reglasNombre"
              counter="60"
              @input="v => { 
                // ESTO HACE LA MAGIA:
                // Reemplaza cualquier cosa que NO sea letra (a-z) o espacio (\s) con nada ('')
                datos.nombre = v.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
              }"
            ></v-text-field>
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model="datos.correo"
              label="Correo Electrónico"
              prepend-inner-icon="mdi-email"
              variant="outlined"
              color="#42b883"
              :rules="reglasCorreo"
              counter="100"
            ></v-text-field>
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              v-model="datos.telefono"
              label="Teléfono (10 dígitos)"
              prepend-inner-icon="mdi-phone"
              variant="outlined"
              color="#42b883"
              :rules="reglasTelefono"
              counter="10"
              @input="v => { 
                let limpio = v.target.value.replace(/[^0-9]/g, '');
                if (limpio.length > 10) limpio = limpio.slice(0, 10);
                datos.telefono = limpio;
              }"
            ></v-text-field>
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              v-model="datos.fechaNacimiento"
              label="Fecha de Nacimiento"
              type="date"
              variant="outlined"
              color="#42b883"
              :rules="reglasFecha"
              :max="fechaMax" 
            ></v-text-field>
          </v-col>

          <v-col cols="12">
            <v-textarea
              v-model="datos.mensaje"
              label="Tu Mensaje"
              prepend-inner-icon="mdi-message-text"
              variant="outlined"
              color="#42b883"
              :rules="reglasMensaje"
              counter="300"
              rows="3"
              auto-grow
            ></v-textarea>
          </v-col>
        </v-row>

        <div class="d-flex flex-column gap-3 mt-4">
          <v-btn 
            block 
            color="#42b883" 
            size="large" 
            rounded="lg" 
            class="text-white font-weight-bold elevation-4"
            type="submit"
            :loading="cargando"
          >
            Enviar Datos
            <v-icon end>mdi-send</v-icon>
          </v-btn>

          <v-btn 
            to="/" 
            variant="text" 
            block 
            color="grey-darken-1">
            <v-icon start>mdi-arrow-left</v-icon>
            Volver al inicio
          </v-btn>

          <v-btn 
            to="/registros" 
            variant="text" 
            block 
            color="blue-darken-1"> <v-icon start>mdi-table-account</v-icon>
            Ver registros
          </v-btn>

        </div>

      </v-form>
    </v-card>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
      location="top"
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>

  </v-container>
</template>

<style scoped>
.gap-3 {
  gap: 12px;
}
</style>