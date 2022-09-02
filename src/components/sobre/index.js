import React from "react";
import Eu from '../../assets/imgs/eu.jpg'
import './style.css'

export default function Sobre() {
    return (
        <section className="sobre" id="sobre">

            <div className="main-sobre">

                <img src={Eu} alt="Foto de Vinícius" />

                <div className="sobre-descricao">

                    <div className="title">
                        <h2>Sobre <span>Mim</span></h2>
                    </div>

                    <p>Sou um Desenvolvedor Web Fullstack, atualmente trabalhando como estagiário em Desenvolvimento na
                        UTFPR - Cornélio Procópio.</p>
                    <p>Utilizo e procuro saber mais sobre PHP, Laravel, HTML, CSS, Javascript, Git, PostgreSQL, Sass,
                        JQuery, Bootstrap, entre outras tecnologias.</p>

                </div>

            </div>

        </section>
    )
}