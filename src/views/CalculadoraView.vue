<script setup>
import { ref } from 'vue'

// Variables reactivas
const num1 = ref(null)
const num2 = ref(null)
const resultado = ref(null)
const errorMsg = ref('')

// Función para Sumar
const sumar = () => {
  errorMsg.value = ''
  
  if (num1.value === null || num2.value === null) {
    errorMsg.value = "Por favor ingresa ambos números"
    return
  }
  
  resultado.value = num1.value + num2.value
}

// Función para Dividir
const dividir = () => {
  errorMsg.value = ''
  
  if (num1.value === null || num2.value === null) {
    errorMsg.value = "Por favor ingresa ambos números"
    return
  }

  if (num2.value === 0) {
    errorMsg.value = "¡No se puede dividir entre cero!"
    resultado.value = null
    return
  }

  resultado.value = (num1.value / num2.value).toFixed(2)
}

// Función Limpiar Todo
const limpiar = () => {
  num1.value = null
  num2.value = null
  resultado.value = null
  errorMsg.value = ''
}
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    
    <v-card 
      elevation="10" 
      rounded="xl" 
      width="100%" 
      max-width="450"
      class="pa-6 text-center"
      border
    >
      <div class="mb-4">
        <v-avatar color="#42b883" size="60" class="mb-3 elevation-3">
          <v-icon color="white" size="30">mdi-calculator</v-icon>
        </v-avatar>
        <h2 class="text-h5 font-weight-bold text-grey-darken-3">Calculadora Vue</h2>
      </div>

      <v-form @submit.prevent>
        <v-row dense>
          <v-col cols="12">
            <v-text-field
              v-model.number="num1"
              label="Primer Número"
              type="number"
              variant="outlined"
              color="#42b883"
              prepend-inner-icon="mdi-numeric-1-box"
              hide-details="auto"
              class="mb-3"
            ></v-text-field>
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model.number="num2"
              label="Segundo Número"
              type="number"
              variant="outlined"
              color="#42b883"
              prepend-inner-icon="mdi-numeric-2-box"
              hide-details="auto"
            ></v-text-field>
          </v-col>
        </v-row>
      </v-form>

      <div class="d-flex justify-space-between gap-2 mt-6 mb-6">
        <v-btn 
          color="#42b883" 
          class="flex-grow-1 text-white text-capitalize" 
          height="50"
          rounded="lg"
          elevation="2"
          @click="sumar"
        >
          <v-icon start>mdi-plus</v-icon> Sumar
        </v-btn>

        <v-btn 
          color="blue-grey-lighten-1" 
          class="flex-grow-1 text-white text-capitalize ml-3" 
          height="50"
          rounded="lg"
          elevation="2"
          @click="dividir"
        >
          <v-icon start>mdi-division</v-icon> Dividir
        </v-btn>
      </div>

      <v-divider class="mb-4"></v-divider>

      <v-expand-transition>
        <v-alert
          v-if="errorMsg"
          type="error"
          variant="tonal"
          border="start"
          class="mb-4 text-left"
          closable
        >
          {{ errorMsg }}
        </v-alert>
      </v-expand-transition>

      <v-scale-transition>
        <div v-if="resultado !== null" class="result-box pa-4 rounded-lg mb-6 elevation-1">
          <div class="text-caption text-grey">Resultado</div>
          <div class="text-h3 font-weight-bold text-green-darken-1">
            {{ resultado }}
          </div>
        </div>
      </v-scale-transition>

      <div class="d-flex flex-column gap-2">
        <v-btn 
          variant="text" 
          color="grey-darken-1" 
          @click="limpiar"
        >
          Limpiar Todo
        </v-btn>
        
        <v-btn 
          to="/" 
          variant="plain" 
          color="#42b883" 
          class="opacity-75"
        >
          <v-icon start>mdi-arrow-left</v-icon> Volver al inicio
        </v-btn>
      </div>

    </v-card>
  </v-container>
</template>

<style scoped>
/* Estilo suave para la caja del resultado */
.result-box {
  background-color: #f1f8f5; 
  border: 1px solid #ccece0;
}
</style>