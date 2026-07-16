import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const nomesCategoria = {
  sol: "Óculos de Sol",
  grau: "Óculos de Grau",
  lupa: "Lupa de Aumento",
  acessorio: "Acessório",
};

/* ===================== elementos ===================== */
const loginTela = document.getElementById("loginTela");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginSenha = document.getElementById("loginSenha");
const loginErro = document.getElementById("loginErro");

const adminPainel = document.getElementById("adminPainel");
const adminUsuario = document.getElementById("adminUsuario");
const btnSair = document.getElementById("btnSair");

const produtoForm = document.getElementById("produtoForm");
const formModo = document.getElementById("formModo");
const campoNome = document.getElementById("campoNome");
const campoCategoria = document.getElementById("campoCategoria");
const campoPreco = document.getElementById("campoPreco");
const campoDescricao = document.getElementById("campoDescricao");
const campoQuantidade = document.getElementById("campoQuantidade");
const campoAtivo = document.getElementById("campoAtivo");
const listaImagens = document.getElementById("listaImagens");
const btnAddImagem = document.getElementById("btnAddImagem");
const btnSalvar = document.getElementById("btnSalvar");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");
const formMsg = document.getElementById("formMsg");

const listaStatus = document.getElementById("listaStatus");
const listaProdutos = document.getElementById("listaProdutos");
const contadorProdutos = document.getElementById("contadorProdutos");

let editandoId = null;
let produtosCache = [];

/* ===================== autenticação ===================== */
onAuthStateChanged(auth, (user) => {
  if (user){
    loginTela.hidden = true;
    adminPainel.hidden = false;
    if (adminUsuario) adminUsuario.textContent = "";
    carregarProdutos();
  } else {
    loginTela.hidden = false;
    adminPainel.hidden = true;
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginErro.textContent = "";
  try{
    await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginSenha.value);
  }catch(erro){
    console.error(erro);
    loginErro.textContent = "E-mail ou senha incorretos.";
  }
});

btnSair.addEventListener("click", () => signOut(auth));

/* ===================== campos de imagem dinâmicos ===================== */
function novaLinhaImagem(valor = ""){
  const linha = document.createElement("div");
  linha.className = "linha-imagem";
  linha.innerHTML = `
    <input type="url" placeholder="https://..." value="${valor}">
    <button type="button" class="btn-remover-img" aria-label="Remover foto">✕</button>
  `;
  linha.querySelector(".btn-remover-img").addEventListener("click", () => linha.remove());
  return linha;
}

btnAddImagem.addEventListener("click", () => {
  listaImagens.appendChild(novaLinhaImagem());
});

function pegarImagensDoForm(){
  return [...listaImagens.querySelectorAll("input")]
    .map(i => i.value.trim())
    .filter(Boolean);
}

function preencherImagensNoForm(imagens){
  listaImagens.innerHTML = "";
  (imagens.length ? imagens : [""]).forEach(url => {
    listaImagens.appendChild(novaLinhaImagem(url));
  });
}

/* ===================== formulário: salvar (criar/editar) ===================== */
function limparFormulario(){
  editandoId = null;
  produtoForm.reset();
  preencherImagensNoForm([]);
  campoAtivo.checked = true;
  formModo.textContent = "Novo produto";
  btnSalvar.textContent = "Salvar produto";
  btnCancelarEdicao.hidden = true;
  formMsg.textContent = "";
  formMsg.className = "form-msg";
}

btnCancelarEdicao.addEventListener("click", limparFormulario);
preencherImagensNoForm([]);

produtoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMsg.textContent = "";
  formMsg.className = "form-msg";

  const dados = {
    nome: campoNome.value.trim(),
    categoria: campoCategoria.value,
    preco: Number(campoPreco.value),
    descricao: campoDescricao.value.trim(),
    imagens: pegarImagensDoForm(),
    ativo: campoAtivo.checked,
  };

  // Quantidade em estoque: campo opcional.
  // Se ficar em branco, o produto não fica sujeito a controle de estoque.
  const quantidadeTexto = campoQuantidade.value.trim();
  if (quantidadeTexto !== ""){
    const quantidadeNum = Number(quantidadeTexto);
    if (isNaN(quantidadeNum) || quantidadeNum < 0){
      formMsg.textContent = "Quantidade em estoque inválida.";
      formMsg.classList.add("erro");
      return;
    }
    dados.quantidade = quantidadeNum;
  } else {
    dados.quantidade = null;
  }

  if (!dados.nome || !dados.categoria || isNaN(dados.preco)){
    formMsg.textContent = "Preencha nome, categoria e preço.";
    formMsg.classList.add("erro");
    return;
  }

  btnSalvar.disabled = true;
  try{
    if (editandoId){
      await updateDoc(doc(db, "produtos", editandoId), dados);
      formMsg.textContent = "Produto atualizado!";
    } else {
      await addDoc(collection(db, "produtos"), dados);
      formMsg.textContent = "Produto cadastrado!";
    }
    formMsg.classList.add("sucesso");
    limparFormulario();
    carregarProdutos();
  }catch(erro){
    console.error(erro);
    formMsg.textContent = "Erro ao salvar. Verifique sua conexão e tente novamente.";
    formMsg.classList.add("erro");
  }finally{
    btnSalvar.disabled = false;
  }
});

/* ===================== listar produtos ===================== */
async function carregarProdutos(){
  listaStatus.textContent = "Carregando produtos...";
  listaStatus.classList.add("show");
  listaStatus.classList.remove("erro");

  try{
    const q = query(collection(db, "produtos"), orderBy("nome"));
    const snap = await getDocs(q);
    produtosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    listaStatus.classList.remove("show");
    contadorProdutos.textContent = `${produtosCache.length} produto${produtosCache.length === 1 ? "" : "s"}`;
    renderizarLista();
  }catch(erro){
    console.error(erro);
    listaStatus.textContent = "Não foi possível carregar os produtos.";
    listaStatus.classList.add("erro", "show");
  }
}

function metaEstoque(p){
  if (p.quantidade === undefined || p.quantidade === null) return "";
  if (Number(p.quantidade) <= 0) return `<span class="esgotado">esgotado</span>`;
  return `<span>${Number(p.quantidade)} em estoque</span>`;
}

function renderizarLista(){
  listaProdutos.innerHTML = produtosCache.map(p => {
    const imagens = Array.isArray(p.imagens) ? p.imagens.filter(Boolean) : [];
    const thumb = imagens[0] || "";
    return `
      <div class="item-produto" data-id="${p.id}">
        ${thumb ? `<img class="thumb" src="${thumb}" alt="">` : `<div class="thumb"></div>`}
        <div class="item-info">
          <div class="nome">${p.nome}</div>
          <div class="meta">
            <span>${nomesCategoria[p.categoria] || p.categoria}</span>
            <span>${Number(p.preco || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            <span>${imagens.length} foto${imagens.length === 1 ? "" : "s"}</span>
            ${metaEstoque(p)}
            ${p.ativo ? "" : `<span class="inativo">oculto no site</span>`}
          </div>
        </div>
        <div class="item-acoes">
          <button type="button" class="btn-editar">Editar</button>
          <button type="button" class="btn-excluir">Excluir</button>
        </div>
      </div>`;
  }).join("");
}

listaProdutos.addEventListener("click", async (e) => {
  const item = e.target.closest(".item-produto");
  if (!item) return;
  const id = item.dataset.id;
  const produto = produtosCache.find(p => p.id === id);

  if (e.target.classList.contains("btn-editar")){
    editandoId = id;
    campoNome.value = produto.nome || "";
    campoCategoria.value = produto.categoria || "sol";
    campoPreco.value = produto.preco || "";
    campoDescricao.value = produto.descricao || "";
    campoQuantidade.value = (produto.quantidade === undefined || produto.quantidade === null) ? "" : produto.quantidade;
    campoAtivo.checked = !!produto.ativo;
    preencherImagensNoForm(Array.isArray(produto.imagens) ? produto.imagens : []);
    formModo.textContent = "Editando produto";
    btnSalvar.textContent = "Salvar alterações";
    btnCancelarEdicao.hidden = false;
    formMsg.textContent = "";
    formMsg.className = "form-msg";
    
  }
  document.querySelector(".admin-form-card").scrollIntoView({ behavior: "smooth" });

  if (e.target.classList.contains("btn-excluir")){
    const confirmar = confirm(`Excluir "${produto.nome}"? Essa ação não pode ser desfeita.`);
    if (!confirmar) return;
    try{
      await deleteDoc(doc(db, "produtos", id));
      carregarProdutos();
    }catch(erro){
      console.error(erro);
      alert("Erro ao excluir o produto.");
    }
  }
});
