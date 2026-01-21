<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <v-app>
    <v-app-bar color="grey-lighten-2" elevation="2">
      <v-app-bar-title>Mi Proyecto Vue</v-app-bar-title>

      <v-spacer></v-spacer>

      <v-btn to="/" variant="text">Inicio</v-btn>

      <v-btn to="/hola-mundo" variant="text" color="primary">Hola Mundo</v-btn>

      <v-btn to="/captcha" variant="text">Captcha</v-btn>

      <v-btn to="/error" color="red" variant="text">Error</v-btn>

    </v-app-bar>

    <v-main>
      <RouterView />
    </v-main>
  </v-app>
</template>