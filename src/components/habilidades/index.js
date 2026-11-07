import React from "react";
import "./style.css";

export default function Habilidades() {
  return (
    <div className="habilidades" id="habilidades">
      <div className="title">
        <h2>Habilidades</h2>
      </div>

      <div className="icones">
        {/* Backend e arquitetura */}
        <i className="devicon-nestjs-plain" title="NestJS"></i>
        <i className="devicon-nodejs-plain" title="Node.js"></i>
        <i className="devicon-typescript-plain" title="TypeScript"></i>
        <i className="devicon-go-plain" title="Go"></i>
        <i className="devicon-php-plain" title="PHP"></i>
        <i className="devicon-laravel-plain" title="Laravel"></i>
        <i className="devicon-apachekafka-plain" title="Kafka"></i>

        {/* Dados e testes */}
        <i className="devicon-postgresql-plain" title="PostgreSQL"></i>
        <i className="devicon-oracle-plain" title="Oracle"></i>
        <i className="devicon-mysql-plain" title="MySQL"></i>
        <i className="devicon-mongodb-plain" title="MongoDB"></i>
        <i className="devicon-redis-plain" title="Redis"></i>
        <i className="devicon-typeorm-plain" title="TypeORM"></i>
        <i className="devicon-jest-plain" title="Jest"></i>

        {/* Infraestrutura */}
        <i className="devicon-docker-plain" title="Docker"></i>
        <i className="devicon-kubernetes-plain" title="Kubernetes"></i>
        <i className="devicon-rancher-plain" title="Rancher"></i>
        <i className="devicon-jenkins-plain" title="Jenkins"></i>
        <i className="devicon-git-plain" title="Git"></i>
        <i className="devicon-datadog-plain" title="Datadog"></i>
        <i className="devicon-grafana-plain" title="Grafana"></i>

        {/* Frontend */}
        <i className="devicon-react-plain" title="React.js"></i>
        <i className="devicon-javascript-plain" title="JavaScript"></i>
        <i className="devicon-html5-plain" title="HTML5"></i>
        <i className="devicon-css3-plain" title="CSS3"></i>
        <i className="devicon-sass-original" title="Sass"></i>
        <i className="devicon-jquery-plain" title="jQuery"></i>
      </div>
    </div>
  );
}
