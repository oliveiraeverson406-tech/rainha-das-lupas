/* =======================================================
   MODO DEBUG TEMPORÁRIO — mostra qualquer erro na tela
   (remover este bloco depois que o bug for resolvido)
======================================================= */
(function(){
  const banner = document.createElement("div");
  banner.id = "debug-banner";
  banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#ff3333;color:#fff;padding:14px;font-family:monospace;font-size:13px;white-space:pre-wrap;display:none;";
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(banner));
  function mostrarErro(msg){
    if (!document.body.contains(banner)) document.body.appendChild(banner);
    banner.style.display = "block";
    banner.textContent = "ERRO CAPTURADO:\n" + msg;
  }
  window.addEventListener("error", (e) => {
    mostrarErro((e.message || "erro desconhecido") + "\nArquivo: " + (e.filename || "?") + "\nLinha: " + (e.lineno || "?"));
  });
  window.addEventListener("unhandledrejection", (e) => {
    mostrarErro("Promise rejeitada: " + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });
})();

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
======================================================================= */
const WHATSAPP_NUMERO = "5592900000000";

/* =======================================================================
   PADRONIZAÇÃO DE IMAGENS (Cloudinary)
   Deixa todas as fotos com o mesmo tamanho/proporção, sem cortar o produto.
======================================================================= */
function padronizarImagem(url, tamanho = 800){
  if (!url) return url;
  // Só aplica em URLs do Cloudinary (evita quebrar links de outras origens)
  if (!url.includes("res.cloudinary.com")) return url;
  // Já tem transformação aplicada? não duplica.
  if (url.includes("/upload/w_")) return url;
  return url.replace(
    "/upload/",
    `/upload/w_${tamanho},h_${tamanho},c_pad,b_auto/`
  );
}

/* =======================================================================
   CONTROLE DE ESTOQUE
   Produtos antigos (sem o campo "quantidade") continuam aparecendo normal.
   Só esconde quando "quantidade" existir e for <= 0.
======================================================================= */
function temEstoque(produto){
  if (produto.quantidade === undefined || produto.quantidade === null) return true;
  return Number(produto.quantidade) > 0;
}

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
  sol: "#FFFFFF",
  grau: "#4A6670",
  lupa: "#B68D40",
  acessorio: "#FFFFFF",
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
    montarHeroSlideshow();

    
    
  }catch(erro){
    console.error("Erro ao carregar produtos:", erro);
    statusMsg.textContent = "Não foi possível carregar a coleção agora. Erro: " + (erro && erro.message ? erro.message : erro);
    statusMsg.classList.add("erro", "show");
  }
}

/* ===================== renderização dos cards ===================== */
const LIMITE_ESTOQUE_BAIXO = 3;

function temEstoqueBaixo(produto){
  if (produto.quantidade === undefined || produto.quantidade === null) return false;
  const q = Number(produto.quantidade);
  return q > 0 && q <= LIMITE_ESTOQUE_BAIXO;
}

