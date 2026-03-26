<script setup>
import { ref, onMounted } from 'vue'

const tab = ref('perfil')
const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : ''
const idUsuarioActual = ref(null)

const formPerfil = ref(null)

// 🟢 DATOS DEL USUARIO
const perfil = ref({
  nombre: '',
  correo: 'Cargando...',
  celular: '',
  fotoUrl: '',
  verificado: false
})

// 🟢 VARIABLES PARA LA FOTO
const inputArchivoNativo = ref(null)
const archivoParaGuardar = ref(null)
const fotoPrevia = ref(null)
const confirmandoFoto = ref(false)

// 🟢 VARIABLES OTP (Verificación)
const otp = ref('')
const codigoEnviado = ref(false)
const cargandoVerificacion = ref(false)
const mensajeVerificacion = ref('')

// Variables Seguridad
const pwdActual = ref(''); const pwdNueva = ref(''); const pwdConfirmar = ref(''); 
const verPwd1 = ref(false); const verPwd2 = ref(false); const verPwd3 = ref(false)

// 🟢 SNACKBAR
const snackbar = ref({ mostrar: false, texto: '', color: 'success' })
const mostrarMensaje = (texto, color = 'success') => {
  snackbar.value.texto = texto; snackbar.value.color = color; snackbar.value.mostrar = true
}

const reglas = {
  nombre: [v => !!v || 'El nombre es obligatorio', v => (v && v.length >= 3) || 'Debe tener al menos 3 letras'],
  correo: [v => !!v || 'El correo es obligatorio', v => /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(v) || 'Escribe un correo válido'],
  celular: [v => !!v || 'El número celular es obligatorio', v => /^[0-9]{10}$/.test(v) || 'Debe tener exactamente 10 dígitos']
}

// CARGAR DATOS
onMounted(async () => {
  const usr = localStorage.getItem('usuario')
  if (usr) {
    const data = JSON.parse(usr)
    perfil.value.nombre = data.nombre
    idUsuarioActual.value = data.id
    
    try {
      const res = await fetch(`${baseURL}/api/mi-perfil/${data.id}`)
      const dbData = await res.json()
      if (dbData.success) {
        perfil.value.correo = dbData.perfil.strCorreo
        perfil.value.celular = dbData.perfil.strNumeroCelular || ''
        perfil.value.verificado = dbData.perfil.Verificado
        perfil.value.fotoUrl = dbData.perfil.strUrlImagen || ''
      }
    } catch (error) { console.error(error) }
  }
})

// LÓGICA DE IMAGEN Y VISTA PREVIA
const abrirBuscadorArchivos = () => { inputArchivoNativo.value.click() }

const procesarArchivoSeleccionado = (event) => {
  const archivo = event.target.files[0]
  if (!archivo) return
  event.target.value = '' 

  const extension = archivo.name.split('.').pop().toLowerCase()
  const permitidas = ['jpg', 'jpeg', 'png', 'webp']

  if (!archivo.type.startsWith('image/') || !permitidas.includes(extension)) {
    mostrarMensaje('Seguridad: Solo se permiten imágenes (No ISO, PDF, etc).', 'error')
    return
  }
  const megabytes = archivo.size / (1024 * 1024)
  if (megabytes > 2) {
    mostrarMensaje('El archivo es demasiado grande (Máximo 2MB).', 'warning')
    return
  }

  fotoPrevia.value = URL.createObjectURL(archivo)
  archivoParaGuardar.value = archivo
  confirmandoFoto.value = true
  mostrarMensaje('¿Te gusta esta foto? Dale a la palomita verde para confirmarla.', 'info')
}

const aceptarFotoPrevia = () => {
  confirmandoFoto.value = false 
  mostrarMensaje('Foto confirmada. Recuerda darle a "Guardar Cambios".', 'success')
}

const cancelarFotoPrevia = () => {
  fotoPrevia.value = null; archivoParaGuardar.value = null; confirmandoFoto.value = false
}

