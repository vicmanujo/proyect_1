<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

// Importamos las gráficas
import { Bar, Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement)

const router = useRouter()
const esAdmin = ref(false)
const estaVerificado = ref(true) // 🟢 NUEVA VARIABLE PARA CONTROLAR EL BLOQUEO

// Variables para el Reloj (Usuarios Normales)
const horaActual = ref('')
const fechaActual = ref('')
let intervaloReloj = null

// Datos simulados para gráficas
const chartDataUsuarios = ref({
  labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  datasets: [{
    label: 'Inicios de Sesión',
    backgroundColor: '#1867C0',
    borderRadius: 4,
    data: [12, 19, 15, 25, 22, 10, 5]
  }]
})

const chartDataInventario = ref({
  labels: ['Disponibles', 'Agotados', 'En Ruta'],
  datasets: [{
    backgroundColor: ['#4CAF50', '#F44336', '#FFC107'],
    data: [350, 45, 120]
  }]
})

const opcionesGrafica = { responsive: true, maintainAspectRatio: false }

const actualizarReloj = () => {
  const ahora = new Date()
  horaActual.value = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  fechaActual.value = ahora.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

onMounted(() => {
  const usrStr = localStorage.getItem('usuario')
  if (usrStr) {
    const usr = JSON.parse(usrStr)
    
    // 🚨 1. VALIDACIÓN DE CUENTA VERIFICADA
    if (usr.verificado === false || usr.verificado === 0) {
      estaVerificado.value = false // 🔴 Encendemos la pantalla de bloqueo
      return // Detenemos la lectura para que no cargue ni reloj ni gráficas
    }

    // 👑 2. SI ESTÁ VERIFICADO, REVISAMOS SU ROL
    estaVerificado.value = true

    if (usr.esAdmin) {
      esAdmin.value = true
    } else {
      actualizarReloj()
      intervaloReloj = setInterval(actualizarReloj, 1000)
    }
  }
})

onUnmounted(() => {
  if (intervaloReloj) clearInterval(intervaloReloj)
})
</script>

<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4 fill-height align-start">
    
    <template v-if="!estaVerificado">
      <v-row justify="center" align="center" style="height: 80vh;">
        <v-col cols="12" md="6" class="text-center">
          <v-card elevation="6" rounded="xl" class="pa-10 border-top-red bg-white">
            <v-icon size="90" color="red-darken-2" class="mb-4 text-glow">mdi-shield-alert-outline</v-icon>
            <h1 class="text-h4 font-weight-black text-grey-darken-4 mb-3">Cuenta No Verificada</h1>
            <p class="text-body-1 text-grey-darken-2 mb-8 px-4">
              Por políticas de seguridad de <b>CORP SYSTEM</b>, es estrictamente necesario que verifiques tu cuenta antes de acceder a los módulos de trabajo y gráficas del sistema.
            </p>
            <v-btn
              color="#1867C0"
              size="x-large"
              variant="elevated"
              prepend-icon="mdi-account-check"
              class="text-none font-weight-bold px-8 text-white"
              rounded="lg"
              @click="router.push('/mi-perfil')"
            >
              Ir a verificar mi cuenta
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <template v-else>
      
      <template v-if="esAdmin">
        <v-row>
          <v-col cols="12" md="4">
            <v-card elevation="2" rounded="xl" class="pa-4 bg-white border-left-blue">
              <div class="d-flex justify-space-between align-center">
                <div>
                  <p class="text-caption text-grey font-weight-bold text-uppercase mb-1">Usuarios Activos</p>
                  <h2 class="text-h3 font-weight-black text-blue-darken-3">1,204</h2>
                </div>
                <v-avatar color="blue-lighten-4" size="50"><v-icon color="blue-darken-3">mdi-account-group</v-icon></v-avatar>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card elevation="2" rounded="xl" class="pa-4 bg-white border-left-green">
              <div class="d-flex justify-space-between align-center">
                <div>
                  <p class="text-caption text-grey font-weight-bold text-uppercase mb-1">Ventas del Mes</p>
                  <h2 class="text-h3 font-weight-black text-green-darken-3">$45.2K</h2>
                </div>
                <v-avatar color="green-lighten-4" size="50"><v-icon color="green-darken-3">mdi-currency-usd</v-icon></v-avatar>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card elevation="2" rounded="xl" class="pa-4 bg-white border-left-red">
              <div class="d-flex justify-space-between align-center">
                <div>
                  <p class="text-caption text-grey font-weight-bold text-uppercase mb-1">Alertas Sistema</p>
                  <h2 class="text-h3 font-weight-black text-red-darken-3">3</h2>
                </div>
                <v-avatar color="red-lighten-4" size="50"><v-icon color="red-darken-3">mdi-alert</v-icon></v-avatar>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <v-row class="mt-4">
          <v-col cols="12" md="8">
            <v-card elevation="2" rounded="xl" class="pa-6 h-100">
              <h3 class="text-h6 font-weight-bold text-grey-darken-3 mb-4">Tráfico de Usuarios</h3>
              <div style="height: 300px;">
                <Bar :data="chartDataUsuarios" :options="opcionesGrafica" />
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card elevation="2" rounded="xl" class="pa-6 h-100">
              <h3 class="text-h6 font-weight-bold text-grey-darken-3 mb-4">Estado del Inventario</h3>
              <div style="height: 300px;">
                <Doughnut :data="chartDataInventario" :options="opcionesGrafica" />
              </div>
            </v-card>
          </v-col>
        </v-row>
      </template>

      <template v-else>
        <v-row justify="center" align="center" style="height: 80vh;">
          <v-col cols="12" md="8" class="text-center">
            <v-card elevation="0" color="transparent">
              <v-icon size="80" color="blue-grey-lighten-2" class="mb-4">mdi-clock-outline</v-icon>
              <h1 class="text-h1 font-weight-black text-blue-darken-4 mb-2" style="font-family: monospace;">
                {{ horaActual }}
              </h1>
              <h2 class="text-h5 text-grey-darken-1 text-capitalize">
                {{ fechaActual }}
              </h2>
              <v-divider class="my-8 mx-auto" style="max-width: 200px;"></v-divider>
              <p class="text-body-1 text-grey">
                Utiliza el menú lateral izquierdo para acceder a tus herramientas de trabajo.
              </p>
            </v-card>
          </v-col>
        </v-row>
      </template>

    </template>
  </v-container>
</template>

<style scoped>
.border-left-blue { border-left: 6px solid #1867C0 !important; }
.border-left-green { border-left: 6px solid #4CAF50 !important; }
.border-left-red { border-left: 6px solid #D32F2F !important; }
.border-top-red { border-top: 8px solid #D32F2F !important; }
.text-glow { filter: drop-shadow(0px 0px 10px rgba(211, 47, 47, 0.3)); }
</style>