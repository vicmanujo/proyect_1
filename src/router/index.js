import { createRouter, createWebHistory } from 'vue-router'
import InicioView from '../views/InicioView.vue'
import CaptchaView from '../views/CaptchaView.vue'
import ErrorView from '../views/ErrorView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'inicio',
      component: InicioView
    },
    {
      path: '/captcha',
      name: 'captcha',
      component: CaptchaView
    },
    {
      path: '/error',
      name: 'error',
      component: ErrorView
    },
    // Comodín: Si escriben cualquier ruta rara, los manda a Error
    {
      path: '/:pathMatch(.*)*',
      redirect: '/error'
    },
    {
      path: '/hola-mundo',
      name: 'holamundo',
      // Aquí podemos reusar el componente simple que tenías antes o crear uno nuevo
      component: () => import('../views/HolaMundoView.vue') 
    },
  ]
})

export default router