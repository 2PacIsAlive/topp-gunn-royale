import Vue from 'vue'
import App from './App.vue'
import store from './store'
import VueSocketio from 'vue-socket.io';
import io from 'socket.io-client'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.css'

Vue.use(VueSocketio, io('https://f81d91ee.ngrok.io'), store);
//Vue.use(VueSocketio, io('http://localhost:8080'), store);
Vue.use(Vuetify)

new Vue({
  el: '#app',
  store,
  render: h => h(App)
})
