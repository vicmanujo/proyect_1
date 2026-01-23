<script setup>
import { ref, computed } from 'vue'

// Detectar entorno para la URL
const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : '';

// Variables del formulario
const valido = ref(false)
const cargando = ref(false)
const formulario = ref(null) // Referencia al formulario para resetearlo
const snackbar = ref({ show: false, text: '', color: '' })

// Modelo de datos
const datos = ref({
  nombre: '',
  correo: '',
  telefono: '',
  fechaNacimiento: '',
  mensaje: ''
})

// --- REGLAS DE VALIDACIÓN ---

// 1. Nombre: Solo letras y espacios, máx 60.
const reglasNombre = [
  v => !!v || 'El nombre es obligatorio',
  v => (v && v.length <= 60) || 'Máximo 60 caracteres',
  v => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(v) || 'Solo se permiten letras y espacios'
]

// 2. Correo: Formato email, máx 100.
const reglasCorreo = [
  v => !!v || 'El correo es obligatorio',
  v => (v && v.length <= 100) || 'Máximo 100 caracteres',
  v => /.+@.+\..+/.test(v) || 'El correo debe ser válido'
]

// 3. Teléfono: Solo números, exactamente 10.
const reglasTelefono = [
  v => !!v || 'El teléfono es obligatorio',
  v => /^[0-9]+$/.test(v) || 'Solo se permiten números',
  v => (v && v.length === 10) || 'Debe tener exactamente 10 dígitos'
]

// 4. Fecha: Obligatoria (la validación de "no futuro" se hace en el atributo max del input)
const reglasFecha = [
  v => !!v || 'La fecha de nacimiento es obligatoria'
]

// 5. Mensaje: Máx 300.
const reglasMensaje = [
  v => !!v || 'El mensaje es obligatorio',
  v => (v && v.length <= 300) || 'Máximo 300 caracteres'
]

// Calcular la fecha de HOY para que no seleccionen mañana
const fechaMax = computed(() => {
  const hoy = new Date();
  return hoy.toISOString().split('T')[0]; // Formato YYYY-MM-DD
})

// --- FUNCIÓN ENVIAR ---
const enviarFormulario = async () => {
  // 1. Validar visualmente
  const { valid } = await formulario.value.validate()
  if (!valid) return

  cargando.value = true

  try {
    // 2. Enviar a la API
    const respuesta = await fetch(`${baseURL}/api/guardar-contacto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos.value)
    });

    const resultado = await respuesta.json();

    if (resultado.success) {
      // Éxito
      snackbar.value = { show: true, text: '¡Mensaje enviado con éxito!', color: 'success' }
      formulario.value.reset() // Limpiar campos
    } else {
      // Error de lógica
      snackbar.value = { show: true, text: 'Error: ' + resultado.message, color: 'error' }
    }

  } catch (error) {
    // Error de red
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
                // 1. Eliminar cualquier cosa que no sea número
                let limpio = v.target.value.replace(/[^0-9]/g, '');
                // 2. Cortar a máximo 10 caracteres
                if (limpio.length > 10) limpio = limpio.slice(0, 10);
                // 3. Actualizar el modelo
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
            color="grey-darken-1"
          >
            <v-icon start>mdi-arrow-left</v-icon>
            Volver al inicio
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