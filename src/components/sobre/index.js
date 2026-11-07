import React from "react";
import Eu from "../../assets/imgs/eu.jpg";
import "./style.css";

export default function Sobre() {
  return (
    <section className="sobre" id="sobre">
      <div className="main-sobre">
        <img src={Eu} alt="Foto de Vinícius" />

        <div className="sobre-descricao">
          <div className="title">
            <h2>
              Sobre <span>Mim</span>
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
          <ul>
            <li>
              <u>
                <b>Backend e arquitetura:</b> Node.js, NestJS, TypeScript, Go,
                PHP, APIs REST, microsserviços, Kafka e webhooks.
              </u>
            </li>
            <li>
              <u>
                <b>Dados e testes:</b> PostgreSQL, Oracle, MySQL, MongoDB,
                Redis, TypeORM, GORM e Jest.
              </u>
            </li>
            <li>
              <u>
                <b>Infraestrutura:</b> Docker, Kubernetes, Rancher, Jenkins,
                Git, Datadog e Grafana.
              </u>
            </li>
            <li>
              <u>
                <b>Frontend:</b> React.js, JavaScript, HTML, CSS, Sass e
                jQuery.
              </u>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