// GUARDAR PERFIL (Texto + Foto)
const guardarPerfil = async () => {
  const { valid } = await formPerfil.value.validate()
  if (!valid) {
    mostrarMensaje('Por favor, corrige los errores en rojo antes de guardar.', 'error')
    return
  }

  try {
    const formData = new FormData()
    formData.append('nombre', perfil.value.nombre)
    formData.append('correo', perfil.value.correo)
    formData.append('celular', perfil.value.celular)
    if (archivoParaGuardar.value) formData.append('foto', archivoParaGuardar.value)

    const res = await fetch(`${baseURL}/api/mi-perfil/${idUsuarioActual.value}`, {
      method: 'PUT', body: formData 
    })
    const data = await res.json()
    
    if (data.success) {
      mostrarMensaje('¡Tus datos se guardaron correctamente!', 'success')
      const usr = JSON.parse(localStorage.getItem('usuario'))
      usr.nombre = perfil.value.nombre
      if (data.fotoUrl) {
        perfil.value.fotoUrl = data.fotoUrl
        usr.fotoUrl = data.fotoUrl
      }
      localStorage.setItem('usuario', JSON.stringify(usr))
      
      fotoPrevia.value = null; archivoParaGuardar.value = null; confirmandoFoto.value = false
      window.dispatchEvent(new CustomEvent('perfil-actualizado', { detail: usr }))
    } else {
      mostrarMensaje(data.message, 'error')
    }
  } catch (error) {
    mostrarMensaje('Error de red. No se pudo conectar al servidor.', 'error')
  }
}

// ACTUALIZAR CONTRASEÑA
const cambiarPassword = async () => { /* ... lógica que ya tienes ... */ }

// ==========================================
// 🟢 LÓGICA DE VERIFICACIÓN (OTP CORREO)
// ==========================================
const solicitarCodigo = async () => {
  cargandoVerificacion.value = true
  mensajeVerificacion.value = ''
  otp.value = ''
  
  try {
    const res = await fetch(`${baseURL}/api/solicitar-codigo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario: idUsuarioActual.value })
    })
    const data = await res.json()
    
    if (data.success) {
      codigoEnviado.value = true 
      mostrarMensaje('Código enviado a tu correo.', 'success')
    } else {
      mensajeVerificacion.value = 'Error: ' + data.message
      mostrarMensaje(data.message, 'error')
    }
  } catch (error) {
    console.error(error)
    mostrarMensaje('Error al conectar con el servidor para mandar el correo.', 'error')
  } finally {
    cargandoVerificacion.value = false
  }
}

const verificarCuenta = async () => {
  if (otp.value.length < 6) return
  
  cargandoVerificacion.value = true
  try {
    const res = await fetch(`${baseURL}/api/verificar-codigo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario: idUsuarioActual.value, codigo: otp.value })
    })
    const data = await res.json()
    
    if (data.success) {
      perfil.value.verificado = true
      codigoEnviado.value = false
      mensajeVerificacion.value = ''
      mostrarMensaje('¡Tu cuenta ha sido verificada! Redirigiendo...', 'success')

      // 🟢 MAGIA AQUÍ: Actualizamos la libretita del navegador
      const usr = JSON.parse(localStorage.getItem('usuario'))
      if (usr) {
        usr.verificado = true
        localStorage.setItem('usuario', JSON.stringify(usr))
      }

      // 🟢 Esperamos 1.5 segundos y lo mandamos a Inicio
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)

    } else {
      mensajeVerificacion.value = data.message 
      otp.value = ''
    }
  } catch (error) {
    mostrarMensaje('Error al verificar el código.', 'error')
  } finally {
    cargandoVerificacion.value = false
  }
}
</script>

