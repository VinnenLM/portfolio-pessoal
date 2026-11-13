import React from "react";
import "./style.css";

const grupos = [
  {
    titulo: "Backend e arquitetura",
    itens: [
      ["devicon-nestjs-plain", "NestJS"],
      ["devicon-nodejs-plain", "Node.js"],
      ["devicon-typescript-plain", "TypeScript"],
      ["devicon-go-plain", "Go"],
      ["devicon-php-plain", "PHP"],
      ["devicon-laravel-plain", "Laravel"],
      ["devicon-java-plain", "Java"],
      ["devicon-apachekafka-plain", "Kafka"],
    ],
  },
  {
    titulo: "Dados e testes",
    itens: [
      ["devicon-postgresql-plain", "PostgreSQL"],
      ["devicon-oracle-plain", "Oracle"],
      ["devicon-mysql-plain", "MySQL"],
      ["devicon-mongodb-plain", "MongoDB"],
      ["devicon-redis-plain", "Redis"],
      ["devicon-typeorm-plain", "TypeORM"],
      ["devicon-jest-plain", "Jest"],
    ],
  },
  {
    titulo: "Infraestrutura",
    itens: [
      ["devicon-docker-plain", "Docker"],
      ["devicon-kubernetes-plain", "Kubernetes"],
      ["devicon-rancher-plain", "Rancher"],
      ["devicon-jenkins-plain", "Jenkins"],
      ["devicon-git-plain", "Git"],
      ["devicon-datadog-plain", "Datadog"],
      ["devicon-grafana-plain", "Grafana"],
    ],
  },
  {
    titulo: "Frontend",
    itens: [
      ["devicon-react-plain", "React.js"],
      ["devicon-javascript-plain", "JavaScript"],
      ["devicon-html5-plain", "HTML5"],
      ["devicon-css3-plain", "CSS3"],
      ["devicon-sass-original", "Sass"],
      ["devicon-bootstrap-plain", "Bootstrap"],
      ["devicon-jquery-plain", "jQuery"],
    ],
  },
];

export default function Habilidades() {
  return (
    <section className="habilidades" id="habilidades">
      <div className="title">
        <h2>Habilidades</h2>
      </div>

      <div className="container habilidades-grupos">
        {grupos.map((g) => (
          <div className="habilidades-grupo" key={g.titulo}>
            <h3>{g.titulo}</h3>
            <div className="icones">
              {g.itens.map(([classe, nome]) => (
                <div className="habilidade" key={nome} title={nome}>
                  <i className={`${classe} colored`}></i>
                  <span>{nome}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
