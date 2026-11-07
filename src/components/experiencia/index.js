import React from "react";
import "./style.css";

const experiencias = [
  {
    cargo: "Analista de Desenvolvimento Júnior",
    empresa: "Lojas Quero-Quero S.A.",
    periodo: "Fev. 2024 – atual",
    local: "Remoto · Cachoeirinha, RS",
    itens: [
      "Desenvolvimento e manutenção de APIs e microsserviços em Node.js, NestJS e TypeScript, com integrações REST e processamento de eventos via Kafka.",
      "Desenvolvimento de aplicações web em React.js e TypeScript integradas a APIs NestJS.",
      "Desenvolvimento e manutenção de serviços em Go e integração com APIs externas.",
      "Diagnóstico de falhas em consumidores Kafka, timeouts, conexões e bloqueios de banco, com análise de logs e monitoramento em Datadog e Grafana.",
      "Ajustes em consultas e persistência com PostgreSQL, Oracle e MongoDB, utilizando TypeORM e GORM e testes com Jest.",
      "Deploys e configuração de aplicações com Docker, Kubernetes, Rancher e Jenkins, incluindo CronJobs, volumes persistentes e recursos de pods.",
    ],
  },
  {
    cargo: "Estagiário de Desenvolvimento Web",
    empresa: "Lojas Quero-Quero S.A.",
    periodo: "Jan. 2023 – fev. 2024",
    local: "Cachoeirinha, RS",
    itens: [
      "Desenvolvimento e manutenção de aplicações web e APIs com Node.js, NestJS, TypeScript e React.js.",
    ],
  },
  {
    cargo: "Estagiário de Desenvolvimento",
    empresa: "Universidade Tecnológica Federal do Paraná (UTFPR)",
    periodo: "Set. 2021 – dez. 2022",
    local: "Cornélio Procópio, PR",
    itens: ["Desenvolvimento e manutenção de sistemas web com PHP."],
  },
];

const formacao = [
  {
    titulo: "Bacharelado em Engenharia de Software",
    instituicao: "Universidade Tecnológica Federal do Paraná (UTFPR)",
    periodo: "2019 – 2025",
  },
  {
    titulo: "Técnico em Informática",
    instituicao: "ETEC – Escola Técnica Estadual de São Paulo",
    periodo: "Fev. 2013 – jun. 2014",
  },
];

const certificacoes = [
  "Linguagem Go – Alura (out. 2024)",
  "Fundamentos NestJS – Udemy (jul. 2023)",
  "Certificação Docker DCA – Alura (nov. 2021)",
  "PHP, com Laravel e Lumen – Alura (nov. 2021)",
  "Front-end e HTML e CSS – Alura (nov. 2021)",
  "Acessibilidade Web – Alura (out. 2021)",
];

export default function Experiencia() {
  return (
    <section className="experiencia" id="experiencia">
      <div className="title">
        <h2>Experiência</h2>
      </div>

      <div className="experiencia-lista">
        {experiencias.map((exp) => (
          <div className="experiencia-card" key={`${exp.cargo}-${exp.periodo}`}>
            <div className="experiencia-topo">
              <div>
                <h3>{exp.cargo}</h3>
                <p className="experiencia-empresa">
                  {exp.empresa} · {exp.local}
                </p>
              </div>
              <span className="experiencia-periodo">{exp.periodo}</span>
            </div>

            <ul>
              {exp.itens.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="formacao-grid">
        <div className="experiencia-card">
          <h3 className="experiencia-subtitulo">
            <i className="fa-solid fa-graduation-cap"></i> Formação
          </h3>
          {formacao.map((f) => (
            <div className="formacao-item" key={f.titulo}>
              <strong>{f.titulo}</strong>
              <p>{f.instituicao}</p>
              <span className="experiencia-periodo">{f.periodo}</span>
            </div>
          ))}
        </div>

        <div className="experiencia-card">
          <h3 className="experiencia-subtitulo">
            <i className="fa-solid fa-certificate"></i> Cursos e certificações
          </h3>
          <ul>
            {certificacoes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