<template>
  <v-container max-width="800">
    
    <v-snackbar v-model="snackbar.mostrar" :color="snackbar.color" timeout="4000" location="top right" elevation="24" style="z-index: 9999;">
      <div class="d-flex align-center font-weight-bold">
        <v-icon start>{{ snackbar.color === 'error' ? 'mdi-alert-circle' : (snackbar.color === 'warning' ? 'mdi-alert' : 'mdi-check-circle') }}</v-icon>
        {{ snackbar.texto }}
      </div>
    </v-snackbar>

    <div class="mb-6">
      <h2 class="text-h5 font-weight-bold text-grey-darken-3">Configuración de Cuenta</h2>
      <p class="text-medium-emphasis">Administra tu información personal y la seguridad de tu sesión.</p>
    </div>

    <v-card elevation="2" rounded="xl">
      <v-tabs v-model="tab" color="blue-darken-3" align-tabs="center" bg-color="grey-lighten-4">
        <v-tab value="perfil" prepend-icon="mdi-account-details">Perfil General</v-tab>
        <v-tab value="seguridad" prepend-icon="mdi-shield-lock">Seguridad</v-tab>
        <v-tab value="verificacion" prepend-icon="mdi-check-decagram">Verificación</v-tab>
      </v-tabs>

      <v-card-text class="pa-6">
        <v-window v-model="tab">
          
          <v-window-item value="perfil">
            <v-alert v-if="!perfil.verificado" type="warning" variant="tonal" density="compact" class="mb-6" style="cursor: pointer;" @click="tab = 'verificacion'">
              <v-icon start>mdi-shield-alert</v-icon> Tu cuenta no está validada. <strong>Haz clic aquí para validarla ahora mismo.</strong>
            </v-alert>
            <v-alert v-else type="success" variant="tonal" density="compact" class="mb-6">
              <v-icon start>mdi-check-decagram</v-icon> Tu cuenta está validada y segura.
            </v-alert>

            <v-row>
              <v-col cols="12" md="4" class="text-center d-flex flex-column align-center justify-start mt-2">
                <v-avatar size="140" color="#1867C0" class="elevation-4 mb-4">
                  <v-img v-if="fotoPrevia || perfil.fotoUrl" :src="fotoPrevia || perfil.fotoUrl" cover></v-img>
                  <span v-else class="text-white text-h2 font-weight-bold">{{ perfil.nombre.charAt(0).toUpperCase() }}</span>
                </v-avatar>
                <input type="file" ref="inputArchivoNativo" class="d-none" accept="image/png, image/jpeg, image/jpg, image/webp" @change="procesarArchivoSeleccionado" />
                <v-btn v-if="!confirmandoFoto" size="small" variant="tonal" color="blue-darken-3" prepend-icon="mdi-camera" @click="abrirBuscadorArchivos" class="text-none font-weight-bold">Cambiar Foto</v-btn>
                <v-expand-transition>
                  <div v-if="confirmandoFoto" class="d-flex flex-column align-center bg-grey-lighten-4 pa-2 rounded-lg elevation-1 w-100 mt-2">
                    <span class="text-caption font-weight-bold text-grey-darken-2 mb-2">¿Usar esta foto?</span>
                    <div class="d-flex ga-4">
                      <v-btn icon size="small" color="success" elevation="2" @click="aceptarFotoPrevia"><v-icon>mdi-check</v-icon></v-btn>
                      <v-btn icon size="small" color="error" variant="text" @click="cancelarFotoPrevia"><v-icon>mdi-close</v-icon></v-btn>
                    </div>
                  </div>
                </v-expand-transition>
              </v-col>
              
              <v-col cols="12" md="8">
                <v-form ref="formPerfil" @submit.prevent="guardarPerfil">
                  <v-text-field v-model="perfil.nombre" :rules="reglas.nombre" label="Nombre de Usuario" variant="outlined" density="comfortable" color="blue-darken-3" class="mb-2" prepend-inner-icon="mdi-account" maxlength="50" counter="50" persistent-counter></v-text-field>
                  <v-text-field v-model="perfil.correo" :rules="reglas.correo" label="Correo Electrónico" variant="outlined" density="comfortable" color="blue-darken-3" class="mb-2" prepend-inner-icon="mdi-email" type="email" maxlength="100" counter="100" persistent-counter></v-text-field>
                  <v-text-field v-model="perfil.celular" :rules="reglas.celular" label="Número Celular" variant="outlined" density="comfortable" color="blue-darken-3" class="mb-4" prepend-inner-icon="mdi-phone" type="text" maxlength="10" counter="10" persistent-counter @keypress="(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault() }"></v-text-field>
                  <div class="text-right mt-2">
                    <v-btn type="submit" color="blue-darken-3" class="text-none font-weight-bold px-6" prepend-icon="mdi-content-save">Guardar Cambios</v-btn>
                  </div>
                </v-form>
              </v-col>
            </v-row>
          </v-window-item>

          <v-window-item value="seguridad">
            <v-card variant="tonal" color="warning" class="mb-6"><v-card-text class="text-caption font-weight-medium"><v-icon start>mdi-alert</v-icon>Para cambiar tu contraseña, debes ingresar tu contraseña actual por seguridad.</v-card-text></v-card>
            <v-form @submit.prevent="cambiarPassword">
              <v-text-field v-model="pwdActual" label="Contraseña Actual" variant="outlined" density="comfortable" class="mb-2" :append-inner-icon="verPwd1 ? 'mdi-eye-off' : 'mdi-eye'" :type="verPwd1 ? 'text' : 'password'" @click:append-inner="verPwd1 = !verPwd1" prepend-inner-icon="mdi-lock-outline"></v-text-field>
              <v-text-field v-model="pwdNueva" label="Nueva Contraseña" variant="outlined" density="comfortable" class="mb-2" :append-inner-icon="verPwd2 ? 'mdi-eye-off' : 'mdi-eye'" :type="verPwd2 ? 'text' : 'password'" @click:append-inner="verPwd2 = !verPwd2" prepend-inner-icon="mdi-lock-reset"></v-text-field>
              <v-text-field v-model="pwdConfirmar" label="Confirmar Nueva Contraseña" variant="outlined" density="comfortable" class="mb-4" :append-inner-icon="verPwd3 ? 'mdi-eye-off' : 'mdi-eye'" :type="verPwd3 ? 'text' : 'password'" @click:append-inner="verPwd3 = !verPwd3" prepend-inner-icon="mdi-lock-check"></v-text-field>
              <div class="text-right"><v-btn type="submit" color="red-darken-1" class="text-none font-weight-bold" prepend-icon="mdi-key-variant">Actualizar Contraseña</v-btn></div>
            </v-form>
          </v-window-item>

          <v-window-item value="verificacion">
            
            <div v-if="perfil.verificado" class="text-center pa-6">
              <v-icon color="success" size="80" class="mb-4">mdi-shield-check</v-icon>
              <h3 class="text-h6 font-weight-bold mb-2 text-success">Cuenta Verificada</h3>
              <p class="text-medium-emphasis">Tu cuenta ha sido validada. Tienes acceso completo a las funciones del sistema.</p>
            </div>

            <div v-else>
              
              <div v-if="!codigoEnviado" class="text-center pa-6">
                 <v-icon color="grey-lighten-1" size="80" class="mb-4">mdi-shield-alert</v-icon>
                 <h3 class="text-h5 font-weight-bold mt-0 mb-4 text-grey-darken-3">Verifica tu Cuenta</h3>
                 <p class="text-medium-emphasis mb-6">Para mantener la seguridad del sistema, necesitamos verificar tu identidad enviando un código a tu correo.</p>
                 <v-btn color="blue-darken-3" class="mb-3 font-weight-bold text-none" prepend-icon="mdi-email-fast" @click="solicitarCodigo" :loading="cargandoVerificacion" block size="large">
                    Enviar Código a mi Correo
                 </v-btn>
              </div>

              <v-card v-if="codigoEnviado" class="py-8 px-6 text-center mx-auto ma-4" elevation="4" max-width="400" width="100%">
                
                <h3 class="text-h5 font-weight-bold mt-0 mb-4">Verifica tu Cuenta</h3>

                <div class="text-body-medium mb-6">
                  Hemos enviado un código de verificación a <br>
                  <strong class="text-purple-darken-2">{{ perfil.correo }}</strong> <br><br>
                  Por favor revisa tu correo y pega el código abajo.
                </div>

                <v-alert v-if="mensajeVerificacion" type="error" variant="tonal" density="compact" class="mb-4 text-caption text-left">
                  {{ mensajeVerificacion }}
                </v-alert>

                <v-sheet color="surface">
                  <v-otp-input
                    v-model="otp"
                    type="password"
                    variant="solo"
                    length="6"
                  ></v-otp-input>
                </v-sheet>

                <v-btn
                  class="my-4 font-weight-bold text-none"
                  color="purple"
                  height="40"
                  text="Verificar"
                  variant="flat"
                  width="70%"
                  @click="verificarCuenta"
                  :loading="cargandoVerificacion"
                ></v-btn>

                <div class="text-body-small">
                  ¿No recibiste el código? 
                  <a href="#" @click.prevent="solicitarCodigo" class="text-purple font-weight-bold text-decoration-none">Reenviar</a>
                </div>
              </v-card>

            </div>
          </v-window-item>

        </v-window>
      </v-card-text>
    </v-card>
  </v-container>
</template>