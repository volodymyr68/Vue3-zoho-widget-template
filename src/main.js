import { createApp } from 'vue'
import { createPinia } from 'pinia'

import 'vuetify/styles'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createVuetify } from 'vuetify'
import VueApexCharts from "vue3-apexcharts";

import App from './App.vue'

const app = createApp(App)

// Создаём инстанс vuetify
const vuetify = createVuetify({
  components,
  directives,
})

// Подключаем плагины
app.use(createPinia())
app.use(vuetify)
app.use(VueApexCharts);

app.mount('#app')
