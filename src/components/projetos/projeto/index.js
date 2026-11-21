import React from "react";

const ROTULOS = {
  app: "Aplicação",
  ferramenta: "Ferramenta",
  curso: "Curso / site",
};

export default function Projeto({
  titulo,
  descricao,
  link,
  categoria,
  logo,
  redondo = false,
  icone,
  tags = [],
  tema = {},
  download = false,
  extra = null,
  jogar = false,
}) {
  const github = link.includes("github.com");

  // cada card usa as cores do próprio projeto
  const estilo = {
    "--c1": tema.c1 || "#7c9cff",
    "--c2": tema.c2 || "#141821",
    "--on": tema.on || "#0a0c10",
    "--logo-bg": tema.logoBg || "#0d1016",
  };

  return (
    <article className="card" style={estilo}>
      <div className="card-capa">
        <span className="card-cat">{ROTULOS[categoria]}</span>

        <div className={`card-logo${redondo ? " redondo" : ""}`}>
          {logo ? (
            <img src={logo} alt="" />
          ) : (
            <i className={icone}></i>
          )}
        </div>
      </div>

      <div className="card-corpo">
        <h3 className="projeto-title">{titulo}</h3>

        <p className="card-desc">{descricao}</p>

        {tags.length > 0 && (
          <ul className="card-tags">
            {tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}

        <div className="card-botoes">
          <a
            className="botao-link"
            href={link}
            {...(download ? { download: true } : { target: "_blank", rel: "noreferrer" })}
          >
            {download ? (
              <>
                <i className="fa-solid fa-download"></i> Baixar APK
              </>
            ) : jogar ? (
              <>
                <i className="fa-solid fa-gamepad"></i> Jogar online
              </>
            ) : github ? (
              <>
                <i className="fa-brands fa-github"></i> Ver código
              </>
            ) : (
              <>
                Abrir projeto{" "}
                <i className="fa-solid fa-arrow-up-right-from-square"></i>
              </>
            )}
          </a>

          {extra && (
            <a
              className="botao-link secundario"
              href={extra.link}
              {...(extra.download ? { download: true } : { target: "_blank", rel: "noreferrer" })}
            >
              <i className={extra.icone}></i> {extra.texto}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
