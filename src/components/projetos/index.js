import React from "react";
import Projeto from "./projeto";
import './style.css'

export default function Projetos() {
    return (
        <div className="projetos" id="projetos">

            <div className="title">
                <h2>Projetos</h2>
            </div>

            <div className="cards">

                <div className="card">
                    <i className="fas fa-user"></i>
                    <span className="projeto-title">Blog Cabelos Coloridos</span>
                    <div className="paragrafo">
                        <p>Projeto para a página <a className="link"
                            href="https://www.instagram.com/blogcabeloscoloridos/" target="_blank" rel="noreferrer">Cabelos Coloridos</a> utilizando PHP
                            com Laravel, PostgreSQL e outras tecnologias.</p>
                    </div>
                    <a className="botao-link" href="https://blog-cabelos-coloridos.herokuapp.com" target="_blank" rel="noreferrer">Ver Mais</a>
                </div>

                <Projeto titulo="Séries Controller" icone="fas fa-video" descricao="Projeto de gerenciador de séries, podendo cadastrar suas temporadas/episódios e marcar como assistidas. Criado utilizando PHP com Laravel e PostgreSQL." link="http://series-controller.herokuapp.com" />

                <Projeto titulo="Mind Booster" icone="fas fa-gamepad" descricao="Projeto de jogo estilo Flash Cards, criado utilizando ReactJs e Firebase." link="https://github.com/VinnenLM/prog-web-1-reactjs" />

                <Projeto titulo="Consultório Odonto" icone="fas fa-tooth" descricao="Projeto de gerenciador de consultório odontológico, criado utilizando Java e PostgreSQL." link="https://github.com/VinnenLM/consultorio-odonto" />

                <Projeto titulo="Gerenciador de Estudos" icone="fas fa-clock" descricao="Projeto de cronômetro para gerenciar o tempo dos estudos, criado utilizando React com Typescript." link="https://contador-estudos.herokuapp.com" />

                <Projeto titulo="DSMovie" icone="fas fa-film" descricao="Projeto para listagem de séries e filmes, permitindo a avaliação dos mesmos, criado durante a Semana Sprint React da DevSuperior." link="https://dsmovie-vinicius-mendonca.netlify.app/" />

                <Projeto titulo="DSVendas" icone="fas fa-clipboard" descricao="Projeto de dashboard para análise de vendas, criado durante a Semana Sprint React da DevSuperior." link="https://dsvendas-vinicius-mendonca.netlify.app/dashboard" />

                <Projeto titulo="SEMAT 2019" icone="fa-regular fa-calendar-check" descricao="Site para divulgação do evento da semana da matemática, criado utilizando ReactJs." link="https://semana-matematica-2019.netlify.app/" />

                <Projeto titulo="21 Dias De Código" icone="fa-solid fa-rocket" descricao="Códigos desenvolvidos durante o desafio 21 Dias de Código da Rocketseat" link="https://github.com/VinnenLM/desafio-21-dias-rocketseat" />

            </div>
        </div>
    )
}