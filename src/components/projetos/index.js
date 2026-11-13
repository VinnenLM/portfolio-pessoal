import React, { useState } from "react";
import Projeto from "./projeto";
import "./style.css";

const img = (arquivo) => `${process.env.PUBLIC_URL}/projetos/${arquivo}`;

const FILTROS = [
  ["todos", "Todos"],
  ["app", "Aplicações"],
  ["ferramenta", "Ferramentas"],
  ["curso", "Cursos e sites"],
];

/*
  Cada projeto tem as cores do próprio site (tema):
    c1 = cor principal (borda, botão, ícone)
    c2 = segunda cor do degradê da capa
    on = cor do texto sobre o botão
    logoBg = fundo atrás da logo
  Para usar uma logo, coloque o arquivo em public/projetos e informe em "logo".
  Sem logo, o card usa o ícone Font Awesome de "icone".
*/
const projetos = [
  {
    titulo: "Enzimando",
    categoria: "app",
    descricao:
      "Blog sobre cerveja e pesquisa na área cervejeira, criado com NestJS, React e PostgreSQL. Hospedado no Render, com banco no Neon, imagens no Cloudinary e envio de e-mails via Brevo.",
    link: "https://enzimando.onrender.com",
    logo: img("enzimando.svg"),
    redondo: true,
    tags: ["NestJS", "React", "PostgreSQL", "Render"],
    tema: { c1: "#f2c500", c2: "#0d0d0d", on: "#0d0d0d", logoBg: "#0d0d0d" },
  },
  {
    titulo: "Blog Cabelos Coloridos",
    categoria: "app",
    descricao:
      "Blog para a página Cabelos Coloridos, criado com NestJS, React e PostgreSQL. Hospedado no Render, com banco no Neon, imagens no Cloudinary e envio de e-mails via Brevo.",
    link: "https://blog-cabelos-coloridos.onrender.com/",
    logo: img("cabelos-coloridos.svg"),
    redondo: true,
    tags: ["NestJS", "React", "PostgreSQL", "Render"],
    tema: { c1: "#b248ce", c2: "#ff7f89", on: "#ffffff", logoBg: "#8cccb4" },
  },
  {
    titulo: "SpawnWatch",
    categoria: "app",
    descricao:
      "Aplicação web para monitorar spawns de Pokémon GO com notificações no celular, criada utilizando React com TypeScript e Cloudflare Workers.",
    link: "https://spawnwatch.vinicius-mendoncaa.workers.dev",
    logo: img("spawnwatch.svg"),
    redondo: true,
    tags: ["React", "TypeScript", "Cloudflare Workers"],
    tema: { c1: "#ffcb05", c2: "#2f6eb5", on: "#09111f", logoBg: "#09111f" },
  },
  {
    titulo: "Mock-data",
    categoria: "ferramenta",
    descricao:
      "Gerador de dados fictícios brasileiros para testes: CPF, CNPJ, RG, Inscrição Estadual, telefone, endereço, conta bancária, cartão de crédito e mais, com validador. Roda 100% no navegador.",
    link: "https://vinnenlm.github.io/mock-data/",
    logo: img("mock-data.svg"),
    tags: ["JavaScript", "Sem back-end"],
    tema: { c1: "#5b8cff", c2: "#0f1115", on: "#ffffff", logoBg: "#0f1115" },
  },
  {
    titulo: "jsonfmt",
    categoria: "ferramenta",
    descricao:
      "Formatador, minificador e validador de JSON, com indicação de linha e coluna do erro, indentação configurável e ordenação de chaves. Roda 100% no navegador, feito com HTML, CSS e JavaScript.",
    link: "https://vinnenlm.github.io/jsonfmt/",
    logo: img("jsonfmt.svg"),
    tags: ["JavaScript", "Sem back-end"],
    tema: { c1: "#5b8cff", c2: "#0f1115", on: "#ffffff", logoBg: "#0f1115" },
  },
  {
    titulo: "b64codec",
    categoria: "ferramenta",
    descricao:
      "Ferramenta para codificar e decodificar Base64, de texto (com suporte a UTF-8) e de imagens, com pré-visualização e download. Roda 100% no navegador, feita com HTML, CSS e JavaScript.",
    link: "https://vinnenlm.github.io/b64codec/",
    logo: img("b64codec.svg"),
    tags: ["JavaScript", "Sem back-end"],
    tema: { c1: "#5b8cff", c2: "#0f1115", on: "#ffffff", logoBg: "#0f1115" },
  },
  {
    titulo: "Compressor de Imagens",
    categoria: "ferramenta",
    descricao:
      "Aplicação web para compressão de imagens, permitindo reduzir o tamanho de arquivos sem perder qualidade.",
    link: "https://compressor-imagens.netlify.app/",
    icone: "fa-solid fa-compress",
    tags: ["HTML", "CSS", "JavaScript"],
    tema: { c1: "#3498db", c2: "#2ecc71", on: "#ffffff", logoBg: "#0d1620" },
  },
  {
    titulo: "Séries Controller",
    categoria: "app",
    descricao:
      "Projeto de gerenciador de séries, podendo cadastrar suas temporadas/episódios e marcar como assistidas. Criado utilizando PHP com Laravel e PostgreSQL.",
    link: "https://github.com/VinnenLM/series-controller",
    icone: "fa-solid fa-video",
    tags: ["PHP", "Laravel", "PostgreSQL"],
    tema: { c1: "#ff2d20", c2: "#1b1b1b", on: "#ffffff", logoBg: "#161616" },
  },
  {
    titulo: "Mind Booster",
    categoria: "app",
    descricao:
      "Projeto de jogo estilo Flash Cards, criado utilizando ReactJs e Firebase.",
    link: "https://mind-booster.netlify.app/",
    icone: "fa-solid fa-gamepad",
    tags: ["React", "Firebase"],
    tema: { c1: "#a855f7", c2: "#4f46e5", on: "#ffffff", logoBg: "#150f24" },
  },
  {
    titulo: "Consultório Odonto",
    categoria: "app",
    descricao:
      "Projeto de gerenciador de consultório odontológico, criado utilizando Java e PostgreSQL.",
    link: "https://github.com/VinnenLM/consultorio-odonto",
    icone: "fa-solid fa-tooth",
    tags: ["Java", "PostgreSQL"],
    tema: { c1: "#14b8a6", c2: "#0e7490", on: "#042f2e", logoBg: "#0a1a1c" },
  },
  {
    titulo: "Gerenciador de Estudos",
    categoria: "app",
    descricao:
      "Projeto de cronômetro para gerenciar o tempo dos estudos, criado utilizando React com Typescript.",
    link: "https://contador-estudos.netlify.app/",
    icone: "fa-solid fa-clock",
    tags: ["React", "TypeScript"],
    tema: { c1: "#f59e0b", c2: "#b45309", on: "#1c1100", logoBg: "#1c1408" },
  },
  {
    titulo: "Desafio Rocketseat",
    categoria: "curso",
    descricao: "21 Dias de códigos desenvolvidos durante o desafio da Rocketseat.",
    link: "https://vinnenlm.github.io/desafio-21-dias-rocketseat/",
    icone: "fa-solid fa-rocket",
    tags: ["Rocketseat"],
    tema: { c1: "#8257e5", c2: "#121214", on: "#ffffff", logoBg: "#121214" },
  },
  {
    titulo: "DSMovie",
    categoria: "curso",
    descricao:
      "Projeto para listagem de séries e filmes, permitindo a avaliação dos mesmos, criado durante a Semana Sprint React da DevSuperior.",
    link: "https://dsmovie-vinicius-mendonca.netlify.app/",
    icone: "fa-solid fa-film",
    tags: ["React", "DevSuperior"],
    tema: { c1: "#a78bfa", c2: "#4c1d95", on: "#1a0b3b", logoBg: "#150f24" },
  },
  {
    titulo: "DSVendas",
    categoria: "curso",
    descricao:
      "Projeto de dashboard para análise de vendas, criado durante a Semana Sprint React da DevSuperior.",
    link: "https://dsvendas-vinicius-mendonca.netlify.app/dashboard",
    icone: "fa-solid fa-clipboard",
    tags: ["React", "DevSuperior"],
    tema: { c1: "#34d399", c2: "#065f46", on: "#022c22", logoBg: "#08201a" },
  },
  {
    titulo: "SEMAT 2022",
    categoria: "curso",
    descricao: "Site para divulgação da IX semana da matemática da UTFPR.",
    link: "https://www.cp.utfpr.edu.br/semat/2022/",
    icone: "fa-solid fa-calendar-check",
    tags: ["UTFPR"],
    tema: { c1: "#38bdf8", c2: "#0c4a6e", on: "#04202f", logoBg: "#0a1a24" },
  },
  {
    titulo: "SEMAT 2019",
    categoria: "curso",
    descricao: "Site para divulgação da VIII semana da matemática da UTFPR.",
    link: "https://www.cp.utfpr.edu.br/semat/2019/",
    icone: "fa-regular fa-calendar-check",
    tags: ["UTFPR"],
    tema: { c1: "#fbbf24", c2: "#1f2937", on: "#1c1100", logoBg: "#161a22" },
  },
];

export default function Projetos() {
  const [filtro, setFiltro] = useState("todos");

  const visiveis = projetos.filter(
    (p) => filtro === "todos" || p.categoria === filtro
  );

  return (
    <section className="projetos" id="projetos">
      <div className="title">
        <h2>Projetos</h2>
      </div>

      <div className="container">
        <div className="filtros" role="tablist" aria-label="Filtrar projetos">
          {FILTROS.map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={filtro === valor}
              className={`filtro${filtro === valor ? " ativo" : ""}`}
              onClick={() => setFiltro(valor)}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <div className="cards">
          {visiveis.map((p) => (
            <Projeto key={p.titulo} {...p} />
          ))}
        </div>
      </div>
    </section>
  );
}
