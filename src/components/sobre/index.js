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
            Sou Desenvolvedor de Software Fullstack, com foco em tecnologias
            modernas para desenvolvimento web e backend. Minha experiência
            inclui:
          </p>
          <ul>
            <li>
              <u>
                <b>Backend:</b> Node.js, NestJS, PHP, TypeScript.
              </u>
            </li>
            <li>
              <u>
                <b>Frontend:</b> React.js, JavaScript, HTML, CSS, Sass, JQuery.
              </u>
            </li>
            <li>
              <u>
                <b>Banco de Dados:</b> PostgreSQL, Oracle, MySQL.
              </u>
            </li>
            <li>
              <u>
                <b>DevOps e Infraestrutura:</b> Docker, Git.
              </u>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
