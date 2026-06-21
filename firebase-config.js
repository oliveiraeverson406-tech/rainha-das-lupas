/* =======================================================================
   CONFIGURAÇÃO DO FIREBASE
   ---------------------------------------------------------------------
   EDITE AQUI — cole as chaves do seu projeto.
   Onde encontrar: console.firebase.google.com > rainha-das-lupas >
   ⚙️ Configurações do projeto > role até "Seus apps" > app da Web > SDK.

   Se você ainda não criou um "app da Web" dentro do projeto Firebase:
   1. No Console, clique no ícone de engrenagem > "Configurações do projeto"
   2. Em "Seus apps", clique no ícone </> (Web)
   3. Dê um apelido (ex: "rainha-das-lupas-site") e clique em "Registrar app"
   4. O Firebase vai mostrar um bloco "firebaseConfig" — copie os valores
      e cole abaixo, substituindo o que está escrito como exemplo.
======================================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDY6_Dt7QMK6Qssf6Di0HLtfi3NfqnGM9k",
  authDomain: "rainha-das-lupas.firebaseapp.com",
  projectId: "rainha-das-lupas",
  storageBucket: "rainha-das-lupas.firebasestorage.app",
  messagingSenderId: "1066816437022",
  appId: "1:1066816437022:web:bbda2340018a9ff208670f"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
