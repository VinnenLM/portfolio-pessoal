import React from "react";
import Eu from "../../assets/imgs/eu.jpg";
import "./style.css";

const grupos = [
  {
    icone: "fa-solid fa-server",
    titulo: "Backend e arquitetura",
    texto:
      "Node.js, NestJS, TypeScript, Go, PHP, APIs REST, microsserviços, Kafka e webhooks.",
  },
  {
    icone: "fa-solid fa-database",
    titulo: "Dados e testes",
    texto: "PostgreSQL, Oracle, MySQL, MongoDB, Redis, TypeORM, GORM e Jest.",
  },
  {
    icone: "fa-solid fa-cubes",
    titulo: "Infraestrutura",
    texto: "Docker, Kubernetes, Rancher, Jenkins, Git, Datadog e Grafana.",
  },
  {
    icone: "fa-solid fa-laptop-code",
    titulo: "Frontend",
    texto: "React.js, JavaScript, HTML, CSS, Sass e jQuery.",
  },
];

export default function Sobre() {
  return (
    <section className="sobre" id="sobre">
      <div className="container main-sobre">
        <div className="sobre-foto">
          <img src={Eu} alt="Foto de Vinícius" />
        </div>

        <div className="sobre-descricao">
          <div className="title title-esq">
            <h2>
              Sobre <span className="destaque">Mim</span>
            </h2>
          </div>

          <p>
            Sou Desenvolvedor de Software com mais de 5 anos de experiência,
            com foco em backend e atuação fullstack. Trabalho com Node.js,
            NestJS, TypeScript e Go no desenvolvimento de APIs REST,
            microsserviços e processamento assíncrono de eventos com Kafka.
            Atuo em integrações entre sistemas, deploys em Kubernetes e
            investigação de problemas em produção. Minha experiência inclui:
          </p>

          <div className="sobre-grupos">
            {grupos.map((g) => (
              <div className="sobre-grupo" key={g.titulo}>
                <i className={g.icone}></i>
                <div>
                  <b>{g.titulo}</b>
                  <p>{g.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