function cardHTML(produto){
  const imagens = Array.isArray(produto.imagens) ? produto.imagens.filter(Boolean) : [];
  const arte = imagens.length
    ? `<img src="${padronizarImagem(imagens[0])}" alt="${produto.nome}">`
    : iconeCategoria(produto.categoria);
  const badge = imagens.length > 1
    ? `<span class="badge-fotos">📷 ${imagens.length} fotos</span>`
    : "";
  const badgeEstoque = temEstoqueBaixo(produto)
    ? `<span class="badge-estoque" style="position:absolute;top:10px;left:10px;background:#0d0d0d;color:#FFFFFF;font-family:'Work Sans',sans-serif;font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;z-index:2;">Últimas unidades</span>`
    : "";
  const msg = `Olá! Tenho interesse no produto "${produto.nome}" (${formatarPreco(produto.preco)}).`;

  return `
    <article class="card" data-id="${produto.id}">
      <div class="card-art">${arte}${badge}${badgeEstoque}</div>
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
    const passaEstoque = temEstoque(p);
    return passaCategoria && passaBusca && passaEstoque;
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

/* slideshow automático do hero — mostra os produtos reais */
const heroSlideshow = document.getElementById("heroSlideshow");
let heroSlideIndex = 0;
let heroSlideTimer = null;

function montarHeroSlideshow(){
  if (!heroSlideshow || !produtos.length) return;

  const destaques = produtos.filter(p => p.imagens && p.imagens.length && temEstoque(p)).slice(0, 6);
  if (!destaques.length) return;

  heroSlideshow.innerHTML = destaques.map((p, i) => `
    <div class="hero-slide ${i === 0 ? "ativo" : ""}">
      <img src="${padronizarImagem(p.imagens[0])}" alt="${p.nome}">
      <div class="hero-slide-info">
        <h4>${p.nome}</h4>
        <span>${formatarPreco(p.preco)}</span>
      </div>
    </div>
  `).join("");

  clearInterval(heroSlideTimer);
  heroSlideTimer = setInterval(() => {
    const slides = heroSlideshow.querySelectorAll(".hero-slide");
    slides[heroSlideIndex].classList.remove("ativo");
    heroSlideIndex = (heroSlideIndex + 1) % slides.length;
    slides[heroSlideIndex].classList.add("ativo");
  }, 3500);
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
if (setaEsq) setaEsq.style.display = "none";
if (setaDir) setaDir.style.display = "none";

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

  if (imagensAtuais.length > 1) mostrarDicaArraste();
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
  galeriaImgPrincipal.src = padronizarImagem(imagensAtuais[indiceAtual]);
  galeriaImgPrincipal.alt = galeriaNome.textContent;
  // Setas removidas da interface: a navegação agora é só por arraste (1 dedo) e pinça (zoom)
  setaEsq.style.display = "none";
  setaDir.style.display = "none";
}

function renderizarMiniaturas(){
  galeriaMiniaturas.innerHTML = imagensAtuais.map((src, i) =>
    `<img src="${padronizarImagem(src, 150)}" alt="ângulo ${i + 1}" data-i="${i}" class="${i === indiceAtual ? "ativa" : ""}">`
  ).join("");
}

if (galeriaMiniaturas){
  galeriaMiniaturas.addEventListener("click", (e) => {
    const img = e.target.closest("img[data-i]");
    if (!img) return;
    indiceAtual = Number(img.dataset.i);
    renderizarImagemAtual();
    renderizarMiniaturas();
  });
}

if (setaEsq) setaEsq.addEventListener("click", () => {
  indiceAtual = (indiceAtual - 1 + imagensAtuais.length) % imagensAtuais.length;
  renderizarImagemAtual();
  renderizarMiniaturas();
});

if (setaDir) setaDir.addEventListener("click", () => {
  indiceAtual = (indiceAtual + 1) % imagensAtuais.length;
  renderizarImagemAtual();
  renderizarMiniaturas();
});

if (galeriaFechar) galeriaFechar.addEventListener("click", fecharGaleria);
if (galeriaOverlay){
  galeriaOverlay.addEventListener("click", (e) => {
    if (e.target === galeriaOverlay) fecharGaleria();
  });
}
document.addEventListener("keydown", (e) => {
  if (!galeriaOverlay || !galeriaOverlay.classList.contains("aberta")) return;
  if (e.key === "Escape") fecharGaleria();
  if (e.key === "ArrowLeft") setaEsq.click();
  if (e.key === "ArrowRight") setaDir.click();
});

/* =======================================================================
   1 DEDO GIRA ENTRE ÂNGULOS + 2 DEDOS (PINÇA) DÃO ZOOM
======================================================================= */
const SENSIBILIDADE_PX = 40; // px de arraste equivalentes a 1 "giro"
const pointersAtivos = new Map();
let arrastando = false;
let ultimoX = 0;
let pinchDistInicial = 0;
let escalaAtual = 1;

function girarPara(direcao){
  // direcao: 1 = próximo ângulo, -1 = ângulo anterior
  indiceAtual = (indiceAtual + direcao + imagensAtuais.length) % imagensAtuais.length;
  renderizarImagemAtual();
  renderizarMiniaturas();
}

function moverArraste(x){
  if (!arrastando) return;
  const delta = x - ultimoX;
  if (Math.abs(delta) >= SENSIBILIDADE_PX){
    girarPara(delta < 0 ? 1 : -1);
    ultimoX = x;
  }
}

function distanciaEntre(p1, p2){
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function aplicarEscala(escala){
  galeriaImgPrincipal.style.transform = `scale(${escala})`;
}

function resetarEscala(){
  if (!galeriaImgPrincipal) return;
  escalaAtual = 1;
  galeriaImgPrincipal.style.transition = "transform .25s ease";
  aplicarEscala(1);
  setTimeout(() => { if (galeriaImgPrincipal) galeriaImgPrincipal.style.transition = ""; }, 250);
}

function finalizarPonteiro(e){
  pointersAtivos.delete(e.pointerId);

  if (pointersAtivos.size === 0){
    arrastando = false;
    if (escalaAtual !== 1) resetarEscala();
  } else if (pointersAtivos.size === 1){
    // ainda sobrou 1 dedo na tela: retoma o giro a partir da posição atual dele
    const restante = [...pointersAtivos.values()][0];
    arrastando = true;
    ultimoX = restante.x;
    if (escalaAtual !== 1) resetarEscala();
  }
}

if (galeriaImgPrincipal){
  galeriaImgPrincipal.draggable = false;
  galeriaImgPrincipal.style.touchAction = "none"; // controlamos gesto e zoom manualmente
  galeriaImgPrincipal.style.cursor = "grab";
  galeriaImgPrincipal.style.userSelect = "none";

  galeriaImgPrincipal.addEventListener("pointerdown", (e) => {
    galeriaImgPrincipal.setPointerCapture(e.pointerId);
    pointersAtivos.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersAtivos.size === 1){
      arrastando = imagensAtuais.length > 1;
      ultimoX = e.clientX;
    } else if (pointersAtivos.size === 2){
      arrastando = false; // pausa o giro enquanto belisca pra dar zoom
      const [p1, p2] = [...pointersAtivos.values()];
      pinchDistInicial = distanciaEntre(p1, p2);
    }
  });

  galeriaImgPrincipal.addEventListener("pointermove", (e) => {
    if (!pointersAtivos.has(e.pointerId)) return;
    pointersAtivos.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersAtivos.size === 2){
      const [p1, p2] = [...pointersAtivos.values()];
      const distAtual = distanciaEntre(p1, p2);
      if (pinchDistInicial > 0){
        let novaEscala = distAtual / pinchDistInicial;
        novaEscala = Math.min(2.5, Math.max(1, novaEscala));
        escalaAtual = novaEscala;
        aplicarEscala(escalaAtual);
      }
    } else if (pointersAtivos.size === 1){
      moverArraste(e.clientX);
    }
  });

  galeriaImgPrincipal.addEventListener("pointerup", finalizarPonteiro);
  galeriaImgPrincipal.addEventListener("pointercancel", finalizarPonteiro);
  galeriaImgPrincipal.addEventListener("dragstart", (e) => e.preventDefault());
}

/* pequena dica visual "arraste para girar" na primeira vez que abre */
let dicaJaMostrada = false;
function mostrarDicaArraste(){
  if (dicaJaMostrada) return;
  dicaJaMostrada = true;

  const dica = document.createElement("div");
  dica.textContent = "☝ Arraste para girar · ✌ Belisque para dar zoom";
  dica.style.cssText = `
    position:absolute; left:50%; bottom:14px; transform:translateX(-50%);
    background:rgba(13,13,13,0.85); color:#FFB300; font-family:'Work Sans',sans-serif;
    font-size:13px; padding:6px 14px; border-radius:20px; pointer-events:none;
    z-index:10; opacity:0; transition:opacity .3s ease;
  `;
  const container = galeriaImgPrincipal.parentElement || galeriaOverlay;
  container.style.position = container.style.position || "relative";
  container.appendChild(dica);

  requestAnimationFrame(() => { dica.style.opacity = "1"; });
  setTimeout(() => {
    dica.style.opacity = "0";
    setTimeout(() => dica.remove(), 400);
  }, 2200);
}

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
