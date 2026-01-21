import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 1. Importar Vuetify y sus estilos
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// 2. Crear la configuración de Vuetify
const vuetify = createVuetify({
  components,
  directives,
})

const app = createApp(App)

app.use(router)
app.use(vuetify) // <--- 3. ¡Importante! Usar Vuetify aquí
app.mount('#app')