import React from "react";

export default function Projeto({ titulo, icone, descricao, link }) {
  return (
    <>
      <div className="card">
        <i className={icone}></i>

        <span className="projeto-title">{titulo}</span>

        <div className="paragrafo">
          <p>{descricao}</p>
        </div>

        <a className="botao-link" href={link} target="_blank" rel="noreferrer">
          Ver Mais
        </a>
      </div>
    </>
  );
}
