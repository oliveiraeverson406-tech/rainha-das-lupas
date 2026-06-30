import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/* ===================== Firebase inline ===================== */
const firebaseConfig = {
  apiKey: "AIzaSyDY6_Dt7QMK6Qssf6Di0HLtfi3NfqnGM9k",
  authDomain: "rainha-das-lupas.firebaseapp.com",
  projectId: "rainha-das-lupas",
  storageBucket: "rainha-das-lupas.firebasestorage.app",
  messagingSenderId: "1066816437022",
  appId: "1:1066816437022:web:bbda2340018a9ff208670f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =======================================================================
   EDITE AQUI — número de WhatsApp da loja
   Formato: código do país + DDD + número, só números (sem espaço, traço ou +)
   Exemplo Brasil/Manaus: "5592912345678"
======================================================================= */
const WHATSAPP_NUMERO = "5592900000000";

/* ===================== referências de elementos ===================== */
const grid = document.getElementById("grid");
const vazio = document.getElementById("vazio");
const statusMsg = document.getElementById("statusMsg");
const buscaInput = document.getElementById("busca");
const pills = document.querySelectorAll(".pill");

const nomesCategoria = {
  sol: "Óculos de Sol",
  grau: "Óculos de Grau",
  lupa: "Lupa de Aumento",
  acessorio: "Acessório",
};

const corCategoria = {
  sol: "#6B1E2E",
  grau: "#4A6670",
  lupa: "#B68D40",
  acessorio: "#2B1B12",
};

function iconeCategoria(categoria){
  const icones = {
    sol: `<path d="M3 11h4a3 3 0 0 0 6 0h4M3 11l2-5h14l2 5M3 11v2a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3M21 11v2a3 3 0 0 1-3 3h0a3 3 0 0 1-3-3" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>`,
    grau: `<circle cx="7" cy="13" r="4" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="17" cy="13" r="4" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M11 12h2M3 12 1 9M21 12l2-3" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    lupa: `<circle cx="10" cy="10" r="6" stroke="currentColor" stroke-width="1.8" fill="none"/><line x1="14.5" y1="14.5" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
    acessorio: `<rect x="4" y="8" width="16" height="11" rx="3" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="currentColor" stroke-width="1.6" fill="none"/>`,
  };
  return `<svg viewBox="0 0 24 24" style="color:${corCategoria[categoria]}">${icones[categoria]}</svg>`;
}

function formatarPreco(valor){
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function linkWhatsApp(mensagem){
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
}

/* ===================== carregar produtos do Firestore ===================== */
let produtos = [];

async function carregarProdutos(){
  statusMsg.textContent = "Carregando coleção...";
  statusMsg.classList.remove("erro");
  statusMsg.classList.add("show");

  try{
    const colRef = collection(db, "produtos");
    const q = query(colRef, where("ativo", "==", true));
    const snap = await getDocs(q);

    produtos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    statusMsg.classList.remove("show");
    aplicarFiltros();
  }catch(erro){
    console.error("Erro ao carregar produtos:", erro);
    statusMsg.textContent = "Não foi possível carregar a coleção agora. Tente novamente em instantes.";
    statusMsg.classList.add("erro", "show");
  }
}

/* ===================== renderização dos cards ===================== */
function cardHTML(produto){
  const imagens = Array.isArray(produto.imagens) ? produto.imagens.filter(Boolean) : [];
  const arte = imagens.length
    ? `<img src="${imagens[0]}" alt="${produto.nome}">`
    : iconeCategoria(produto.categoria);
  const badge = imagens.length > 1
    ? `<span class="badge-fotos">📷 ${imagens.length} fotos</span>`
    : "";
  const msg = `Olá! Tenho interesse no produto "${produto.nome}" (${formatarPreco(produto.preco)}).`;

  return `
    <article class="card" data-id="${produto.id}">
      <div class="card-art">${arte}${badge}</div>
      <div class="card-body">
        <span class="card-cat" style="color:${corCategoria[produto.categoria]}">${nomesCategoria[produto.categoria] || produto.categoria}</span>
        <h3 class="card-nome">${produto.nome}</h3>
        <p class="card-desc">${produto.descricao || ""}</p>
        <div class="card-bottom">
          <span class="card-preco">${formatarPreco(produto.preco)}</span>
          <a class="card-zap" href="${linkWhatsApp(msg)}" target="_blank" rel="noopener">Perguntar</a>
        </div>
      </div>
    </article>`;
}

let categoriaAtual = "todos";
let buscaAtual = "";

function aplicarFiltros(){
  const filtrados = produtos.filter(p => {
    const passaCategoria = categoriaAtual === "todos" || p.categoria === categoriaAtual;
    const passaBusca = (p.nome || "").toLowerCase().includes(buscaAtual.toLowerCase());
    return passaCategoria && passaBusca;
  });
  grid.innerHTML = filtrados.map(cardHTML).join("");
  vazio.classList.toggle("show", filtrados.length === 0);
}

pills.forEach(pill => {
  pill.addEventListener("click", () => {
    pills.forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    categoriaAtual = pill.dataset.cat;
    aplicarFiltros();
  });
});

buscaInput.addEventListener("input", (e) => {
  buscaAtual = e.target.value;
  aplicarFiltros();
});

/* links de WhatsApp do cabeçalho, rodapé e botão flutuante */
const msgGeral = "Olá! Vim pelo site da Rainha das Lupas e gostaria de mais informações.";
["zap-header", "zap-footer", "zap-flutuante", "zap-footer-tel"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.href = linkWhatsApp(msgGeral);
});

/* lupa interativa do hero */
const stage = document.getElementById("lensStage");
const lens = document.getElementById("lens");
if (stage && window.matchMedia("(hover: hover)").matches){
  stage.addEventListener("mousemove", (e) => {
    const rect = stage.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lens.style.left = `${x - 75}px`;
    lens.style.top = `${y - 75}px`;
    lens.style.backgroundPosition = `${-(x * 2.5 - 75)}px ${-(y * 2.5 - 75)}px`;
  });
}

/* =======================================================================
   GALERIA — modal com fotos em outros ângulos
======================================================================= */
const galeriaOverlay = document.getElementById("galeriaOverlay");
const galeriaImgPrincipal = document.getElementById("galeriaImgPrincipal");
const galeriaMiniaturas = document.getElementById("galeriaMiniaturas");
const galeriaNome = document.getElementById("galeriaNome");
const galeriaDesc = document.getElementById("galeriaDesc");
const galeriaPreco = document.getElementById("galeriaPreco");
const galeriaCat = document.getElementById("galeriaCat");
const galeriaFechar = document.getElementById("galeriaFechar");
const setaEsq = document.getElementById("setaEsq");
const setaDir = document.getElementById("setaDir");

let imagensAtuais = [];
let indiceAtual = 0;

function abrirGaleria(produto){
  imagensAtuais = Array.isArray(produto.imagens) ? produto.imagens.filter(Boolean) : [];
  indiceAtual = 0;

  galeriaNome.textContent = produto.nome;
  galeriaDesc.textContent = produto.descricao || "";
  galeriaPreco.textContent = formatarPreco(produto.preco);
  galeriaCat.textContent = nomesCategoria[produto.categoria] || produto.categoria;
  galeriaCat.style.color = corCategoria[produto.categoria];

  renderizarImagemAtual();
  renderizarMiniaturas();

  galeriaOverlay.classList.add("aberta");
  document.body.style.overflow = "hidden";
}

function fecharGaleria(){
  galeriaOverlay.classList.remove("aberta");
  document.body.style.overflow = "";
}

function renderizarImagemAtual(){
  if (!imagensAtuais.length){
    galeriaImgPrincipal.removeAttribute("src");
    setaEsq.hidden = true;
    setaDir.hidden = true;
    return;
  }
  galeriaImgPrincipal.src = imagensAtuais[indiceAtual];
  galeriaImgPrincipal.alt = galeriaNome.textContent;
  const mostrarSetas = imagensAtuais.length > 1;
  setaEsq.hidden = !mostrarSetas;
  setaDir.hidden = !mostrarSetas;
}

function renderizarMiniaturas(){
  galeriaMiniaturas.innerHTML = imagensAtuais.map((src, i) =>
    `<img src="${src}" alt="ângulo ${i + 1}" data-i="${i}" class="${i === indiceAtual ? "ativa" : ""}">`
  ).join("");
}

galeriaMiniaturas.addEventListener("click", (e) => {
  const img = e.target.closest("img[data-i]");
  if (!img) return;
  indiceAtual = Number(img.dataset.i);
  renderizarImagemAtual();
  renderizarMiniaturas();
});

setaEsq.addEventListener("click", () => {
  indiceAtual = (indiceAtual - 1 + imagensAtuais.length) % imagensAtuais.length;
  renderizarImagemAtual();
  renderizarMiniaturas();
});

setaDir.addEventListener("click", () => {
  indiceAtual = (indiceAtual + 1) % imagensAtuais.length;
  renderizarImagemAtual();
  renderizarMiniaturas();
});

galeriaFechar.addEventListener("click", fecharGaleria);
galeriaOverlay.addEventListener("click", (e) => {
  if (e.target === galeriaOverlay) fecharGaleria();
});
document.addEventListener("keydown", (e) => {
  if (!galeriaOverlay.classList.contains("aberta")) return;
  if (e.key === "Escape") fecharGaleria();
  if (e.key === "ArrowLeft") setaEsq.click();
  if (e.key === "ArrowRight") setaDir.click();
});

/* clique no card (fora do botão "Perguntar") abre a galeria */
grid.addEventListener("click", (e) => {
  if (e.target.closest(".card-zap")) return;
  const card = e.target.closest(".card");
  if (!card) return;
  const produto = produtos.find(p => p.id === card.dataset.id);
  if (produto) abrirGaleria(produto);
});

/* ===================== inicialização ===================== */
carregarProdutos();
